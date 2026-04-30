import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WatchButton } from "@/components/watch-button";
import { formatSkuTitle, formatUSDFull } from "@/lib/utils";
import type { Sport, Sku } from "@/lib/data";

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

export default async function WatchlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/watchlist");

  // 1) The user's watched SKU rows + joined SKU detail.
  const { data: watchRows } = await supabase
    .from("watchlist")
    .select("sku_id, added_at, sku:skus!watchlist_sku_id_fkey(*)")
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });

  const watched: { sku: Sku; addedAt: string }[] = (watchRows ?? [])
    .map((row) => {
      const skuRel = Array.isArray(row.sku) ? row.sku[0] : row.sku;
      if (!skuRel) return null;
      return { sku: rowToSku(skuRel as SkuRow), addedAt: row.added_at };
    })
    .filter((x): x is { sku: Sku; addedAt: string } => x !== null);

  // 2) Lowest ask + last sale for each watched SKU (single round trip each).
  const skuIds = watched.map((w) => w.sku.id);
  const [{ data: listings }, { data: sales }] = await Promise.all([
    skuIds.length
      ? supabase
          .from("listings")
          .select("sku_id, price_cents")
          .in("sku_id", skuIds)
          .eq("status", "Active")
      : Promise.resolve({ data: [] as { sku_id: string; price_cents: number }[] }),
    skuIds.length
      ? supabase
          .from("sales")
          .select("sku_id, price_cents, sold_at")
          .in("sku_id", skuIds)
          .order("sold_at", { ascending: false })
      : Promise.resolve({ data: [] as { sku_id: string; price_cents: number; sold_at: string }[] }),
  ]);

  const lowestBySku = new Map<string, number>();
  for (const l of listings ?? []) {
    const cur = lowestBySku.get(l.sku_id);
    if (cur === undefined || l.price_cents < cur) lowestBySku.set(l.sku_id, l.price_cents);
  }
  const lastBySku = new Map<string, number>();
  for (const s of sales ?? []) {
    if (!lastBySku.has(s.sku_id)) lastBySku.set(s.sku_id, s.price_cents);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
        <Link href="/account" className="inline-flex items-center gap-1 hover:text-white">
          <ArrowLeft size={14} /> Account
        </Link>
        <span>/</span>
        <span className="text-white">Watchlist</span>
      </div>
      <h1 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
        Watchlist
      </h1>
      <p className="mt-1 text-sm text-white/50">
        Boxes you&apos;re tracking. We&apos;ll alert you when prices drop or new listings appear.
      </p>

      {watched.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
            <Heart size={24} />
          </div>
          <h3 className="font-display mt-4 text-base font-bold text-white">No watchlist yet</h3>
          <p className="mt-1 text-sm text-white/50">
            Tap the heart on any product to track it here.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-sm font-bold text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400"
          >
            Browse marketplace
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-white/[0.03] text-left text-[10px] font-semibold tracking-[0.15em] text-white/50 uppercase">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Lowest ask</th>
                <th className="px-4 py-3">Last sale</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {watched.map(({ sku }) => {
                const askCents = lowestBySku.get(sku.id);
                const lastCents = lastBySku.get(sku.id);
                return (
                  <tr key={sku.id} className="transition hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <Link href={`/product/${sku.slug}`} className="flex items-center gap-3">
                        <div
                          className="flex h-12 w-10 shrink-0 items-center justify-center rounded text-[8px] font-bold text-white"
                          style={{
                            background: `linear-gradient(135deg, ${sku.gradient[0]}, ${sku.gradient[1]})`,
                          }}
                        >
                          {sku.brand.slice(0, 4).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white transition hover:text-amber-300">
                            {formatSkuTitle(sku)}
                          </div>
                          <div className="text-xs text-white/50">{sku.sport}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-display font-black text-amber-400">
                      {askCents !== undefined ? formatUSDFull(askCents / 100) : "—"}
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {lastCents !== undefined ? formatUSDFull(lastCents / 100) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <WatchButton skuId={sku.id} variant="compact" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
