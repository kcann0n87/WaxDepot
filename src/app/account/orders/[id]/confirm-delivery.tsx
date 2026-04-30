"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { confirmDelivery } from "@/app/actions/orders";

export function ConfirmDeliveryButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, startTransition] = useTransition();

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
      {error && (
        <div className="mt-3 rounded border border-rose-700/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button
          onClick={submit}
          disabled={pending}
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
        Order {orderId} · auto-releases in 3 days if you take no action.
      </div>
    </div>
  );
}
