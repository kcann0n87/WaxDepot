"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

// Structural type for Stripe Checkout shipping_options. Pulling the named
// type from the Stripe SDK across versions has been finicky; the inline
// shape here matches the `shipping_rate_data` form we actually use.
type CheckoutShippingOption = {
  shipping_rate_data: {
    display_name: string;
    type: "fixed_amount";
    fixed_amount: { amount: number; currency: string };
    metadata?: Record<string, string>;
  };
};

/**
 * Build the Stripe `shipping_options` array for a listing. Sellers can
 * configure 1–3 tiers in `listing_shipping_options`; if for any reason the
 * row is missing (legacy listings before migration 0009 ran), fall back to
 * the listing's own `shipping_cents` so checkout never breaks.
 */
async function buildShippingOptionsForListing(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listingId: string,
  fallbackShippingCents: number,
): Promise<CheckoutShippingOption[]> {
  const { data: rows } = await supabase
    .from("listing_shipping_options")
    .select("name, shipping_cents, sort_order")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });

  const options =
    rows && rows.length > 0
      ? rows.map((r) => ({ name: String(r.name), cents: Number(r.shipping_cents) }))
      : fallbackShippingCents > 0
        ? [{ name: "Standard shipping", cents: fallbackShippingCents }]
        : [];

  return options.map((o) => ({
    shipping_rate_data: {
      display_name: o.name,
      type: "fixed_amount" as const,
      fixed_amount: { amount: o.cents, currency: "usd" },
      // Stash the option name so the webhook can write it back onto the
      // order without another DB lookup.
      metadata: { waxdepot_shipping_name: o.name },
    },
  }));
}

async function getOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : "https://waxdepot.io";
}

function newOrderId() {
  return `WM-${Math.floor(100000 + Math.random() * 900000)}`;
}

export type CheckoutResult = {
  ok?: boolean;
  error?: string;
  needsAuth?: boolean;
  needsSellerStripe?: boolean;
  checkoutUrl?: string;
  orderId?: string;
};

/**
 * Buy Now path: creates a fresh order in pending state and a Stripe Checkout
 * Session for the buyer to pay. Returns the Checkout URL — caller redirects.
 *
 * Money flow (escrow model):
 *   1. Buyer pays via Stripe Checkout → funds land in PLATFORM balance
 *   2. Seller ships, buyer confirms delivery → confirmDelivery action triggers
 *      a Stripe Transfer from platform to seller's connected account
 *   3. Platform retains the tier-based seller fee (Phase 3)
 *
 * For now (Phase 2), we just do step 1 — no transfer_data on the Checkout
 * Session. Funds sit in platform balance until Phase 3 wires the release.
 */
export async function createBuyNowCheckout(formData: FormData): Promise<CheckoutResult> {
  if (!stripe) return { error: "Payments aren't configured yet." };

  const skuId = String(formData.get("skuId") || "").trim();
  const listingIdHint = String(formData.get("listingId") || "").trim();

  if (!skuId) return { error: "Missing product." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { needsAuth: true };

    // Find the listing to charge against. Caller can pass a specific
    // listingId; otherwise we pick the lowest-priced active listing for the SKU.
    const listingQuery = supabase
      .from("listings")
      .select("id, sku_id, seller_id, price_cents, shipping_cents, quantity, status")
      .eq("sku_id", skuId)
      .eq("status", "Active")
      .order("price_cents", { ascending: true });
    const { data: listing } = listingIdHint
      ? await listingQuery.eq("id", listingIdHint).limit(1).maybeSingle()
      : await listingQuery.limit(1).maybeSingle();
    if (!listing) return { error: "This product is no longer available." };

    // Seller must have Stripe Connect set up — otherwise we can't direct payment.
    const { data: seller } = await supabase
      .from("profiles")
      .select(
        "id, display_name, username, stripe_account_id, stripe_charges_enabled",
      )
      .eq("id", listing.seller_id)
      .maybeSingle();
    if (!seller?.stripe_account_id || !seller.stripe_charges_enabled) {
      return {
        needsSellerStripe: true,
        error:
          "This seller hasn't finished setting up payouts yet. Try a different listing.",
      };
    }

    const { data: sku } = await supabase
      .from("skus")
      .select("id, slug, year, brand, product, set_name, image_url")
      .eq("id", skuId)
      .maybeSingle();
    if (!sku) return { error: "Product not found." };

    // Create the pending order. Real ship_to_* gets populated from Stripe
    // Checkout's collected shipping_details when payment completes (webhook).
    let orderId = newOrderId();
    const totalCents = listing.price_cents + listing.shipping_cents;
    const insertOrder = {
      id: orderId,
      buyer_id: user.id,
      seller_id: listing.seller_id,
      listing_id: listing.id,
      sku_id: skuId,
      qty: 1,
      price_cents: listing.price_cents,
      shipping_cents: listing.shipping_cents,
      tax_cents: 0,
      total_cents: totalCents,
      status: "Charged" as const,
      payment_status: "pending",
      ship_to_name: "ADDRESS_PENDING",
      ship_to_addr1: "ADDRESS_PENDING",
      ship_to_city: "PENDING",
      ship_to_state: "XX",
      ship_to_zip: "00000",
    };
    let { error: orderErr } = await supabase.from("orders").insert(insertOrder);
    if (orderErr && orderErr.code === "23505") {
      orderId = newOrderId();
      const retry = await supabase
        .from("orders")
        .insert({ ...insertOrder, id: orderId });
      orderErr = retry.error;
    }
    if (orderErr) {
      console.error("createBuyNowCheckout order insert failed:", orderErr);
      return { error: "Could not start checkout. Please try again." };
    }

    const origin = await getOrigin();
    const shippingOptions = await buildShippingOptionsForListing(
      supabase,
      listing.id,
      listing.shipping_cents,
    );
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${sku.year} ${sku.brand} ${sku.product}`,
              description: `${sku.set_name} · Sold by ${seller.display_name}`,
              ...(sku.image_url
                ? { images: [`${origin}${sku.image_url}`] }
                : {}),
            },
            unit_amount: listing.price_cents,
          },
          quantity: 1,
        },
      ],
      shipping_address_collection: { allowed_countries: ["US"] },
      ...(shippingOptions.length > 0 && { shipping_options: shippingOptions }),
      payment_intent_data: {
        metadata: { waxdepot_order_id: orderId },
      },
      metadata: { waxdepot_order_id: orderId },
      success_url: `${origin}/account/orders/${orderId}?payment=success`,
      cancel_url: `${origin}/account/orders/${orderId}?payment=cancel`,
    });

    if (!session.url) {
      return { error: "Stripe didn't return a checkout URL." };
    }

    // Persist the PI id (when it exists yet) for later reconciliation.
    if (typeof session.payment_intent === "string") {
      await supabase
        .from("orders")
        .update({ stripe_payment_intent_id: session.payment_intent })
        .eq("id", orderId);
    }

    return { ok: true, checkoutUrl: session.url, orderId };
  } catch (e) {
    console.error("createBuyNowCheckout failed:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

/**
 * Generate a Checkout Session for an EXISTING pending order (e.g., one that
 * was created when a seller accepted a bid). Buyer hits the order page,
 * clicks Pay now, and we return them to a fresh Checkout URL.
 */
export async function createCheckoutForOrder(formData: FormData): Promise<CheckoutResult> {
  if (!stripe) return { error: "Payments aren't configured yet." };

  const orderIdInput = String(formData.get("orderId") || "").trim();
  if (!orderIdInput) return { error: "Missing order id." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { needsAuth: true };

    const { data: order } = await supabase
      .from("orders")
      .select(
        "id, buyer_id, seller_id, sku_id, listing_id, price_cents, shipping_cents, status, payment_status, sku:skus!orders_sku_id_fkey(id, slug, year, brand, product, set_name, image_url)",
      )
      .eq("id", orderIdInput)
      .maybeSingle();
    if (!order) return { error: "Order not found." };
    if (order.buyer_id !== user.id) return { error: "Not your order." };
    if (order.payment_status === "paid") return { error: "This order is already paid." };
    if (order.status === "Canceled") return { error: "This order was canceled." };

    const { data: seller } = await supabase
      .from("profiles")
      .select("display_name, stripe_account_id, stripe_charges_enabled")
      .eq("id", order.seller_id)
      .maybeSingle();
    if (!seller?.stripe_account_id || !seller.stripe_charges_enabled) {
      return {
        needsSellerStripe: true,
        error: "Seller hasn't finished Stripe setup yet. Message them or wait.",
      };
    }

    const sku = Array.isArray(order.sku) ? order.sku[0] : order.sku;
    if (!sku) return { error: "Product not found." };

    const origin = await getOrigin();
    const shippingOptions = order.listing_id
      ? await buildShippingOptionsForListing(
          supabase,
          order.listing_id,
          order.shipping_cents,
        )
      : order.shipping_cents > 0
        ? [
            {
              shipping_rate_data: {
                display_name: "Standard shipping",
                type: "fixed_amount" as const,
                fixed_amount: {
                  amount: order.shipping_cents,
                  currency: "usd",
                },
                metadata: { waxdepot_shipping_name: "Standard shipping" },
              },
            } satisfies CheckoutShippingOption,
          ]
        : [];
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${sku.year} ${sku.brand} ${sku.product}`,
              description: `${sku.set_name} · Sold by ${seller.display_name}`,
              ...(sku.image_url
                ? { images: [`${origin}${sku.image_url}`] }
                : {}),
            },
            unit_amount: order.price_cents,
          },
          quantity: 1,
        },
      ],
      shipping_address_collection: { allowed_countries: ["US"] },
      ...(shippingOptions.length > 0 && { shipping_options: shippingOptions }),
      payment_intent_data: {
        metadata: { waxdepot_order_id: order.id },
      },
      metadata: { waxdepot_order_id: order.id },
      success_url: `${origin}/account/orders/${order.id}?payment=success`,
      cancel_url: `${origin}/account/orders/${order.id}?payment=cancel`,
    });

    if (!session.url) return { error: "Stripe didn't return a checkout URL." };

    if (typeof session.payment_intent === "string") {
      await supabase
        .from("orders")
        .update({ stripe_payment_intent_id: session.payment_intent })
        .eq("id", order.id);
    }

    return { ok: true, checkoutUrl: session.url, orderId: order.id };
  } catch (e) {
    console.error("createCheckoutForOrder failed:", e);
    return { error: "Could not start checkout. Please try again." };
  }
}

/**
 * Convenience wrapper: take checkout result and redirect, otherwise revalidate
 * the source page so the inline error renders.
 */
export async function buyNowAndRedirect(formData: FormData) {
  const result = await createBuyNowCheckout(formData);
  if (result.checkoutUrl) {
    redirect(result.checkoutUrl);
  }
  // For error cases the calling client handles error state via the result;
  // this server-action wrapper is used when called from a plain <form> with
  // no client interactivity.
  revalidatePath("/");
}

export async function payOrderAndRedirect(formData: FormData) {
  const result = await createCheckoutForOrder(formData);
  if (result.checkoutUrl) {
    redirect(result.checkoutUrl);
  }
  const orderId = String(formData.get("orderId") || "");
  if (orderId) revalidatePath(`/account/orders/${orderId}`);
}
