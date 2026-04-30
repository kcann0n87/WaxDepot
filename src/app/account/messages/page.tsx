import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MessageCircle, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyConversations } from "@/app/actions/messages";

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/messages");

  const conversations = await getMyConversations();
  const unreadCount = conversations.filter((c) => c.unread && !c.lastFromYou).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
        <Link href="/account" className="inline-flex items-center gap-1 hover:text-white">
          <ArrowLeft size={14} /> Account
        </Link>
        <span>/</span>
        <span className="text-white">Messages</span>
      </div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
            Messages
          </h1>
          <p className="text-sm text-white/50">
            Conversations with sellers, buyers, and support · {unreadCount} unread
          </p>
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
          <MessageCircle className="mx-auto text-white/40" size={32} />
          <p className="mt-3 font-display text-base font-bold text-white">No messages yet</p>
          <p className="mt-1 text-sm text-white/50">
            When you contact a seller or have an order question, the conversation lives here.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-sm font-bold text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400"
          >
            <Plus size={14} />
            Browse marketplace
          </Link>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-white/10 bg-[#101012]">
          {conversations.map((c) => (
            <li key={c.id} className="border-b border-white/5 last:border-0">
              <Link
                href={`/account/messages/${c.id}`}
                className={`flex gap-3 px-4 py-3 transition hover:bg-white/[0.02] ${
                  c.unread && !c.lastFromYou ? "bg-amber-500/10" : ""
                }`}
              >
                <Avatar name={c.withDisplayName} support={c.withRole === "support"} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                      {c.withDisplayName}
                      <span className="text-[11px] font-normal text-white/40">@{c.withUsername}</span>
                      {c.withRole === "support" && (
                        <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                          STAFF
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] text-white/40">
                      {ago(c.lastMessageAt)}
                    </span>
                  </div>
                  {c.subject && (
                    <div className="mt-0.5 line-clamp-1 text-xs text-white/50">{c.subject}</div>
                  )}
                  {c.lastSnippet && (
                    <div className="mt-1 line-clamp-1 text-sm text-white/80">
                      {c.lastFromYou && (
                        <span className="font-semibold text-white/50">You: </span>
                      )}
                      {c.lastSnippet}
                    </div>
                  )}
                </div>
                {c.unread && !c.lastFromYou && (
                  <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Avatar({ name, support }: { name: string; support?: boolean }) {
  if (support) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-xs font-black text-slate-900 shadow-md">
        WM
      </div>
    );
  }
  const initial = name[0]?.toUpperCase() ?? "?";
  const colors = [
    "from-emerald-400 to-emerald-600",
    "from-sky-400 to-sky-600",
    "from-rose-400 to-rose-600",
    "from-amber-400 to-amber-600",
    "from-violet-400 to-violet-600",
    "from-cyan-400 to-cyan-600",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-md ${color}`}
    >
      {initial}
    </div>
  );
}

function ago(iso: string) {
  const eventTime = new Date(iso).getTime();
  const now = Date.now();
  const diff = now - eventTime;
  const min = Math.max(Math.floor(diff / 60000), 0);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
