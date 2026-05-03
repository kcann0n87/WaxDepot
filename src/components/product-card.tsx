import Link from "next/link";
import { Layers } from "lucide-react";
import type { Sku } from "@/lib/data";
import { formatSkuTitle, formatUSD } from "@/lib/utils";
import { ProductImage } from "./product-image";
import { WatchButton } from "./watch-button";

/**
 * Single card on a product grid (homepage / browse / search).
 *
 * `variantCount` controls multi-variant display:
 *   - 1 (or omitted): render as a single SKU. Title + price = exact SKU.
 *   - 2+: render as a "release" card. Title drops the variant suffix
 *     (e.g. "2025-26 Topps Cosmic Chrome NBA" instead of
 *     "2025-26 Topps Cosmic Chrome NBA Hobby Box"), price shows
 *     "from $X" using the cheapest variant in the group, and a small
 *     "X variants" chip surfaces in the corner. Link goes to the
 *     canonical /product/<variant_group> URL so the variant selector
 *     loads.
 */
export function ProductCard({
  sku,
  lowestAsk,
  lastSale,
  presale,
  variantCount,
}: {
  sku: Sku;
  lowestAsk: number | null;
  lastSale: number | null;
  presale?: boolean;
  variantCount?: number;
}) {
  const isMultiVariant = (variantCount ?? 1) > 1;
  // For multi-variant releases, link to the canonical group URL so the
  // variant selector renders. For single SKUs, link to the SKU slug as
  // before — the page handler redirects through to canonical anyway.
  const href = isMultiVariant && sku.variantGroup
    ? `/product/${sku.variantGroup}`
    : `/product/${sku.slug}`;
  // Title: drop the per-variant suffix when collapsed so it reads as
  // "the release" not "this specific box config."
  const title = isMultiVariant
    ? `${sku.year} ${sku.brand} ${sku.set} ${(sku.sport as string) === "Pokemon" ? "TCG" : sku.sport}`
    : formatSkuTitle(sku);

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-lg border border-white/5 bg-[#101012] transition hover:border-amber-400/30 hover:bg-[#15151a]"
    >
      <ProductImage sku={sku} size="card" className="relative aspect-[4/5]">
        {presale && (
          <span className="absolute top-2 left-2 z-10 rounded-full border border-amber-400/40 bg-black/50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-300 uppercase backdrop-blur">
            Presale
          </span>
        )}
        {isMultiVariant && (
          <span className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 rounded-full border border-fuchsia-400/40 bg-black/60 px-2 py-0.5 text-[10px] font-bold tracking-wider text-fuchsia-300 uppercase backdrop-blur">
            <Layers size={10} />
            {variantCount} variants
          </span>
        )}
        <div className="absolute top-2 right-2 z-10">
          <WatchButton skuId={sku.id} variant="icon" />
        </div>
      </ProductImage>
      <div className="flex flex-1 flex-col p-3">
        <div className="line-clamp-2 text-sm font-semibold tracking-tight text-white group-hover:text-amber-300">
          {title}
        </div>
        <div className="mt-1 text-[11px] tracking-wide text-white/60">
          {sku.sport} · {sku.brand} · {sku.year}
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-[10px] font-semibold tracking-[0.15em] text-white/60 uppercase">
              {lowestAsk !== null
                ? isMultiVariant
                  ? "From"
                  : "Lowest Ask"
                : "Last Sale"}
            </div>
            <div className="font-display text-lg font-black tracking-tight text-amber-400">
              {lowestAsk !== null ? formatUSD(lowestAsk) : lastSale !== null ? formatUSD(lastSale) : "—"}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
