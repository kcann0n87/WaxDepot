"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Clock, Loader2, ShieldCheck } from "lucide-react";
import { confirmDelivery } from "@/app/actions/orders";

const RELEASE_GATE_MS = 24 * 60 * 60 * 1000;

/**
 * Buyer-facing CTA that releases funds (skipping the 2-day auto-release
 * cron). Gated to ≥24h after the seller marked the order shipped — nothing
 * realistically arrives same-day, so the button shows a countdown instead.
 * The server action mirrors this gate as defense in depth.
 */
export function ConfirmDeliveryButton({
  orderId,
  shippedAt,
}: {
  orderId: string;
  shippedAt?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, startTransition] = useTransition();
  // Recompute on a 60s tick so the countdown ticks down while the user
  // sits on the page. Cheap — no network calls in the interval.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const shippedMs = shippedAt ? new Date(shippedAt).getTime() : null;
  const elapsed = shippedMs ? now - shippedMs : null;
  const locked =
    shippedMs !== null && elapsed !== null && elapsed < RELEASE_GATE_MS;
  const hoursLeft =
    locked && elapsed !== null
      ? Math.max(1, Math.ceil((RELEASE_GATE_MS - elapsed) / 3_600_000))
      : 0;

  if (confirmed) {
    return (
      <div className="mt-2 rounded-md border border-emerald-700/40 bg-emerald-500/10 p-3 text-sm">
        <div className="flex items-center gap-2 font-bold text-emerald-100">
          <Check size={16} /> Confirmed — funds released
        </div>
        <p className="mt-1 text-xs text-emerald-200">
          Thanks for confirming. The seller has been notified and your payment was released to
          their pending balance.
        </p>
        <Link
          href="/account"
          className="mt-2 inline-block text-xs font-semibold text-emerald-300 hover:underline"
        >
          Back to orders →
        </Link>
      </div>
    );
  }

  const submit = () => {
    if (locked) return;
    setError(null);
    const formData = new FormData();
    formData.set("orderId", orderId);
    startTransition(async () => {
      const result = await confirmDelivery(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setConfirmed(true);
      router.refresh();
    });
  };

  return (
    <div className="mt-2 rounded-md border border-amber-700/40 bg-amber-500/10 p-3">
      <div className="flex items-start gap-2">
        <ShieldCheck size={16} className="mt-0.5 text-amber-400" />
        <div className="flex-1">
          <div className="text-sm font-bold text-white">Did your box arrive sealed?</div>
          <p className="mt-0.5 text-xs text-white/70">
            Confirming releases the payment to the seller. If something&apos;s wrong, open a dispute
            instead — your payment stays held until it&apos;s resolved.
          </p>
        </div>
      </div>
      {locked && (
        <div className="mt-3 flex items-center gap-2 rounded border border-white/10 bg-[#101012] px-3 py-2 text-xs text-white/70">
          <Clock size={12} className="text-amber-300" />
          <span>
            Release available in <strong className="text-white">{hoursLeft} hour{hoursLeft === 1 ? "" : "s"}</strong> — the
            order shipped less than a day ago.
          </span>
        </div>
      )}
      {error && (
        <div className="mt-3 rounded border border-rose-700/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button
          onClick={submit}
          disabled={pending || locked}
          title={locked ? `Available in ${hoursLeft} hour${hoursLeft === 1 ? "" : "s"}` : undefined}
          className="flex flex-1 items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : null}
          Yes, release funds
        </button>
        <Link
          href={`/account/disputes/new?order=${orderId}`}
          className="flex-1 rounded-md border border-rose-700/50 bg-[#101012] px-3 py-2 text-center text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10"
        >
          Open a dispute
        </Link>
      </div>
      <div className="mt-2 text-[11px] text-amber-300/70">
        Order {orderId} · auto-releases 2 days after delivery if you take no action.
      </div>
    </div>
  );
}
