"use server";

import { revalidatePath } from "next/cache";
import { stripe } from "@/lib/stripe";
import { requireAdmin, logAdminAction } from "@/lib/admin";
import { serviceRoleClient } from "@/lib/supabase/admin";
import { releaseOrderToSeller } from "@/app/actions/orders";

type Result = { ok?: boolean; error?: string; data?: unknown };

/**
 * Refund an order's charge in full. Updates the order to Canceled +
 * payment_status=refunded. Idempotent — refusing if a transfer has already
 * fired (use Stripe directly for that case).
 */
export async function adminRefundOrder(
  orderId: string,
  reason: string,
): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Forbidden" };
  if (!stripe) return { error: "Stripe not configured" };

  const sb = serviceRoleClient();
  const { data: order } = await sb
    .from("orders")
    .select("id, stripe_charge_id, stripe_transfer_id, payment_status, status, total_cents")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { error: "Order not found." };
  if (!order.stripe_charge_id) return { error: "No charge to refund." };
  if (order.stripe_transfer_id)
    return {
      error:
        "Order has been released to seller — refund via Stripe directly + recover from seller.",
    };
  if (order.payment_status === "refunded")
    return { error: "Already refunded." };

  try {
    const refund = await stripe.refunds.create({
      charge: order.stripe_charge_id,
      reason: "requested_by_customer",
      metadata: { admin_id: admin.id, admin_reason: reason },
    });
    await sb
      .from("orders")
      .update({
        payment_status: "refunded",
        status: "Canceled",
        canceled_at: new Date().toISOString(),
        cancel_reason: reason,
      })
      .eq("id", orderId);
    await logAdminAction(admin.id, "refund_order", "order", orderId, {
      reason,
      refund_id: refund.id,
      amount_cents: order.total_cents,
    });
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true, data: { refund_id: refund.id } };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("adminRefundOrder failed:", e);
    return { error: `Refund failed: ${message}` };
  }
}

/**
 * Force-release escrow to the seller (skips the 2-day wait, bypasses
 * buyer confirmation). Use when buyer is unresponsive or in a resolved
 * dispute that favors the seller.
 */
export async function adminForceReleaseOrder(
  orderId: string,
  reason: string,
): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Forbidden" };

  const result = await releaseOrderToSeller(orderId);
  if (result.error) return { error: result.error };

  await logAdminAction(admin.id, "force_release_order", "order", orderId, {
    reason,
  });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

/**
 * Force an order into the Delivered state. Sets `delivered_at = now()`,
 * which starts the 2-day auto-release clock — the buyer can either confirm
 * delivery (immediate release) or open a dispute. After 2 days the
 * /api/cron/auto-release job releases funds to the seller automatically.
 *
 * Useful when:
 *   - The carrier's delivery webhook didn't fire (lost in EasyPost)
 *   - The seller hand-delivered it and there's no tracking event
 *   - The buyer claims non-receipt but the package was clearly received
 *
 * Idempotent — safe to call on Delivered/Released/Completed orders (just
 * does nothing). Uses the same logic as buyer/seller markDelivered but
 * bypasses the "must be Shipped" check so admins can recover stuck orders.
 */
export async function adminMarkDelivered(
  orderId: string,
  reason: string,
): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Forbidden" };
  if (!reason.trim()) return { error: "Reason required for the audit log." };

  const sb = serviceRoleClient();
  const { data: order } = await sb
    .from("orders")
    .select("id, status, delivered_at, buyer_id, seller_id, sku:skus!orders_sku_id_fkey(year, brand, product)")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { error: "Order not found." };
  if (["Released", "Completed", "Canceled"].includes(order.status))
    return { error: `Order is already ${order.status}.` };
  if (order.status === "Delivered")
    return { error: "Order is already Delivered." };

  const now = new Date().toISOString();
  const { error } = await sb
    .from("orders")
    .update({ status: "Delivered", delivered_at: now })
    .eq("id", orderId);
  if (error) return { error: error.message };

  // Notify the buyer so they know the dispute window is now open.
  const skuRel = Array.isArray(order.sku) ? order.sku[0] : order.sku;
  const skuMeta = skuRel as
    | { year?: number; brand?: string; product?: string }
    | null;
  if (skuMeta) {
    await sb.from("notifications").insert({
      user_id: order.buyer_id,
      type: "order-delivered",
      title: "Marked delivered by support",
      body: `WaxDepot marked ${skuMeta.year} ${skuMeta.brand} ${skuMeta.product} delivered. Funds auto-release in 2 days unless you open a dispute.`,
      href: `/account/orders/${orderId}`,
    });
  }

  await logAdminAction(admin.id, "mark_delivered", "order", orderId, {
    reason,
    previous_status: order.status,
  });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

/**
 * Cancel an order without refunding (for orders that never charged, or
 * that already refunded but need status cleanup).
 */
export async function adminCancelOrder(
  orderId: string,
  reason: string,
): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Forbidden" };

  const sb = serviceRoleClient();
  const { error } = await sb
    .from("orders")
    .update({
      status: "Canceled",
      canceled_at: new Date().toISOString(),
      cancel_reason: reason,
    })
    .eq("id", orderId);
  if (error) return { error: error.message };

  await logAdminAction(admin.id, "cancel_order", "order", orderId, { reason });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

/**
 * Resolve a dispute. Outcomes:
 *   - refund_buyer: full refund to buyer, order canceled
 *   - release_seller: dispute dismissed, force-release escrow
 *   - partial: partial refund, remaining released to seller
 */
export async function adminResolveDispute(
  disputeId: string,
  outcome: "refund_buyer" | "release_seller" | "partial",
  notes: string,
  partialRefundCents?: number,
): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Forbidden" };

  const sb = serviceRoleClient();
  const { data: dispute } = await sb
    .from("disputes")
    .select("id, order_id, status")
    .eq("id", disputeId)
    .maybeSingle();
  if (!dispute) return { error: "Dispute not found." };
  if (dispute.status === "Resolved")
    return { error: "Dispute already resolved." };

  let actionResult: Result;
  if (outcome === "refund_buyer") {
    actionResult = await adminRefundOrder(dispute.order_id, `dispute ${disputeId}: ${notes}`);
  } else if (outcome === "release_seller") {
    actionResult = await adminForceReleaseOrder(
      dispute.order_id,
      `dispute ${disputeId}: ${notes}`,
    );
  } else {
    // Partial — issue partial refund, release remainder
    if (!stripe) return { error: "Stripe not configured" };
    if (!partialRefundCents || partialRefundCents <= 0)
      return { error: "Specify partialRefundCents > 0" };
    const { data: order } = await sb
      .from("orders")
      .select("stripe_charge_id, total_cents")
      .eq("id", dispute.order_id)
      .maybeSingle();
    if (!order?.stripe_charge_id) return { error: "No charge to refund." };
    if (partialRefundCents >= order.total_cents)
      return { error: "Partial refund must be less than total." };
    try {
      const refund = await stripe.refunds.create({
        charge: order.stripe_charge_id,
        amount: partialRefundCents,
        reason: "requested_by_customer",
        metadata: { admin_id: admin.id, dispute_id: disputeId },
      });
      // Release remainder to seller (the existing release logic handles
      // tier-fee math on the remaining amount via the charge's net).
      const release = await releaseOrderToSeller(dispute.order_id);
      actionResult = { ok: true, data: { refund_id: refund.id, release } };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { error: `Partial refund failed: ${message}` };
    }
  }

  if (actionResult.error) return actionResult;

  await sb
    .from("disputes")
    .update({
      status: "Resolved",
      resolution: outcome,
      resolved_at: new Date().toISOString(),
      admin_notes: notes,
    })
    .eq("id", disputeId);

  await logAdminAction(admin.id, `resolve_dispute_${outcome}`, "dispute", disputeId, {
    notes,
    partialRefundCents,
  });
  revalidatePath("/admin/disputes");
  revalidatePath(`/admin/disputes/${disputeId}`);
  return { ok: true };
}

/**
 * Create a new SKU in the catalog.
 */
export async function adminCreateSku(input: {
  slug: string;
  year: number;
  brand: string;
  set_name: string;
  product: string;
  sport: "NBA" | "MLB" | "NFL" | "NHL" | "Pokemon" | "Soccer";
  release_date: string;
  description?: string;
  image_url?: string;
  gradient_from?: string;
  gradient_to?: string;
  is_published?: boolean;
}): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Forbidden" };

  const sb = serviceRoleClient();
  const { data, error } = await sb
    .from("skus")
    .insert({
      slug: input.slug,
      year: input.year,
      brand: input.brand,
      set_name: input.set_name,
      product: input.product,
      sport: input.sport,
      release_date: input.release_date,
      description: input.description ?? "",
      image_url: input.image_url ?? null,
      gradient_from: input.gradient_from ?? "#475569",
      gradient_to: input.gradient_to ?? "#0f172a",
      is_published: input.is_published ?? true,
    })
    .select("id, slug")
    .maybeSingle();
  if (error) return { error: error.message };

  await logAdminAction(admin.id, "create_sku", "sku", data?.id ?? input.slug, {
    slug: input.slug,
  });
  revalidatePath("/admin/catalog");
  return { ok: true, data };
}

/**
 * Update an existing SKU (any subset of fields).
 */
export async function adminUpdateSku(
  id: string,
  patch: Partial<{
    year: number;
    brand: string;
    set_name: string;
    product: string;
    sport: "NBA" | "MLB" | "NFL" | "NHL" | "Pokemon" | "Soccer";
    release_date: string;
    description: string;
    image_url: string | null | undefined;
    gradient_from: string;
    gradient_to: string;
    is_published: boolean;
  }>,
): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Forbidden" };

  const sb = serviceRoleClient();
  const { error } = await sb.from("skus").update(patch).eq("id", id);
  if (error) return { error: error.message };

  await logAdminAction(admin.id, "update_sku", "sku", id, { patch });
  revalidatePath("/admin/catalog");
  revalidatePath(`/admin/catalog/${id}`);
  return { ok: true };
}

/**
 * Upload an image to the public `product-images` Supabase Storage bucket and
 * return its public URL. Caller (the SKU form) decides what to do with the
 * URL — typically pasting it into the form's image_url field, or saving it
 * straight to the SKU.
 *
 * The slug is used as the path key so re-uploads replace the existing file
 * and the URL stays stable across edits. A short timestamp suffix is added
 * so CDN caches drop the old version when admins replace an image.
 */
export async function adminUploadSkuImage(
  formData: FormData,
): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Forbidden" };

  const file = formData.get("file");
  const slug = String(formData.get("slug") || "").trim().toLowerCase();
  const skuId = String(formData.get("skuId") || "").trim() || null;

  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug))
    return { error: "Slug is required (lowercase, hyphens only)." };
  if (!(file instanceof File))
    return { error: "No file received." };
  if (file.size === 0) return { error: "File is empty." };
  if (file.size > 5 * 1024 * 1024)
    return { error: "Max 5MB per image." };

  const allowed = new Map<string, string>([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
  ]);
  const ext = allowed.get(file.type);
  if (!ext) return { error: "Use JPG, PNG, or WebP." };

  // Add a short timestamp so the public URL changes whenever the admin
  // re-uploads — clients can't see a stale CDN copy.
  const stamp = Date.now().toString(36);
  const path = `${slug}-${stamp}.${ext}`;

  const sb = serviceRoleClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await sb.storage
    .from("product-images")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
      cacheControl: "31536000",
    });
  if (uploadErr) {
    console.error("adminUploadSkuImage upload failed:", uploadErr);
    return { error: `Upload failed: ${uploadErr.message}` };
  }

  const { data: pub } = sb.storage.from("product-images").getPublicUrl(path);
  const publicUrl = pub.publicUrl;
  if (!publicUrl) return { error: "Could not derive public URL." };

  // If a skuId was provided, persist immediately so the SKU is updated even
  // if the admin closes the form before clicking Save.
  if (skuId) {
    const { error: updateErr } = await sb
      .from("skus")
      .update({ image_url: publicUrl })
      .eq("id", skuId);
    if (updateErr) {
      console.error("adminUploadSkuImage skus update failed:", updateErr);
      return { error: `Saved file but couldn't update SKU: ${updateErr.message}` };
    }
    revalidatePath("/admin/catalog");
    revalidatePath(`/admin/catalog/${skuId}`);
  }

  await logAdminAction(admin.id, "upload_sku_image", "sku", skuId ?? slug, {
    slug,
    path,
    size_bytes: file.size,
    type: file.type,
  });

  return { ok: true, data: { publicUrl, path } };
}

/**
 * Delete a SKU. Refuses if any listings reference it.
 */
export async function adminDeleteSku(id: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Forbidden" };

  const sb = serviceRoleClient();
  const { count } = await sb
    .from("listings")
    .select("*", { count: "exact", head: true })
    .eq("sku_id", id);
  if ((count ?? 0) > 0)
    return { error: `Cannot delete: ${count} active listing(s) reference this SKU.` };

  const { error } = await sb.from("skus").delete().eq("id", id);
  if (error) return { error: error.message };

  await logAdminAction(admin.id, "delete_sku", "sku", id);
  revalidatePath("/admin/catalog");
  return { ok: true };
}

/**
 * Send a Supabase magic-link invite to an email address. The invitee gets
 * an email with a link that signs them in and lands them at NEXT_PUBLIC_SITE_URL
 * (or localhost in dev). On first sign-in the handle_new_user trigger
 * creates their profile with username derived from email + display_name
 * from the metadata we pass here.
 *
 * Used while we're invite-only — public /signup is gated by middleware.
 */
export async function adminInviteUser(input: {
  email: string;
  displayName?: string;
}): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Forbidden" };

  const email = input.email.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }

  const sb = serviceRoleClient();

  // Reject if there's already an auth user for this email — better to
  // surface the duplicate than silently send another invite.
  const { data: existing } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (existing?.users.some((u) => u.email?.toLowerCase() === email)) {
    return { error: "An account with that email already exists." };
  }

  const redirectTo =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  const { data, error } = await sb.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${redirectTo}/account`,
    data: input.displayName
      ? { display_name: input.displayName.trim() }
      : undefined,
  });
  if (error) return { error: error.message };

  await logAdminAction(admin.id, "invite_user", "user", data.user?.id ?? email, {
    email,
    display_name: input.displayName ?? null,
  });
  revalidatePath("/admin/invite");
  revalidatePath("/admin/users");
  return { ok: true, data: { user_id: data.user?.id ?? null, email } };
}

/**
 * Bulk-invite the next N pending waitlist entries (oldest first — first
 * sign-up gets in first). Caps at 25 per run because Supabase rate-limits
 * inviteUserByEmail. Returns counts so the admin can see what happened
 * without scrolling through individual toasts.
 *
 * Skips emails that already have an auth user (duplicate-invite check
 * baked into adminInviteUser handles this safely; we just count it as
 * "skipped" instead of "failed").
 */
export async function adminInviteBatchPending(
  maxCount = 25,
): Promise<Result & { sent?: number; skipped?: number; failed?: number }> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Forbidden" };

  const cap = Math.max(1, Math.min(50, Math.floor(maxCount)));
  const sb = serviceRoleClient();

  // Build the same invitedAt set the waitlist page uses, then take the
  // oldest N pending emails. Service role to bypass RLS for the cross-
  // user reads.
  const [{ data: waitlist }, { data: inviteLogs }, usersList] = await Promise.all([
    sb
      .from("waitlist")
      .select("email, created_at")
      .order("created_at", { ascending: true }),
    sb
      .from("admin_actions")
      .select("details")
      .eq("action", "invite_user"),
    sb.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const invitedEmails = new Set(
    (inviteLogs ?? [])
      .map((r) => (r.details as { email?: string } | null)?.email?.toLowerCase())
      .filter((e): e is string => !!e),
  );
  const existingAuthEmails = new Set(
    (usersList.data?.users ?? [])
      .map((u) => u.email?.toLowerCase())
      .filter((e): e is string => !!e),
  );

  const pending = (waitlist ?? [])
    .map((w) => w.email)
    .filter(
      (email) =>
        !invitedEmails.has(email.toLowerCase()) &&
        !existingAuthEmails.has(email.toLowerCase()),
    )
    .slice(0, cap);

  if (pending.length === 0) {
    return { ok: true, sent: 0, skipped: 0, failed: 0 };
  }

  const redirectTo =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  let sent = 0;
  let failed = 0;
  for (const rawEmail of pending) {
    const email = rawEmail.trim().toLowerCase();
    try {
      const { data, error } = await sb.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${redirectTo}/account`,
      });
      if (error) {
        failed++;
        console.error("adminInviteBatchPending invite failed:", email, error);
        continue;
      }
      await logAdminAction(
        admin.id,
        "invite_user",
        "user",
        data.user?.id ?? email,
        { email, display_name: null, batch: true },
      );
      sent++;
    } catch (e) {
      failed++;
      console.error("adminInviteBatchPending threw:", email, e);
    }
  }

  revalidatePath("/admin/waitlist");
  revalidatePath("/admin/invite");
  revalidatePath("/admin");
  return { ok: true, sent, skipped: 0, failed };
}
