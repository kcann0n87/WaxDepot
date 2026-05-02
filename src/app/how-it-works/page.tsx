import Link from "next/link";
import {
  ArrowRight,
  CreditCard,
  Package,
  PackageCheck,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Truck,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How it works · WaxDepot",
  description:
    "How WaxDepot's stock-market-style marketplace works for sealed sports wax. Real bid/ask, escrow on every order, payouts when boxes arrive sealed.",
};

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <p className="text-[10px] font-semibold tracking-[0.2em] text-amber-400/80 uppercase">
        How it works
      </p>
      <h1 className="font-display mt-1 text-4xl font-black tracking-tight text-white sm:text-5xl">
        Trade sealed wax like stocks.
      </h1>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-white/70">
        WaxDepot is a live order book for sealed sports card boxes. Every
        product has a real bid, a real ask, and real escrow. No flea-market
        guesswork, no eBay tax, no fake boxes.
      </p>

      {/* Three-step buyer flow */}
      <section className="mt-12">
        <p className="mb-4 text-[10px] font-semibold tracking-[0.18em] text-white/50 uppercase">
          For buyers
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Step
            n={1}
            icon={<CreditCard size={22} />}
            title="Place a bid or buy at ask"
            body="Every product shows the lowest ask, highest bid, and recent sales. Buy instantly at the lowest ask, or place a bid below it and wait for a seller to accept."
          />
          <Step
            n={2}
            icon={<ShieldCheck size={22} />}
            title="We hold your payment in escrow"
            body="Your card is charged at order placement. The funds sit in escrow at Stripe — they don't reach the seller until you confirm the box arrived sealed."
          />
          <Step
            n={3}
            icon={<PackageCheck size={22} />}
            title="Confirm + funds release"
            body="Box arrives sealed → you confirm delivery, or the auto-release fires 2 days after the carrier marks it delivered. Refund in full if anything's wrong."
          />
        </div>
      </section>

      {/* Three-step seller flow */}
      <section className="mt-12">
        <p className="mb-4 text-[10px] font-semibold tracking-[0.18em] text-white/50 uppercase">
          For sellers
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Step
            n={1}
            icon={<TrendingUp size={22} />}
            title="Connect Stripe + list"
            body="3-minute Stripe Connect onboarding (KYC + bank). Then list your sealed box with one ask price and quantity — or hold out for a bid that meets your number."
          />
          <Step
            n={2}
            icon={<Truck size={22} />}
            title="Ship within 2 business days"
            body="When a buyer pays, you get an order. Drop tracking into the seller dashboard within 2 days using USPS, UPS, or FedEx. We notify the buyer + the carrier monitors it."
          />
          <Step
            n={3}
            icon={<Package size={22} />}
            title="Get paid"
            body="When the buyer confirms (or 2 days after carrier delivery), Stripe transfers the sale price minus your tier fee directly to your bank. Payouts cadence depends on tier."
          />
        </div>
      </section>

      {/* Why the order book is different */}
      <section className="mt-16 rounded-2xl border border-white/10 bg-[#101012] p-6 sm:p-8">
        <h2 className="font-display text-2xl font-black tracking-tight text-white">
          Why an order book beats a flea market
        </h2>
        <p className="mt-2 text-sm text-white/60">
          Most card marketplaces show you whatever a seller decided to list at,
          and you guess if that&apos;s a fair price. The order book shows you
          the actual market — every standing offer, every recent trade.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Comparison
            label="On other sites"
            tone="rose"
            items={[
              "Seller picks an inflated retail price",
              "Buyer pays the asking price or doesn't",
              "13% eBay fee on the seller side",
              "Chargeback risk on every sale",
              "Fakes and resealed boxes mixed in",
            ]}
            icon={<TrendingDown size={14} />}
          />
          <Comparison
            label="On WaxDepot"
            tone="emerald"
            items={[
              "Live bid/ask spread shows the real market",
              "Buy at ask or bid below — sellers respond to demand",
              "10% flat seller fee, no buyer fees, free shipping option",
              "Stripe escrow + 2-day dispute window protects buyers",
              "Sealed-only listings, dispute-on-delivery for tampering",
            ]}
            icon={<TrendingUp size={14} />}
          />
        </div>
      </section>

      {/* Trust pillars */}
      <section className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Pillar
          title="Buyer Protection"
          body="Held in escrow. Refund if your box doesn't arrive sealed."
          href="/help/buying/buyer-protection"
        />
        <Pillar
          title="Seller fee schedule"
          body="Starter 10% · Pro 8% · Elite 6%. No listing fees, no payment surcharges."
          href="/help/selling/fees"
        />
        <Pillar
          title="Stripe-backed payouts"
          body="KYC, tax forms, and bank verification handled by Stripe Connect."
          href="/help/payouts/set-up-payouts"
        />
      </section>

      {/* Final CTA */}
      <section className="mt-16 rounded-2xl border border-amber-700/40 bg-gradient-to-br from-amber-500/10 to-transparent p-8 text-center">
        <h2 className="font-display text-3xl font-black tracking-tight text-white">
          Ready to trade?
        </h2>
        <p className="mt-2 text-white/70">
          Browse the order book, list a box, or read the fine print first.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2.5 text-sm font-bold text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400"
          >
            Browse the order book
            <ArrowRight size={14} />
          </Link>
          <Link
            href="/sell"
            className="rounded-md border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-amber-400/40 hover:bg-amber-500/10 hover:text-amber-300"
          >
            List a box
          </Link>
          <Link
            href="/faq"
            className="rounded-md px-5 py-2.5 text-sm font-semibold text-white/60 transition hover:text-white"
          >
            FAQ
          </Link>
        </div>
      </section>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  body,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#101012] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300">
          {icon}
        </div>
        <span className="font-display text-2xl font-black text-amber-400/40">
          0{n}
        </span>
      </div>
      <h3 className="font-display mt-4 text-lg font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/60">{body}</p>
    </div>
  );
}

function Comparison({
  label,
  tone,
  items,
  icon,
}: {
  label: string;
  tone: "rose" | "emerald";
  items: string[];
  icon: React.ReactNode;
}) {
  const ring =
    tone === "rose"
      ? "border-rose-700/30 bg-rose-500/[0.04]"
      : "border-emerald-700/30 bg-emerald-500/[0.04]";
  const text = tone === "rose" ? "text-rose-300" : "text-emerald-300";
  return (
    <div className={`rounded-xl border ${ring} p-5`}>
      <div className={`flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase ${text}`}>
        {icon}
        {label}
      </div>
      <ul className="mt-3 space-y-2 text-sm text-white/80">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className={`mt-2 h-1 w-1 shrink-0 rounded-full ${tone === "rose" ? "bg-rose-400" : "bg-emerald-400"}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Pillar({
  title,
  body,
  href,
}: {
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-white/10 bg-[#101012] p-5 transition hover:border-amber-400/30"
    >
      <h3 className="font-display text-base font-black text-white group-hover:text-amber-300">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-white/60">{body}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-300/70 group-hover:text-amber-300">
        Learn more <ArrowRight size={11} />
      </span>
    </Link>
  );
}
