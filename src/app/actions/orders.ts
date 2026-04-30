"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok?: boolean; error?: string; orderId?: string };

function newOrderId() {
  return `WM-${Math.floor(100000 + Math.random() * 900000)}`;
}

/**
 * Seller accepts a buyer's bid. Matches the bid against the seller's lowest-
 * priced active listing for the SKU, creates an order at the bid price,
 * decrements (or marks Sold) the listing, marks the bid Won, and notifies the
 * buyer.
 *
 * Note: ship-to address is left as placeholder strings until Stripe Checkout
 * is wired (Stripe Checkout captures address during payment). Order page shows
 * a banner about this until the buyer provides an address.
 */
export async function acceptBid(formData: FormData): Promise<ActionResult> {
  const bidId = String(formData.get("bidId") || "").trim();
  if (!bidId) return { error: "Missing bid id." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "You must be signed in." };

    const { data: bid } = await supabase
      .from("bids")
      .select(
        "id, sku_id, buyer_id, price_cents, status, sku:skus!bids_sku_id_fkey(slug, year, brand, product)",
      )
      .eq("id", bidId)
      .maybeSingle();
    if (!bid) return { error: "Bid not found." };
    if (bid.status !== "Active") return { error: "That bid isn't active anymore." };

    // Find the seller's lowest-priced active listing for this SKU.
    const { data: listing } = await supabase
      .from("listings")
      .select("*")
      .eq("seller_id", user.id)
      .eq("sku_id", bid.sku_id)
      .eq("status", "Active")
      .order("price_cents", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!listing) return { error: "You no longer have an active listing for this product." };

    const buyerProfile = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", bid.buyer_id)
      .maybeSingle();

    const sellerProfile = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", user.id)
      .maybeSingle();

    // Generate a unique order id, retrying once on the rare collision.
    let orderId = newOrderId();
    let totalCents = bid.price_cents + listing.shipping_cents;
    const orderInsert = {
      id: orderId,
      buyer_id: bid.buyer_id,
      seller_id: user.id,
      listing_id: listing.id,
      sku_id: bid.sku_id,
      qty: 1,
      price_cents: bid.price_cents,
      shipping_cents: listing.shipping_cents,
      tax_cents: 0,
      total_cents: totalCents,
      card_last4: null,
      status: "Charged" as const,
      // Placeholder ship-to until Stripe Checkout captures real address.
      ship_to_name: buyerProfile.data?.display_name ?? "Buyer",
      ship_to_addr1: "ADDRESS_PENDING",
      ship_to_city: "PENDING",
      ship_to_state: "XX",
      ship_to_zip: "00000",
    };

    let { error: orderErr } = await supabase.from("orders").insert(orderInsert);
    if (orderErr && orderErr.code === "23505") {
      // PK collision — retry once with a new id.
      orderId = newOrderId();
      totalCents = bid.price_cents + listing.shipping_cents;
      const retry = await supabase
        .from("orders")
        .insert({ ...orderInsert, id: orderId });
      orderErr = retry.error;
    }
    if (orderErr) {
      console.error("acceptBid order insert failed:", orderErr);
      return { error: "Could not create the order." };
    }

    // Mark this bid as Won; mark all OTHER active bids on this SKU at this
    // buyer's price or below as Outbid (so only one wins).
    await supabase.from("bids").update({ status: "Won" }).eq("id", bid.id);

    // Decrement listing qty or mark Sold when qty reaches 0.
    if (listing.quantity > 1) {
      await supabase
        .from("listings")
        .update({ quantity: listing.quantity - 1, updated_at: new Date().toISOString() })
        .eq("id", listing.id);
    } else {
      await supabase
        .from("listings")
        .update({ status: "Sold", updated_at: new Date().toISOString() })
        .eq("id", listing.id);
    }

    // Notify the buyer.
    const skuRel = Array.isArray(bid.sku) ? bid.sku[0] : bid.sku;
    const skuMeta = skuRel as { slug?: string; year?: number; brand?: string; product?: string } | null;
    if (skuMeta) {
      await supabase.from("notifications").insert({
        user_id: bid.buyer_id,
        type: "bid-accepted",
        title: "Your bid was accepted",
        body: `${sellerProfile.data?.display_name ?? "The seller"} accepted your $${(bid.price_cents / 100).toFixed(0)} bid on ${skuMeta.year} ${skuMeta.brand} ${skuMeta.product}. Order ${orderId} is open.`,
        href: `/account/orders/${orderId}`,
      });
    }

    revalidatePath(`/account/listings/${listing.id}`);
    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath("/account");
    if (skuMeta?.slug) revalidatePath(`/product/${skuMeta.slug}`);

    return { ok: true, orderId };
  } catch (e) {
    console.error("acceptBid failed:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function declineBid(formData: FormData): Promise<ActionResult> {
  const bidId = String(formData.get("bidId") || "").trim();
  if (!bidId) return { error: "Missing bid id." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "You must be signed in." };

    const { data: bid } = await supabase
      .from("bids")
      .select(
        "id, sku_id, buyer_id, price_cents, status, sku:skus!bids_sku_id_fkey(slug, year, brand, product)",
      )
      .eq("id", bidId)
      .maybeSingle();
    if (!bid) return { error: "Bid not found." };

    // Verify the seller has an active listing on this SKU (so they have
    // standing to decline).
    const { data: listing } = await supabase
      .from("listings")
      .select("id")
      .eq("seller_id", user.id)
      .eq("sku_id", bid.sku_id)
      .eq("status", "Active")
      .limit(1)
      .maybeSingle();
    if (!listing) return { error: "You don't have an active listing on this product." };

    await supabase.from("bids").update({ status: "Outbid" }).eq("id", bid.id);

    const skuRel = Array.isArray(bid.sku) ? bid.sku[0] : bid.sku;
    const skuMeta = skuRel as { slug?: string; year?: number; brand?: string; product?: string } | null;
    if (skuMeta) {
      await supabase.from("notifications").insert({
        user_id: bid.buyer_id,
        type: "outbid",
        title: "Bid declined",
        body: `Your $${(bid.price_cents / 100).toFixed(0)} bid on ${skuMeta.year} ${skuMeta.brand} ${skuMeta.product} was declined. You can re-bid at a higher price.`,
        href: skuMeta.slug ? `/product/${skuMeta.slug}` : "/account",
      });
    }

    revalidatePath(`/account/listings/${listing.id}`);
    revalidatePath("/account");
    return { ok: true };
  } catch (e) {
    console.error("declineBid failed:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function markShipped(formData: FormData): Promise<ActionResult> {
  const orderId = String(formData.get("orderId") || "").trim();
  const carrier = String(formData.get("carrier") || "").trim();
  const tracking = String(formData.get("tracking") || "").trim();

  if (!orderId) return { error: "Missing order id." };
  if (!carrier) return { error: "Pick a carrier." };
  if (tracking.length < 8) return { error: "Tracking number looks too short." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "You must be signed in." };

    const { data: order } = await supabase
      .from("orders")
      .select(
        "id, seller_id, buyer_id, status, sku:skus!orders_sku_id_fkey(slug, year, brand, product)",
      )
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return { error: "Order not found." };
    if (order.seller_id !== user.id) return { error: "This isn't your order to ship." };
    if (!["Charged", "InEscrow"].includes(order.status))
      return { error: `Order is already ${order.status}.` };

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("orders")
      .update({
        status: "Shipped",
        carrier,
        tracking,
        shipped_at: now,
      })
      .eq("id", orderId);
    if (error) throw error;

    const skuRel = Array.isArray(order.sku) ? order.sku[0] : order.sku;
    const skuMeta = skuRel as { slug?: string; year?: number; brand?: string; product?: string } | null;
    if (skuMeta) {
      await supabase.from("notifications").insert({
        user_id: order.buyer_id,
        type: "order-shipped",
        title: "Your order shipped",
        body: `${skuMeta.year} ${skuMeta.brand} ${skuMeta.product} · ${carrier} · ${tracking}`,
        href: `/account/orders/${orderId}`,
      });
    }

    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath("/account");
    return { ok: true, orderId };
  } catch (e) {
    console.error("markShipped failed:", e);
    return { error: "Could not save tracking. Please try again." };
  }
}

export async function confirmDelivery(formData: FormData): Promise<ActionResult> {
  const orderId = String(formData.get("orderId") || "").trim();
  if (!orderId) return { error: "Missing order id." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "You must be signed in." };

    const { data: order } = await supabase
      .from("orders")
      .select(
        "id, buyer_id, seller_id, status, total_cents, sku:skus!orders_sku_id_fkey(year, brand, product)",
      )
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return { error: "Order not found." };
    if (order.buyer_id !== user.id) return { error: "Only the buyer can confirm delivery." };
    if (!["Shipped", "Delivered"].includes(order.status))
      return { error: `Cannot confirm — order is ${order.status}.` };

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("orders")
      .update({
        status: "Released",
        delivered_at: order.status === "Delivered" ? undefined : now,
        released_at: now,
      })
      .eq("id", orderId);
    if (error) throw error;

    const skuRel = Array.isArray(order.sku) ? order.sku[0] : order.sku;
    const skuMeta = skuRel as { year?: number; brand?: string; product?: string } | null;
    if (skuMeta) {
      await supabase.from("notifications").insert({
        user_id: order.seller_id,
        type: "payout-sent",
        title: "Funds released",
        body: `Buyer confirmed ${skuMeta.year} ${skuMeta.brand} ${skuMeta.product} arrived sealed. $${(order.total_cents / 100).toFixed(2)} released to your pending balance.`,
        href: `/account/orders/${orderId}`,
      });
    }

    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath("/account");
    return { ok: true };
  } catch (e) {
    console.error("confirmDelivery failed:", e);
    return { error: "Could not confirm delivery. Please try again." };
  }
}

export async function cancelOrder(formData: FormData): Promise<ActionResult> {
  const orderId = String(formData.get("orderId") || "").trim();
  const reason = String(formData.get("reason") || "").trim().slice(0, 200) || null;
  if (!orderId) return { error: "Missing order id." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "You must be signed in." };

    const { data: order } = await supabase
      .from("orders")
      .select("id, buyer_id, seller_id, status, listing_id")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return { error: "Order not found." };
    if (order.buyer_id !== user.id && order.seller_id !== user.id)
      return { error: "Not your order." };
    // Once shipped, cancellations require a dispute, not a unilateral cancel.
    if (!["Charged", "InEscrow"].includes(order.status))
      return { error: `Order is ${order.status} — open a dispute instead.` };

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("orders")
      .update({
        status: "Canceled",
        canceled_at: now,
        cancel_reason: reason,
      })
      .eq("id", orderId);
    if (error) throw error;

    // Re-open the listing if there was one (give seller back the inventory).
    if (order.listing_id) {
      const { data: listing } = await supabase
        .from("listings")
        .select("status, quantity")
        .eq("id", order.listing_id)
        .maybeSingle();
      if (listing) {
        await supabase
          .from("listings")
          .update({
            status: "Active",
            quantity: listing.quantity + 1,
          })
          .eq("id", order.listing_id);
      }
    }

    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath("/account");
    return { ok: true };
  } catch (e) {
    console.error("cancelOrder failed:", e);
    return { error: "Could not cancel. Please try again." };
  }
}
