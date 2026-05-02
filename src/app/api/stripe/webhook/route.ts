import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { createClient as createSbAdmin } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { emailPaymentReceived } from "@/lib/email";

/**
 * Webhooks have no user session, so we can't use the cookie-based server
 * client (RLS would silently block writes). Use the service role for all
 * DB operations triggered by Stripe events.
 */
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service credentials not configured");
  }
  return createSbAdmin(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Stripe webhook handler. Listens for events Stripe pushes after Checkout
 * completions, Connect-account changes, transfers, and refunds.
 *
 * Two endpoints typically register against this URL:
 *   1. "Connected and v2 accounts" → account.updated (seller onboarding)
 *   2. "Your account" → checkout.session.completed, payment_intent.*,
 *      charge.refunded, transfer.*
 *   Both share the same signing secret (STRIPE_WEBHOOK_SECRET) by
 *   re-using the same endpoint, OR you can register two endpoints in
 *   Stripe and rotate to the latest secret of either.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }
  // Support multiple signing secrets so the same /api/stripe/webhook URL can
  // back two Stripe webhook registrations (one for Connected-account events,
  // one for Platform-account events). Each registration has its own secret.
  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET_2,
  ].filter((s): s is string => !!s);
  if (secrets.length === 0) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not configured" },
      { status: 503 },
    );
  }

  const body = await request.text();
  const sig = (await headers()).get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event | null = null;
  let lastError: unknown = null;
  for (const candidate of secrets) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, candidate);
      break;
    } catch (e) {
      lastError = e;
    }
  }
  if (!event) {
    console.error(
      "Stripe webhook signature failed for all configured secrets:",
      lastError,
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await handleEvent(event);
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error(`Webhook handler ${event.type} failed:`, e);
    // Return 500 so Stripe retries the delivery.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}

async function handleEvent(event: Stripe.Event) {
  const supabase = adminClient();

  switch (event.type) {
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      await supabase
        .from("profiles")
        .update({
          stripe_charges_enabled: !!account.charges_enabled,
          stripe_payouts_enabled: !!account.payouts_enabled,
          stripe_details_submitted: !!account.details_submitted,
        })
        .eq("stripe_account_id", account.id);
      break;
    }

    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.waxdepot_order_id;
      if (!orderId) break;

      const piId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;

      // Look up the latest charge id from the PI for use in Phase 3 transfer.
      let chargeId: string | null = null;
      if (piId && stripe) {
        try {
          const pi = await stripe.paymentIntents.retrieve(piId);
          chargeId =
            typeof pi.latest_charge === "string"
              ? pi.latest_charge
              : pi.latest_charge?.id ?? null;
        } catch (e) {
          console.error("PI retrieve failed in webhook:", e);
        }
      }

      // Resolve which shipping option the buyer picked + how much they
      // actually paid for shipping. Stripe stores the chosen rate id in
      // session.shipping_cost.shipping_rate; expand it to read the
      // display_name (we set this when we created the rate).
      let chosenShippingName: string | null = null;
      let chosenShippingCents: number | null = null;
      const sessionWithShipping = session as unknown as {
        shipping_cost?: {
          amount_total?: number | null;
          shipping_rate?: string | { id?: string; display_name?: string | null; metadata?: Record<string, string> } | null;
        } | null;
      };
      const sc = sessionWithShipping.shipping_cost;
      if (sc) {
        if (typeof sc.amount_total === "number") {
          chosenShippingCents = sc.amount_total;
        }
        if (sc.shipping_rate) {
          if (typeof sc.shipping_rate === "string" && stripe) {
            try {
              const rate = await stripe.shippingRates.retrieve(sc.shipping_rate);
              chosenShippingName =
                rate.metadata?.waxdepot_shipping_name ??
                rate.display_name ??
                null;
            } catch (e) {
              console.error("Shipping rate retrieve failed:", e);
            }
          } else if (typeof sc.shipping_rate === "object") {
            chosenShippingName =
              sc.shipping_rate.metadata?.waxdepot_shipping_name ??
              sc.shipping_rate.display_name ??
              null;
          }
        }
      }

      // Capture shipping address from Checkout's collected_information.
      // The shape moved between versions of the Stripe API; check both.
      type ShippingShape = {
        name?: string | null;
        address?: {
          line1?: string | null;
          line2?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string | null;
        } | null;
      } | null | undefined;
      const sessionAny = session as unknown as {
        collected_information?: { shipping_details?: ShippingShape };
        shipping_details?: ShippingShape;
      };
      const shipping: ShippingShape =
        sessionAny.collected_information?.shipping_details ?? sessionAny.shipping_details;

      const update: Record<string, unknown> = {
        status: "InEscrow",
        payment_status: "paid",
      };
      if (piId) update.stripe_payment_intent_id = piId;
      if (chargeId) update.stripe_charge_id = chargeId;
      if (shipping?.address) {
        const a = shipping.address;
        update.ship_to_name = shipping.name ?? "Buyer";
        update.ship_to_addr1 = [a.line1, a.line2].filter(Boolean).join(", ") || "—";
        update.ship_to_city = a.city ?? "—";
        update.ship_to_state = a.state ?? "—";
        update.ship_to_zip = a.postal_code ?? "—";
      }
      // Persist the actual shipping the buyer paid + the option name. The
      // pre-checkout `orders.shipping_cents` was a placeholder (the lowest
      // option) so this is when the order's shipping cost becomes real.
      if (chosenShippingCents !== null) {
        update.shipping_cents = chosenShippingCents;
      }
      if (chosenShippingName) {
        update.shipping_option_name = chosenShippingName;
      }
      // Re-derive total_cents from the final shipping pick so receipts and
      // payouts stay consistent.
      if (chosenShippingCents !== null) {
        const { data: existing } = await supabase
          .from("orders")
          .select("price_cents, tax_cents")
          .eq("id", orderId)
          .maybeSingle();
        if (existing) {
          update.total_cents =
            existing.price_cents + chosenShippingCents + (existing.tax_cents ?? 0);
        }
      }

      await supabase.from("orders").update(update).eq("id", orderId);

      // Notify both sides: seller "ship now", buyer "payment received".
      const { data: order } = await supabase
        .from("orders")
        .select(
          "seller_id, buyer_id, total_cents, sku:skus!orders_sku_id_fkey(year, brand, product)",
        )
        .eq("id", orderId)
        .maybeSingle();
      if (order) {
        const sku = Array.isArray(order.sku) ? order.sku[0] : order.sku;
        const productTitle = sku
          ? `${sku.year} ${sku.brand} ${sku.product}`
          : `order ${orderId}`;

        await supabase.from("notifications").insert([
          {
            user_id: order.seller_id,
            type: "bid-accepted",
            title: "Payment received — ship the order",
            body: `Buyer paid for ${productTitle}. Funds in escrow until they confirm delivery.`,
            href: `/account/orders/${orderId}`,
          },
        ]);

        // Transactional emails for both sides. Look up auth emails by
        // user id; skip silently if not available.
        try {
          const [{ data: sellerAuth }, { data: buyerAuth }] = await Promise.all([
            supabase.auth.admin.getUserById(order.seller_id),
            supabase.auth.admin.getUserById(order.buyer_id),
          ]);
          if (sellerAuth?.user?.email) {
            await emailPaymentReceived({
              to: sellerAuth.user.email,
              role: "seller",
              productTitle,
              amountDollars: order.total_cents / 100,
              orderHref: `https://waxdepot.io/account/orders/${orderId}`,
            });
          }
          if (buyerAuth?.user?.email) {
            await emailPaymentReceived({
              to: buyerAuth.user.email,
              role: "buyer",
              productTitle,
              amountDollars: order.total_cents / 100,
              orderHref: `https://waxdepot.io/account/orders/${orderId}`,
            });
          }
        } catch (e) {
          console.error("payment received emails failed:", e);
        }
      }
      break;
    }

    case "payment_intent.succeeded": {
      // Fallback path for raw PaymentIntents not routed through Checkout.
      // Phase 2 sends everything through Checkout, so this rarely fires —
      // kept for safety + future direct-PI flows.
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.waxdepot_order_id;
      if (!orderId) break;
      await supabase
        .from("orders")
        .update({
          status: "InEscrow",
          payment_status: "paid",
          stripe_charge_id: typeof pi.latest_charge === "string" ? pi.latest_charge : null,
        })
        .eq("id", orderId);
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.waxdepot_order_id;
      if (!orderId) break;
      await supabase
        .from("orders")
        .update({ payment_status: "failed" })
        .eq("id", orderId);
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const orderId =
        (charge.metadata?.waxdepot_order_id as string | undefined) ??
        (typeof charge.payment_intent === "string"
          ? await lookupOrderByPaymentIntent(charge.payment_intent)
          : undefined);
      if (!orderId) break;
      await supabase
        .from("orders")
        .update({ payment_status: "refunded", status: "Canceled" })
        .eq("id", orderId);
      break;
    }

    case "transfer.created": {
      const transfer = event.data.object as Stripe.Transfer;
      const orderId = transfer.metadata?.waxdepot_order_id;
      if (!orderId) break;
      await supabase
        .from("orders")
        .update({
          stripe_transfer_id: transfer.id,
          status: "Released",
        })
        .eq("id", orderId);
      break;
    }

    case "transfer.reversed": {
      const transfer = event.data.object as Stripe.Transfer;
      const orderId = transfer.metadata?.waxdepot_order_id;
      if (!orderId) break;
      // Stripe rolled back the payout — return order to Delivered so we can
      // retry release manually.
      await supabase
        .from("orders")
        .update({ status: "Delivered" })
        .eq("id", orderId);
      break;
    }

    default:
      // No-op for unhandled events.
      break;
  }
}

async function lookupOrderByPaymentIntent(piId: string): Promise<string | undefined> {
  const supabase = adminClient();
  const { data } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_payment_intent_id", piId)
    .maybeSingle();
  return data?.id;
}
