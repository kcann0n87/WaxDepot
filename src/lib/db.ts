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
  variant_group?: string | null;
  variant_type?: string | null;
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
    variantGroup: row.variant_group ?? undefined,
    variantType: row.variant_type ?? undefined,
  };
}

export async function getAllSkus(): Promise<Sku[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("skus")
    .select("*")
    .eq("is_published", true)
    .order("release_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToSku);
}

/**
 * Lightweight rolling-30-day seller stats used by the account-menu tier
 * badge. Returns just the two numbers needed to compute progress to the
 * next tier — no review feedback, no dispute count (those live on the
 * fuller analytics page). Safe to call for non-sellers; they get zeros.
 */
export async function getSellerTierStats(userId: string): Promise<{
  salesLast30d: number;
  gmvLast30dCents: number;
}> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("orders")
    .select("status, total_cents")
    .eq("seller_id", userId)
    .gte("placed_at", since);

  // Anything from Charged onward counts as a "sale" for tier purposes —
  // refunds (Canceled with payment_status='refunded') don't, but neither
  // does the in-escrow window where money's still in flight.
  const paidStatuses = new Set([
    "Charged",
    "InEscrow",
    "Shipped",
    "Delivered",
    "Released",
    "Completed",
  ]);
  const paid = (data ?? []).filter((o) => paidStatuses.has(o.status as string));
  return {
    salesLast30d: paid.length,
    gmvLast30dCents: paid.reduce((sum, o) => sum + o.total_cents, 0),
  };
}

/**
 * Format the grace-period expiration timestamp for human-friendly display
 * in tier badges ("expires Jun 30"). Returns null if no expiry is set.
 */
export function formatTierExpires(expiresAt: string | null | undefined): string | null {
  if (!expiresAt) return null;
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function getSkuBySlug(slug: string): Promise<Sku | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("skus")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToSku(data) : null;
}

/**
 * Returns every SKU in a variant_group along with its lowest-ask price
 * (cents) so the variant selector can show "Hobby Box · $720 / Hobby Case
 * · $8,640" style labels with real per-variant prices.
 *
 * Used by the product page handler to render the variant toggle. Sorted
 * by the canonical variant order (smallest retail → flagship → case).
 */
export async function getVariantsForGroup(
  group: string,
): Promise<Array<Sku & { lowestAskCents: number | null }>> {
  const supabase = await createClient();
  const { data: skuRows, error } = await supabase
    .from("skus")
    .select("*")
    .eq("variant_group", group)
    .eq("is_published", true);
  if (error) throw error;
  if (!skuRows || skuRows.length === 0) return [];

  const ids = skuRows.map((r) => r.id);
  const { data: askRows } = await supabase
    .from("listings")
    .select("sku_id, price_cents")
    .in("sku_id", ids)
    .eq("status", "Active");

  // Reduce to lowest active ask per SKU.
  const lowest: Record<string, number> = {};
  for (const row of askRows ?? []) {
    const cur = lowest[row.sku_id];
    if (cur === undefined || row.price_cents < cur) lowest[row.sku_id] = row.price_cents;
  }

  return skuRows.map((row) => ({
    ...rowToSku(row),
    lowestAskCents: lowest[row.id] ?? null,
  }));
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
    const seller = sellerObj as { username?: string; is_verified?: boolean } | null;
    return {
      id: r.id,
      skuId: r.sku_id,
      seller: seller?.username ?? "unknown",
      sellerVerified: !!seller?.is_verified,
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

/**
 * Batch lowest-ask lookup for many SKUs in a single query. Returns a Map of
 * skuId → lowest active ask in dollars (missing key = no listings). Use this
 * instead of N parallel getLowestAsk calls anywhere a list of SKUs is shown.
 */
export async function getLowestAsksForSkus(
  skuIds: string[],
): Promise<Map<string, number>> {
  if (skuIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("sku_id, price_cents")
    .in("sku_id", skuIds)
    .eq("status", "Active");
  if (error) throw error;
  const out = new Map<string, number>();
  for (const r of data ?? []) {
    const cur = out.get(r.sku_id as string);
    const price = (r.price_cents as number) / 100;
    if (cur === undefined || price < cur) out.set(r.sku_id as string, price);
  }
  return out;
}

/**
 * Batch last-sale lookup for many SKUs in a single query. Returns a Map of
 * skuId → most-recent sale price in dollars.
 */
export async function getLastSalesForSkus(
  skuIds: string[],
): Promise<Map<string, number>> {
  if (skuIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales")
    .select("sku_id, price_cents, sold_at")
    .in("sku_id", skuIds)
    .order("sold_at", { ascending: false });
  if (error) throw error;
  const out = new Map<string, number>();
  for (const r of data ?? []) {
    // First (highest sold_at) row per sku_id wins.
    if (!out.has(r.sku_id as string)) {
      out.set(r.sku_id as string, (r.price_cents as number) / 100);
    }
  }
  return out;
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
 * Daily sales count for a SKU over the last N days. Used by the volume
 * chart on the product page (TCGPlayer-style "is anyone actually trading
 * this?" indicator under the price line). Empty days are filled with a
 * count of 0 so the chart's x-axis is continuous and legible.
 */
export async function getDailySalesVolumeForSku(
  skuId: string,
  days = 30,
): Promise<{ date: string; count: number }[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await supabase
    .from("sales")
    .select("sold_at")
    .eq("sku_id", skuId)
    .gte("sold_at", since);

  // Pre-seed every date in range with 0 so the chart shows a flat baseline
  // for sparse SKUs instead of skipping days.
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    buckets.set(d, 0);
  }
  for (const row of data ?? []) {
    const key = (row.sold_at as string).slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}

/**
 * Lifetime sales count for a single SKU, plus a "trailing-30-days" velocity
 * count for the social-proof badge on the product page ("Sold 47 times ·
 * 12 in the last 30 days"). Single round-trip — service-role client isn't
 * needed since the sales table is publicly readable.
 */
export async function getSalesCountForSku(
  skuId: string,
): Promise<{ lifetime: number; trailing30: number }> {
  const supabase = await createClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const [lifetimeRes, trailingRes] = await Promise.all([
    supabase
      .from("sales")
      .select("id", { count: "exact", head: true })
      .eq("sku_id", skuId),
    supabase
      .from("sales")
      .select("id", { count: "exact", head: true })
      .eq("sku_id", skuId)
      .gte("sold_at", thirtyDaysAgo),
  ]);
  return {
    lifetime: lifetimeRes.count ?? 0,
    trailing30: trailingRes.count ?? 0,
  };
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
  (Sku & {
    lowestAsk: number | null;
    lastSale: number | null;
    salesCount90d: number;
  })[]
> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];

  try {
    const supabase = await createClient();
    const since90d = new Date(Date.now() - 90 * 86400000).toISOString();

    const [skusRes, listingsRes, salesRes] = await Promise.all([
      supabase
        .from("skus")
        .select("*")
        .eq("is_published", true)
        .order("release_date", { ascending: false }),
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
    // Trailing-90-day sales count per SKU — the popularity signal for
    // browse sort. Lifetime would over-weight legacy Topps Chrome from
    // 5 years ago; 90d captures what's actually moving right now.
    const salesCount90dBySku = new Map<string, number>();
    for (const s of salesRes.data ?? []) {
      if (!lastBySku.has(s.sku_id)) lastBySku.set(s.sku_id, s.price_cents);
      if (s.sold_at >= since90d) {
        salesCount90dBySku.set(
          s.sku_id,
          (salesCount90dBySku.get(s.sku_id) ?? 0) + 1,
        );
      }
    }

    return (skusRes.data ?? []).map((row) => {
      const sku = rowToSku(row);
      return {
        ...sku,
        lowestAsk: lowestBySku.has(sku.id) ? lowestBySku.get(sku.id)! / 100 : null,
        lastSale: lastBySku.has(sku.id) ? lastBySku.get(sku.id)! / 100 : null,
        salesCount90d: salesCount90dBySku.get(sku.id) ?? 0,
      };
    });
  } catch (e) {
    console.error("getCatalogWithPricing failed:", e);
    return [];
  }
}
