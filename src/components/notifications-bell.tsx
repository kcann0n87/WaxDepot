"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  Bell,
  CheckCheck,
  Heart,
  MessageCircle,
  Package,
  PackageCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
  type NotificationType,
} from "@/app/actions/notifications";

const iconFor = (t: NotificationType) => {
  const map: Record<NotificationType, React.ReactNode> = {
    "bid-placed": <TrendingUp size={14} className="text-amber-400" />,
    outbid: <TrendingDown size={14} className="text-rose-400" />,
    "bid-accepted": <Zap size={14} className="text-amber-400" />,
    "order-shipped": <Package size={14} className="text-sky-400" />,
    "order-delivered": <PackageCheck size={14} className="text-emerald-400" />,
    "payout-sent": <ArrowDownToLine size={14} className="text-emerald-400" />,
    "price-drop": <Heart size={14} className="text-rose-400" />,
    "new-listing": <Zap size={14} className="text-amber-400" />,
    "new-message": <MessageCircle size={14} className="text-amber-400" />,
  };
  return map[t];
};

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const result = await getMyNotifications(20);
    setItems(result.items);
    setUnread(result.unread);
  }, []);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    (async () => {
      await load();
      if (mounted) setHydrated(true);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const onMarkRead = (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    setUnread((u) => Math.max(0, u - 1));
    markNotificationRead(id).catch(() => {});
  };

  const onMarkAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
    setUnread(0);
    markAllNotificationsRead().catch(() => {});
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-2 text-white/60 transition hover:bg-white/5 hover:text-white"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {hydrated && unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-slate-900">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[360px] overflow-hidden rounded-xl border border-white/10 bg-[#101012] shadow-xl shadow-black/40">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <div>
              <div className="font-display text-base font-black text-white">Notifications</div>
              <div className="text-xs text-white/50">
                {unread > 0 ? `${unread} unread` : "All caught up"}
              </div>
            </div>
            {unread > 0 && (
              <button
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/10"
              >
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-white/50">
              {hydrated ? "No notifications yet." : "Loading..."}
            </div>
          ) : (
            <ul className="max-h-[420px] divide-y divide-white/5 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    onClick={() => {
                      onMarkRead(n.id);
                      setOpen(false);
                    }}
                    className={`flex gap-3 px-4 py-3 transition hover:bg-white/[0.03] ${
                      n.unread ? "bg-amber-500/5" : ""
                    }`}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/5 bg-white/5">
                      {iconFor(n.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-sm font-semibold text-white">{n.title}</div>
                        <div className="shrink-0 text-[11px] text-white/40">{ago(n.createdAt)}</div>
                      </div>
                      <div className="mt-0.5 line-clamp-2 text-xs text-white/60">{n.body}</div>
                    </div>
                    {n.unread && (
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-white/5 px-4 py-2.5 text-center">
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-amber-300 transition hover:text-amber-200"
            >
              View all activity →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function ago(iso: string) {
  const eventTime = new Date(iso).getTime();
  const now = Date.now();
  const diffMin = Math.max(Math.floor((now - eventTime) / 60000), 1);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d`;
}
