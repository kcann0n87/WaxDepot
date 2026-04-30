"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, X } from "lucide-react";
import { acceptBid, declineBid } from "@/app/actions/orders";

export function BidActions({ bidId }: { bidId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (which: "accept" | "decline") => {
    setError(null);
    const formData = new FormData();
    formData.set("bidId", bidId);
    startTransition(async () => {
      const result = which === "accept" ? await acceptBid(formData) : await declineBid(formData);
      if (result.error) setError(result.error);
      // success refreshes the page automatically via revalidatePath
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => submit("decline")}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-md border border-rose-700/40 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X size={11} />
          Decline
        </button>
        <button
          onClick={() => submit("accept")}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-1.5 text-xs font-bold text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          Accept
        </button>
      </div>
      {error && (
        <div className="rounded border border-rose-700/40 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-200">
          {error}
        </div>
      )}
    </div>
  );
}
