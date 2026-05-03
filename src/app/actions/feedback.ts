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
    if (!["NBA", "MLB", "NFL", "NHL", "Pokemon"].includes(sport))
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
