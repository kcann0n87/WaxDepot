/**
 * EasyPost integration: register a tracker when seller marks an order shipped.
 * EasyPost polls the carrier and webhooks us when status changes (in_transit,
 * out_for_delivery, delivered, return_to_sender, failure, error).
 *
 * Designed to gracefully NO-OP when EASYPOST_API_KEY is missing so the rest of
 * the ship flow keeps working in environments without the integration. Exact
 * same pattern as Resend / Stripe in this codebase.
 */

const API_BASE = "https://api.easypost.com/v2";

export type EasyPostStatus =
  | "pre_transit"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "available_for_pickup"
  | "return_to_sender"
  | "failure"
  | "error"
  | "unknown";

export type EasyPostTracker = {
  id: string;
  tracking_code: string;
  carrier: string;
  status: EasyPostStatus;
  est_delivery_date: string | null;
};

function authHeader() {
  const key = process.env.EASYPOST_API_KEY;
  if (!key) return null;
  // EasyPost uses HTTP Basic with the API key as username, blank password.
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

/**
 * Register a tracker so EasyPost starts polling the carrier and forwarding
 * status changes to /api/easypost/webhook. Returns null when no key is set.
 *
 * EasyPost expects carrier names in their normalized form. Our app uses the
 * same canonical strings (USPS, UPS, FedEx, DHL) so we pass through directly.
 */
export async function createTracker(
  trackingCode: string,
  carrier: string,
  orderId: string,
): Promise<EasyPostTracker | null> {
  const auth = authHeader();
  if (!auth) {
    console.log("[easypost] EASYPOST_API_KEY not set — skipping tracker creation");
    return null;
  }
  // Carrier code mapping. EasyPost uses uppercase USPS but lowercase ups/fedex/dhl_ecommerce.
  const carrierMap: Record<string, string> = {
    USPS: "USPS",
    UPS: "UPS",
    FedEx: "FedEx",
    DHL: "DHLExpress",
  };
  const epCarrier = carrierMap[carrier] ?? carrier;

  try {
    const res = await fetch(`${API_BASE}/trackers`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tracker: {
          tracking_code: trackingCode,
          carrier: epCarrier,
          // Stash our order id in metadata so the webhook handler can route
          // status updates back to the right row without an extra DB lookup.
          options: { restrict_carriers_to: [epCarrier] },
          metadata: { order_id: orderId },
        },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[easypost] tracker create failed ${res.status}:`, text.slice(0, 300));
      return null;
    }
    const tracker = (await res.json()) as EasyPostTracker;
    return tracker;
  } catch (e) {
    console.error("[easypost] tracker create threw:", e);
    return null;
  }
}

/**
 * Find an order by its tracking number — used by the webhook handler to
 * route delivery events back to the right row.
 */
export type EasyPostWebhookEvent = {
  description: string;
  result?: EasyPostTracker & {
    metadata?: { order_id?: string } | null;
    public_url?: string;
    tracking_details?: Array<{ status: string; message: string; datetime: string }>;
  };
};
