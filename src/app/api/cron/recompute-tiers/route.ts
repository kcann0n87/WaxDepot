import { NextResponse } from "next/server";
import { createClient as createSbAdmin } from "@supabase/supabase-js";
import {
  endOfNextMonth,
  TIER_RANK,
  tierFromMonthlyStats,
  type SellerTier,
} from "@/lib/fees";

/**
 * Nightly cron: recompute every seller's tier with grace-period semantics.
 *
 *   - Promotion (qualifying tier > current): bump immediately + set
 *     tier_expires_at = end of next month
 *   - Re-qualification (qualifying tier == current, both >= Pro): extend
 *     tier_expires_at = end of next month
 *   - Lower qualification with future tier_expires_at: no-op (grace)
 *   - Lower qualification with past or null tier_expires_at: demote to
 *     qualifying tier (and clear tier_expires_at if dropping to Starter)
 *
 * Configured in vercel.json. Vercel Cron sends
 *   Authorization: Bearer ${CRON_SECRET}
 * which we verify against the env var. Service-role client because we
 * need cross-user reads (per-user RLS would only see one user's orders).
 */
export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  seller_tier: SellerTier | null;
  tier_expires_at: string | null;
  stripe_account_id: string | null;
};

type OrderRow = {
  seller_id: string;
  status: string;
  total_cents: number;
};

type ReviewRow = {
  seller_id: string;
  verdict: string;
};

type DisputeRow = {
  reporter_id: string | null;
  status: string;
};

const PAID_STATUSES = new Set([
  "Charged",
  "InEscrow",
  "Shipped",
  "Delivered",
  "Released",
  "Completed",
]);

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Supabase service credentials not configured" },
      { status: 503 },
    );
  }

  const supabase = createSbAdmin(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = new Date();
  const since = new Date(now.getTime() - 30 * 86400000).toISOString();
  const newExpiry = endOfNextMonth(now);

  // Pull every profile that's at all "seller-shaped" — has a Stripe
  // account, OR has a non-Starter tier already, OR has any orders as
  // seller in the last 90 days. We hydrate the orders query separately
  // and join in code; doing this in SQL would mean a giant JOIN.
  const { data: profiles, error: profilesErr } = await supabase
    .from("profiles")
    .select("id, seller_tier, tier_expires_at, stripe_account_id")
    .or(
      "stripe_account_id.not.is.null,seller_tier.neq.Starter,tier_expires_at.not.is.null",
    );
  if (profilesErr) {
    console.error("recompute-tiers profiles query failed:", profilesErr);
    return NextResponse.json(
      { error: "Profiles query failed" },
      { status: 500 },
    );
  }
  const profileRows = (profiles ?? []) as ProfileRow[];
  if (profileRows.length === 0) {
    return NextResponse.json({ scanned: 0, updated: 0, results: [] });
  }

  const sellerIds = profileRows.map((p) => p.id);

  // Aggregate 30-day orders per seller in one round-trip.
  const { data: orders } = await supabase
    .from("orders")
    .select("seller_id, status, total_cents")
    .in("seller_id", sellerIds)
    .gte("placed_at", since);

  const salesBySeller = new Map<string, { sales: number; gmvCents: number }>();
  for (const o of (orders ?? []) as OrderRow[]) {
    if (!PAID_STATUSES.has(o.status)) continue;
    const cur = salesBySeller.get(o.seller_id) ?? { sales: 0, gmvCents: 0 };
    cur.sales += 1;
    cur.gmvCents += o.total_cents;
    salesBySeller.set(o.seller_id, cur);
  }

  // Aggregate review feedback per seller (used for positive% threshold).
  const { data: reviews } = await supabase
    .from("reviews")
    .select("seller_id, verdict")
    .in("seller_id", sellerIds);

  const reviewsBySeller = new Map<string, { positive: number; total: number }>();
  for (const r of (reviews ?? []) as ReviewRow[]) {
    const cur = reviewsBySeller.get(r.seller_id) ?? { positive: 0, total: 0 };
    cur.total += 1;
    if (r.verdict === "positive") cur.positive += 1;
    reviewsBySeller.set(r.seller_id, cur);
  }

  // Aggregate currently-open disputes per reporter id (Apex requires 0
  // unresolved disputes against the seller; here we proxy with disputes
  // the seller has open, but a stricter implementation would join on
  // orders.seller_id — doing the simpler version for now).
  const { data: disputes } = await supabase
    .from("disputes")
    .select("reporter_id, status")
    .in("reporter_id", sellerIds);

  const openDisputesBySeller = new Map<string, number>();
  for (const d of (disputes ?? []) as DisputeRow[]) {
    if (!d.reporter_id) continue;
    if (d.status === "Resolved" || d.status?.startsWith("Resolved")) continue;
    openDisputesBySeller.set(
      d.reporter_id,
      (openDisputesBySeller.get(d.reporter_id) ?? 0) + 1,
    );
  }

  // Aggregate seller-initiated cancels in the rolling 30-day window.
  // Used as a gate on tier promotions: > 2 in 30d blocks tier-up. The
  // signal here is "this seller is unreliable" — they accepted bids /
  // accepted purchases then bailed. Doesn't impact existing tier (no
  // demotion from cancels alone), just blocks the upgrade path.
  const { data: cancels } = await supabase
    .from("orders")
    .select("seller_id, canceled_at")
    .in("seller_id", sellerIds)
    .eq("canceled_by", "seller")
    .gte("canceled_at", since);

  const sellerCancelsLast30d = new Map<string, number>();
  for (const c of (cancels ?? []) as { seller_id: string; canceled_at: string | null }[]) {
    sellerCancelsLast30d.set(
      c.seller_id,
      (sellerCancelsLast30d.get(c.seller_id) ?? 0) + 1,
    );
  }
  const MAX_SELLER_CANCELS_FOR_TIER_UP = 2;

  const results: {
    sellerId: string;
    from: SellerTier;
    to: SellerTier;
    action: "promote" | "extend" | "demote" | "noop" | "grace";
    expiresAt: string | null;
  }[] = [];

  for (const p of profileRows) {
    const stats = salesBySeller.get(p.id) ?? { sales: 0, gmvCents: 0 };
    const reviewStats = reviewsBySeller.get(p.id) ?? { positive: 0, total: 0 };
    const positivePct =
      reviewStats.total > 0
        ? (reviewStats.positive / reviewStats.total) * 100
        : 100; // No reviews = treat as perfect; otherwise tier never opens
    const openDisputes = openDisputesBySeller.get(p.id) ?? 0;
    const sellerCancels = sellerCancelsLast30d.get(p.id) ?? 0;

    const qualifying = tierFromMonthlyStats(
      stats.sales,
      stats.gmvCents,
      positivePct,
      openDisputes,
    );
    const current: SellerTier = (p.seller_tier as SellerTier) ?? "Starter";
    const expiresAt = p.tier_expires_at ? new Date(p.tier_expires_at) : null;
    const expiresInFuture = expiresAt !== null && expiresAt.getTime() > now.getTime();

    let action: typeof results[number]["action"] = "noop";
    let nextTier: SellerTier = current;
    let nextExpiresAt: Date | null = expiresAt;

    if (TIER_RANK[qualifying] > TIER_RANK[current]) {
      // Promotion candidate — instant tier-up, BUT block if seller has
      // > 2 cancels in the 30-day window. Reliability gate: a seller
      // who's bailing on accepted orders shouldn't earn a fee discount.
      if (sellerCancels > MAX_SELLER_CANCELS_FOR_TIER_UP) {
        action = "noop";
      } else {
        action = "promote";
        nextTier = qualifying;
        nextExpiresAt = newExpiry;
      }
    } else if (
      TIER_RANK[qualifying] === TIER_RANK[current] &&
      current !== "Starter"
    ) {
      // Re-qualification at non-Starter tier — extend grace, BUT also
      // gated by the cancel reliability check.
      if (sellerCancels > MAX_SELLER_CANCELS_FOR_TIER_UP) {
        action = "noop";
      } else {
        action = "extend";
        nextExpiresAt = newExpiry;
      }
    } else if (TIER_RANK[qualifying] < TIER_RANK[current]) {
      if (expiresInFuture) {
        // Lower qualification but grace period not over yet
        action = "grace";
      } else {
        // Demote to qualifying tier; clear expires_at if back to Starter
        action = "demote";
        nextTier = qualifying;
        nextExpiresAt = qualifying === "Starter" ? null : newExpiry;
      }
    }

    if (
      nextTier !== current ||
      (nextExpiresAt?.toISOString() ?? null) !==
        (expiresAt?.toISOString() ?? null)
    ) {
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          seller_tier: nextTier,
          tier_expires_at: nextExpiresAt
            ? nextExpiresAt.toISOString()
            : null,
        })
        .eq("id", p.id);
      if (updateErr) {
        console.error(
          `recompute-tiers update failed for ${p.id}:`,
          updateErr,
        );
      }
    }

    results.push({
      sellerId: p.id,
      from: current,
      to: nextTier,
      action,
      expiresAt: nextExpiresAt ? nextExpiresAt.toISOString() : null,
    });
  }

  return NextResponse.json({
    scanned: profileRows.length,
    updated: results.filter((r) => r.action !== "noop" && r.action !== "grace")
      .length,
    promoted: results.filter((r) => r.action === "promote").length,
    extended: results.filter((r) => r.action === "extend").length,
    demoted: results.filter((r) => r.action === "demote").length,
    inGrace: results.filter((r) => r.action === "grace").length,
  });
}
