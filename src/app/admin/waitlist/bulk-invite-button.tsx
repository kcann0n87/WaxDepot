"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { adminInviteBatchPending } from "@/app/actions/admin";

const BATCH_CAP = 25;

export function BulkInviteButton({ pendingCount }: { pendingCount: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{
    sent: number;
    failed: number;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const batchSize = Math.min(pendingCount, BATCH_CAP);
  const isCapped = pendingCount > BATCH_CAP;

  const sendBatch = () => {
    setErr(null);
    setResult(null);
    start(async () => {
      const res = await adminInviteBatchPending(BATCH_CAP);
      if (res.error) {
        setErr(res.error);
        return;
      }
      setResult({ sent: res.sent ?? 0, failed: res.failed ?? 0 });
      setConfirmOpen(false);
      router.refresh();
    });
  };

  if (result) {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
        <CheckCircle2 size={12} />
        Sent {result.sent}
        {result.failed > 0 && (
          <span className="text-rose-300">· {result.failed} failed</span>
        )}
        <button
          onClick={() => setResult(null)}
          className="ml-2 text-white/40 hover:text-white/70"
        >
          ×
        </button>
      </div>
    );
  }

  if (!confirmOpen) {
    return (
      <button
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/20"
      >
        <Send size={12} />
        Invite next {batchSize} pending
        {isCapped && (
          <span className="ml-1 text-[10px] font-semibold text-amber-300/70">
            (of {pendingCount})
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-700/40 bg-amber-500/[0.06] px-3 py-2 text-xs">
      <span className="text-amber-200">
        Send {batchSize} invite{batchSize === 1 ? "" : "s"}?
      </span>
      <button
        onClick={sendBatch}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-md bg-amber-400 px-2.5 py-1 font-bold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
        {pending ? "Sending…" : "Send"}
      </button>
      <button
        onClick={() => setConfirmOpen(false)}
        disabled={pending}
        className="text-white/50 hover:text-white"
      >
        Cancel
      </button>
      {err && <span className="text-rose-300">{err}</span>}
    </div>
  );
}
