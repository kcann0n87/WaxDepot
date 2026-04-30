"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns the SKU UUIDs the current user is watching.
 * Returns empty array for anonymous users (no error — caller falls back to localStorage).
 */
export async function getMyWatchlistIds(): Promise<string[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("watchlist")
      .select("sku_id")
      .eq("user_id", user.id);
    if (error) throw error;
    return (data ?? []).map((r) => r.sku_id);
  } catch (e) {
    console.error("getMyWatchlistIds failed:", e);
    return [];
  }
}

/**
 * Toggle a SKU on/off the watchlist for the current user.
 * `currentlyWatching` is the client's optimistic view — used to decide which op to run.
 * Returns the actual new state (or the old state if the call failed).
 */
export async function toggleWatch(
  skuId: string,
  currentlyWatching: boolean,
): Promise<{ ok: boolean; watching: boolean }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, watching: currentlyWatching };

    if (currentlyWatching) {
      const { error } = await supabase
        .from("watchlist")
        .delete()
        .eq("user_id", user.id)
        .eq("sku_id", skuId);
      if (error) throw error;
      revalidatePath("/account/watchlist");
      return { ok: true, watching: false };
    } else {
      const { error } = await supabase
        .from("watchlist")
        .upsert(
          { user_id: user.id, sku_id: skuId },
          { onConflict: "user_id,sku_id", ignoreDuplicates: true },
        );
      if (error) throw error;
      revalidatePath("/account/watchlist");
      return { ok: true, watching: true };
    }
  } catch (e) {
    console.error("toggleWatch failed:", e);
    return { ok: false, watching: currentlyWatching };
  }
}

/**
 * Bulk-insert any localStorage SKU IDs into the user's Supabase watchlist on
 * first login. Idempotent — duplicates are silently skipped.
 */
export async function syncLocalWatchlist(skuIds: string[]): Promise<{ ok: boolean }> {
  if (!skuIds.length) return { ok: true };
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false };
    const rows = skuIds.map((sku_id) => ({ user_id: user.id, sku_id }));
    const { error } = await supabase
      .from("watchlist")
      .upsert(rows, { onConflict: "user_id,sku_id", ignoreDuplicates: true });
    if (error) throw error;
    revalidatePath("/account/watchlist");
    return { ok: true };
  } catch (e) {
    console.error("syncLocalWatchlist failed:", e);
    return { ok: false };
  }
}
