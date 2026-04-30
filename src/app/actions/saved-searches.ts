"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Sport } from "@/lib/data";

export type SavedSearchRecord = {
  id: string;
  query: string;
  sport?: string;
  brand?: string;
  priceMax?: number;
  alerts: { newListing: boolean; priceDrop: boolean; email: boolean };
  createdAt: number;
};

type Row = {
  id: string;
  query: string | null;
  sport: Sport | null;
  brand: string | null;
  price_max_cents: number | null;
  alert_new_listing: boolean;
  alert_price_drop: boolean;
  alert_email: boolean;
  created_at: string;
};

function rowToRecord(r: Row): SavedSearchRecord {
  return {
    id: r.id,
    query: r.query ?? "",
    sport: r.sport ?? undefined,
    brand: r.brand ?? undefined,
    priceMax: r.price_max_cents !== null ? r.price_max_cents / 100 : undefined,
    alerts: {
      newListing: r.alert_new_listing,
      priceDrop: r.alert_price_drop,
      email: r.alert_email,
    },
    createdAt: new Date(r.created_at).getTime(),
  };
}

export async function getMySavedSearches(): Promise<SavedSearchRecord[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as Row[]).map(rowToRecord);
  } catch (e) {
    console.error("getMySavedSearches failed:", e);
    return [];
  }
}

export async function createSavedSearch(params: {
  query: string;
  sport?: string;
  brand?: string;
  priceMax?: number;
  alerts?: { newListing: boolean; priceDrop: boolean; email: boolean };
}): Promise<{ ok: boolean; id?: string; error?: string; needsAuth?: boolean }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, needsAuth: true };

    const alerts = params.alerts ?? { newListing: true, priceDrop: true, email: false };
    const { data, error } = await supabase
      .from("saved_searches")
      .insert({
        user_id: user.id,
        query: params.query || null,
        sport: params.sport ?? null,
        brand: params.brand ?? null,
        price_max_cents: params.priceMax !== undefined ? Math.round(params.priceMax * 100) : null,
        alert_new_listing: alerts.newListing,
        alert_price_drop: alerts.priceDrop,
        alert_email: alerts.email,
      })
      .select("id")
      .single();
    if (error) throw error;
    revalidatePath("/account/alerts");
    return { ok: true, id: data?.id };
  } catch (e) {
    console.error("createSavedSearch failed:", e);
    return { ok: false, error: "Could not save search." };
  }
}

export async function deleteSavedSearch(id: string): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false };
    const { error } = await supabase.from("saved_searches").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;
    revalidatePath("/account/alerts");
    return { ok: true };
  } catch (e) {
    console.error("deleteSavedSearch failed:", e);
    return { ok: false };
  }
}

export async function updateSavedSearchAlerts(
  id: string,
  alerts: Partial<{ newListing: boolean; priceDrop: boolean; email: boolean }>,
): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false };
    const update: Record<string, boolean> = {};
    if (alerts.newListing !== undefined) update.alert_new_listing = alerts.newListing;
    if (alerts.priceDrop !== undefined) update.alert_price_drop = alerts.priceDrop;
    if (alerts.email !== undefined) update.alert_email = alerts.email;
    if (Object.keys(update).length === 0) return { ok: true };
    const { error } = await supabase
      .from("saved_searches")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw error;
    revalidatePath("/account/alerts");
    return { ok: true };
  } catch (e) {
    console.error("updateSavedSearchAlerts failed:", e);
    return { ok: false };
  }
}

/**
 * Bulk-migrate localStorage saved searches to the user's account on first login.
 * Local rows have random string ids — we generate fresh UUIDs server-side.
 */
export async function syncLocalSavedSearches(
  items: Array<Omit<SavedSearchRecord, "id" | "createdAt">>,
): Promise<{ ok: boolean }> {
  if (!items.length) return { ok: true };
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false };

    const rows = items.map((s) => ({
      user_id: user.id,
      query: s.query || null,
      sport: s.sport ?? null,
      brand: s.brand ?? null,
      price_max_cents: s.priceMax !== undefined ? Math.round(s.priceMax * 100) : null,
      alert_new_listing: s.alerts.newListing,
      alert_price_drop: s.alerts.priceDrop,
      alert_email: s.alerts.email,
    }));
    const { error } = await supabase.from("saved_searches").insert(rows);
    if (error) throw error;
    revalidatePath("/account/alerts");
    return { ok: true };
  } catch (e) {
    console.error("syncLocalSavedSearches failed:", e);
    return { ok: false };
  }
}
