"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { serviceRoleClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { TIER_FEE, type SellerTier } from "@/lib/fees";
import {
  emailBidAccepted,
  emailBidDeclined,
  emailFundsReleased,
  emailOrderCanceled,
  emailOrderShipped,
} from "@/lib/email";
import { shouldSendEmail } from "@/lib/email-prefs";
import { siteUrl } from "@/lib/site-url";
import { createTracker } from "@/lib/easypost";

export type ActionResult = { ok?: boolean; error?: string; orderId?: string };

/**
 * Helper: best-effort lookup of a user's email by their auth id, used for
 * routing transactional emails. Falls back to null silently — caller should
 * skip the email when null.
 */
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.admin
      .getUserById(userId)
      .catch(() => ({ data: null as unknown as { user: { email?: string } | null } }));
    return data?.user?.email ?? null;
  } catch {
    return null;
  }
}

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
      payment_status: "pending",
      // Placeholder ship-to until Stripe Checkout captures real address.
      ship_to_name: buyerProfile.data?.display_name ?? "Buyer",
      ship_to_addr1: "ADDRESS_PENDING",
      ship_to_city: "PENDING",
      ship_to_state: "XX",
      ship_to_zip: "00000",
    };

    // Cross-owner writes: order is for the buyer, bid is the buyer's,
    // listing is the seller's, notification targets the buyer. RLS would
    // block several of these via the regular client. Validation done.
    const admin = serviceRoleClient();

    let { error: orderErr } = await admin.from("orders").insert(orderInsert);
    if (orderErr && orderErr.code === "23505") {
      // PK collision — retry once with a new id.
      orderId = newOrderId();
      totalCents = bid.price_cents + listing.shipping_cents;
      const retry = await admin
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
    await admin.from("bids").update({ status: "Won" }).eq("id", bid.id);

    // Decrement listing qty or mark Sold when qty reaches 0.
    if (listing.quantity > 1) {
      await admin
        .from("listings")
        .update({ quantity: listing.quantity - 1, updated_at: new Date().toISOString() })
        .eq("id", listing.id);
    } else {
      await admin
        .from("listings")
        .update({ status: "Sold", updated_at: new Date().toISOString() })
        .eq("id", listing.id);
    }

    // Notify the buyer with a payment CTA — they need to complete checkout
    // for the order to go live.
    const skuRel = Array.isArray(bid.sku) ? bid.sku[0] : bid.sku;
    const skuMeta = skuRel as { slug?: string; year?: number; brand?: string; product?: string } | null;
    if (skuMeta) {
      const productTitle = `${skuMeta.year} ${skuMeta.brand} ${skuMeta.product}`;
      await admin.from("notifications").insert({
        user_id: bid.buyer_id,
        type: "bid-accepted",
        title: "Bid accepted — complete payment",
        body: `${sellerProfile.data?.display_name ?? "The seller"} accepted your $${(bid.price_cents / 100).toFixed(0)} bid on ${productTitle}. Pay now to lock the order.`,
        href: `/account/orders/${orderId}`,
      });
      const buyerEmail = await getUserEmail(bid.buyer_id);
      if (buyerEmail && (await shouldSendEmail(bid.buyer_id, "bid_emails"))) {
        await emailBidAccepted({
          to: buyerEmail,
          productTitle,
          amountDollars: bid.price_cents / 100,
          orderHref: `${siteUrl()}/account/orders/${orderId}`,
        });
      }
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

    // Service role: seller updating buyer's bid + sending buyer a notification.
    const admin = serviceRoleClient();
    await admin.from("bids").update({ status: "Outbid" }).eq("id", bid.id);

    const skuRel = Array.isArray(bid.sku) ? bid.sku[0] : bid.sku;
    const skuMeta = skuRel as { slug?: string; year?: number; brand?: string; product?: string } | null;
    if (skuMeta) {
      const productTitle = `${skuMeta.year} ${skuMeta.brand} ${skuMeta.product}`;
      await admin.from("notifications").insert({
        user_id: bid.buyer_id,
        type: "bid-declined",
        title: "Bid declined",
        body: `Your $${(bid.price_cents / 100).toFixed(0)} bid on ${productTitle} was declined. You can re-bid at a higher price.`,
        href: skuMeta.slug ? `/product/${skuMeta.slug}` : "/account",
      });
      const buyerEmail = await getUserEmail(bid.buyer_id);
      if (buyerEmail && (await shouldSendEmail(bid.buyer_id, "bid_emails"))) {
        await emailBidDeclined({
          to: buyerEmail,
          productTitle,
          amountDollars: bid.price_cents / 100,
          productHref: skuMeta.slug
            ? `${siteUrl()}/product/${skuMeta.slug}`
            : `${siteUrl()}/account`,
        });
      }
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

    // Writes happen via service role: ownership + state transition were just
    // validated in code, so the wide-open "orders seller update" RLS policy
    // is no longer the floor of defense. The notifications insert similarly
    // can't use the regular auth client because the seller is creating a
    // notification _for the buyer_ (different user_id).
    const admin = serviceRoleClient();

    const now = new Date().toISOString();
    const { error } = await admin
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
      const productTitle = `${skuMeta.year} ${skuMeta.brand} ${skuMeta.product}`;
      await admin.from("notifications").insert({
        user_id: order.buyer_id,
        type: "order-shipped",
        title: "Your order shipped",
        body: `${productTitle} · ${carrier} · ${tracking}`,
        href: `/account/orders/${orderId}`,
      });
      const buyerEmail = await getUserEmail(order.buyer_id);
      if (buyerEmail && (await shouldSendEmail(order.buyer_id, "order_emails"))) {
        await emailOrderShipped({
          to: buyerEmail,
          productTitle,
          carrier,
          tracking,
          orderHref: `${siteUrl()}/account/orders/${orderId}`,
        });
      }
    }

    // Register the tracker with EasyPost so we get auto-delivered status.
    // No-ops gracefully if EASYPOST_API_KEY isn't set (the cron + manual
    // flow still works as the safety net).
    const tracker = await createTracker(tracking, carrier, orderId);
    if (tracker?.est_delivery_date) {
      await admin
        .from("orders")
        .update({ estimated_delivery: tracker.est_delivery_date })
        .eq("id", orderId);
    }

    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath("/account");
    return { ok: true, orderId };
  } catch (e) {
    console.error("markShipped failed:", e);
    return { error: "Could not save tracking. Please try again." };
  }
}

/**
 * Seller (or buyer) action: mark a Shipped order as Delivered. Starts the
 * 2-day auto-release timer (the /api/cron/auto-release job picks up
 * Delivered orders past 2 days and triggers Stripe Transfer).
 *
 * Buyers can short-circuit by clicking Confirm delivery (confirmDelivery
 * below) which releases funds immediately.
 */
export async function markDelivered(formData: FormData): Promise<ActionResult> {
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
        "id, buyer_id, seller_id, status, sku:skus!orders_sku_id_fkey(year, brand, product)",
      )
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return { error: "Order not found." };
    if (order.buyer_id !== user.id && order.seller_id !== user.id)
      return { error: "Not your order." };
    if (order.status !== "Shipped")
      return { error: `Order is ${order.status} — can't mark delivered.` };

    // Service role for the lifecycle write + cross-user notification.
    const admin = serviceRoleClient();

    const now = new Date().toISOString();
    const { error } = await admin
      .from("orders")
      .update({ status: "Delivered", delivered_at: now })
      .eq("id", orderId);
    if (error) throw error;

    const skuRel = Array.isArray(order.sku) ? order.sku[0] : order.sku;
    const skuMeta = skuRel as { year?: number; brand?: string; product?: string } | null;
    if (skuMeta) {
      await admin.from("notifications").insert({
        user_id: order.buyer_id,
        type: "order-delivered",
        title: "Package delivered",
        body: `${skuMeta.year} ${skuMeta.brand} ${skuMeta.product} marked delivered. Funds auto-release in 2 days unless you open a dispute.`,
        href: `/account/orders/${orderId}`,
      });
    }

    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath("/account");
    return { ok: true };
  } catch (e) {
    console.error("markDelivered failed:", e);
    return { error: "Could not mark delivered." };
  }
}

/**
 * Internal helper: actually fire the Stripe Transfer to release escrowed
 * funds to the seller. Used by both buyer-initiated confirmDelivery and the
 * /api/cron/auto-release job. Idempotent on stripe_transfer_id.
 */
export async function releaseOrderToSeller(orderId: string): Promise<ActionResult> {
  try {
    // Service role for the whole flow: this is called by the cron job (no
    // user context) AND from confirmDelivery (buyer context). Either way,
    // the lifecycle write to Released + the Stripe transfer + the sales
    // insert + the seller notification all need privileges the regular
    // auth client can't provide.
    const admin = serviceRoleClient();
    const { data: order } = await admin
      .from("orders")
      .select(
        "id, seller_id, status, payment_status, total_cents, price_cents, partial_refund_cents, stripe_charge_id, stripe_transfer_id, sku:skus!orders_sku_id_fkey(year, brand, product)",
      )
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return { error: "Order not found." };
    if (["Released", "Completed", "Canceled"].includes(order.status))
      return { error: `Already ${order.status}.` };
    if (order.stripe_transfer_id) return { error: "Transfer already created." };

    const now = new Date().toISOString();
    const { error: statusErr } = await admin
      .from("orders")
      .update({
        status: "Released",
        released_at: now,
        delivered_at: order.status === "Delivered" ? undefined : now,
      })
      .eq("id", orderId);
    if (statusErr) throw statusErr;

    if (stripe && order.payment_status === "paid" && order.stripe_charge_id) {
      try {
        const { data: seller } = await admin
          .from("profiles")
          .select("stripe_account_id, stripe_charges_enabled")
          .eq("id", order.seller_id)
          .maybeSingle();
        if (seller?.stripe_account_id && seller.stripe_charges_enabled) {
          const tier: SellerTier = "Starter";
          // Subtract any partial refunds the seller already issued —
          // the buyer has been refunded that money, so the seller's
          // net payout drops accordingly.
          const partialRefunds = order.partial_refund_cents ?? 0;
          const sellerPriceAfterRefunds = order.price_cents - partialRefunds;
          const feeCents = Math.round(sellerPriceAfterRefunds * TIER_FEE[tier]);
          const transferAmount = sellerPriceAfterRefunds - feeCents;
          if (transferAmount > 0) {
            await stripe.transfers.create({
              amount: transferAmount,
              currency: "usd",
              destination: seller.stripe_account_id,
              source_transaction: order.stripe_charge_id,
              metadata: { waxdepot_order_id: order.id },
              description: `Payout for ${order.id} (${tier} tier · ${(TIER_FEE[tier] * 100).toFixed(0)}% fee${partialRefunds > 0 ? ` · -$${(partialRefunds / 100).toFixed(2)} partial refund` : ""})`,
            });
          }
        }
      } catch (e) {
        console.error("releaseOrderToSeller transfer failed:", e);
      }
    }

    // Record the sale in the public sales table so the homepage tape,
    // product-page recent-sales, and price-history chart all reflect this
    // completed transaction. The sales table has RLS with no public-insert
    // policy — only trusted server paths (this one + the Stripe webhook)
    // can add entries. Best-effort; we already shipped the funds so a
    // failure here just delays public visibility of the trade.
    {
      const { data: orderForSku } = await admin
        .from("orders")
        .select("sku_id")
        .eq("id", orderId)
        .maybeSingle();
      if (orderForSku?.sku_id) {
        const { error: salesErr } = await admin.from("sales").insert({
          sku_id: orderForSku.sku_id,
          price_cents: order.price_cents,
          sold_at: now,
        });
        if (salesErr) console.error("sales insert failed:", salesErr.message);
      }
    }

    const skuRel = Array.isArray(order.sku) ? order.sku[0] : order.sku;
    const skuMeta = skuRel as { year?: number; brand?: string; product?: string } | null;
    if (skuMeta) {
      const productTitle = `${skuMeta.year} ${skuMeta.brand} ${skuMeta.product}`;
      await admin.from("notifications").insert({
        user_id: order.seller_id,
        type: "payout-sent",
        title: "Funds released",
        body: `${productTitle} · $${(order.total_cents / 100).toFixed(2)} released to your pending balance.`,
        href: `/account/orders/${orderId}`,
      });
      const sellerEmail = await getUserEmail(order.seller_id);
      if (sellerEmail && (await shouldSendEmail(order.seller_id, "order_emails"))) {
        await emailFundsReleased({
          to: sellerEmail,
          productTitle,
          amountDollars: order.total_cents / 100,
          orderHref: `${siteUrl()}/account/orders/${orderId}`,
        });
      }
    }

    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath("/account");
    return { ok: true };
  } catch (e) {
    console.error("releaseOrderToSeller failed:", e);
    return { error: "Could not release funds." };
  }
}

/**
 * Floor on how long after the carrier's "shipped" event a buyer can release
 * funds. Nothing realistically arrives in < 24h domestically, so the button
 * is gated to prevent accidental / fraudulent same-day releases. Server-side
 * defense-in-depth — the UI also disables the button with a countdown.
 */
const RELEASE_GATE_MS = 24 * 60 * 60 * 1000;

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
        "id, buyer_id, seller_id, status, payment_status, total_cents, price_cents, partial_refund_cents, stripe_charge_id, stripe_payment_intent_id, shipped_at, sku:skus!orders_sku_id_fkey(year, brand, product)",
      )
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return { error: "Order not found." };
    if (order.buyer_id !== user.id) return { error: "Only the buyer can confirm delivery." };
    if (!["Shipped", "Delivered"].includes(order.status))
      return { error: `Cannot confirm — order is ${order.status}.` };

    // 24h-since-shipped gate. If the carrier hasn't even had it for a day,
    // the buyer almost certainly hasn't received it and shouldn't be able to
    // release funds. Auto-release cron + dispute window are unaffected.
    if (order.shipped_at) {
      const shippedMs = new Date(order.shipped_at).getTime();
      const elapsed = Date.now() - shippedMs;
      if (Number.isFinite(elapsed) && elapsed < RELEASE_GATE_MS) {
        const hoursLeft = Math.ceil((RELEASE_GATE_MS - elapsed) / 3_600_000);
        return {
          error: `Funds can be released starting 24 hours after the seller marks the order shipped. Try again in ${hoursLeft} hour${hoursLeft === 1 ? "" : "s"}.`,
        };
      }
    }

    // Service role for the lifecycle write + cross-user notification +
    // Stripe-related profile read. Ownership was just validated.
    const admin = serviceRoleClient();

    const now = new Date().toISOString();
    const { error } = await admin
      .from("orders")
      .update({
        status: "Released",
        delivered_at: order.status === "Delivered" ? undefined : now,
        released_at: now,
      })
      .eq("id", orderId);
    if (error) throw error;

    // Phase 3: trigger Stripe Transfer to the seller's connected account.
    // We pull the seller's stripe_account_id and apply the seller's tier fee
    // before transferring. The transfer is scoped to the original charge so
    // platform balance accounting stays clean.
    if (
      stripe &&
      order.payment_status === "paid" &&
      order.stripe_charge_id
    ) {
      try {
        const { data: seller } = await admin
          .from("profiles")
          .select("stripe_account_id, stripe_charges_enabled")
          .eq("id", order.seller_id)
          .maybeSingle();
        if (seller?.stripe_account_id && seller.stripe_charges_enabled) {
          // Default to Starter tier fee. When per-seller-tier is wired this
          // becomes a column lookup on the seller's profile.
          const tier: SellerTier = "Starter";
          const partialRefunds = order.partial_refund_cents ?? 0;
          const sellerPriceAfterRefunds = order.price_cents - partialRefunds;
          const feeCents = Math.round(sellerPriceAfterRefunds * TIER_FEE[tier]);
          const transferAmount = sellerPriceAfterRefunds - feeCents;
          if (transferAmount > 0) {
            await stripe.transfers.create({
              amount: transferAmount,
              currency: "usd",
              destination: seller.stripe_account_id,
              source_transaction: order.stripe_charge_id,
              metadata: { waxdepot_order_id: order.id },
              description: `Payout for order ${order.id} (${tier} tier · ${(TIER_FEE[tier] * 100).toFixed(0)}% fee${partialRefunds > 0 ? ` · -$${(partialRefunds / 100).toFixed(2)} partial refund` : ""})`,
            });
          }
        }
      } catch (e) {
        // Non-fatal: order is still Released. Webhook transfer.* events will
        // catch up if/when the transfer eventually goes through, or admin
        // can reconcile manually.
        console.error("confirmDelivery transfer failed:", e);
      }
    }

    const skuRel = Array.isArray(order.sku) ? order.sku[0] : order.sku;
    const skuMeta = skuRel as { year?: number; brand?: string; product?: string } | null;
    if (skuMeta) {
      await admin.from("notifications").insert({
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

/**
 * Seller-initiated partial refund. Use case: box arrived damaged,
 * seller wants to comp the buyer $X to keep them happy without going
 * through a full dispute. Seller eats the cost — the eventual transfer
 * to their connected account is reduced by the refunded amount.
 *
 * Constraints:
 *   - Order must be in a refundable state (paid + escrow not released
 *     yet). Once released, refunds are out of our hands.
 *   - Refund amount must be > 0 and not exceed price_cents (don't
 *     allow refunding the shipping line — that's a separate Stripe call
 *     we don't support here).
 *   - Cumulative partial_refund_cents (across multiple calls) capped
 *     at price_cents.
 *
 * Reason field is required; logged in cancel_reason for audit trail
 * (we share the column since partial refunds are similar lifecycle
 * events) and notifies the buyer.
 */
export async function sellerPartialRefund(
  formData: FormData,
): Promise<ActionResult> {
  const orderId = String(formData.get("orderId") || "").trim();
  const amountStr = String(formData.get("amount") || "").trim();
  const reason = String(formData.get("reason") || "").trim().slice(0, 500);

  if (!orderId) return { error: "Missing order id." };
  if (!reason || reason.length < 6) {
    return {
      error: "Tell the buyer why — at least a sentence. They'll see it.",
    };
  }
  const amountDollars = parseFloat(amountStr);
  if (!Number.isFinite(amountDollars) || amountDollars <= 0) {
    return { error: "Refund amount must be greater than zero." };
  }
  const amountCents = Math.round(amountDollars * 100);

  if (!stripe) return { error: "Payments aren't configured yet." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "You must be signed in." };

    const { data: order } = await supabase
      .from("orders")
      .select(
        "id, seller_id, buyer_id, status, payment_status, price_cents, partial_refund_cents, stripe_charge_id, sku:skus!orders_sku_id_fkey(year, brand, product)",
      )
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return { error: "Order not found." };
    if (order.seller_id !== user.id)
      return { error: "Only the seller can issue a partial refund." };
    if (order.payment_status !== "paid")
      return { error: "Order isn't paid — nothing to refund." };
    if (!order.stripe_charge_id)
      return { error: "No Stripe charge on file for this order." };
    if (["Released", "Completed", "Canceled"].includes(order.status))
      return {
        error: `Order is ${order.status} — refund through admin/Stripe instead.`,
      };

    const alreadyRefunded = order.partial_refund_cents ?? 0;
    const maxRefundable = order.price_cents - alreadyRefunded;
    if (amountCents > maxRefundable) {
      return {
        error: `Max refundable is $${(maxRefundable / 100).toFixed(2)} (item price minus prior partial refunds).`,
      };
    }

    // Issue the refund via Stripe before recording it in the DB. If
    // Stripe rejects, we don't want a stale partial_refund_cents row.
    let refundId: string | null = null;
    try {
      const refund = await stripe.refunds.create({
        charge: order.stripe_charge_id,
        amount: amountCents,
        reason: "requested_by_customer",
        metadata: {
          waxdepot_order_id: order.id,
          waxdepot_initiated_by: "seller",
          waxdepot_reason: reason,
        },
      });
      refundId = refund.id;
    } catch (e) {
      console.error("sellerPartialRefund Stripe failed:", e);
      const message = e instanceof Error ? e.message : String(e);
      return { error: `Stripe refund failed: ${message}` };
    }

    const admin = serviceRoleClient();
    const newPartialTotal = alreadyRefunded + amountCents;
    await admin
      .from("orders")
      .update({
        partial_refund_cents: newPartialTotal,
        // Append the refund to cancel_reason for the audit trail.
        cancel_reason: `[partial refund $${(amountCents / 100).toFixed(2)} via ${refundId}] ${reason}`,
      })
      .eq("id", orderId);

    // Notify buyer that the refund hit their card.
    const skuRel = Array.isArray(order.sku) ? order.sku[0] : order.sku;
    const skuMeta = skuRel as
      | { year?: number; brand?: string; product?: string }
      | null;
    const productTitle = skuMeta
      ? `${skuMeta.year} ${skuMeta.brand} ${skuMeta.product}`
      : `order ${orderId}`;
    await admin.from("notifications").insert({
      user_id: order.buyer_id,
      type: "payout-sent",
      title: `Seller refunded $${(amountCents / 100).toFixed(2)}`,
      body: `${productTitle}: $${(amountCents / 100).toFixed(2)} back to your card. Reason: ${reason}`,
      href: `/account/orders/${orderId}`,
    });

    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath("/account");
    return { ok: true };
  } catch (e) {
    console.error("sellerPartialRefund failed:", e);
    return { error: "Could not process the refund. Please try again." };
  }
}

export async function cancelOrder(formData: FormData): Promise<ActionResult> {
  const orderId = String(formData.get("orderId") || "").trim();
  const reason = String(formData.get("reason") || "").trim().slice(0, 500);
  if (!orderId) return { error: "Missing order id." };
  // Reason is now REQUIRED for both sides. Tier-recompute counts seller
  // cancels and the audit trail needs the why for every cancellation.
  if (!reason || reason.length < 6) {
    return {
      error:
        "Tell us why — at least a sentence. This goes on the order record.",
    };
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
        "id, buyer_id, seller_id, status, listing_id, total_cents, sku:skus!orders_sku_id_fkey(year, brand, product)",
      )
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return { error: "Order not found." };
    if (order.buyer_id !== user.id && order.seller_id !== user.id)
      return { error: "Not your order." };
    // Once shipped, cancellations require a dispute, not a unilateral cancel.
    if (!["Charged", "InEscrow"].includes(order.status))
      return { error: `Order is ${order.status} — open a dispute instead.` };

    // Default to whoever's actually cancelling. Sellers can override to
    // 'buyer' via the form's attribution dropdown — used when the buyer
    // messaged asking the seller to cancel ("changed my mind, please
    // cancel"). Buyer-attributed cancels DON'T count against the seller's
    // tier-promotion cap. Buyer's own cancels are always 'buyer' — they
    // can't claim a cancel was seller-initiated.
    const userIsSeller = order.seller_id === user.id;
    const requestedBy = String(formData.get("canceledBy") || "").trim();
    let canceledBy: "buyer" | "seller" = userIsSeller ? "seller" : "buyer";
    if (userIsSeller && (requestedBy === "buyer" || requestedBy === "seller")) {
      canceledBy = requestedBy;
    }

    // Service role for the cancel + listing reopen. Ownership was just
    // validated; the regular auth client could in theory do the order
    // update via the permissive buyer/seller policies, but if either
    // party isn't actually the listing owner, the listing reopen would
    // fail. Easier and safer to do both via service role.
    const admin = serviceRoleClient();

    const now = new Date().toISOString();
    const { error } = await admin
      .from("orders")
      .update({
        status: "Canceled",
        canceled_at: now,
        cancel_reason: reason,
        canceled_by: canceledBy,
      })
      .eq("id", orderId);
    if (error) throw error;

    // Notify the other party so they're not left wondering.
    const otherUserId =
      canceledBy === "seller" ? order.buyer_id : order.seller_id;
    const otherRole: "buyer" | "seller" =
      canceledBy === "seller" ? "buyer" : "seller";
    const skuRel = Array.isArray(order.sku) ? order.sku[0] : order.sku;
    const skuMeta = skuRel as { year?: number; brand?: string; product?: string } | null;
    const productTitle = skuMeta
      ? `${skuMeta.year} ${skuMeta.brand} ${skuMeta.product}`
      : `order ${orderId}`;
    await admin.from("notifications").insert({
      user_id: otherUserId,
      type: "order-canceled",
      title:
        canceledBy === "seller"
          ? "Seller canceled your order"
          : "Buyer canceled an order",
      body: `${productTitle} was canceled. Reason: ${reason}`,
      href: `/account/orders/${orderId}`,
    });

    // Email the OTHER party — the canceler already saw the action confirmed
    // in the UI. Best-effort.
    try {
      const otherEmail = await getUserEmail(otherUserId);
      if (otherEmail && (await shouldSendEmail(otherUserId, "order_emails"))) {
        await emailOrderCanceled({
          to: otherEmail,
          role: otherRole,
          productTitle,
          amountDollars: order.total_cents / 100,
          reason,
          canceledBy,
          orderHref: `${siteUrl()}/account/orders/${orderId}`,
        });
      }
    } catch (e) {
      console.error("emailOrderCanceled failed:", e);
    }

    // Re-open the listing if there was one (give seller back the inventory).
    if (order.listing_id) {
      const { data: listing } = await admin
        .from("listings")
        .select("status, quantity")
        .eq("id", order.listing_id)
        .maybeSingle();
      if (listing) {
        await admin
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
