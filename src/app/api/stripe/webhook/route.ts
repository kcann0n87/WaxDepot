import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

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
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not configured" },
      { status: 503 },
    );
  }

  const body = await request.text();
  const sig = (await headers()).get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    console.error("Stripe webhook signature failed:", e);
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
  const supabase = await createClient();

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

      await supabase.from("orders").update(update).eq("id", orderId);

      // Notify the seller — they can ship now.
      const { data: order } = await supabase
        .from("orders")
        .select(
          "seller_id, sku:skus!orders_sku_id_fkey(year, brand, product)",
        )
        .eq("id", orderId)
        .maybeSingle();
      if (order) {
        const sku = Array.isArray(order.sku) ? order.sku[0] : order.sku;
        await supabase.from("notifications").insert({
          user_id: order.seller_id,
          type: "bid-accepted",
          title: "Payment received — ship the order",
          body: sku
            ? `Buyer paid for ${sku.year} ${sku.brand} ${sku.product}. Funds in escrow until they confirm delivery.`
            : `Buyer paid for order ${orderId}. Funds are in escrow.`,
          href: `/account/orders/${orderId}`,
        });
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
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_payment_intent_id", piId)
    .maybeSingle();
  return data?.id;
}
