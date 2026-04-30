/**
 * Carrier registry: display name + deep-link to that carrier's tracking page.
 *
 * Keys match the values our ship-form `<select>` writes into orders.carrier.
 * The URL pattern is the carrier's documented public-tracking deep link —
 * not an API call, just `?tracking=…` so the buyer can click through to the
 * canonical scan history without us hosting a tracking page ourselves.
 */
export type CarrierKey = "USPS" | "UPS" | "FedEx" | "DHL";

const CARRIERS: Record<CarrierKey, { name: string; trackUrl: (tracking: string) => string }> = {
  USPS: {
    name: "USPS",
    trackUrl: (t) =>
      `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${encodeURIComponent(t)}`,
  },
  UPS: {
    name: "UPS",
    trackUrl: (t) => `https://www.ups.com/track?tracknum=${encodeURIComponent(t)}`,
  },
  FedEx: {
    name: "FedEx",
    trackUrl: (t) =>
      `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(t)}`,
  },
  DHL: {
    name: "DHL",
    trackUrl: (t) =>
      `https://www.dhl.com/global-en/home/tracking/tracking-express.html?tracking-id=${encodeURIComponent(t)}`,
  },
};

export function getCarrier(key: string | null | undefined) {
  if (!key) return null;
  // Case-insensitive match; the ship-form writes "UPS" / "USPS" etc., but
  // hand-edited rows might use lowercase or "ups" — handle both.
  const normalized = (Object.keys(CARRIERS) as CarrierKey[]).find(
    (k) => k.toLowerCase() === key.toLowerCase(),
  );
  return normalized ? CARRIERS[normalized] : null;
}

/**
 * Generate the carrier's public tracking URL, or null if we don't recognize
 * the carrier. UI should fall back to plain text in that case.
 */
export function getTrackingUrl(carrier: string | null | undefined, tracking: string | null | undefined) {
  if (!tracking) return null;
  const c = getCarrier(carrier);
  return c ? c.trackUrl(tracking) : null;
}
