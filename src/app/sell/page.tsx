import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCatalogWithPricing } from "@/lib/db";
import { SellForm } from "./sell-form";

export const dynamic = "force-dynamic";

export default async function SellPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/sell");

  // Gate the listing form on Stripe Connect being live. Without this, a seller
  // could list, get a buyer, and then the checkout would fail with "seller
  // hasn't finished setting up payments yet" — the buyer never gets paid in
  // and the marketplace looks broken. Better to block the listing upstream
  // and route the seller through onboarding first.
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "stripe_account_id, stripe_charges_enabled, stripe_details_submitted",
    )
    .eq("id", user.id)
    .maybeSingle();

  const canList = profile?.stripe_charges_enabled === true;

  if (!canList) {
    return (
      <PayoutsRequiredGate
        hasAccount={!!profile?.stripe_account_id}
        inProgress={
          !!profile?.stripe_account_id && !profile.stripe_charges_enabled
        }
      />
    );
  }

  // Catalog with lowest ask + last sale per SKU.
  const catalog = await getCatalogWithPricing();

  // Highest active bid per SKU — used by the smart-pricing card.
  const { data: bids } = await supabase
    .from("bids")
    .select("sku_id, price_cents")
    .eq("status", "Active");

  const highestBidMap: Record<string, number> = {};
  for (const b of bids ?? []) {
    const cur = highestBidMap[b.sku_id];
    if (cur === undefined || b.price_cents > cur) highestBidMap[b.sku_id] = b.price_cents;
  }

  return <SellForm catalog={catalog} highestBidMap={highestBidMap} />;
}

/**
 * Pre-listing gate. Shown when a seller hits /sell without a working Stripe
 * Connect account. Three states:
 *   - never started (no stripe_account_id) → "Set up payouts" CTA
 *   - in progress (account exists, charges_enabled=false) → "Finish onboarding"
 *   - rare third state where details_submitted but charges_enabled=false: same
 *     "Finish onboarding" copy works since they likely need to add a doc Stripe
 *     requested.
 */
function PayoutsRequiredGate({
  hasAccount,
  inProgress,
}: {
  hasAccount: boolean;
  inProgress: boolean;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-amber-700/30 bg-amber-500/10 text-amber-400">
        <Building2 size={28} />
      </div>
      <p className="mt-6 text-[10px] font-semibold tracking-[0.2em] text-amber-400/80 uppercase">
        One step before you list
      </p>
      <h1 className="font-display mt-1 text-3xl font-black tracking-tight text-white">
        Connect your bank to get paid
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">
        WaxDepot uses Stripe to hold buyer funds in escrow and pay you out
        when each box arrives sealed. We need your payout details before
        you can list — that way every listing is guaranteed to be fillable
        and buyers never hit a checkout dead end.
      </p>

      <ul className="mt-6 space-y-2 text-left text-sm text-white/80">
        <Bullet>Takes about 3 minutes — bank or debit card, address, SSN last 4</Bullet>
        <Bullet>You get paid 2 days after each delivery (Starter tier)</Bullet>
        <Bullet>Stripe-verified sellers get the verified badge on listings</Bullet>
        <Bullet>
          <span className="text-white/70">
            US sellers only — payouts are processed via Stripe Connect (US bank
            or debit card required).
          </span>
        </Bullet>
      </ul>

      <Link
        href="/sell/payouts"
        className="mt-8 inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-3 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400"
      >
        {inProgress ? "Finish onboarding" : "Set up payouts"}
        <ArrowRight size={14} />
      </Link>

      <Link
        href="/help/selling/get-paid"
        className="mt-4 inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
      >
        <ShieldCheck size={12} />
        Why we require this — read the explainer
      </Link>

      {hasAccount && !inProgress && (
        <p className="mt-6 text-[11px] text-white/50">
          Your Stripe account exists but charges aren&apos;t enabled yet — Stripe
          may need an extra document. Click above to finish.
        </p>
      )}
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
      <span>{children}</span>
    </li>
  );
}
