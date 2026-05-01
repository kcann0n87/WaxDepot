"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  Building2,
  Check,
  ChevronRight,
  Lightbulb,
  Loader2,
  Search,
} from "lucide-react";
import type { Sku } from "@/lib/data";
import { CURRENT_USER_TIER, TIER_FEE } from "@/lib/fees";
import { formatSkuTitle, formatUSD, formatUSDFull } from "@/lib/utils";
import { SkuThumb } from "@/components/sku-thumb";
import { createListing } from "../actions/listings";

const FEE_RATE = TIER_FEE[CURRENT_USER_TIER];

type Step = 1 | 2 | 3 | 4;

type CatalogItem = Sku & { lowestAsk: number | null; lastSale: number | null };

export function SellForm({
  catalog,
  highestBidMap,
}: {
  catalog: CatalogItem[];
  highestBidMap: Record<string, number>; // skuId -> highest bid in cents
}) {
  const [step, setStep] = useState<Step>(1);
  const [query, setQuery] = useState("");
  const [skuId, setSkuId] = useState<string | null>(null);
  const [askPrice, setAskPrice] = useState<string>("");
  const [shipping, setShipping] = useState<string>("0");
  const [quantity, setQuantity] = useState<string>("1");
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sku = catalog.find((s) => s.id === skuId);
  const matches = useMemo(() => {
    if (!query) return catalog.slice(0, 8);
    const q = query.toLowerCase();
    return catalog
      .filter(
        (s) =>
          s.brand.toLowerCase().includes(q) ||
          s.set.toLowerCase().includes(q) ||
          s.sport.toLowerCase().includes(q) ||
          s.product.toLowerCase().includes(q) ||
          String(s.year).includes(q),
      )
      .slice(0, 12);
  }, [query, catalog]);

  const ask = sku?.lowestAsk ?? null;
  const last = sku?.lastSale ?? null;
  const bid = sku ? (highestBidMap[sku.id] ?? null) : null;
  const bidUsd = bid !== null ? bid / 100 : null;

  const askNum = parseFloat(askPrice) || 0;
  const fee = askNum * FEE_RATE;
  const payout = Math.max(askNum - fee, 0);

  const handlePublish = () => {
    if (!sku) return;
    setSubmitError(null);
    const formData = new FormData();
    formData.set("skuId", sku.id);
    formData.set("price", String(askNum));
    formData.set("shipping", shipping);
    formData.set("quantity", quantity);
    startTransition(async () => {
      const result = await createListing(formData);
      if (result.error) {
        setSubmitError(result.error);
      } else {
        setSubmitted(true);
        setStep(4);
      }
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="text-[10px] font-semibold tracking-[0.2em] text-amber-400/80 uppercase">
        Sell
      </div>
      <h1 className="font-display mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
        List a sealed box
      </h1>
      <p className="mt-1 text-white/60">
        It takes about 60 seconds. We hold the buyer&apos;s payment in escrow until the box arrives
        sealed.
      </p>

      <Link
        href="/sell/payouts"
        className="mt-4 flex items-center gap-3 rounded-lg border border-amber-700/40 bg-amber-500/10 px-3 py-2.5 text-sm transition hover:bg-amber-500/15"
      >
        <Building2 size={16} className="text-amber-300" />
        <span className="flex-1 text-amber-100">
          <strong>Set up payouts</strong> to receive ACH transfers on your tier&apos;s schedule.
        </span>
        <ChevronRight size={16} className="text-amber-300" />
      </Link>

      <Stepper step={step} />

      {/* Persistent banner across steps 2-4 — makes it impossible to forget
          which SKU you're actually listing. Click "Change" to reset. */}
      {step > 1 && sku && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-700/40 bg-gradient-to-r from-amber-500/10 to-transparent p-4">
          <SkuThumb sku={sku} className="h-14 w-12 rounded" alt={formatSkuTitle(sku)} />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold tracking-[0.18em] text-amber-300/80 uppercase">
              You&apos;re listing
            </div>
            <div className="font-display line-clamp-2 text-base font-black text-white">
              {formatSkuTitle(sku)}
            </div>
            <div className="text-xs text-white/50">{sku.sport} · Factory Sealed</div>
          </div>
          {step < 4 && (
            <button
              onClick={() => {
                setStep(1);
                setSkuId(null);
                setAskPrice("");
              }}
              className="shrink-0 rounded-md border border-white/15 bg-[#101012] px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-amber-400/40 hover:text-amber-300"
            >
              Change
            </button>
          )}
        </div>
      )}

      {step === 1 && (
        <Card title="1. Find your product" subtitle="Search by year, brand, sport, or set">
          <div className="relative">
            <label htmlFor="sell-product-search" className="sr-only">
              Search the catalog by year, brand, sport, or set
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/60"
              size={16}
              aria-hidden="true"
            />
            <input
              id="sell-product-search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='e.g. "2025 Bowman" or "Prizm"'
              className="w-full rounded-md border border-white/10 bg-white/5 py-2.5 pr-3 pl-9 text-sm text-white placeholder:text-white/50 focus:border-amber-400/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
            />
          </div>

          <div className="mt-4 divide-y divide-white/5 overflow-hidden rounded-lg border border-white/10">
            {matches.length === 0 && (
              <div className="p-6 text-center text-sm text-white/50">
                No matches. Try a different search.
              </div>
            )}
            {matches.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSkuId(s.id);
                  if (s.lowestAsk !== null) setAskPrice(String(Math.max(s.lowestAsk - 5, 1)));
                  setStep(2);
                }}
                className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-white/[0.02]"
              >
                <SkuThumb sku={s} className="h-12 w-10 rounded" alt={formatSkuTitle(s)} />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">{formatSkuTitle(s)}</div>
                  <div className="text-xs text-white/50">
                    {s.sport} · Last sale {s.lastSale !== null ? formatUSD(s.lastSale) : "—"}
                  </div>
                </div>
                <ChevronRight size={16} className="text-white/60" />
              </button>
            ))}
          </div>
        </Card>
      )}

      {step === 2 && sku && (
        <Card title="2. Set your asking price" subtitle="See what the market is paying right now">
          <SmartPricingCard
            ask={ask}
            last={last}
            bid={bidUsd}
            onApply={(p) => setAskPrice(String(p))}
          />

          <div className="mt-5 grid grid-cols-3 divide-x divide-white/10 rounded-lg border border-white/10 bg-white/[0.02] text-center">
            <Stat label="Lowest Ask" value={ask !== null ? formatUSD(ask) : "—"} accent="emerald" />
            <Stat label="Last Sale" value={last !== null ? formatUSD(last) : "—"} />
            <Stat label="Highest Bid" value={bidUsd !== null ? formatUSD(bidUsd) : "—"} accent="rose" />
          </div>

          <label className="mt-6 block">
            <span className="text-sm font-semibold text-white/80">Your asking price</span>
            <div className="relative mt-1">
              <span className="absolute top-1/2 left-3 -translate-y-1/2 text-white/60">$</span>
              <input
                type="number"
                value={askPrice}
                onChange={(e) => setAskPrice(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/5 py-2.5 pr-3 pl-7 text-sm text-white focus:border-amber-400/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
              />
            </div>
            {ask !== null && askNum > 0 && askNum >= ask && (
              <p className="mt-1.5 text-xs text-amber-300">
                ⚠ Your price is at or above the lowest ask — sellers under you will sell first.
              </p>
            )}
            {ask !== null && askNum > 0 && askNum < ask && (
              <p className="mt-1.5 text-xs text-emerald-300">
                ✓ You&apos;ll be the new lowest ask, undercutting by {formatUSD(ask - askNum)}.
              </p>
            )}
            {bidUsd !== null && askNum > 0 && askNum <= bidUsd && (
              <p className="mt-1.5 text-xs text-rose-300">
                ⚡ Your price meets the highest bid — this will sell instantly for {formatUSD(bidUsd)}.
              </p>
            )}
          </label>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-semibold text-white/80">Shipping</span>
              <select
                value={shipping}
                onChange={(e) => setShipping(e.target.value)}
                className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-amber-400/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
              >
                <option value="0">Free shipping</option>
                <option value="10">$10 flat</option>
                <option value="15">$15 flat</option>
                <option value="calc">Calculated at checkout</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white/80">Quantity</span>
              <input
                type="number"
                min="1"
                max="100"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-amber-400/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
              />
            </label>
          </div>

          <div className="mt-6 rounded-lg border border-white/10 bg-[#101012] p-4">
            <div className="text-xs font-semibold tracking-wider text-white/60 uppercase">
              Your payout
            </div>
            <div className="mt-2 space-y-1.5 text-sm">
              <Row label="Sale price" value={formatUSDFull(askNum)} />
              <Row
                label={`${CURRENT_USER_TIER} tier fee (${(FEE_RATE * 100).toFixed(0)}%)`}
                value={`-${formatUSDFull(fee)}`}
                muted
              />
              <div className="my-2 border-t border-white/5" />
              <Row label="You receive" value={formatUSDFull(payout)} bold />
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="rounded-md border border-white/15 bg-[#101012] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/[0.02]"
            >
              ← Change product
            </button>
            <button
              disabled={!askNum}
              onClick={() => setStep(3)}
              className="rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-sm font-bold text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue →
            </button>
          </div>
        </Card>
      )}

      {step === 3 && sku && (
        <Card title="3. Review listing" subtitle="Last check before it goes live">
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-start gap-3">
              <SkuThumb sku={sku} className="h-16 w-12 rounded" alt={formatSkuTitle(sku)} />
              <div>
                <div className="font-bold text-white">{formatSkuTitle(sku)}</div>
                <div className="text-sm text-white/60">
                  {sku.sport} · {sku.product} · Factory Sealed
                </div>
              </div>
            </div>
          </div>

          <dl className="mt-4 divide-y divide-white/5 rounded-lg border border-white/10">
            <Field label="Asking price" value={formatUSDFull(askNum)} />
            <Field
              label="Shipping"
              value={
                shipping === "0"
                  ? "Free"
                  : shipping === "calc"
                    ? "Calculated at checkout"
                    : `$${shipping} flat`
              }
            />
            <Field label="Quantity" value={quantity} />
            <Field
              label={`${CURRENT_USER_TIER} tier fee (${(FEE_RATE * 100).toFixed(0)}%)`}
              value={`-${formatUSDFull(fee)}`}
            />
            <Field label="Payout per box" value={formatUSDFull(payout)} bold />
          </dl>

          <div className="mt-6 rounded-md border border-amber-700/40 bg-amber-500/10 p-3 text-xs text-amber-200">
            By listing, you agree to ship within 2 business days of sale. Buyer payment is held in
            escrow and released after delivery confirmation.
          </div>

          {submitError && (
            <div className="mt-4 rounded-md border border-rose-700/40 bg-rose-500/10 p-3 text-xs text-rose-200">
              {submitError}
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(2)}
              disabled={pending}
              className="rounded-md border border-white/15 bg-[#101012] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/[0.02] disabled:opacity-50"
            >
              ← Back
            </button>
            <button
              onClick={handlePublish}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2 text-sm font-bold text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? <Loader2 size={14} className="animate-spin" /> : null}
              Publish listing
            </button>
          </div>
        </Card>
      )}

      {step === 4 && submitted && sku && (
        <Card title="4. You're live" subtitle="Your listing is now visible to buyers">
          <div className="flex flex-col items-center py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-700/40 bg-emerald-500/15">
              <Check className="text-emerald-400" size={28} />
            </div>
            <div className="font-display mt-4 text-lg font-black text-white">
              Listing published
            </div>
            <div className="mt-1 text-sm text-white/60">
              {quantity} × {sku.brand} {sku.set} {sku.product} at {formatUSDFull(askNum)} each
            </div>
            <div className="mt-6 flex gap-2">
              <Link
                href={`/product/${sku.slug}`}
                className="rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-sm font-bold text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400"
              >
                View product page
              </Link>
              <Link
                href="/account"
                className="rounded-md border border-white/15 bg-[#101012] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/[0.02]"
              >
                Back to dashboard
              </Link>
              <button
                onClick={() => {
                  setStep(1);
                  setSkuId(null);
                  setAskPrice("");
                  setSubmitted(false);
                  setSubmitError(null);
                }}
                className="rounded-md border border-white/15 bg-[#101012] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/[0.02]"
              >
                List another
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ["Find product", "Set price", "Review", "Done"];
  return (
    <ol className="my-6 flex items-center gap-2">
      {labels.map((label, i) => {
        const n = i + 1;
        const isDone = step > n;
        const isCurrent = step === n;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                isDone
                  ? "bg-emerald-500 text-white"
                  : isCurrent
                    ? "bg-amber-500 text-slate-900"
                    : "bg-white/10 text-white/50"
              }`}
            >
              {isDone ? <Check size={14} /> : n}
            </div>
            <span
              className={`hidden text-xs font-semibold sm:inline ${
                isCurrent ? "text-white" : "text-white/50"
              }`}
            >
              {label}
            </span>
            {n < labels.length && (
              <div className={`mx-1 h-px flex-1 ${isDone ? "bg-emerald-500" : "bg-white/10"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#101012] p-6 shadow-2xl shadow-black/40">
      <h2 className="font-display text-lg font-black text-white">{title}</h2>
      <p className="mt-0.5 mb-4 text-sm text-white/50">{subtitle}</p>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "emerald" | "rose";
}) {
  const tone =
    accent === "emerald"
      ? "text-emerald-300"
      : accent === "rose"
        ? "text-rose-300"
        : "text-white";
  return (
    <div className="px-3 py-3">
      <div className="text-[10px] font-semibold tracking-wider text-white/60 uppercase">
        {label}
      </div>
      <div className={`font-display mt-1 text-base font-black ${tone}`}>{value}</div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  bold,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className={muted ? "text-white/50" : "text-white/80"}>{label}</span>
      <span className={`${bold ? "text-base font-bold text-white" : "text-white"}`}>{value}</span>
    </div>
  );
}

function Field({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="text-sm text-white/60">{label}</dt>
      <dd className={`text-sm ${bold ? "font-bold text-white" : "font-semibold text-white"}`}>
        {value}
      </dd>
    </div>
  );
}

function SmartPricingCard({
  ask,
  last,
  bid,
  onApply,
}: {
  ask: number | null;
  last: number | null;
  bid: number | null;
  onApply: (price: number) => void;
}) {
  const recommended = ask !== null ? Math.max(ask - 5, 1) : last ?? 100;
  const fastSell = bid !== null ? bid : recommended;

  return (
    <div className="rounded-xl border border-amber-700/40 bg-gradient-to-br from-amber-500/10 to-transparent p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
          <Lightbulb size={18} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-white">Smart pricing</div>
          <div className="text-xs text-white/60">
            Pick a strategy and we&apos;ll prefill your asking price.
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => onApply(recommended)}
          className="rounded-lg border border-emerald-700/40 bg-[#101012] p-3 text-left transition hover:border-emerald-400 hover:bg-emerald-500/10"
        >
          <div className="text-[10px] font-semibold tracking-wider text-emerald-300 uppercase">
            Recommended
          </div>
          <div className="font-display mt-0.5 text-lg font-black text-white">
            {formatUSD(recommended)}
          </div>
          <div className="text-[11px] text-white/50">Be the new lowest ask</div>
        </button>
        <button
          onClick={() => onApply(fastSell)}
          className="rounded-lg border border-amber-700/40 bg-[#101012] p-3 text-left transition hover:border-amber-400 hover:bg-amber-500/10"
        >
          <div className="text-[10px] font-semibold tracking-wider text-amber-300 uppercase">
            Quick sell
          </div>
          <div className="font-display mt-0.5 text-lg font-black text-white">
            {formatUSD(fastSell)}
          </div>
          <div className="text-[11px] text-white/50">
            {bid !== null ? "Match highest bid · sells now" : "Aggressive pricing"}
          </div>
        </button>
      </div>

      {last !== null && ask !== null && last > ask && (
        <div className="mt-3 rounded-md border border-white/10 bg-[#101012] p-2.5 text-[11px] text-white/60">
          💡 Last sale was {formatUSD(last)}, currently {formatUSD(last - ask)} above the lowest
          ask. Buyers are paying a premium right now.
        </div>
      )}
    </div>
  );
}
