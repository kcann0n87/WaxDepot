import "server-only";
import { createClient } from "./supabase/server";
import type { Sport, Sku, Listing } from "./data";

function rowToSku(row: {
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
}): Sku & { uuid: string } {
  return {
    id: row.id, // uuid
    uuid: row.id,
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

export async function getAllSkus(): Promise<Sku[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("skus")
    .select("*")
    .order("release_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToSku);
}

export async function getSkuBySlug(slug: string): Promise<Sku | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("skus")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToSku(data) : null;
}

export async function getListingsForSku(skuId: string): Promise<Listing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("id, sku_id, price_cents, shipping_cents, quantity, seller:profiles!listings_seller_id_fkey(username, is_verified)")
    .eq("sku_id", skuId)
    .eq("status", "Active")
    .order("price_cents", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => {
    // Supabase types joined relations as arrays even when 1:1 — normalize.
    const sellerObj = Array.isArray(r.seller) ? r.seller[0] : r.seller;
    return {
      id: r.id,
      skuId: r.sku_id,
      seller: (sellerObj as { username?: string } | null)?.username ?? "unknown",
      sellerRating: 100, // TODO compute from reviews
      sellerSales: 0, // TODO compute from completed orders
      price: r.price_cents / 100,
      shipping: r.shipping_cents / 100,
      quantity: r.quantity,
    };
  });
}

export async function getLowestAsk(skuId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("price_cents")
    .eq("sku_id", skuId)
    .eq("status", "Active")
    .order("price_cents", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? data.price_cents / 100 : null;
}

export async function getLastSale(skuId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales")
    .select("price_cents")
    .eq("sku_id", skuId)
    .order("sold_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? data.price_cents / 100 : null;
}

export async function getRecentSales(
  skuId: string,
  limit = 10,
): Promise<{ id: string; date: string; price: number }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales")
    .select("id, sold_at, price_cents")
    .eq("sku_id", skuId)
    .order("sold_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    date: r.sold_at.slice(0, 10),
    price: r.price_cents / 100,
  }));
}

/**
 * Returns the N most recent sales across the whole marketplace, joined with
 * the SKU for display. Used by the live "tape" on the homepage.
 */
export async function getRecentSalesGlobal(limit = 8): Promise<
  {
    id: string;
    soldAt: string;
    price: number;
    sku: { slug: string; year: number; brand: string; product: string; image_url: string | null; gradient_from: string | null; gradient_to: string | null } | null;
  }[]
> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sales")
      .select(
        "id, sold_at, price_cents, sku:skus!sales_sku_id_fkey(slug, year, brand, product, image_url, gradient_from, gradient_to)",
      )
      .order("sold_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((r) => {
      const skuRel = Array.isArray(r.sku) ? r.sku[0] : r.sku;
      return {
        id: r.id as string,
        soldAt: r.sold_at as string,
        price: (r.price_cents as number) / 100,
        sku: (skuRel as {
          slug: string;
          year: number;
          brand: string;
          product: string;
          image_url: string | null;
          gradient_from: string | null;
          gradient_to: string | null;
        } | null) ?? null,
      };
    });
  } catch (e) {
    console.error("getRecentSalesGlobal failed:", e);
    return [];
  }
}

/**
 * Aggregate marketplace stats for the hero banner. Returns null fields when
 * the threshold isn't met (homepage will hide the stats block in that case).
 */
export async function getMarketplaceStats(): Promise<{
  escrowUsd: number | null;
  sellerCount: number | null;
  positivePct: number | null;
}> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { escrowUsd: null, sellerCount: null, positivePct: null };
  }
  try {
    const supabase = await createClient();
    const [escrowRes, sellersRes, reviewsRes] = await Promise.all([
      supabase
        .from("orders")
        .select("total_cents")
        .in("status", ["Charged", "InEscrow", "Shipped", "Delivered"])
        .eq("payment_status", "paid"),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("stripe_charges_enabled", true),
      supabase.from("reviews").select("verdict"),
    ]);

    const escrowCents = (escrowRes.data ?? []).reduce(
      (sum: number, r) => sum + (r.total_cents as number),
      0,
    );
    const sellerCount = sellersRes.count ?? 0;
    const reviewRows = (reviewsRes.data ?? []) as { verdict: string }[];
    const totalReviews = reviewRows.length;
    const positiveReviews = reviewRows.filter((r) => r.verdict === "positive").length;
    const positivePct = totalReviews > 0 ? (positiveReviews / totalReviews) * 100 : null;

    // Hide each stat unless it's meaningful enough to show without embarrassment.
    return {
      escrowUsd: escrowCents > 0 ? escrowCents / 100 : null,
      sellerCount: sellerCount >= 3 ? sellerCount : null,
      positivePct: totalReviews >= 10 ? positivePct : null,
    };
  } catch (e) {
    console.error("getMarketplaceStats failed:", e);
    return { escrowUsd: null, sellerCount: null, positivePct: null };
  }
}

export async function getActiveBidsForSku(skuId: string, limit = 20) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bids")
    .select("id, price_cents, expires_at, created_at")
    .eq("sku_id", skuId)
    .eq("status", "Active")
    .order("price_cents", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    price: (r.price_cents as number) / 100,
    expiresAt: r.expires_at as string,
    createdAt: r.created_at as string,
  }));
}

export async function getHighestBidForSku(skuId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bids")
    .select("price_cents")
    .eq("sku_id", skuId)
    .eq("status", "Active")
    .order("price_cents", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? (data.price_cents as number) / 100 : null;
}

/**
 * Aggregates the sales table into a daily price-history series for the chart.
 * Returns up to `days` data points (one per day with at least one sale).
 */
export async function getPriceHistoryForSku(
  skuId: string,
  days = 90,
): Promise<{ date: string; price: number }[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales")
    .select("price_cents, sold_at")
    .eq("sku_id", skuId)
    .gte("sold_at", since)
    .order("sold_at", { ascending: true });
  if (error) throw error;

  const byDay = new Map<string, { sum: number; count: number }>();
  for (const r of data ?? []) {
    const day = r.sold_at.slice(0, 10);
    const acc = byDay.get(day) ?? { sum: 0, count: 0 };
    acc.sum += r.price_cents;
    acc.count += 1;
    byDay.set(day, acc);
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { sum, count }]) => ({
      date,
      price: Math.round(sum / count) / 100,
    }));
}

/**
 * Returns all SKUs along with their lowest ask + last sale in a single round-trip.
 * Used by the homepage and search to avoid N+1 queries.
 *
 * Falls back to an empty array if Supabase is unreachable (so the marketing
 * shell still renders).
 */
export async function getCatalogWithPricing(): Promise<
  (Sku & { lowestAsk: number | null; lastSale: number | null })[]
> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];

  try {
    const supabase = await createClient();

    const [skusRes, listingsRes, salesRes] = await Promise.all([
      supabase.from("skus").select("*").order("release_date", { ascending: false }),
      supabase.from("listings").select("sku_id, price_cents").eq("status", "Active"),
      supabase
        .from("sales")
        .select("sku_id, price_cents, sold_at")
        .order("sold_at", { ascending: false }),
    ]);
    if (skusRes.error) throw skusRes.error;
    if (listingsRes.error) throw listingsRes.error;
    if (salesRes.error) throw salesRes.error;

    const lowestBySku = new Map<string, number>();
    for (const l of listingsRes.data ?? []) {
      const cur = lowestBySku.get(l.sku_id);
      if (cur === undefined || l.price_cents < cur)
        lowestBySku.set(l.sku_id, l.price_cents);
    }
    const lastBySku = new Map<string, number>();
    for (const s of salesRes.data ?? []) {
      if (!lastBySku.has(s.sku_id)) lastBySku.set(s.sku_id, s.price_cents);
    }

    return (skusRes.data ?? []).map((row) => {
      const sku = rowToSku(row);
      return {
        ...sku,
        lowestAsk: lowestBySku.has(sku.id) ? lowestBySku.get(sku.id)! / 100 : null,
        lastSale: lastBySku.has(sku.id) ? lastBySku.get(sku.id)! / 100 : null,
      };
    });
  } catch (e) {
    console.error("getCatalogWithPricing failed:", e);
    return [];
  }
}
