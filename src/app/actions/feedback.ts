"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FeedbackResult = { ok?: boolean; error?: string };

/**
 * Two related submissions live on /feedback — the action handles both.
 *
 *   type='feature' payload: { title, description }
 *   type='set'     payload: { brand, set_name, sport, year, product, notes }
 *
 * Both also accept an optional `email` field for anonymous submissions.
 * Signed-in users submit under their profile id and don't need email
 * (we already have their auth email).
 *
 * Validates server-side, inserts into the feedback table. Confirmation
 * notification is sent later by the admin-review workflow if accepted.
 */
export async function submitFeedback(
  formData: FormData,
): Promise<FeedbackResult> {
  const type = String(formData.get("type") || "").trim();
  if (type !== "feature" && type !== "set") {
    return { error: "Invalid feedback type." };
  }

  const email = String(formData.get("email") || "").trim().slice(0, 200);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const submittedBy = user?.id ?? null;

  if (!submittedBy && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { error: "Email is required so we can follow up." };
  }

  let payload: Record<string, string> = {};

  if (type === "feature") {
    const title = String(formData.get("title") || "").trim().slice(0, 120);
    const description = String(formData.get("description") || "")
      .trim()
      .slice(0, 4000);
    if (title.length < 4) return { error: "Give your idea a short title." };
    if (description.length < 10)
      return { error: "Add a sentence or two on what you'd like." };
    payload = { title, description };
  } else {
    const brand = String(formData.get("brand") || "").trim().slice(0, 60);
    const setName = String(formData.get("set_name") || "").trim().slice(0, 80);
    const sport = String(formData.get("sport") || "").trim();
    const year = String(formData.get("year") || "").trim();
    const product = String(formData.get("product") || "").trim().slice(0, 60);
    const notes = String(formData.get("notes") || "").trim().slice(0, 2000);
    if (!brand) return { error: "Brand is required (e.g. Topps, Panini)." };
    if (!setName) return { error: "Set name is required (e.g. Chrome, Prizm)." };
    if (!["NBA", "MLB", "NFL", "NHL", "Soccer", "Pokemon"].includes(sport))
      return { error: "Pick a sport." };
    if (!year || !/^\d{4}$/.test(year)) return { error: "Year is required." };
    payload = { brand, set_name: setName, sport, year, product, notes };
  }

  const { error } = await supabase
    .from("feedback")
    .insert({
      type,
      payload,
      submitted_by: submittedBy,
      email: email || null,
    });
  if (error) {
    console.error("submitFeedback insert failed:", error);
    return { error: "Could not submit. Please try again." };
  }

  revalidatePath("/feedback");
  return { ok: true };
}

/**
 * Admin-only: change a feedback submission's status. Used from the
 * triage queue at /admin/feedback. Optional admin_notes lets the
 * reviewer leave a reason ("declined — duplicate of ID 12", etc.).
 *
 * Status flow:
 *   pending → reviewed (acknowledged but not yet acted on)
 *   pending|reviewed → accepted (will ship / will add to catalog)
 *   pending|reviewed → declined (won't act on)
 *   accepted → shipped (the feature/SKU is now live)
 */
export async function adminUpdateFeedbackStatus(
  id: string,
  status: "pending" | "reviewed" | "accepted" | "declined" | "shipped",
  adminNotes?: string,
): Promise<FeedbackResult> {
  const { requireAdmin, logAdminAction } = await import("@/lib/admin");
  const { serviceRoleClient } = await import("@/lib/supabase/admin");

  const admin = await requireAdmin();
  if (!admin) return { error: "Forbidden" };

  const sb = serviceRoleClient();
  const { error } = await sb
    .from("feedback")
    .update({
      status,
      admin_notes: adminNotes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: error.message };

  await logAdminAction(admin.id, "update_feedback_status", "feedback", id, {
    status,
    admin_notes: adminNotes,
  });
  revalidatePath("/admin/feedback");
  return { ok: true };
}

/**
 * Admin-only: turn a "set request" feedback row into a real SKU in
 * one click. Reads the payload (brand/set_name/sport/year/product),
 * generates a slug, calls adminCreateSku, marks the feedback row
 * shipped with the new SKU id, and notifies the requester (if they
 * were signed in when they submitted).
 *
 * Defaults — admin can edit afterward in /admin/catalog:
 *   - product field defaults to "Hobby Box" if not specified
 *   - release_date defaults to today (admin should update)
 *   - description, image_url, gradient: omitted (catalog has sane fallbacks)
 *
 * Returns the new SKU id + slug so the UI can link straight to its
 * edit page if the admin wants to upload an image.
 */
export async function adminApproveSetRequest(
  feedbackId: string,
): Promise<FeedbackResult & { sku_id?: string; slug?: string }> {
  const { requireAdmin, logAdminAction } = await import("@/lib/admin");
  const { serviceRoleClient } = await import("@/lib/supabase/admin");
  const { adminCreateSku } = await import("./admin");

  const admin = await requireAdmin();
  if (!admin) return { error: "Forbidden" };

  const sb = serviceRoleClient();
  const { data: row } = await sb
    .from("feedback")
    .select("id, type, payload, status, submitted_by, email")
    .eq("id", feedbackId)
    .maybeSingle();
  if (!row) return { error: "Feedback request not found." };
  if (row.type !== "set")
    return { error: "Only set requests can be approved this way." };
  if (row.status === "shipped")
    return { error: "Already added to the catalog." };

  const p = (row.payload ?? {}) as {
    brand?: string;
    set_name?: string;
    sport?: string;
    year?: string;
    product?: string;
    notes?: string;
  };
  const brand = (p.brand ?? "").trim();
  const setName = (p.set_name ?? "").trim();
  const sport = p.sport;
  const yearNum = parseInt(p.year ?? "", 10);
  const product = (p.product ?? "").trim() || "Hobby Box";

  if (!brand) return { error: "Request is missing brand — edit it first." };
  if (!setName)
    return { error: "Request is missing set name — edit it first." };
  if (!Number.isFinite(yearNum))
    return { error: "Request is missing a valid year." };
  if (
    sport !== "NBA" &&
    sport !== "MLB" &&
    sport !== "NFL" &&
    sport !== "NHL" &&
    sport !== "Pokemon" &&
    sport !== "Soccer"
  ) {
    return { error: "Request has an invalid sport — edit it first." };
  }

  const sportSegment =
    sport === "NBA"
      ? "basketball"
      : sport === "NFL"
        ? "football"
        : sport === "NHL"
          ? "hockey"
          : sport === "Soccer"
            ? "soccer"
            : sport === "Pokemon"
              ? "pokemon-tcg"
              : "baseball";
  const productSegment = product
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const slug = `${yearNum}-${brand} ${setName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    + `-${sportSegment}-${productSegment}`;

  const created = await adminCreateSku({
    slug,
    year: yearNum,
    brand,
    set_name: setName,
    product,
    sport,
    // Default release_date to today; admin should refine it. Keeping
    // it filled-in is better than null since release_date is non-null.
    release_date: new Date().toISOString().slice(0, 10),
    description: p.notes ? `Requested set. ${p.notes}` : undefined,
    is_published: false, // start unpublished so admin can review before it's live
  });
  if (created.error) return { error: created.error };

  const newSkuId = (created.data as { id?: string } | null)?.id ?? null;

  // Mark the feedback shipped with the SKU id in admin_notes.
  await sb
    .from("feedback")
    .update({
      status: "shipped",
      admin_notes: newSkuId ? `Created SKU ${slug} (${newSkuId})` : `Created SKU ${slug}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", feedbackId);

  // Notify the original requester if they're a signed-in user.
  if (row.submitted_by) {
    await sb.from("notifications").insert({
      user_id: row.submitted_by,
      type: "new-listing",
      title: "Your set request was added",
      body: `${yearNum} ${brand} ${setName} ${sport} is now in the catalog. We'll publish it once admin uploads a product image.`,
      href: `/product/${slug}`,
    });
  }

  await logAdminAction(admin.id, "approve_set_request", "feedback", feedbackId, {
    sku_slug: slug,
    sku_id: newSkuId,
  });
  revalidatePath("/admin/feedback");
  revalidatePath("/admin/catalog");
  return { ok: true, sku_id: newSkuId ?? undefined, slug };
}
