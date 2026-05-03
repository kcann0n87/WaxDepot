"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { adminInviteUser } from "@/app/actions/admin";

export function InviteForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSent(null);
    start(async () => {
      const res = await adminInviteUser({
        email,
        displayName: displayName.trim() || undefined,
      });
      if (res.error) {
        setErr(res.error);
        return;
      }
      setSent(email);
      setEmail("");
      setDisplayName("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-3">
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold tracking-wider text-white/60 uppercase">
          Email
        </span>
        <input
          type="email"
          required
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="invitee@example.com"
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
          disabled={pending}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold tracking-wider text-white/60 uppercase">
          Display name <span className="text-white/40 normal-case">(optional)</span>
        </span>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="What we'll call them in the UI"
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
          disabled={pending}
        />
      </label>

      {err && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {err}
        </div>
      )}
      {sent && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          <CheckCircle2 size={14} />
          Invite sent to <span className="font-semibold">{sent}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={pending || !email}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        {pending ? "Sending…" : "Send invite"}
      </button>
    </form>
  );
}
