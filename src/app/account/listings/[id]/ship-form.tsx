"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Truck } from "lucide-react";
import { markShipped } from "@/app/actions/orders";

export function ShipForm({
  orderId,
  initialCarrier,
  initialTracking,
  needsShipBy,
}: {
  orderId: string;
  initialCarrier?: string | null;
  initialTracking?: string | null;
  needsShipBy?: string;
}) {
  const router = useRouter();
  const [carrier, setCarrier] = useState(initialCarrier ?? "");
  const [tracking, setTracking] = useState(initialTracking ?? "");
  const [error, setError] = useState<string | null>(null);
  const [shipped, setShipped] = useState(!!initialTracking);
  const [pending, startTransition] = useTransition();

  const valid = carrier && tracking.length >= 8;

  const submit = () => {
    if (!valid) return;
    setError(null);
    const formData = new FormData();
    formData.set("orderId", orderId);
    formData.set("carrier", carrier);
    formData.set("tracking", tracking);
    startTransition(async () => {
      const result = await markShipped(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setShipped(true);
      router.refresh();
    });
  };

  if (shipped) {
    return (
      <div className="rounded-md border border-emerald-700/40 bg-emerald-500/10 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-100">
          <Check size={16} /> Marked as shipped
        </div>
        <div className="mt-1 text-xs text-emerald-200">
          {carrier} · <span className="font-mono">{tracking}</span>
        </div>
        <p className="mt-2 text-xs text-emerald-200">
          The buyer was notified. Once they confirm delivery (or auto-release fires), funds move to
          your pending balance.
        </p>
        <button
          onClick={() => setShipped(false)}
          className="mt-2 text-xs font-semibold text-emerald-300 transition hover:underline"
        >
          Update tracking
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-white/10 bg-[#101012] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
        <Truck size={16} className="text-white/40" />
        Mark as shipped
      </div>
      {needsShipBy && (
        <div className="mb-2 text-xs text-white/50">
          Ship by <strong className="text-white/80">{needsShipBy}</strong> to keep your seller score
          in good standing.
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[140px_1fr]">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-white/80">Carrier</span>
          <select
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-amber-400/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
          >
            <option value="">Select…</option>
            <option>USPS</option>
            <option>UPS</option>
            <option>FedEx</option>
            <option>DHL</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-white/80">Tracking number</span>
          <input
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="1Z999AA10123456784"
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-white focus:border-amber-400/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
          />
        </label>
      </div>

      {error && (
        <div className="mt-3 rounded border border-rose-700/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      )}

      <button
        disabled={!valid || pending}
        onClick={submit}
        className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-sm font-bold text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : null}
        Mark as shipped
      </button>
    </div>
  );
}
