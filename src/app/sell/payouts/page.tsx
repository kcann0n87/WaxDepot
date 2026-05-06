import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Check,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_USER_TIER, TIER_FEE } from "@/lib/fees";
import {
  openStripeDashboardAndRedirect,
  refreshSellerStripeStatus,
  startOnboardingAndRedirect,
} from "@/app/actions/stripe-connect";

export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ stripe?: string; message?: string }>;
}) {
  const { stripe: stripeParam, message: errorMessage } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/sell/payouts");

  // If the user just returned from Stripe's hosted onboarding, refresh their
  // account state so the page reflects whether onboarding actually completed.
  if (stripeParam === "return" || stripeParam === "refresh") {
    await refreshSellerStripeStatus().catch(() => {});
  }

  const [{ data: profile }, { count: listingCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, display_name, stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("seller_id", user.id),
  ]);

  const hasAccount = !!profile?.stripe_account_id;
  const isReady =
    !!profile?.stripe_charges_enabled && !!profile?.stripe_payouts_enabled;
  const inProgress = hasAccount && !isReady;
  const isFirstTimeSeller = isReady && (listingCount ?? 0) === 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
        <Link href="/sell" className="hover:text-white">
          Sell
        </Link>
        <span>/</span>
        <span className="text-white">Payouts</span>
      </div>
      <div className="text-[10px] font-semibold tracking-[0.2em] text-amber-400/80 uppercase">
        Get paid
      </div>
      <h1 className="font-display mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
        Stripe Connect
      </h1>
      <p className="mt-1 text-white/60">
        We use Stripe to handle payouts, KYC, and tax forms. Setup takes about 3
        minutes — Stripe handles bank verification + identity, we just route the
        sale proceeds to your account.
      </p>

      {stripeParam === "error" && (
        <div className="mt-6 rounded-md border border-rose-700/40 bg-rose-500/10 p-4 text-sm text-rose-100">
          <strong className="text-rose-300">Stripe onboarding didn&apos;t start.</strong>{" "}
          {errorMessage ?? "Something went wrong. Try again, or contact support."}
          <p className="mt-2 text-xs text-rose-200/70">
            If this keeps happening, the platform&apos;s Stripe Connect
            capability may not be enabled yet. Check the Vercel function logs
            for the exact error.
          </p>
        </div>
      )}

      {/* Status card */}
      {!hasAccount && (
        <Card className="mt-8" tone="cta">
          <div className="flex items-start gap-4">
            <Glyph>
              <Zap size={20} />
            </Glyph>
            <div className="flex-1">
              <h2 className="font-display text-lg font-black text-white">
                Connect your Stripe account
              </h2>
              <p className="mt-1 text-sm text-white/60">
                You&apos;ll be sent to Stripe&apos;s secure onboarding page to
                verify your identity and link a bank account. We&apos;ll bring
                you back here when you&apos;re done.
              </p>
              <form action={startOnboardingAndRedirect} className="mt-4">
                <button className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2.5 text-sm font-bold text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400">
                  Connect Stripe
                  <ArrowRight size={14} />
                </button>
              </form>
            </div>
          </div>
        </Card>
      )}

      {inProgress && (
        <Card className="mt-8" tone="warn">
          <div className="flex items-start gap-4">
            <Glyph tone="warn">
              <Building2 size={20} />
            </Glyph>
            <div className="flex-1">
              <h2 className="font-display text-lg font-black text-white">
                Finish your Stripe setup
              </h2>
              <p className="mt-1 text-sm text-amber-200/80">
                Stripe still needs more info before we can route money to you.
                {profile.stripe_details_submitted
                  ? " Your submission is being verified — this can take a few minutes."
                  : " Pick up where you left off."}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-amber-200/80">
                <Capability
                  label="Accept charges"
                  ok={!!profile.stripe_charges_enabled}
                />
                <Capability
                  label="Receive payouts"
                  ok={!!profile.stripe_payouts_enabled}
                />
              </div>
              <form action={startOnboardingAndRedirect} className="mt-4">
                <button className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2.5 text-sm font-bold text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400">
                  Continue setup
                  <ArrowRight size={14} />
                </button>
              </form>
            </div>
          </div>
        </Card>
      )}

      {isReady && (
        <Card className="mt-8" tone="success">
          <div className="flex items-start gap-4">
            <Glyph tone="success">
              <Check size={20} />
            </Glyph>
            <div className="flex-1">
              <h2 className="font-display text-lg font-black text-white">
                {isFirstTimeSeller
                  ? "You're set up — let's get a box listed"
                  : "Stripe is connected"}
              </h2>
              <p className="mt-1 text-sm text-emerald-200/80">
                {isFirstTimeSeller
                  ? "Stripe verified. Head to /sell to put your first box on the order book — buyers can hit your ask or send you a bid you can accept."
                  : "You're fully set up. Sales proceeds will hit your linked account on the schedule below."}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-emerald-200/80">
                <Capability label="Accept charges" ok />
                <Capability label="Receive payouts" ok />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {isFirstTimeSeller && (
                  <Link
                    href="/sell"
                    className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2.5 text-sm font-bold text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400"
                  >
                    List your first box
                    <ArrowRight size={14} />
                  </Link>
                )}
                {!isFirstTimeSeller && (
                  <Link
                    href="/sell"
                    className="inline-flex items-center gap-1.5 rounded-md bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-amber-300"
                  >
                    List a box
                    <ArrowRight size={14} />
                  </Link>
                )}
                <form action={openStripeDashboardAndRedirect}>
                  <button className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-amber-400/40 hover:bg-amber-500/10 hover:text-amber-300">
                    Open Stripe dashboard
                    <ExternalLink size={12} />
                  </button>
                </form>
                <form action={startOnboardingAndRedirect}>
                  <button className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-[#101012] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/[0.02]">
                    Update banking info
                  </button>
                </form>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tier + payout schedule reminder */}
      <Card className="mt-6">
        <div className="flex items-start gap-4">
          <Glyph>
            <CreditCard size={20} />
          </Glyph>
          <div className="flex-1">
            <h2 className="font-display text-base font-black text-white">
              Your tier · {CURRENT_USER_TIER}
            </h2>
            <p className="mt-1 text-sm text-white/60">
              Flat seller fee: {(TIER_FEE[CURRENT_USER_TIER] * 100).toFixed(0)}%
              of the sale price. No buyer fees, no separate processing line —
              we absorb Stripe&apos;s 2.9% + $0.30 inside the seller fee.
            </p>
            <ul className="mt-3 space-y-1 text-xs text-white/60">
              <li>
                <strong className="text-white/90">Starter (12%):</strong>{" "}
                weekly Friday payout, default for every new seller
              </li>
              <li>
                <strong className="text-white/90">Pro (10%):</strong> twice
                weekly, ≥30 sales OR ≥$5k in 30 days &amp; 99%+ rating
              </li>
              <li>
                <strong className="text-white/90">Elite (8%):</strong> every 3
                days, ≥150 sales OR ≥$10k in 30 days &amp; 99.5%+ rating
              </li>
              <li>
                <strong className="text-white/90">Apex (6%):</strong> next
                business day, ≥1000 sales OR ≥$100k in 30 days, 0 disputes
              </li>
            </ul>
            <Link
              href="/sell/tiers"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-300 hover:text-amber-200"
            >
              Full tier breakdown · examples · how it works →
            </Link>
          </div>
        </div>
      </Card>

      {/* Trust + privacy */}
      <div className="mt-6 flex items-start gap-2 rounded-md border border-white/10 bg-white/[0.02] px-3 py-2.5 text-xs text-white/60">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-400" />
        <span>
          WaxDepot never stores your full bank or SSN. Stripe is PCI-DSS Level 1
          and handles all KYC, tax forms, and bank verification — we just
          forward your sale proceeds.
        </span>
      </div>
    </div>
  );
}

function Card({
  children,
  className = "",
  tone = "neutral",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "neutral" | "cta" | "warn" | "success";
}) {
  const ring =
    tone === "cta"
      ? "border-amber-700/40 bg-gradient-to-br from-amber-500/10 to-transparent"
      : tone === "warn"
        ? "border-amber-700/40 bg-amber-500/5"
        : tone === "success"
          ? "border-emerald-700/40 bg-emerald-500/5"
          : "border-white/10 bg-[#101012]";
  return (
    <div className={`rounded-xl border p-6 ${ring} ${className}`}>{children}</div>
  );
}

function Glyph({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warn" | "success";
}) {
  const cls =
    tone === "warn"
      ? "bg-amber-500/15 text-amber-300"
      : tone === "success"
        ? "bg-emerald-500/15 text-emerald-300"
        : "bg-amber-500/10 text-amber-300";
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${cls}`}>
      {children}
    </div>
  );
}

function Capability({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 ${
        ok
          ? "border-emerald-700/40 bg-emerald-500/10 text-emerald-300"
          : "border-white/10 bg-white/[0.02] text-white/50"
      }`}
    >
      {ok ? <Check size={11} /> : <span className="text-white/50">○</span>}
      <span className="text-[11px] font-semibold">{label}</span>
    </div>
  );
}
