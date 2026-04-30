"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Paperclip, Send } from "lucide-react";
import { sendMessage } from "@/app/actions/messages";

export function ReplyComposer({
  conversationId,
  withName,
}: {
  conversationId: string;
  withName: string;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!text.trim() || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await sendMessage(conversationId, text);
      if (!result.ok) {
        setError(result.error ?? "Could not send.");
        return;
      }
      setText("");
      router.refresh();
    });
  };

  return (
    <div className="border-t border-white/5 p-4">
      {error && (
        <div className="mb-2 rounded-md border border-rose-700/40 bg-rose-500/10 p-2 text-xs text-rose-200">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          placeholder={`Reply to ${withName}...`}
          className="flex-1 resize-none rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-amber-400/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
        />
        <div className="flex flex-col gap-1.5">
          <button
            onClick={submit}
            disabled={!text.trim() || pending}
            className="flex items-center justify-center rounded-md bg-gradient-to-r from-amber-400 to-amber-500 p-2 text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send"
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
          <button
            type="button"
            disabled
            className="rounded-md border border-white/15 bg-[#101012] p-2 text-white/30"
            aria-label="Attach file"
            title="Attachments coming soon"
          >
            <Paperclip size={16} />
          </button>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-white/40">
        Press ⌘↵ to send. Be respectful — abusive messages can result in account suspension.
      </div>
    </div>
  );
}
