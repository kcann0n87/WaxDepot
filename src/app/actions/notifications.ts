"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { serviceRoleClient } from "@/lib/supabase/admin";

export type NotificationType =
  | "bid-placed"
  | "outbid"
  | "bid-accepted"
  | "order-shipped"
  | "order-delivered"
  | "payout-sent"
  | "price-drop"
  | "new-listing"
  | "new-message";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  unread: boolean;
  createdAt: string; // ISO
};

type Row = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  unread: boolean;
  created_at: string;
};

function rowToItem(r: Row): NotificationItem {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    href: r.href,
    unread: r.unread,
    createdAt: r.created_at,
  };
}

export async function getMyNotifications(
  limit = 20,
): Promise<{ items: NotificationItem[]; unread: number }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return { items: [], unread: 0 };
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { items: [], unread: 0 };

    const [list, count] = await Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("unread", true),
    ]);

    if (list.error) throw list.error;
    return {
      items: ((list.data ?? []) as Row[]).map(rowToItem),
      unread: count.count ?? 0,
    };
  } catch (e) {
    console.error("getMyNotifications failed:", e);
    return { items: [], unread: 0 };
  }
}

export async function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false };
    const { error } = await supabase
      .from("notifications")
      .update({ unread: false })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    console.error("markNotificationRead failed:", e);
    return { ok: false };
  }
}

export async function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false };
    const { error } = await supabase
      .from("notifications")
      .update({ unread: false })
      .eq("user_id", user.id)
      .eq("unread", true);
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    console.error("markAllNotificationsRead failed:", e);
    return { ok: false };
  }
}

/**
 * Server-only helper for actions that need to fan out a notification.
 * Uses service role because the typical caller is acting AS user A
 * (e.g. buyer placing a bid) but writing a notification FOR user B
 * (the seller). RLS restricts inserts to auth.uid() = user_id, which
 * would block cross-user fanout.
 */
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
}): Promise<void> {
  try {
    const sb = serviceRoleClient();
    await sb.from("notifications").insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      href: params.href,
    });
  } catch (e) {
    console.error("createNotification failed:", e);
  }
}
