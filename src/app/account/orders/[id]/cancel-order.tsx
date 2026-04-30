"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { cancelOrder } from "@/app/actions/orders";

const reasons = [
  "Changed my mind",
  "Found a better price",
  "Ordered by mistake",
  "Took too long to ship",
  "Other",
];

export function CancelOrderButton({ orderId, total }: { orderId: string; total: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (confirmed) {
    return (
      <div className="mt-3 rounded-md border border-emerald-700/40 bg-emerald-500/10 p-3 text-sm">
        <div className="flex items-center gap-2 font-bold text-emerald-100">
          <Check size={16} /> Order canceled
        </div>
        <p className="mt-1 text-xs text-emerald-200">
          Refund of ${total.toFixed(2)} processes once payments go live. The seller has been notified.
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
    if (!reason) return;
    setError(null);
    const formData = new FormData();
    formData.set("orderId", orderId);
    formData.set("reason", reason);
    startTransition(async () => {
      const result = await cancelOrder(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setConfirmed(true);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-white/50 transition hover:text-rose-400 hover:underline"
      >
        Cancel order
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-white/10 bg-[#101012] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-white/5 p-5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 text-rose-400" size={18} />
                <div>
                  <h3 className="font-display text-base font-bold text-white">
                    Cancel order {orderId}?
                  </h3>
                  <p className="mt-0.5 text-xs text-white/50">
                    The seller hasn&apos;t shipped yet. Once payments go live this triggers a full
                    refund within 3-5 business days.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-white/40 transition hover:bg-white/5"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5">
              <div className="mb-3 text-sm font-semibold text-white/80">Why are you canceling?</div>
              <ul className="space-y-1.5">
                {reasons.map((r) => (
                  <li key={r}>
                    <button
                      onClick={() => setReason(r)}
                      className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition ${
                        reason === r
                          ? "border-amber-500/40 bg-amber-500/10 text-white"
                          : "border-white/10 bg-[#101012] text-white/80 hover:border-white/15"
                      }`}
                    >
                      <div
                        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 ${
                          reason === r ? "border-amber-400 bg-amber-400" : "border-white/15"
                        }`}
                      >
                        {reason === r && <div className="h-1 w-1 rounded-full bg-slate-900" />}
                      </div>
                      {r}
                    </button>
                  </li>
                ))}
              </ul>

              {error && (
                <div className="mt-3 rounded border border-rose-700/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {error}
                </div>
              )}

              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="flex-1 rounded-md border border-white/15 bg-[#101012] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/[0.02] disabled:opacity-50"
                >
                  Keep order
                </button>
                <button
                  disabled={!reason || pending}
                  onClick={submit}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {pending ? <Loader2 size={14} className="animate-spin" /> : null}
                  Cancel & refund ${total.toFixed(0)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
