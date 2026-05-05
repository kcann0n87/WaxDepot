"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { serviceRoleClient } from "@/lib/supabase/admin";

export type ReviewResult = { ok?: boolean; error?: string };
export type Verdict = "positive" | "neutral" | "negative";

export async function leaveReview(formData: FormData): Promise<ReviewResult> {
  const orderId = String(formData.get("orderId") || "").trim();
  const verdict = String(formData.get("verdict") || "").trim() as Verdict;
  const itemAccuracy = parseInt(String(formData.get("itemAccuracy") || "0"), 10);
  const communication = parseInt(String(formData.get("communication") || "0"), 10);
  const shippingSpeed = parseInt(String(formData.get("shippingSpeed") || "0"), 10);
  const shippingCost = parseInt(String(formData.get("shippingCost") || "0"), 10);
  const text = String(formData.get("text") || "").trim().slice(0, 2000) || null;

  if (!orderId) return { error: "Missing order id." };
  if (!["positive", "neutral", "negative"].includes(verdict))
    return { error: "Pick an overall verdict." };
  for (const [k, v] of [
    ["item accuracy", itemAccuracy],
    ["communication", communication],
    ["shipping speed", shippingSpeed],
    ["shipping cost", shippingCost],
  ] as const) {
    if (!Number.isFinite(v) || v < 1 || v > 5)
      return { error: `Rate ${k} between 1 and 5 stars.` };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "You must be signed in." };

    const { data: order } = await supabase
      .from("orders")
      .select(
        "id, buyer_id, seller_id, sku_id, status, sku:skus!orders_sku_id_fkey(slug)",
      )
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return { error: "Order not found." };
    if (order.buyer_id !== user.id) return { error: "Only the buyer can review this order." };
    if (!["Released", "Completed"].includes(order.status))
      return { error: "You can only review after funds are released." };

    // One review per order — uniqueness is enforced at the DB level too.
    const { data: existing } = await supabase
      .from("reviews")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle();
    if (existing) return { error: "You already reviewed this order." };

    // Map verdict + ratings to a canonical 1-5 stars (avg of the four sub-ratings)
    const stars = Math.max(
      1,
      Math.min(
        5,
        Math.round((itemAccuracy + communication + shippingSpeed + shippingCost) / 4),
      ),
    );

    const { error } = await supabase.from("reviews").insert({
      reviewer_id: user.id,
      seller_id: order.seller_id,
      order_id: orderId,
      sku_id: order.sku_id,
      stars,
      verdict,
      item_accuracy: itemAccuracy,
      communication,
      shipping_speed: shippingSpeed,
      shipping_cost: shippingCost,
      text,
    });
    if (error) {
      if (error.code === "23505") return { error: "You already reviewed this order." };
      throw error;
    }

    // Notify the seller. Service role: buyer inserting a row owned by the
    // seller would otherwise be blocked by the auth.uid()=user_id RLS policy.
    const admin = serviceRoleClient();
    await admin.from("notifications").insert({
      user_id: order.seller_id,
      type: "new-message",
      title: "New review on your sale",
      body: `${
        verdict === "positive" ? "Positive" : verdict === "neutral" ? "Neutral" : "Negative"
      } review · ${stars}★. Reply to thank or address the feedback.`,
      href: `/account/orders/${orderId}`,
    });

    revalidatePath(`/account/orders/${orderId}`);
    const skuRel = Array.isArray(order.sku) ? order.sku[0] : order.sku;
    const slug = (skuRel as { slug?: string } | null)?.slug;
    if (slug) revalidatePath(`/product/${slug}`);
    // Refresh the seller's profile so the new review appears.
    const { data: sellerProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", order.seller_id)
      .maybeSingle();
    if (sellerProfile?.username) revalidatePath(`/seller/${sellerProfile.username}`);

    return { ok: true };
  } catch (e) {
    console.error("leaveReview failed:", e);
    return { error: "Could not post the review. Please try again." };
  }
}

export async function addSellerReply(formData: FormData): Promise<ReviewResult> {
  const reviewId = String(formData.get("reviewId") || "").trim();
  const text = String(formData.get("text") || "").trim().slice(0, 2000);

  if (!reviewId) return { error: "Missing review id." };
  if (!text) return { error: "Type a reply first." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "You must be signed in." };

    const { data: review } = await supabase
      .from("reviews")
      .select("id, seller_id, buyer_id, order_id")
      .eq("id", reviewId)
      .maybeSingle();
    if (!review) return { error: "Review not found." };
    if (review.seller_id !== user.id)
      return { error: "Only the seller can reply to this review." };

    const { error } = await supabase
      .from("reviews")
      .update({ seller_reply: text, seller_reply_at: new Date().toISOString() })
      .eq("id", reviewId);
    if (error) throw error;

    // Notify the buyer that the seller replied. Service role for the
    // cross-user write.
    const admin = serviceRoleClient();
    await admin.from("notifications").insert({
      user_id: review.buyer_id,
      type: "new-message",
      title: "Seller replied to your review",
      body:
        text.length > 100 ? `${text.slice(0, 97)}…` : text,
      href: review.order_id ? `/account/orders/${review.order_id}` : "/account",
    });

    const { data: sellerProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", review.seller_id)
      .maybeSingle();
    if (sellerProfile?.username) revalidatePath(`/seller/${sellerProfile.username}`);

    return { ok: true };
  } catch (e) {
    console.error("addSellerReply failed:", e);
    return { error: "Could not post the reply." };
  }
}
