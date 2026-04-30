import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

/**
 * Stripe webhook handler. Listens for events Stripe pushes after charges,
 * Connect-account changes, transfers, and refunds.
 *
 * To register this endpoint:
 *   Stripe Dashboard → Developers → Webhooks → Add endpoint
 *   URL: https://waxdepot.io/api/stripe/webhook
 *   Events: account.updated, payment_intent.succeeded,
 *           payment_intent.payment_failed, charge.refunded,
 *           transfer.created, transfer.reversed
 *   Then copy the "Signing secret" (whsec_...) into the
 *   STRIPE_WEBHOOK_SECRET env var on Vercel.
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

    case "payment_intent.succeeded": {
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
      // Notify seller that payment is in escrow and they can ship.
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
            ? `Buyer paid for ${sku.year} ${sku.brand} ${sku.product}. Funds are in escrow.`
            : `Buyer paid for order ${orderId}. Funds are in escrow.`,
          href: `/account/orders/${orderId}`,
        });
      }
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
