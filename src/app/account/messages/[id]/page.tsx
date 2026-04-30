import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Package, ShieldCheck } from "lucide-react";
import { getConversation, markConversationRead } from "@/app/actions/messages";
import { ReplyComposer } from "./reply-composer";

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const convo = await getConversation(id);
  if (!convo) notFound();

  // Best-effort mark-read; don't block render if it fails.
  await markConversationRead(id).catch(() => {});

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
        <Link href="/account/messages" className="inline-flex items-center gap-1 hover:text-white">
          <ArrowLeft size={14} /> Messages
        </Link>
        <span>/</span>
        <span className="text-white">{convo.withDisplayName}</span>
      </div>

      <header className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={convo.withDisplayName} support={convo.withRole === "support"} />
          <div>
            <div className="flex items-center gap-1.5 text-lg font-bold text-white">
              {convo.withRole === "seller" ? (
                <Link
                  href={`/seller/${convo.withUsername}`}
                  className="transition hover:text-amber-300"
                >
                  {convo.withDisplayName}
                </Link>
              ) : (
                <span>{convo.withDisplayName}</span>
              )}
              <span className="text-xs font-normal text-white/40">@{convo.withUsername}</span>
              {convo.withRole === "support" && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                  STAFF
                </span>
              )}
            </div>
            <div className="text-xs text-white/50">
              {convo.withRole === "seller"
                ? "Seller"
                : convo.withRole === "buyer"
                  ? "Buyer"
                  : "WaxMarket Support"}
              {convo.subject && ` · ${convo.subject}`}
            </div>
          </div>
        </div>
      </header>

      {convo.orderId && (
        <Link
          href={`/account/orders/${convo.orderId}`}
          className="mb-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 transition hover:bg-white/5"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/5 bg-white/5 text-amber-300">
            <Package size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white/50">
              Order <span className="font-mono text-white/80">{convo.orderId}</span>
            </div>
            <div className="text-sm font-bold text-white">View order details →</div>
          </div>
        </Link>
      )}

      <div className="rounded-xl border border-white/10 bg-[#101012]">
        <ol className="divide-y divide-white/5">
          {convo.messages.map((m) => (
            <li
              key={m.id}
              className={`px-5 py-4 ${m.fromYou ? "bg-white/[0.02]" : ""}`}
            >
              <div className="mb-1 flex items-center gap-2 text-xs">
                <span
                  className={`font-bold ${
                    m.fromYou
                      ? "text-white/80"
                      : m.fromRole === "support"
                        ? "text-amber-400"
                        : "text-white"
                  }`}
                >
                  {m.fromYou ? "You" : convo.withDisplayName}
                </span>
                <span className="text-white/40">·</span>
                <span className="text-white/40">{formatTs(m.ts)}</span>
              </div>
              <p className="text-sm whitespace-pre-line text-white/90">{m.text}</p>
              {m.systemEvent && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-1 text-xs">
                  {m.systemEvent.kind === "shipped" && (
                    <>
                      <Package size={11} className="text-sky-400" />
                      <span className="font-semibold text-white/80">Shipped:</span>
                      <span className="font-mono text-white/60">{m.systemEvent.detail}</span>
                    </>
                  )}
                  {m.systemEvent.kind === "released" && (
                    <>
                      <ShieldCheck size={11} className="text-emerald-400" />
                      <span className="font-semibold text-white/80">Funds released:</span>
                      <span className="text-white/60">{m.systemEvent.detail}</span>
                    </>
                  )}
                  {m.systemEvent.kind === "delivered" && (
                    <>
                      <Package size={11} className="text-emerald-400" />
                      <span className="font-semibold text-white/80">Delivered</span>
                    </>
                  )}
                  {m.systemEvent.kind === "dispute" && (
                    <>
                      <span className="font-semibold text-rose-300">Dispute opened</span>
                      <span className="text-white/60">{m.systemEvent.detail}</span>
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
        <ReplyComposer conversationId={convo.id} withName={convo.withDisplayName} />
      </div>
    </div>
  );
}

function Avatar({ name, support }: { name: string; support?: boolean }) {
  if (support) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-black text-slate-900 shadow-md">
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
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-base font-bold text-white shadow-md ${color}`}
    >
      {initial}
    </div>
  );
}

function formatTs(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}
