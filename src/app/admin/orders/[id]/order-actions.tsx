"use client";

import { useState, useTransition } from "react";
import {
  adminCancelOrder,
  adminForceReleaseOrder,
  adminMarkDelivered,
  adminRefundOrder,
} from "@/app/actions/admin";

type Action = "refund" | "release" | "cancel" | "delivered";

export function OrderAdminActions({
  orderId,
  canRefund,
  canRelease,
  canMarkDelivered,
}: {
  orderId: string;
  canRefund: boolean;
  canRelease: boolean;
  canMarkDelivered: boolean;
}) {
  const [open, setOpen] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const submit = (action: Action) => {
    if (!reason.trim()) {
      setErr("Reason required.");
      return;
    }
    setErr(null);
    startTransition(async () => {
      const fn =
        action === "refund"
          ? adminRefundOrder
          : action === "release"
            ? adminForceReleaseOrder
            : action === "delivered"
              ? adminMarkDelivered
              : adminCancelOrder;
      const result = await fn(orderId, reason.trim());
      if (result.error) setErr(result.error);
      else {
        setOk(`✓ ${action} succeeded`);
        setOpen(null);
        setReason("");
      }
    });
  };

  return (
    <div className="rounded-xl border border-rose-700/30 bg-rose-500/[0.04] p-4">
      <div className="mb-3 text-xs font-semibold tracking-[0.15em] text-rose-300 uppercase">
        Admin actions · destructive
      </div>
      <div className="flex flex-wrap gap-2">
        {canMarkDelivered && (
          <button
            onClick={() => setOpen(open === "delivered" ? null : "delivered")}
            disabled={pending}
            className="rounded-md border border-sky-700/40 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/20 disabled:opacity-50"
          >
            Mark delivered (start 2-day clock)
          </button>
        )}
        {canRefund && (
          <button
            onClick={() => setOpen(open === "refund" ? null : "refund")}
            disabled={pending}
            className="rounded-md border border-rose-700/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
          >
            Refund full
          </button>
        )}
        {canRelease && (
          <button
            onClick={() => setOpen(open === "release" ? null : "release")}
            disabled={pending}
            className="rounded-md border border-emerald-700/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
          >
            Force release escrow
          </button>
        )}
        <button
          onClick={() => setOpen(open === "cancel" ? null : "cancel")}
          disabled={pending}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50"
        >
          Cancel (no refund)
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-2">
          <label className="block text-[10px] font-semibold tracking-wider text-white/60 uppercase">
            Reason (logged to admin_actions)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50"
            placeholder="e.g. buyer never received, dispute resolved in buyer's favor"
          />
          <button
            onClick={() => submit(open)}
            disabled={pending}
            className="rounded-md bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-amber-300 disabled:opacity-50"
          >
            {pending ? "Working…" : `Confirm ${open}`}
          </button>
        </div>
      )}

      {err && <p className="mt-3 text-xs text-rose-300">{err}</p>}
      {ok && <p className="mt-3 text-xs text-emerald-300">{ok}</p>}
    </div>
  );
}
