"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ConversationListItem = {
  id: string;
  withUsername: string;
  withDisplayName: string;
  withRole: "seller" | "buyer" | "support";
  withRating?: number;
  orderId: string | null;
  skuId: string | null;
  subject: string;
  lastMessageAt: string;
  unread: boolean;
  lastSnippet: string | null;
  lastFromYou: boolean;
};

export type MessageItem = {
  id: string;
  fromRole: "buyer" | "seller" | "support";
  fromYou: boolean;
  text: string;
  ts: string;
  systemEvent?: { kind: string; detail: string | null };
};

export type ConversationDetail = {
  id: string;
  iAmBuyer: boolean; // current user is the buyer half
  withUsername: string;
  withDisplayName: string;
  withRole: "seller" | "buyer" | "support";
  orderId: string | null;
  skuId: string | null;
  skuSlug?: string;
  subject: string;
  messages: MessageItem[];
};

type ConvoRow = {
  id: string;
  buyer_id: string;
  other_id: string;
  other_role: "seller" | "buyer" | "support";
  order_id: string | null;
  sku_id: string | null;
  subject: string;
  last_message_at: string;
  unread: boolean;
};

type ProfileRow = { id: string; username: string; display_name: string };

export async function getMyConversations(): Promise<ConversationListItem[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: convos, error } = await supabase
      .from("conversations")
      .select("*")
      .or(`buyer_id.eq.${user.id},other_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false });
    if (error) throw error;
    if (!convos?.length) return [];

    const counterpartyIds = (convos as ConvoRow[]).map((c) =>
      c.buyer_id === user.id ? c.other_id : c.buyer_id,
    );
    const uniqueIds = Array.from(new Set(counterpartyIds));

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", uniqueIds);
    const profileMap = new Map<string, ProfileRow>();
    for (const p of (profiles ?? []) as ProfileRow[]) profileMap.set(p.id, p);

    // Latest message per conversation for the snippet.
    const convoIds = (convos as ConvoRow[]).map((c) => c.id);
    const { data: lastMessages } = await supabase
      .from("messages")
      .select("conversation_id, from_role, text, ts")
      .in("conversation_id", convoIds)
      .order("ts", { ascending: false });
    const latestByConvo = new Map<string, { from_role: string; text: string }>();
    for (const m of lastMessages ?? []) {
      if (!latestByConvo.has(m.conversation_id)) {
        latestByConvo.set(m.conversation_id, { from_role: m.from_role, text: m.text });
      }
    }

    return (convos as ConvoRow[]).map((c) => {
      const youAreBuyer = c.buyer_id === user.id;
      const counterpartyId = youAreBuyer ? c.other_id : c.buyer_id;
      const profile = profileMap.get(counterpartyId);
      const last = latestByConvo.get(c.id);
      const lastFromYou = last
        ? (youAreBuyer && last.from_role === "buyer") ||
          (!youAreBuyer && last.from_role !== "buyer")
        : false;
      const yourRoleIsBuyer = youAreBuyer;
      const counterpartyRole: "seller" | "buyer" | "support" =
        c.other_role === "support" ? "support" : yourRoleIsBuyer ? c.other_role : "buyer";

      return {
        id: c.id,
        withUsername: profile?.username ?? "unknown",
        withDisplayName: profile?.display_name ?? profile?.username ?? "Unknown",
        withRole: counterpartyRole,
        orderId: c.order_id,
        skuId: c.sku_id,
        subject: c.subject,
        lastMessageAt: c.last_message_at,
        unread: c.unread,
        lastSnippet: last?.text ?? null,
        lastFromYou,
      };
    });
  } catch (e) {
    console.error("getMyConversations failed:", e);
    return [];
  }
}

export async function getConversation(id: string): Promise<ConversationDetail | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: convo } = await supabase
      .from("conversations")
      .select("*, sku:skus!conversations_sku_id_fkey(slug)")
      .eq("id", id)
      .maybeSingle();
    if (!convo) return null;
    const c = convo as ConvoRow & { sku: { slug?: string } | { slug?: string }[] | null };
    if (c.buyer_id !== user.id && c.other_id !== user.id) return null;

    const counterpartyId = c.buyer_id === user.id ? c.other_id : c.buyer_id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .eq("id", counterpartyId)
      .maybeSingle();

    const { data: msgs } = await supabase
      .from("messages")
      .select("id, from_role, text, ts, system_event_kind, system_event_detail")
      .eq("conversation_id", id)
      .order("ts", { ascending: true });

    const youAreBuyer = c.buyer_id === user.id;
    const skuRel = Array.isArray(c.sku) ? c.sku[0] : c.sku;
    const skuSlug = (skuRel as { slug?: string } | null)?.slug;

    return {
      id: c.id,
      iAmBuyer: youAreBuyer,
      withUsername: profile?.username ?? "unknown",
      withDisplayName: profile?.display_name ?? profile?.username ?? "Unknown",
      withRole: youAreBuyer ? c.other_role : "buyer",
      orderId: c.order_id,
      skuId: c.sku_id,
      skuSlug,
      subject: c.subject,
      messages: (msgs ?? []).map((m) => ({
        id: m.id,
        fromRole: m.from_role as "buyer" | "seller" | "support",
        fromYou:
          (youAreBuyer && m.from_role === "buyer") ||
          (!youAreBuyer && m.from_role !== "buyer"),
        text: m.text,
        ts: m.ts,
        systemEvent: m.system_event_kind
          ? { kind: m.system_event_kind, detail: m.system_event_detail }
          : undefined,
      })),
    };
  } catch (e) {
    console.error("getConversation failed:", e);
    return null;
  }
}

export async function sendMessage(
  conversationId: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "Type a message first." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You must be signed in." };

    const { data: convo } = await supabase
      .from("conversations")
      .select("buyer_id, other_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (!convo) return { ok: false, error: "Conversation not found." };
    const c = convo as { buyer_id: string; other_id: string };
    if (c.buyer_id !== user.id && c.other_id !== user.id)
      return { ok: false, error: "Not your conversation." };

    const fromRole = c.buyer_id === user.id ? "buyer" : "seller";
    const now = new Date().toISOString();
    const { error: msgErr } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      from_role: fromRole,
      text: trimmed,
      ts: now,
    });
    if (msgErr) throw msgErr;

    await supabase
      .from("conversations")
      .update({ last_message_at: now, unread: true })
      .eq("id", conversationId);

    revalidatePath(`/account/messages/${conversationId}`);
    revalidatePath("/account/messages");
    return { ok: true };
  } catch (e) {
    console.error("sendMessage failed:", e);
    return { ok: false, error: "Could not send the message." };
  }
}

export async function markConversationRead(id: string): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false };
    await supabase.from("conversations").update({ unread: false }).eq("id", id);
    revalidatePath("/account/messages");
    return { ok: true };
  } catch (e) {
    console.error("markConversationRead failed:", e);
    return { ok: false };
  }
}

export async function startConversation(formData: FormData): Promise<void> {
  const toUsername = String(formData.get("to") || "").trim().toLowerCase();
  const text = String(formData.get("text") || "").trim();
  const orderId = String(formData.get("orderId") || "") || null;
  const skuId = String(formData.get("skuId") || "") || null;
  const subject = String(formData.get("subject") || "").trim() || `Message to ${toUsername}`;

  if (!toUsername || !text) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/account/messages/new`);

  const { data: target } = await supabase
    .from("profiles")
    .select("id, is_seller")
    .eq("username", toUsername)
    .maybeSingle();
  if (!target) redirect(`/account/messages?error=user-not-found`);

  // If a thread for this same (buyer, other, optional order) tuple already
  // exists, append the message instead of duplicating.
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("buyer_id", user.id)
    .eq("other_id", target.id)
    .eq("order_id", orderId)
    .maybeSingle();

  let conversationId: string | null = existing?.id ?? null;
  const now = new Date().toISOString();

  if (!conversationId) {
    const { data: created, error: convoErr } = await supabase
      .from("conversations")
      .insert({
        buyer_id: user.id,
        other_id: target.id,
        other_role: "seller",
        order_id: orderId,
        sku_id: skuId,
        subject,
        last_message_at: now,
        unread: true,
      })
      .select("id")
      .single();
    if (convoErr) {
      console.error("startConversation insert failed:", convoErr);
      redirect(`/account/messages?error=create-failed`);
    }
    conversationId = created?.id ?? null;
  }

  if (!conversationId) redirect(`/account/messages`);

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    from_role: "buyer",
    text,
    ts: now,
  });
  await supabase
    .from("conversations")
    .update({ last_message_at: now, unread: true })
    .eq("id", conversationId);

  revalidatePath("/account/messages");
  redirect(`/account/messages/${conversationId}`);
}
