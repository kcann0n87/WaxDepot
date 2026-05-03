import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Check,
  Crown,
  Gem,
  Star,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { getProfile } from "@/lib/supabase/user";
import { getSellerTierStats } from "@/lib/db";
import {
  TIER_FEE,
  TIER_PAYOUT_CADENCE,
  TIER_THRESHOLDS,
  type SellerTier,
} from "@/lib/fees";
import { formatUSDFull } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Seller Tiers · WaxDepot",
  description:
    "Earn lower seller fees as you grow. WaxDepot's 4-tier program — Starter, Pro, Elite, Apex — rewards both sales volume and revenue. No listing fees, no monthly fees.",
};

const TIER_ICON: Record<SellerTier, typeof Star> = {
  Starter: Star,
  Pro: TrendingUp,
  Elite: Trophy,
  Apex: Crown,
};

const TIER_COLOR: Record<
  SellerTier,
  { ring: string; text: string; bg: string; soft: string; bar: string }
> = {
  Starter: {
    ring: "border-white/15",
    text: "text-white",
    bg: "bg-white/5",
    soft: "from-white/5 to-transparent",
    bar: "bg-white/40",
  },
  Pro: {
    ring: "border-sky-500/40",
    text: "text-sky-300",
    bg: "bg-sky-500/15",
    soft: "from-sky-500/10 to-transparent",
    bar: "bg-sky-400",
  },
  Elite: {
    ring: "border-amber-400/50",
    text: "text-amber-300",
    bg: "bg-amber-500/15",
    soft: "from-amber-500/10 to-transparent",
    bar: "bg-amber-400",
  },
  Apex: {
    ring: "border-fuchsia-500/50",
    text: "text-fuchsia-300",
    bg: "bg-fuchsia-500/15",
    soft: "from-fuchsia-500/10 to-transparent",
    bar: "bg-fuchsia-400",
  },
};

const TIER_BLURB: Record<SellerTier, string> = {
  Starter: "Your starting tier the moment you create a listing.",
  Pro: "For sellers who've moved past the hobbyist phase.",
  Elite: "For real operators — LCS owners, full-time resellers.",
  Apex: "Reserved for the top sellers in the marketplace.",
};

export default async function TiersPage() {
  // Live tier tracker for signed-in users — shown right under the hero so
  // sellers can see their current tier and the gap to the next one without
  // hunting through the tier cards below.
  const profile = await getProfile();
  let stats: { salesLast30d: number; gmvLast30dCents: number } | null = null;
  if (profile) {
    try {
      stats = await getSellerTierStats(profile.id);
    } catch (e) {
      console.error("getSellerTierStats failed on /sell/tiers:", e);
    }
  }
  const currentTier: SellerTier =
    (profile?.seller_tier as SellerTier | null) ?? "Starter";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Hero */}
      <div className="text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-amber-700/30 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-amber-300 uppercase">
          <Gem size={11} />
          Seller program
        </p>
        <h1 className="font-display mx-auto mt-4 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl">
          Earn lower fees as you grow
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/70">
          Four tiers. Move up automatically when you hit{" "}
          <strong className="text-white">either</strong> a sales-count{" "}
          <strong className="text-white">or</strong> a sales-volume threshold in
          the last 30 days. No listing fees, no monthly fees, no payment
          processing surcharges — Stripe is on us.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/sell"
            className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-3 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400"
          >
            Start selling <ArrowRight size={14} />
          </Link>
          <Link
            href="/help/selling/get-paid"
            className="text-sm font-semibold text-white/70 hover:text-amber-300"
          >
            How payouts work →
          </Link>
        </div>
      </div>

      {/* Live tracker — only rendered when signed in. */}
      {profile && stats && (
        <TierTracker
          currentTier={currentTier}
          salesLast30d={stats.salesLast30d}
          gmvLast30dCents={stats.gmvLast30dCents}
          displayName={profile.display_name}
        />
      )}

      {/* The 4 tier cards */}
      <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {(["Starter", "Pro", "Elite", "Apex"] as SellerTier[]).map((tier) => {
          const Icon = TIER_ICON[tier];
          const colors = TIER_COLOR[tier];
          const t =
            tier === "Starter"
              ? null
              : TIER_THRESHOLDS[tier as Exclude<SellerTier, "Starter">];
          return (
            <div
              key={tier}
              className={`relative rounded-2xl border bg-gradient-to-b p-5 ${colors.ring} ${colors.soft} from-[8%]`}
            >
              <div
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${colors.bg} ${colors.text}`}
              >
                <Icon size={18} />
              </div>
              <h2 className="font-display mt-3 text-2xl font-black text-white">
                {tier}
              </h2>
              <p className="mt-1 text-xs text-white/60">{TIER_BLURB[tier]}</p>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span
                  className={`font-display text-4xl font-black ${colors.text}`}
                >
                  {(TIER_FEE[tier] * 100).toFixed(0)}%
                </span>
                <span className="text-xs text-white/50">seller fee</span>
              </div>
              <ul className="mt-4 space-y-2 text-xs text-white/80">
                {t === null ? (
                  <>
                    <Bullet>Available the moment you list</Bullet>
                    <Bullet>{TIER_PAYOUT_CADENCE[tier]} payouts</Bullet>
                    <Bullet>Full Buyer Protection on your sales</Bullet>
                  </>
                ) : (
                  <>
                    <Bullet>
                      <strong className="text-white">{t.sales}</strong> sales{" "}
                      <em className="text-white/50">or</em>{" "}
                      <strong className="text-white">
                        ${(t.gmvCents / 100).toLocaleString()}
                      </strong>{" "}
                      in 30 days
                    </Bullet>
                    <Bullet>
                      <strong className="text-white">{t.positivePct}%</strong>+
                      positive feedback
                    </Bullet>
                    {tier === "Apex" && (
                      <Bullet>Zero unresolved disputes</Bullet>
                    )}
                    <Bullet>{TIER_PAYOUT_CADENCE[tier]} payouts</Bullet>
                  </>
                )}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Real-world examples */}
      <div className="mt-14">
        <h2 className="font-display text-2xl font-black tracking-tight text-white">
          What tier would you be?
        </h2>
        <p className="mt-1 text-sm text-white/60">
          Real-world examples based on your last 30 days of activity.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <ExampleCard
            persona="Casual flipper"
            stats="5 hobby boxes at $80 each = $400"
            tier="Starter"
            reason="Below the Pro threshold on both sales (30) and GMV ($5k)."
          />
          <ExampleCard
            persona="Active hobbyist"
            stats="40 hobby boxes at $90 each = $3,600"
            tier="Pro"
            reason="Hits 30 sales threshold. Doesn't need to hit the GMV bar."
          />
          <ExampleCard
            persona="Premium dealer"
            stats="3 cases at $5,000 each = $15,000"
            tier="Elite"
            reason="Hits $10k GMV threshold despite only 3 transactions."
          />
          <ExampleCard
            persona="High-volume LCS"
            stats="200 hobby boxes at $80 each = $16,000"
            tier="Elite"
            reason="Hits both 150 sales AND $10k GMV thresholds."
          />
          <ExampleCard
            persona="Whale dealer"
            stats="12 cases at $9,000 each = $108,000"
            tier="Apex"
            reason="Crosses $100k GMV with only 12 transactions."
          />
          <ExampleCard
            persona="Power seller"
            stats="1,200 hobby boxes at $90 each = $108,000"
            tier="Apex"
            reason="Crosses BOTH 1,000 sales AND $100k GMV thresholds."
          />
        </div>
      </div>

      {/* How it works */}
      <div className="mt-14 rounded-2xl border border-white/10 bg-[#101012] p-6 sm:p-8">
        <h2 className="font-display text-2xl font-black tracking-tight text-white">
          How tier review works
        </h2>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Step
            n="1"
            title="Rolling 30-day window"
            body="Every night at midnight UTC we recalculate your tier based on your last 30 days of completed sales — not lifetime stats. Drop off and you'll move down the next month; ramp up and you'll move up."
          />
          <Step
            n="2"
            title="OR logic, not AND"
            body="You qualify by hitting EITHER the sales count OR the GMV threshold for the tier. Lots of small orders or a few big ones — both paths count."
          />
          <Step
            n="3"
            title="Feedback floor protects buyers"
            body="Tier upgrades require maintaining the positive-feedback bar (99% for Pro, 99.5% for Elite and Apex). Quality has to come with quantity."
          />
          <Step
            n="4"
            title="No retroactive fees"
            body="Tier changes apply going forward only. A sale completed at Pro stays at the Pro fee even if you later drop back to Starter. We never reach back to recharge."
          />
        </div>
      </div>

      {/* What's NOT a fee */}
      <div className="mt-10 rounded-2xl border border-emerald-700/30 bg-gradient-to-br from-emerald-500/[0.06] to-transparent p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
            <Check size={20} />
          </div>
          <div>
            <h2 className="font-display text-xl font-black tracking-tight text-white">
              No surprise fees
            </h2>
            <p className="mt-1 text-sm text-white/70">
              The seller fee above is the <strong className="text-white">only</strong>{" "}
              thing we deduct from your payout. We don&apos;t charge for any of:
            </p>
            <ul className="mt-3 grid grid-cols-1 gap-1.5 text-xs text-white/80 sm:grid-cols-2">
              <NoFee>Listing creation</NoFee>
              <NoFee>Monthly subscription</NoFee>
              <NoFee>Payment processing (we absorb Stripe)</NoFee>
              <NoFee>Bid acceptance</NoFee>
              <NoFee>Photo uploads</NoFee>
              <NoFee>Storefront customization</NoFee>
            </ul>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-14 rounded-2xl border border-amber-700/30 bg-gradient-to-r from-amber-500/[0.08] via-amber-500/[0.04] to-transparent p-7 text-center sm:p-10">
        <h2 className="font-display text-3xl font-black tracking-tight text-white">
          Ready to start?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/70">
          Connect your bank in ~3 minutes. List your first box. The faster you
          ramp, the faster your fee drops.
        </p>
        <div className="mt-6">
          <Link
            href="/sell"
            className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400"
          >
            Open my Sell page <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Personal tier tracker shown to signed-in sellers near the top of the
 * page. Bigger and more detailed than the dropdown badge — exposes BOTH
 * qualification paths (sales count AND GMV) as separate progress bars
 * so the seller can see exactly where they are on each axis.
 */
function TierTracker({
  currentTier,
  salesLast30d,
  gmvLast30dCents,
  displayName,
}: {
  currentTier: SellerTier;
  salesLast30d: number;
  gmvLast30dCents: number;
  displayName: string;
}) {
  const next: SellerTier | null =
    currentTier === "Starter"
      ? "Pro"
      : currentTier === "Pro"
        ? "Elite"
        : currentTier === "Elite"
          ? "Apex"
          : null;
  const t = next
    ? TIER_THRESHOLDS[next as Exclude<SellerTier, "Starter">]
    : null;

  const Icon = TIER_ICON[currentTier];
  const colors = TIER_COLOR[currentTier];

  return (
    <div className="mx-auto mt-10 max-w-3xl">
      <div
        className={`overflow-hidden rounded-2xl border bg-gradient-to-br p-6 ${colors.ring} ${colors.soft} from-[8%]`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-semibold tracking-[0.18em] text-white/50 uppercase">
              {displayName} · last 30 days
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${colors.bg} ${colors.text}`}
              >
                <Icon size={18} />
              </span>
              <h2 className="font-display text-2xl font-black text-white">
                {currentTier}
              </h2>
              <span className="text-sm text-white/50">
                · {(TIER_FEE[currentTier] * 100).toFixed(0)}% seller fee
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold tracking-wider text-white/50 uppercase">
              30-day stats
            </div>
            <div className="mt-1 text-sm text-white">
              <strong>{salesLast30d}</strong> sales ·{" "}
              <strong>{formatUSDFull(gmvLast30dCents / 100)}</strong>
            </div>
          </div>
        </div>

        {next && t ? (
          <div className="mt-5">
            <div className="mb-2 text-xs text-white/70">
              Hit <strong className="text-white">EITHER</strong> threshold to
              unlock <strong className={TIER_COLOR[next].text}>{next}</strong>{" "}
              ({(TIER_FEE[next] * 100).toFixed(0)}% fee):
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ProgressRow
                label="Sales count"
                current={salesLast30d}
                target={t.sales}
                formatter={(n) => n.toLocaleString()}
                tier={next}
              />
              <ProgressRow
                label="Sales volume"
                current={gmvLast30dCents}
                target={t.gmvCents}
                formatter={(n) => formatUSDFull(n / 100)}
                tier={next}
              />
            </div>
            <p className="mt-3 text-[11px] text-white/60">
              You also need <strong className="text-white">{t.positivePct}%+</strong>{" "}
              positive feedback
              {next === "Apex" && (
                <> and <strong className="text-white">zero unresolved disputes</strong></>
              )}
              .
            </p>
          </div>
        ) : (
          <div className="mt-5 rounded-md border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-2 text-xs text-fuchsia-200">
            👑 You&apos;re at the top tier — lowest fee on the platform. Keep
            disputes at zero to stay here.
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  current,
  target,
  formatter,
  tier,
}: {
  label: string;
  current: number;
  target: number;
  formatter: (n: number) => string;
  tier: SellerTier;
}) {
  const pct = Math.min(current / target, 1);
  const done = current >= target;
  const colors = TIER_COLOR[tier];
  return (
    <div className="rounded-lg border border-white/10 bg-[#101012] p-3">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold text-white/70">{label}</span>
        <span className={done ? colors.text + " font-bold" : "text-white/60"}>
          {formatter(current)} / {formatter(target)}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full transition-all ${done ? "bg-emerald-400" : colors.bar}`}
          style={{ width: `${Math.round(pct * 100)}%` }}
        />
      </div>
      {done && (
        <div className="mt-1.5 text-[11px] font-semibold text-emerald-400">
          ✓ Threshold cleared
        </div>
      )}
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check size={12} className="mt-1 shrink-0 text-emerald-400" />
      <span>{children}</span>
    </li>
  );
}

function NoFee({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1.5">
      <Check size={11} className="shrink-0 text-emerald-400" />
      <span>{children}</span>
    </li>
  );
}

function ExampleCard({
  persona,
  stats,
  tier,
  reason,
}: {
  persona: string;
  stats: string;
  tier: SellerTier;
  reason: string;
}) {
  const colors = TIER_COLOR[tier];
  return (
    <div className="rounded-xl border border-white/10 bg-[#101012] p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold text-white">{persona}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${colors.bg} ${colors.text}`}
        >
          {tier} · {(TIER_FEE[tier] * 100).toFixed(0)}%
        </span>
      </div>
      <div className="mt-1.5 text-xs text-white/60">{stats}</div>
      <div className="mt-3 border-t border-white/5 pt-2 text-[11px] text-white/50">
        {reason}
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xs font-bold text-amber-300">
        {n}
      </div>
      <div>
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-white/60">{body}</p>
      </div>
    </div>
  );
}
