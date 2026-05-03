import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpRight,
  DollarSign,
  Package,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { CURRENT_USER_TIER, TIER_FEE, TIER_PAYOUT_CADENCE, TIER_THRESHOLDS } from "@/lib/fees";
import { SalesChart } from "@/components/analytics-chart";
import { SkuThumb } from "@/components/sku-thumb";
import { formatUSD, formatUSDFull } from "@/lib/utils";

const PERIOD_DAYS = 30;

type SkuJoin = {
  id: string;
  slug: string;
  year: number;
  brand: string;
  product: string;
  image_url: string | null;
  gradient_from: string | null;
  gradient_to: string | null;
};

type OrderRow = {
  id: string;
  total_cents: number;
  price_cents: number;
  status: string;
  placed_at: string;
  released_at: string | null;
  sku: SkuJoin | SkuJoin[] | null;
};

export default async function SellerAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/analytics");

  // Pull profile for tier-progress + Stripe account id
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled",
    )
    .eq("id", user.id)
    .maybeSingle();

  const sinceIso = new Date(
    Date.now() - PERIOD_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const prevSinceIso = new Date(
    Date.now() - 2 * PERIOD_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [{ data: ordersRaw }, { count: activeListingsCount }, reviewsRes] =
    await Promise.all([
      supabase
        .from("orders")
        .select(
          "id, total_cents, price_cents, status, placed_at, released_at, sku:skus!orders_sku_id_fkey(id, slug, year, brand, product, image_url, gradient_from, gradient_to)",
        )
        .eq("seller_id", user.id)
        .gte("placed_at", prevSinceIso)
        .order("placed_at", { ascending: true }),
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", user.id)
        .eq("status", "Active"),
      supabase
        .from("reviews")
        .select("verdict")
        .eq("seller_id", user.id)
        .gte("created_at", sinceIso),
    ]);

  const orders = (ordersRaw ?? []) as unknown as OrderRow[];
  const periodStart = new Date(sinceIso);

  // Split by current period vs previous period for week-over-week deltas
  const current = orders.filter((o) => new Date(o.placed_at) >= periodStart);
  const previous = orders.filter((o) => new Date(o.placed_at) < periodStart);

  const currentRevenue = current.reduce(
    (s, o) => s + (countsAsPaid(o.status) ? o.total_cents : 0),
    0,
  );
  const previousRevenue = previous.reduce(
    (s, o) => s + (countsAsPaid(o.status) ? o.total_cents : 0),
    0,
  );
  const orderCount = current.filter((o) => countsAsPaid(o.status)).length;
  const previousOrderCount = previous.filter((o) => countsAsPaid(o.status)).length;
  const avgOrderValue = orderCount > 0 ? currentRevenue / orderCount : 0;
  const previousAvg = previousOrderCount > 0 ? previousRevenue / previousOrderCount : 0;

  const revenueDelta =
    previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : null;
  const orderDelta =
    previousOrderCount > 0
      ? ((orderCount - previousOrderCount) / previousOrderCount) * 100
      : null;
  const avgDelta =
    previousAvg > 0 ? ((avgOrderValue - previousAvg) / previousAvg) * 100 : null;

  // Build the daily revenue series — every day in the window, even zeroes,
  // so the chart shows a real timeline.
  const series = buildDailySeries(current, PERIOD_DAYS);

  // Top SKUs by revenue
  const skuStats = new Map<string, { sku: SkuJoin; revenue: number; units: number }>();
  for (const o of current) {
    if (!countsAsPaid(o.status)) continue;
    const sku = Array.isArray(o.sku) ? o.sku[0] : o.sku;
    if (!sku) continue;
    const acc = skuStats.get(sku.id) ?? { sku, revenue: 0, units: 0 };
    acc.revenue += o.total_cents;
    acc.units += 1;
    skuStats.set(sku.id, acc);
  }
  const topSkus = Array.from(skuStats.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Pull Stripe pending balance for the seller's connected account
  let pendingPayoutCents: number | null = null;
  let availableCents: number | null = null;
  if (stripe && profile?.stripe_account_id && profile.stripe_charges_enabled) {
    try {
      const balance = await stripe.balance.retrieve(
        {},
        { stripeAccount: profile.stripe_account_id },
      );
      pendingPayoutCents = balance.pending.reduce(
        (s, b) => s + (b.currency === "usd" ? b.amount : 0),
        0,
      );
      availableCents = balance.available.reduce(
        (s, b) => s + (b.currency === "usd" ? b.amount : 0),
        0,
      );
    } catch (e) {
      console.error("Stripe balance lookup failed:", e);
    }
  }

  // Tier progress (rolling 30 days). Each tier has OR logic on
  // (sales count | GMV cents) plus a positive-feedback floor.
  const reviews = (reviewsRes.data ?? []) as { verdict: string }[];
  const positivePct =
    reviews.length > 0
      ? (reviews.filter((r) => r.verdict === "positive").length / reviews.length) * 100
      : null;
  const gmvCents = currentRevenue;
  const eligibleFor = (
    threshold: { sales: number; gmvCents: number; positivePct: number },
  ): boolean =>
    (orderCount >= threshold.sales || gmvCents >= threshold.gmvCents) &&
    (positivePct ?? 0) >= threshold.positivePct;
  const onTrackForPro = eligibleFor(TIER_THRESHOLDS.Pro);
  const onTrackForElite = eligibleFor(TIER_THRESHOLDS.Elite);
  const onTrackForApex = eligibleFor(TIER_THRESHOLDS.Apex);
  // Show progress vs whichever path (sales OR gmv) is closer to qualifying.
  const tierProgress = (t: { sales: number; gmvCents: number }) =>
    Math.min(
      Math.max(orderCount / t.sales, gmvCents / t.gmvCents),
      1,
    );
  const tierLabel = (
    t: { sales: number; gmvCents: number; positivePct: number },
    eligible: boolean,
  ) => {
    if (eligible) return "Eligible — kicks in next month";
    const salesGap = Math.max(0, t.sales - orderCount);
    const gmvGapDollars = Math.max(0, (t.gmvCents - gmvCents) / 100);
    const fdbk = `${(positivePct ?? 0).toFixed(1)}%/${t.positivePct}% positive`;
    return `${salesGap} more sales OR ${formatUSD(gmvGapDollars)} more in GMV · ${fdbk}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
        <Link href="/account" className="inline-flex items-center gap-1 hover:text-white">
          <ArrowLeft size={14} /> Account
        </Link>
        <span>/</span>
        <span className="text-white">Seller dashboard</span>
      </div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.2em] text-amber-400/80 uppercase">
            Sell side
          </div>
          <h1 className="font-display mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Seller dashboard
          </h1>
          <p className="text-sm text-white/50">
            Last {PERIOD_DAYS} days · across all your listings
          </p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI
          icon={<DollarSign size={16} />}
          label="Revenue"
          value={formatUSD(currentRevenue / 100)}
          delta={revenueDelta}
          accent="emerald"
        />
        <KPI
          icon={<Package size={16} />}
          label="Orders"
          value={String(orderCount)}
          delta={orderDelta}
        />
        <KPI
          icon={<TrendingUp size={16} />}
          label="Avg order value"
          value={orderCount > 0 ? formatUSD(avgOrderValue / 100) : "—"}
          delta={avgDelta}
        />
        <KPI
          icon={<Package size={16} />}
          label="Active listings"
          value={String(activeListingsCount ?? 0)}
        />
      </div>

      {/* Pending payouts strip */}
      {(pendingPayoutCents !== null || availableCents !== null) && (
        <Link
          href="/sell/payouts"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-700/40 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent px-5 py-4 transition hover:border-emerald-700/70"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
              <ArrowDownToLine size={18} />
            </div>
            <div>
              <div className="text-[10px] font-semibold tracking-wider text-emerald-300/80 uppercase">
                Stripe balance
              </div>
              <div className="font-display text-base font-black text-white">
                {pendingPayoutCents !== null
                  ? `${formatUSDFull((pendingPayoutCents ?? 0) / 100)} pending`
                  : "—"}
                {availableCents !== null && (
                  <span className="ml-2 text-sm font-semibold text-emerald-300">
                    · {formatUSDFull((availableCents ?? 0) / 100)} ready
                  </span>
                )}
              </div>
              <div className="text-xs text-white/50">
                {TIER_PAYOUT_CADENCE[CURRENT_USER_TIER]} · auto-released to your bank
              </div>
            </div>
          </div>
          <ArrowUpRight size={14} className="text-emerald-300" />
        </Link>
      )}

      {/* Daily revenue chart */}
      <section className="mb-8 rounded-xl border border-white/10 bg-[#101012] p-5">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-base font-black text-white">Daily revenue</h2>
            <p className="text-xs text-white/50">
              {orderCount === 0
                ? "No sales yet — list a box to get started"
                : `${formatUSDFull(currentRevenue / 100)} across ${orderCount} ${orderCount === 1 ? "order" : "orders"}`}
            </p>
          </div>
        </div>
        <SalesChart
          data={series.map((p) => ({
            date: p.date,
            revenue: p.revenueCents / 100,
            orders: p.orders,
          }))}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top SKUs */}
        <section className="rounded-xl border border-white/10 bg-[#101012] p-5">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-display text-base font-black text-white">Top sellers</h2>
              <p className="text-xs text-white/50">By revenue, last {PERIOD_DAYS}d</p>
            </div>
          </div>
          {topSkus.length === 0 ? (
            <div className="rounded-md border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/50">
              No sold orders yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {topSkus.map((row, i) => (
                <li key={row.sku.id} className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-bold text-white/80">
                    {i + 1}
                  </div>
                  <SkuThumb sku={row.sku} className="h-9 w-7 rounded" alt={`${row.sku.year} ${row.sku.brand} ${row.sku.product}`} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/product/${row.sku.slug}`}
                      className="line-clamp-1 text-sm font-semibold text-white transition hover:text-amber-300"
                    >
                      {row.sku.year} {row.sku.brand} {row.sku.product}
                    </Link>
                    <div className="text-xs text-white/50">
                      {row.units} sold
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-display text-sm font-black text-amber-400">
                      {formatUSD(row.revenue / 100)}
                    </div>
                    <div className="text-[10px] text-white/60">revenue</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Tier progress */}
        <section className="rounded-xl border border-white/10 bg-[#101012] p-5">
          <div className="mb-4">
            <h2 className="font-display text-base font-black text-white">Tier progress</h2>
            <p className="text-xs text-white/50">
              You&apos;re on{" "}
              <strong className="text-amber-300">{CURRENT_USER_TIER}</strong> ·{" "}
              {(TIER_FEE[CURRENT_USER_TIER] * 100).toFixed(0)}% seller fee
            </p>
          </div>
          <div className="space-y-4 text-sm">
            <TierRow
              tier="Pro"
              fee={TIER_FEE.Pro}
              cadence={TIER_PAYOUT_CADENCE.Pro}
              progress={tierProgress(TIER_THRESHOLDS.Pro)}
              progressLabel={tierLabel(TIER_THRESHOLDS.Pro, onTrackForPro)}
              done={onTrackForPro}
            />
            <TierRow
              tier="Elite"
              fee={TIER_FEE.Elite}
              cadence={TIER_PAYOUT_CADENCE.Elite}
              progress={tierProgress(TIER_THRESHOLDS.Elite)}
              progressLabel={tierLabel(TIER_THRESHOLDS.Elite, onTrackForElite)}
              done={onTrackForElite}
            />
            <TierRow
              tier="Apex"
              fee={TIER_FEE.Apex}
              cadence={TIER_PAYOUT_CADENCE.Apex}
              progress={tierProgress(TIER_THRESHOLDS.Apex)}
              progressLabel={tierLabel(TIER_THRESHOLDS.Apex, onTrackForApex)}
              done={onTrackForApex}
            />
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-md border border-white/10 bg-white/[0.02] p-3 text-[11px] text-white/60">
            <ShieldCheck size={12} className="mt-0.5 text-emerald-400" />
            <span>
              Tier reviews run on the rolling 30-day window. We absorb Stripe&apos;s
              2.9% + 30¢ inside the seller fee — no separate processing line.
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

function countsAsPaid(status: string) {
  return ["Charged", "InEscrow", "Shipped", "Delivered", "Released", "Completed"].includes(status);
}

function buildDailySeries(orders: OrderRow[], days: number) {
  const buckets = new Map<string, { revenueCents: number; orders: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { revenueCents: 0, orders: 0 });
  }
  for (const o of orders) {
    if (!countsAsPaid(o.status)) continue;
    const key = o.placed_at.slice(0, 10);
    const acc = buckets.get(key);
    if (!acc) continue;
    acc.revenueCents += o.total_cents;
    acc.orders += 1;
  }
  return Array.from(buckets.entries()).map(([date, v]) => ({
    date,
    revenueCents: v.revenueCents,
    orders: v.orders,
  }));
}

function KPI({
  icon,
  label,
  value,
  delta,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta?: number | null;
  accent?: "emerald";
}) {
  const tone = accent === "emerald" ? "text-emerald-300" : "text-white";
  return (
    <div className="rounded-xl border border-white/10 bg-[#101012] p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.15em] text-white/50 uppercase">
        <span className="text-white/60">{icon}</span>
        {label}
      </div>
      <div className={`font-display mt-1.5 text-2xl font-black tracking-tight ${tone}`}>
        {value}
      </div>
      {delta !== undefined && delta !== null && (
        <div
          className={`mt-1 inline-flex items-center gap-0.5 rounded text-[11px] font-semibold ${
            delta >= 0 ? "text-emerald-300" : "text-rose-300"
          }`}
        >
          {delta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {delta >= 0 ? "+" : ""}
          {delta.toFixed(1)}%
        </div>
      )}
      {(delta === undefined || delta === null) && (
        <div className="mt-1 text-[11px] text-white/50">No prior data</div>
      )}
    </div>
  );
}

function TierRow({
  tier,
  fee,
  cadence,
  progress,
  progressLabel,
  done,
}: {
  tier: string;
  fee: number;
  cadence: string;
  progress: number;
  progressLabel: string;
  done: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <span className="font-display text-base font-black text-white">{tier}</span>
          <span className="ml-2 text-xs text-white/50">
            {(fee * 100).toFixed(0)}% fee · {cadence}
          </span>
        </div>
        {done && (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase">
            Eligible
          </span>
        )}
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full ${
            done ? "bg-emerald-400" : "bg-amber-400"
          }`}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      <div className="mt-1 text-[11px] text-white/50">{progressLabel}</div>
    </div>
  );
}
