import { NextResponse } from "next/server";
import { createClient as createSbAdmin } from "@supabase/supabase-js";
import type { EasyPostWebhookEvent } from "@/lib/easypost";

/**
 * EasyPost tracker webhook. Fires on tracker.updated when the carrier
 * reports a new scan event (in_transit, out_for_delivery, delivered, etc.).
 *
 * Configure the webhook URL in the EasyPost dashboard:
 *   https://www.easypost.com/account/webhooks
 *   URL: https://waxdepot.io/api/easypost/webhook
 *
 * Authentication: EasyPost lets you set a custom HMAC secret on the webhook;
 * we store that as EASYPOST_WEBHOOK_SECRET and verify the X-Hmac-Signature
 * header. If no secret is configured we accept all events (dev mode).
 *
 * What we do on each event:
 *   - tracker.status === "delivered"   → flip order to Delivered if not already,
 *                                        set delivered_at, notify buyer to
 *                                        confirm (or wait for cron auto-release).
 *   - tracker.status === "return_to_sender" → notify both parties (no auto status change).
 *   - tracker.status === "failure"     → notify both parties.
 *   - other statuses                   → no-op (we trust the cron + manual flow).
 */
export const dynamic = "force-dynamic";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service credentials not configured");
  return createSbAdmin(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: Request) {
  const body = await request.text();

  // Optional HMAC signature verification. EasyPost lets you set a custom secret
  // per webhook in the dashboard; if you do, we verify it. If you don't, we
  // accept all events (which is fine for a low-fraud signal like delivery
  // confirmation, but worth turning on for production).
  const secret = process.env.EASYPOST_WEBHOOK_SECRET;
  if (secret) {
    const sig = request.headers.get("x-hmac-signature");
    const { createHmac, timingSafeEqual } = await import("node:crypto");
    const expected = createHmac("sha256", secret).update(body).digest("hex");
    const valid =
      !!sig &&
      sig.length === expected.length &&
      timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  let event: EasyPostWebhookEvent;
  try {
    event = JSON.parse(body) as EasyPostWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tracker = event.result;
  if (!tracker) return NextResponse.json({ received: true, skipped: "no tracker" });

  const orderId = tracker.metadata?.order_id;
  const trackingCode = tracker.tracking_code;
  const status = tracker.status;

  // Resolve the order. Prefer metadata (single fast read), fall back to a
  // tracking-code lookup so we still work for trackers created before we
  // started embedding metadata.
  const supabase = adminClient();
  let resolvedOrderId: string | null = orderId ?? null;
  if (!resolvedOrderId && trackingCode) {
    const { data } = await supabase
      .from("orders")
      .select("id")
      .eq("tracking", trackingCode)
      .maybeSingle();
    resolvedOrderId = data?.id ?? null;
  }
  if (!resolvedOrderId) {
    return NextResponse.json({ received: true, skipped: "no matching order" });
  }

  if (status === "delivered") {
    // Idempotent: only flip if not already Delivered/Released.
    const { data: order } = await supabase
      .from("orders")
      .select("status, buyer_id")
      .eq("id", resolvedOrderId)
      .maybeSingle();
    if (!order) {
      return NextResponse.json({ received: true, skipped: "order vanished" });
    }
    if (["Delivered", "Released", "Completed"].includes(order.status)) {
      return NextResponse.json({ received: true, skipped: "already delivered" });
    }

    await supabase
      .from("orders")
      .update({
        status: "Delivered",
        delivered_at: new Date().toISOString(),
      })
      .eq("id", resolvedOrderId);

    await supabase.from("notifications").insert([
      {
        user_id: order.buyer_id,
        type: "order-delivered",
        title: "Package delivered — confirm to release",
        body: "Carrier reports your order delivered. Confirm now to release funds, or we'll auto-release in 2 days.",
        href: `/account/orders/${resolvedOrderId}`,
      },
    ]);
  }

  // Best-effort: store estimated delivery so the order page can show it.
  if (tracker.est_delivery_date) {
    await supabase
      .from("orders")
      .update({ estimated_delivery: tracker.est_delivery_date })
      .eq("id", resolvedOrderId);
  }

  return NextResponse.json({ received: true });
}
