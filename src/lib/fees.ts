// WaxDepot fee model — flat commission, no separate payment processing line.
// (We absorb Stripe's 2.9% + $0.30 internally.)

export type SellerTier = "Starter" | "Pro" | "Elite";

export const TIER_FEE: Record<SellerTier, number> = {
  Starter: 0.10,
  Pro: 0.08,
  Elite: 0.06,
};

export const TIER_THRESHOLDS = {
  Pro: { sales: 100, positivePct: 99 },
  Elite: { sales: 500, positivePct: 99.5 },
} as const;

export const TIER_PAYOUT_CADENCE: Record<SellerTier, string> = {
  Starter: "Weekly Friday",
  Pro: "Twice-weekly (Tue + Fri)",
  Elite: "Every 3 days",
};

/**
 * Default tier used by all the UI flows until we have real seller data.
 * Once auth + analytics are wired, swap this for a per-user lookup.
 */
export const CURRENT_USER_TIER: SellerTier = "Starter";

export function feeRateFor(tier: SellerTier = CURRENT_USER_TIER) {
  return TIER_FEE[tier];
}

export function calcFee(saleAmount: number, tier: SellerTier = CURRENT_USER_TIER) {
  return saleAmount * TIER_FEE[tier];
}

export function calcPayout(saleAmount: number, tier: SellerTier = CURRENT_USER_TIER) {
  return saleAmount - calcFee(saleAmount, tier);
}

export function tierFromMonthlyStats(salesLast30d: number, positivePct: number): SellerTier {
  if (salesLast30d >= TIER_THRESHOLDS.Elite.sales && positivePct >= TIER_THRESHOLDS.Elite.positivePct)
    return "Elite";
  if (salesLast30d >= TIER_THRESHOLDS.Pro.sales && positivePct >= TIER_THRESHOLDS.Pro.positivePct)
    return "Pro";
  return "Starter";
}
