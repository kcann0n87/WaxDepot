"use server";

import { createClient } from "@/lib/supabase/server";
import type { Sku, Sport } from "@/lib/data";

/**
 * Records that the current user just viewed a SKU. Idempotent on
 * (user_id, sku_id) — re-viewing bumps viewed_at via upsert.
 * No-op for anonymous users.
 */
export async function trackView(skuId: string): Promise<void> {
  if (!skuId || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("recently_viewed")
      .upsert(
        { user_id: user.id, sku_id: skuId, viewed_at: new Date().toISOString() },
        { onConflict: "user_id,sku_id" },
      );
  } catch (e) {
    console.error("trackView failed:", e);
  }
}

type SkuRow = {
  id: string;
  slug: string;
  year: number;
  brand: string;
  sport: Sport;
  set_name: string;
  product: string;
  release_date: string;
  description: string | null;
  image_url: string | null;
  gradient_from: string | null;
  gradient_to: string | null;
};

function rowToSku(row: SkuRow): Sku {
  return {
    id: row.id,
    slug: row.slug,
    year: row.year,
    brand: row.brand,
    sport: row.sport,
    set: row.set_name,
    product: row.product,
    releaseDate: row.release_date,
    description: row.description ?? "",
    imageUrl: row.image_url ?? undefined,
    gradient: [row.gradient_from ?? "#475569", row.gradient_to ?? "#0f172a"],
  };
}

/**
 * Returns the current user's recently viewed SKUs with lowest ask attached.
 * Returns empty array if the user is anonymous.
 */
export async function getMyRecentlyViewed(
  limit = 10,
): Promise<(Sku & { lowestAsk: number | null })[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("recently_viewed")
      .select("sku_id, viewed_at, sku:skus!recently_viewed_sku_id_fkey(*)")
      .eq("user_id", user.id)
      .order("viewed_at", { ascending: false })
      .limit(limit);
    if (error) throw error;

    const skuRows = (data ?? [])
      .map((row) => {
        const s = Array.isArray(row.sku) ? row.sku[0] : row.sku;
        return s ? (s as SkuRow) : null;
      })
      .filter((s): s is SkuRow => s !== null);
    if (!skuRows.length) return [];

    const skuIds = skuRows.map((s) => s.id);
    const { data: listings } = await supabase
      .from("listings")
      .select("sku_id, price_cents")
      .in("sku_id", skuIds)
      .eq("status", "Active");
    const lowestBySku = new Map<string, number>();
    for (const l of listings ?? []) {
      const cur = lowestBySku.get(l.sku_id);
      if (cur === undefined || l.price_cents < cur) lowestBySku.set(l.sku_id, l.price_cents);
    }

    return skuRows.map((row) => ({
      ...rowToSku(row),
      lowestAsk: lowestBySku.has(row.id) ? lowestBySku.get(row.id)! / 100 : null,
    }));
  } catch (e) {
    console.error("getMyRecentlyViewed failed:", e);
    return [];
  }
}
