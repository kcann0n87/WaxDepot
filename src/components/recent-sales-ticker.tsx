import Link from "next/link";
import { Zap } from "lucide-react";
import { Sport } from "@/lib/data";
import { getRecentSalesGlobal } from "@/lib/db";
import { formatSeasonYear, formatUSD } from "@/lib/utils";

/**
 * Live "tape" of completed sales across the marketplace, server-rendered
 * from the sales table. Returns null when there are no sales — the section
 * disappears entirely so a brand-new marketplace doesn't fake activity.
 *
 * Optionally filters by sport so the NBA/MLB/etc. filtered homepages show
 * only their own sport's recent sales.
 */
export async function RecentSalesTicker({ sport }: { sport?: Sport }) {
  const all = await getRecentSalesGlobal(20);
  // sku may be null (FK orphaned). Drop those.
  const withSku = all.filter((s) => s.sku);
  // We don't have sport on the sku join, so filter by SKU lookup. For
  // simplicity the ticker shows global sales unless a sport filter is
  // active — in which case we re-fetch per-sport via slug heuristic.
  const filtered = sport
    ? withSku.filter((s) => skuMatchesSport(s.sku!.slug, sport))
    : withSku;
  const sales = filtered.slice(0, 5);

  if (sales.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.2em] text-amber-400/80 uppercase">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </div>
          <h2 className="font-display mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
            The tape
          </h2>
          <p className="text-xs text-white/60">Real-time sales across the marketplace</p>
        </div>
        <Link
          href="/search"
          className="text-[11px] font-semibold tracking-wide text-white/60 transition hover:text-amber-300"
        >
          View all →
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#101012]">
        <ul className="divide-y divide-white/5">
          {sales.map((sale) => {
            const sku = sale.sku!;
            return (
              <li key={sale.id}>
                <Link
                  href={`/product/${sku.slug}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.02]"
                >
                  <div
                    className="flex h-10 w-8 shrink-0 items-center justify-center rounded text-[7px] font-bold text-white"
                    style={{
                      background: `linear-gradient(135deg, ${sku.gradient_from ?? "#475569"}, ${sku.gradient_to ?? "#0f172a"})`,
                    }}
                    aria-hidden
                  >
                    {sku.brand.slice(0, 4).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">
                      {formatSeasonYear(sku.year, sportFromSlug(sku.slug))} {sku.brand}{" "}
                      {sku.product}
                    </div>
                    <div className="text-[11px] text-white/60">{ago(sale.soldAt)}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-display text-base font-black text-amber-400">
                      {formatUSD(sale.price)}
                    </div>
                    <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                      <Zap size={10} />
                      Sold
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/**
 * Heuristic sport detection from slug (we only have brand/product on the
 * SKU join, not sport). Good enough for filtering and display.
 */
function sportFromSlug(slug: string): Sport | undefined {
  const lower = slug.toLowerCase();
  if (lower.includes("basketball") || lower.includes("nba")) return "NBA";
  if (lower.includes("baseball") || lower.includes("mlb")) return "MLB";
  if (lower.includes("football") || lower.includes("nfl")) return "NFL";
  if (lower.includes("hockey") || lower.includes("nhl")) return "NHL";
  return undefined;
}

function skuMatchesSport(slug: string, sport: Sport) {
  return sportFromSlug(slug) === sport;
}

function ago(soldAt: string) {
  const seconds = Math.max(
    1,
    Math.floor((Date.now() - new Date(soldAt).getTime()) / 1000),
  );
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
