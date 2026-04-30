"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { joinWaitlist } from "../actions/waitlist";

export function WaitlistForm() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ alreadyOnList: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-emerald-700/40 bg-emerald-500/10 p-5 text-center shadow-2xl shadow-black/40 backdrop-blur">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
          <CheckCircle2 size={20} />
        </div>
        <div className="font-display mt-3 text-base font-black text-white">
          {done.alreadyOnList ? "Already on the list" : "You're on the list"}
        </div>
        <div className="mt-1 text-sm text-white/70">
          We&apos;ll email you the moment WaxDepot opens to the public.
        </div>
      </div>
    );
  }

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await joinWaitlist(formData);
          if (result.error) {
            setError(result.error);
            return;
          }
          if (result.ok) setDone({ alreadyOnList: !!result.alreadyOnList });
        });
      }}
      className="w-full max-w-md"
    >
      <input type="hidden" name="source" value="coming-soon" />
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Mail
            size={14}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/30"
          />
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            disabled={pending}
            className="w-full rounded-md border border-white/15 bg-white/5 py-3 pr-3 pl-9 text-sm text-white placeholder:text-white/30 backdrop-blur transition focus:border-amber-400/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400/20 disabled:opacity-60"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-3 text-sm font-bold whitespace-nowrap text-slate-900 shadow-lg shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : null}
          Get early access
        </button>
      </div>

      {error && (
        <div className="mt-2 rounded-md border border-rose-700/40 bg-rose-500/10 p-2 text-xs text-rose-200">
          {error}
        </div>
      )}

      <p className="mt-2 text-center text-[11px] text-white/40">
        Drop your email — we&apos;ll let you in when sellers start listing.
      </p>
    </form>
  );
}
