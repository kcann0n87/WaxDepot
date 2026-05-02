"use client";

import { useState, useTransition } from "react";
import { Loader2, Lock, Mail, User } from "lucide-react";
import { signUp } from "../auth/actions";

export function SignupForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await signUp(formData);
          if (result?.error) setError(result.error);
        });
      }}
      className="space-y-4 rounded-2xl border border-white/10 bg-[#101012] p-7 shadow-2xl shadow-black/40"
    >
      <input type="hidden" name="next" value={next} />

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.18em] text-white/50 uppercase">
          Display name
        </span>
        <div className="relative">
          <User size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/50" />
          <input
            type="text"
            name="displayName"
            required
            autoComplete="nickname"
            placeholder="What should we call you?"
            className="w-full rounded-md border border-white/10 bg-white/5 py-2.5 pr-3 pl-9 text-sm text-white placeholder:text-white/50 focus:border-amber-400/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
          />
        </div>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.18em] text-white/50 uppercase">
          Email
        </span>
        <div className="relative">
          <Mail size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/50" />
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full rounded-md border border-white/10 bg-white/5 py-2.5 pr-3 pl-9 text-sm text-white placeholder:text-white/50 focus:border-amber-400/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
          />
        </div>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.18em] text-white/50 uppercase">
          Password
        </span>
        <div className="relative">
          <Lock size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/50" />
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className="w-full rounded-md border border-white/10 bg-white/5 py-2.5 pr-3 pl-9 text-sm text-white placeholder:text-white/50 focus:border-amber-400/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
          />
        </div>
      </label>

      {error && (
        <div className="rounded-md border border-rose-700/40 bg-rose-500/10 p-3 text-xs text-rose-200">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-3 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : null}
        Create account
      </button>

      <div className="text-center text-[11px] text-white/60">
        By creating an account you agree to our{" "}
        <a
          href="/terms"
          target="_blank"
          rel="noopener"
          className="text-white/80 underline decoration-white/20 transition hover:text-amber-300"
        >
          Terms of Service
        </a>{" "}
        and{" "}
        <a
          href="/privacy"
          target="_blank"
          rel="noopener"
          className="text-white/80 underline decoration-white/20 transition hover:text-amber-300"
        >
          Privacy Policy
        </a>
        .
      </div>
    </form>
  );
}
