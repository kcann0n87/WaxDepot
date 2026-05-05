"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { serviceRoleClient } from "@/lib/supabase/admin";
import { emailDisputeOpened } from "@/lib/email";

export type SubmitDisputeResult = { ok?: boolean; error?: string; disputeId?: string };

function newDisputeId() {
  return `DSP-${Math.floor(1000 + Math.random() * 9000)}`;
}

const VALID_OUTCOMES = new Set(["refund", "replacement", "partial"]);

export async function submitDispute(formData: FormData): Promise<SubmitDisputeResult> {
  const orderId = String(formData.get("orderId") || "").trim();
  const reason = String(formData.get("reason") || "").trim().slice(0, 100);
  const description = String(formData.get("description") || "").trim().slice(0, 4000);
  const outcome = String(formData.get("outcome") || "").trim();
  const photoCount = parseInt(String(formData.get("photoCount") || "0"), 10) || 0;

  if (!orderId) return { error: "Missing order id." };
  if (!reason) return { error: "Pick a reason." };
  if (description.length < 30)
    return { error: "Add more detail — at least 30 characters helps support resolve faster." };
  if (!VALID_OUTCOMES.has(outcome)) return { error: "Pick a preferred outcome." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "You must be signed in." };

    const { data: order } = await supabase
      .from("orders")
      .select(
        "id, buyer_id, seller_id, status, sku:skus!orders_sku_id_fkey(year, brand, product)",
      )
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return { error: "Order not found." };
    if (order.buyer_id !== user.id)
      return { error: "Only the buyer of an order can open a dispute on it." };
    if (["Released", "Completed", "Canceled"].includes(order.status))
      return { error: `Cannot dispute a ${order.status} order.` };

    // Don't allow a second open dispute on the same order.
    const { data: existing } = await supabase
      .from("disputes")
      .select("id, status")
      .eq("order_id", orderId)
      .maybeSingle();
    if (existing && !existing.status.startsWith("Resolved"))
      return { error: "There's already an open dispute on this order." };

    let disputeId = newDisputeId();
    let { error } = await supabase.from("disputes").insert({
      id: disputeId,
      order_id: orderId,
      reporter_id: user.id,
      reason,
      description,
      preferred_outcome: outcome,
      photo_count: photoCount,
      status: "Awaiting seller",
    });
    if (error && error.code === "23505") {
      // PK collision — retry once.
      disputeId = newDisputeId();
      const retry = await supabase.from("disputes").insert({
        id: disputeId,
        order_id: orderId,
        reporter_id: user.id,
        reason,
        description,
        preferred_outcome: outcome,
        photo_count: photoCount,
        status: "Awaiting seller",
      });
      error = retry.error;
    }
    if (error) {
      console.error("submitDispute insert failed:", error);
      return { error: "Could not file the dispute. Please try again." };
    }

    // Notify the seller. Service role because we're inserting on behalf
    // of a different user (the seller) and RLS would block self-only writes.
    const admin = serviceRoleClient();
    await admin.from("notifications").insert({
      user_id: order.seller_id,
      type: "new-message",
      title: "Dispute opened on your sale",
      body: `${disputeId} — buyer reports "${reason}". You have 48 hours to respond.`,
      href: `/account/orders/${orderId}`,
    });

    // Email the seller. Best-effort — failures don't roll back the dispute.
    try {
      const { data: sellerAuth } = await admin.auth.admin.getUserById(
        order.seller_id,
      );
      if (sellerAuth?.user?.email) {
        const skuRel = Array.isArray(order.sku) ? order.sku[0] : order.sku;
        const productTitle = skuRel
          ? `${skuRel.year} ${skuRel.brand} ${skuRel.product}`
          : `order ${orderId}`;
        await emailDisputeOpened({
          to: sellerAuth.user.email,
          productTitle,
          reason,
          disputeId,
          orderHref: `https://waxdepot.io/account/orders/${orderId}`,
        });
      }
    } catch (e) {
      console.error("emailDisputeOpened failed:", e);
    }

    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath("/account/disputes");
    revalidatePath("/account");

    return { ok: true, disputeId };
  } catch (e) {
    console.error("submitDispute failed:", e);
    return { error: "Something went wrong. Please try again." };
  }
}
