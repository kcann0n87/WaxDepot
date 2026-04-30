"use client";

import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";

export function NewMessageForm({
  to,
  targetDisplayName,
  orderId,
  skuId,
  subjectHint,
  initialDraft,
  startAction,
}: {
  to: string;
  targetDisplayName: string;
  orderId?: string;
  skuId?: string;
  subjectHint: string;
  initialDraft: string;
  startAction: (formData: FormData) => Promise<void>;
}) {
  const [text, setText] = useState(initialDraft);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!text.trim() || pending) return;
    const formData = new FormData();
    formData.set("to", to);
    formData.set("text", text.trim());
    formData.set("subject", subjectHint);
    if (orderId) formData.set("orderId", orderId);
    if (skuId) formData.set("skuId", skuId);
    startTransition(async () => {
      // The server action ends with a redirect — control won't return.
      await startAction(formData);
    });
  };

  return (
    <div className="mt-5 rounded-xl border border-white/10 bg-[#101012] p-5">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-white/80">Your message</span>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          rows={6}
          placeholder={`Write your message to ${targetDisplayName}...`}
          className="w-full resize-none rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-amber-400/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
        />
      </label>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-[11px] text-white/40">Press ⌘↵ to send. Be respectful.</div>
        <button
          onClick={submit}
          disabled={!text.trim() || pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-sm font-bold text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Send
        </button>
      </div>
    </div>
  );
}
