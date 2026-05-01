"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, ShieldCheck, X } from "lucide-react";
import { Sku } from "@/lib/data";
import { formatSkuTitle, formatUSD, formatUSDFull } from "@/lib/utils";
import { createBid } from "@/app/actions/bids";
import { createBuyNowCheckout } from "@/app/actions/stripe-checkout";
import { SkuThumb } from "./sku-thumb";

import { CURRENT_USER_TIER, TIER_FEE } from "@/lib/fees";

const FEE_RATE = TIER_FEE[CURRENT_USER_TIER];

type Mode = "closed" | "buy" | "bid" | "buy-confirmed" | "bid-confirmed";

export function BuyBidActions({
  sku,
  ask,
  bid,
  last,
}: {
  sku: Sku;
  ask: number | null;
  bid: number | null;
  last: number | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("closed");
  const [bidAmount, setBidAmount] = useState<string>(
    bid !== null ? String(bid + 5) : ask !== null ? String(Math.max(ask - 25, 1)) : "0",
  );
  const [bidDays, setBidDays] = useState<string>("7");
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidPending, startBidTransition] = useTransition();
  const close = () => {
    setMode("closed");
    setBidError(null);
  };
  const bidNum = parseFloat(bidAmount) || 0;

  // Close modal on Escape so keyboard users can dismiss it.
  useEffect(() => {
    if (mode === "closed") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode]);

  const submitBid = (price: number, days: number, onSuccess: () => void) => {
    setBidError(null);
    const formData = new FormData();
    formData.set("skuId", sku.id);
    formData.set("price", String(price));
    formData.set("days", String(days));
    startBidTransition(async () => {
      const result = await createBid(formData);
      if (result.needsAuth) {
        const next = `/product/${sku.slug}`;
        router.push(`/signup?next=${encodeURIComponent(next)}`);
        return;
      }
      if (result.error) {
        setBidError(result.error);
        return;
      }
      onSuccess();
    });
  };

  const handleSubmitBid = () => submitBid(bidNum, parseInt(bidDays, 10), () => setMode("bid-confirmed"));

  const handleBuyAtAsk = () => {
    if (ask === null) return;
    setBidError(null);
    const formData = new FormData();
    formData.set("skuId", sku.id);
    startBidTransition(async () => {
      const result = await createBuyNowCheckout(formData);
      if (result.needsAuth) {
        router.push(`/signup?next=${encodeURIComponent(`/product/${sku.slug}`)}`);
        return;
      }
      if (result.error) {
        setBidError(result.error);
        return;
      }
      if (result.checkoutUrl) {
        // Hand off to Stripe's hosted checkout. Webhook fires
        // checkout.session.completed when buyer pays → order moves to InEscrow.
        window.location.href = result.checkoutUrl;
      }
    });
  };

  return (
    <>
      <div className="grid grid-cols-3 divide-x divide-white/10 text-center">
        <Stat label="Lowest Ask" value={ask !== null ? formatUSD(ask) : "—"} accent />
        <Stat label="Last Sale" value={last !== null ? formatUSD(last) : "—"} />
        <Stat label="Highest Bid" value={bid !== null ? formatUSD(bid) : "—"} />
      </div>

      <div className="mt-5 space-y-2.5">
        <button
          disabled={ask === null}
          onClick={() => setMode("buy")}
          className="flex w-full items-center justify-between rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-3 font-bold text-white shadow-lg shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span>Buy Now</span>
          <span>{ask !== null ? formatUSD(ask) : "—"}</span>
        </button>
        <button
          onClick={() => setMode("bid")}
          className="flex w-full items-center justify-between rounded-md border border-white/15 bg-white/5 px-4 py-3 font-bold text-white transition hover:border-amber-400/40 hover:bg-amber-500/5"
        >
          <span>Place Bid</span>
          <span>{bid !== null ? formatUSD(bid + 5) : "—"}</span>
        </button>
      </div>

      <div className="mt-4 border-t border-white/10 pt-4">
        <Link
          href="/sell"
          className="block w-full rounded-md border border-white/10 bg-[#101012]/[0.03] px-4 py-2.5 text-center text-sm font-semibold text-white/70 transition hover:border-white/20 hover:text-white"
        >
          Sell yours →
        </Link>
      </div>

      <div className="mt-4 space-y-1.5 text-xs text-white/50">
        <div className="flex items-center justify-between">
          <span>Seller fee ({CURRENT_USER_TIER} tier)</span>
          <span className="font-semibold text-amber-300">{(FEE_RATE * 100).toFixed(0)}% flat</span>
        </div>
        <div className="text-[10px] text-white/60">No buyer fees · payment processing absorbed</div>
      </div>

      {mode !== "closed" && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-xl bg-[#101012] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {mode === "buy" && (
              <BuyModal
                sku={sku}
                ask={ask!}
                onClose={close}
                onConfirm={handleBuyAtAsk}
                pending={bidPending}
                error={bidError}
              />
            )}
            {mode === "buy-confirmed" && (
              <ConfirmedModal
                title="Redirecting to checkout..."
                lines={[
                  formatSkuTitle(sku),
                  "Hold on while we connect to Stripe.",
                ]}
                ctaLabel="View order"
                ctaHref="/account"
                onClose={close}
              />
            )}
            {mode === "bid" && (
              <BidModal
                sku={sku}
                bidAmount={bidAmount}
                onChangeAmount={setBidAmount}
                bidDays={bidDays}
                onChangeDays={setBidDays}
                currentHighest={bid}
                lowestAsk={ask}
                onClose={close}
                onConfirm={handleSubmitBid}
                pending={bidPending}
                error={bidError}
              />
            )}
            {mode === "bid-confirmed" && (
              <ConfirmedModal
                title="Bid placed"
                lines={[
                  `${formatSkuTitle(sku)}`,
                  `Your bid: ${formatUSD(bidNum)} · expires in ${bidDays} days`,
                  `If a seller accepts, payment processes once Stripe is connected.`,
                ]}
                ctaLabel="View my bids"
                ctaHref="/account"
                onClose={close}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="px-2">
      <div className="text-[10px] font-semibold tracking-[0.15em] text-white/60 uppercase">
        {label}
      </div>
      <div
        className={`mt-1 font-display text-lg font-black tracking-tight ${accent ? "text-amber-400" : "text-white"}`}
      >
        {value}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between border-b border-white/5 p-5">
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <button
        onClick={onClose}
        className="rounded-md p-1 text-white/60 hover:bg-white/5 hover:text-white/60"
        aria-label="Close"
      >
        <X size={18} />
      </button>
    </div>
  );
}

function BuyModal({
  sku,
  ask,
  onClose,
  onConfirm,
  pending,
  error,
}: {
  sku: Sku;
  ask: number;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  error: string | null;
}) {
  return (
    <>
      <ModalHeader title="Buy at lowest ask" onClose={onClose} />
      <div className="max-h-[80vh] overflow-y-auto p-5">
        <div className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <SkuThumb sku={sku} className="h-14 w-11 rounded" alt={formatSkuTitle(sku)} />
          <div>
            <div className="text-sm font-bold text-white">{formatSkuTitle(sku)}</div>
            <div className="text-xs text-white/50">{sku.sport} · Factory Sealed</div>
          </div>
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Lowest ask" value={formatUSDFull(ask)} />
          <Row label="Bid expires" value="1 day" />
          <div className="my-2 border-t border-white/5" />
          <Row label="Locks at" value={formatUSDFull(ask)} bold />
        </dl>

        <div className="mt-4 rounded-md border border-emerald-700/40 bg-emerald-500/10 p-3 text-xs text-emerald-200">
          <div className="flex items-start gap-2">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-400" />
            <div>
              <strong>How this works:</strong> Buy Now places a 1-day bid at the lowest ask. The
              order completes when the seller accepts. Payment processing is rolling out next —
              your card isn&apos;t charged yet, but the bid is real.
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-rose-700/40 bg-rose-500/10 p-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            disabled={pending}
            className="flex-1 rounded-md border border-white/15 bg-[#101012] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/[0.02] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            disabled={pending}
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2.5 text-sm font-bold text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : null}
            Place bid at {formatUSD(ask)}
          </button>
        </div>
      </div>
    </>
  );
}

function BidModal({
  sku,
  bidAmount,
  onChangeAmount,
  bidDays,
  onChangeDays,
  currentHighest,
  lowestAsk,
  onClose,
  onConfirm,
  pending,
  error,
}: {
  sku: Sku;
  bidAmount: string;
  onChangeAmount: (v: string) => void;
  bidDays: string;
  onChangeDays: (v: string) => void;
  currentHighest: number | null;
  lowestAsk: number | null;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  error: string | null;
}) {
  const bidNum = parseFloat(bidAmount) || 0;
  const meetsAsk = lowestAsk !== null && bidNum >= lowestAsk;
  const tooLow = currentHighest !== null && bidNum > 0 && bidNum <= currentHighest;
  const fee = bidNum * FEE_RATE;
  const total = bidNum + Math.round(bidNum * 0.07 * 100) / 100;

  return (
    <>
      <ModalHeader title="Place a bid" onClose={onClose} />
      <div className="p-5">
        <div className="mb-4 text-sm text-white/60">{formatSkuTitle(sku)}</div>

        <div className="grid grid-cols-2 divide-x divide-white/10 rounded-lg border border-white/10 bg-white/[0.02] text-center">
          <div className="px-3 py-3">
            <div className="text-[10px] font-semibold tracking-wider text-white/60 uppercase">Highest Bid</div>
            <div className="mt-1 text-base font-bold text-white">
              {currentHighest !== null ? formatUSD(currentHighest) : "—"}
            </div>
          </div>
          <div className="px-3 py-3">
            <div className="text-[10px] font-semibold tracking-wider text-white/60 uppercase">Lowest Ask</div>
            <div className="mt-1 text-base font-bold text-emerald-300">
              {lowestAsk !== null ? formatUSD(lowestAsk) : "—"}
            </div>
          </div>
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-semibold text-white/80">Your bid</span>
          <div className="relative mt-1">
            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-white/60">$</span>
            <input
              type="number"
              value={bidAmount}
              onChange={(e) => onChangeAmount(e.target.value)}
              className="w-full rounded-md border border-white/15 py-2.5 pr-3 pl-7 text-sm focus:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
            />
          </div>
          {tooLow && (
            <p className="mt-1.5 text-xs text-amber-300">
              ⚠ Below the current highest bid of {formatUSD(currentHighest!)} — yours won&apos;t win
              first.
            </p>
          )}
          {meetsAsk && (
            <p className="mt-1.5 text-xs text-emerald-300">
              ⚡ This meets the lowest ask — buying instantly for {formatUSD(lowestAsk!)}.
            </p>
          )}
          {!tooLow && !meetsAsk && bidNum > 0 && (
            <p className="mt-1.5 text-xs text-white/50">
              You&apos;ll be the new highest bid if a seller doesn&apos;t accept it sooner.
            </p>
          )}
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-semibold text-white/80">Expires</span>
          <select
            value={bidDays}
            onChange={(e) => onChangeDays(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/15 py-2.5 px-3 text-sm focus:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
          >
            <option value="1">1 day</option>
            <option value="3">3 days</option>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
          </select>
        </label>

        <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs">
          <div className="font-semibold text-white/80">If accepted</div>
          <div className="mt-1.5 space-y-1 text-white/60">
            <div className="flex justify-between">
              <span>Bid amount</span>
              <span>{formatUSDFull(bidNum)}</span>
            </div>
            <div className="flex justify-between">
              <span>Sales tax (est)</span>
              <span>{formatUSDFull(total - bidNum)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-white/10 pt-1 font-bold text-white">
              <span>Charged to your card</span>
              <span>{formatUSDFull(total)}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-rose-700/40 bg-rose-500/10 p-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            disabled={pending}
            className="flex-1 rounded-md border border-white/15 bg-[#101012] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/[0.02] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            disabled={bidNum <= 0 || pending}
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2.5 text-sm font-bold text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : null}
            Place bid — {formatUSD(bidNum)}
          </button>
        </div>

        <div className="mt-3 text-[11px] text-white/60">
          Flat {(FEE_RATE * 100).toFixed(0)}% seller fee — no buyer fees, no separate processing.
          {meetsAsk && " Use Buy Now if you want to take the lowest ask immediately."}
        </div>
        {/* keep referenced so the var isn't unused */}
        <div className="hidden">{fee}</div>
      </div>
    </>
  );
}

function ConfirmedModal({
  title,
  lines,
  ctaLabel,
  ctaHref,
  onClose,
}: {
  title: string;
  lines: string[];
  ctaLabel: string;
  ctaHref: string;
  onClose: () => void;
}) {
  return (
    <>
      <ModalHeader title={title} onClose={onClose} />
      <div className="flex flex-col items-center px-5 py-7 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
          <Check className="text-emerald-400" size={28} />
        </div>
        <div className="mt-4 space-y-1.5 text-sm">
          {lines.map((l, i) => (
            <div
              key={i}
              className={i === 0 ? "text-base font-bold text-white" : "text-white/60"}
            >
              {l}
            </div>
          ))}
        </div>
        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-white/15 bg-[#101012] px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/[0.02]"
          >
            Close
          </button>
          <Link
            href={ctaHref}
            onClick={onClose}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className={bold ? "font-bold text-white" : "text-white/60"}>{label}</dt>
      <dd className={bold ? "font-bold text-white" : "font-semibold text-white"}>{value}</dd>
    </div>
  );
}
