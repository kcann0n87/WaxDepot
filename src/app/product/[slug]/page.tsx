import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight, MessageCircle, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { BuyBidActions } from "@/components/buy-bid-actions";
import { OrderBookDepth } from "@/components/order-book-depth";
import { PresaleBanner } from "@/components/presale-banner";
import { ProductJsonLd } from "@/components/product-jsonld";
import { RealtimeOrderBook } from "@/components/realtime-order-book";
import { SellerLink } from "@/components/seller-link";
import { PriceChart } from "@/components/price-chart";
import { ProductImage } from "@/components/product-image";
import { SalesVolumeChart } from "@/components/sales-volume-chart";
import { RecentlyViewed } from "@/components/recently-viewed";
import { TrackView } from "@/components/track-view";
import { VariantSelector } from "@/components/variant-selector";
import { WatchButton } from "@/components/watch-button";
import {
  getActiveBidsForSku,
  getDailySalesVolumeForSku,
  getHighestBidForSku,
  getLastSale,
  getListingsForSku,
  getLowestAsk,
  getPriceHistoryForSku,
  getRecentSales,
  getSalesCountForSku,
  getSkuBySlug,
  getVariantsForGroup,
} from "@/lib/db";
import { sortByVariantOrder, variantLabel } from "@/lib/variants";
import { formatUSD, formatUSDFull, isPresale } from "@/lib/utils";
import type { Metadata } from "next";

/**
 * Pretty title sans the per-variant suffix. The variant (Hobby Box / Hobby
 * Case / Mega Box / etc.) lives in the segmented control above the order
 * book — putting it in the H1 too would be redundant once selectors are on
 * the page. Falls back to the full SKU title if there's only one variant.
 */
function groupTitle(year: number, brand: string, set: string, sport: string): string {
  return `${year} ${brand} ${set} ${sport === "Pokemon" ? "TCG" : sport}`;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ variant?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const { sku } = await resolveProduct(slug, sp.variant);
  if (!sku) {
    return { title: "Product not found · WaxDepot" };
  }
  const ask = await getLowestAsk(sku.id);
  const title = `${sku.year} ${sku.brand} ${sku.set} ${sku.product} · WaxDepot`;
  const askLine = ask !== null ? `Lowest ask ${formatUSD(ask)}.` : "Track price + place a bid.";
  const description =
    `${sku.year} ${sku.brand} ${sku.set} sealed ${sku.product.toLowerCase()} on the WaxDepot marketplace. ${askLine} Buyer Protection on every order.`.slice(0, 200);
  // openGraph.images and twitter.images are intentionally NOT set here —
  // Next.js auto-picks up the colocated opengraph-image.tsx file.
  return {
    title,
    description,
    openGraph: {
      type: "website",
      title,
      description,
      url: `/product/${sku.variantGroup ?? sku.slug}${sku.variantType ? `?variant=${sku.variantType}` : ""}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

/**
 * Resolves the slug param into a concrete SKU. Two cases:
 *
 *   1. slug is a variant_group → look up all variants, pick the one
 *      requested via ?variant or the first by canonical order
 *   2. slug is a legacy per-SKU slug → look up directly, redirect to
 *      the canonical /product/<group>?variant=<type> URL
 *
 * Returns the active SKU and (for case 1) the full variant list so the
 * selector can render. For redirects, this never returns — `redirect()`
 * throws.
 */
async function resolveProduct(
  slug: string,
  variantParam?: string,
): Promise<{
  sku: Awaited<ReturnType<typeof getSkuBySlug>>;
  variants: Awaited<ReturnType<typeof getVariantsForGroup>>;
}> {
  // Case 1: treat slug as a variant_group.
  const variants = sortByVariantOrder(await getVariantsForGroup(slug));
  if (variants.length > 0) {
    const requested = variantParam
      ? variants.find((v) => v.variantType === variantParam)
      : null;
    const sku = requested ?? variants[0];
    return { sku, variants };
  }

  // Case 2: legacy per-SKU slug. Redirect to the canonical group URL so
  // any inbound link or bookmark still works without changing the API.
  const direct = await getSkuBySlug(slug);
  if (direct?.variantGroup && direct.variantType) {
    redirect(`/product/${direct.variantGroup}?variant=${direct.variantType}`);
  }

  // Stranded SKU with no group/type backfill — render directly so the
  // product page still works for any row that escaped migration 0013.
  return { sku: direct, variants: [] };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ variant?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { sku, variants } = await resolveProduct(slug, sp.variant);
  if (!sku) notFound();

  // Parallel fetch everything the page needs for this SKU.
  const [listings, bids, history, sales, ask, bid, last, salesCount, volume] =
    await Promise.all([
      getListingsForSku(sku.id),
      getActiveBidsForSku(sku.id, 20),
      getPriceHistoryForSku(sku.id, 90),
      getRecentSales(sku.id, 6),
      getLowestAsk(sku.id),
      getHighestBidForSku(sku.id),
      getLastSale(sku.id),
      getSalesCountForSku(sku.id),
      getDailySalesVolumeForSku(sku.id, 30),
    ]);
  const volumeTotal = volume.reduce((sum, d) => sum + d.count, 0);

  const previous = history.length >= 8 ? history[history.length - 8].price : last ?? 0;
  const change = last && previous ? last - previous : 0;
  const changePct = previous ? (change / previous) * 100 : 0;

  // Group title drops the per-variant product suffix when a selector is
  // shown. Single-variant products keep the full title (with "Hobby Box"
  // or whatever) for clarity.
  const showVariantSelector = variants.length > 1;
  const titleText = showVariantSelector
    ? groupTitle(sku.year, sku.brand, sku.set, sku.sport)
    : `${sku.year} ${sku.brand} ${sku.set} ${sku.product}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-white/60">
        <Link href="/" className="hover:text-white">
          All
        </Link>
        <ChevronRight size={12} />
        <Link href={`/?sport=${sku.sport}`} className="hover:text-white">
          {sku.sport}
        </Link>
        <ChevronRight size={12} />
        <span className="text-white/60">{sku.brand}</span>
        <ChevronRight size={12} />
        <span className="text-white">{sku.set}</span>
      </nav>

      {isPresale(sku.releaseDate) && <PresaleBanner releaseDate={sku.releaseDate} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#101012] p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
              <ProductImage sku={sku} size="lg" className="aspect-[4/5] rounded-xl border border-white/5" />

              <div>
                <div className="flex items-start justify-between gap-3">
                  <h1 className="font-display text-3xl leading-[1.1] font-black tracking-tight text-white">
                    {titleText}
                  </h1>
                  <WatchButton skuId={sku.id} variant="compact" />
                </div>
                {showVariantSelector && (
                  <p className="mt-2 text-xs text-white/50">
                    Currently viewing{" "}
                    <strong className="text-white/80">{variantLabel(sku.variantType)}</strong>
                  </p>
                )}
                <p className="mt-3 text-sm leading-relaxed text-white/60">{sku.description}</p>

                <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <Spec label="Sport" value={sku.sport} />
                  <Spec label="Brand" value={sku.brand} />
                  <Spec label="Set" value={sku.set} />
                  <Spec label="Year" value={String(sku.year)} />
                  <Spec label="Product" value={sku.product} />
                  <Spec
                    label="Release"
                    value={new Date(sku.releaseDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  />
                </dl>

                {salesCount.lifetime > 0 && (
                  <div className="mt-5 inline-flex flex-wrap items-center gap-2 text-xs text-white/70">
                    <span className="inline-flex items-center gap-1 rounded-md border border-amber-700/40 bg-amber-500/[0.08] px-2 py-1 font-semibold text-amber-200">
                      <TrendingUp size={11} />
                      Sold {salesCount.lifetime} {salesCount.lifetime === 1 ? "time" : "times"}
                    </span>
                    {salesCount.trailing30 > 0 && (
                      <span className="text-white/50">
                        · {salesCount.trailing30} in the last 30 days
                      </span>
                    )}
                  </div>
                )}

                <Link
                  href="/help/buying/buyer-protection"
                  className="mt-6 flex items-start gap-2 rounded-lg border border-emerald-700/30 bg-emerald-500/5 px-3 py-2.5 text-xs text-emerald-100/80 transition hover:border-emerald-500/50 hover:bg-emerald-500/10"
                >
                  <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                  <span>
                    <strong className="text-emerald-300">Buyer Protection:</strong> Held in escrow.
                    Refund if your box doesn&apos;t arrive sealed. <span className="text-emerald-300/70 underline decoration-emerald-500/30 underline-offset-2">Learn more →</span>
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* Variant selector — only renders when there's more than one
              variant in the group (Hobby Box + Hobby Case + Mega etc.). */}
          {showVariantSelector && sku.variantGroup && sku.variantType && (
            <div className="mt-6">
              <VariantSelector
                groupSlug={sku.variantGroup}
                activeType={sku.variantType}
                variants={variants.map((v) => ({
                  variantType: v.variantType ?? "box",
                  lowestAskCents: v.lowestAskCents,
                }))}
              />
            </div>
          )}

          {history.length > 0 && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-[#101012] p-6">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <div className="text-[10px] font-semibold tracking-[0.18em] text-amber-400/80 uppercase">
                    Price history
                  </div>
                  <h2 className="font-display mt-1 text-2xl font-black tracking-tight text-white">
                    Last 90 days
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold ${
                      change >= 0
                        ? "border-emerald-700/40 bg-emerald-500/10 text-emerald-400"
                        : "border-rose-700/40 bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {change >= 0 ? "+" : ""}
                    {formatUSD(Math.abs(change))} ({changePct.toFixed(1)}%)
                  </span>
                  <span className="text-xs text-white/60">7d</span>
                </div>
              </div>
              <PriceChart data={history} />
            </div>
          )}

          {/* Daily sales volume — TCGPlayer-style "is anyone trading this?"
              under the price line. Only renders if there's been at least one
              sale in the window so empty SKUs don't show a flatline. */}
          {volumeTotal > 0 && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-[#101012] p-6">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <div className="text-[10px] font-semibold tracking-[0.18em] text-sky-300/80 uppercase">
                    Sales volume
                  </div>
                  <h2 className="font-display mt-1 text-2xl font-black tracking-tight text-white">
                    Last 30 days
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-sky-700/40 bg-sky-500/10 px-2 py-1 text-xs font-bold text-sky-300">
                  {volumeTotal} {volumeTotal === 1 ? "sale" : "sales"}
                </span>
              </div>
              <SalesVolumeChart data={volume} />
            </div>
          )}

          {(listings.length > 0 || bids.length > 0) && (
            <div className="mt-6">
              <OrderBookDepth listings={listings} bids={bids} last={last} />
            </div>
          )}

          {/* Live order-book sync. Subscribes to Supabase Realtime for
              this SKU's listings + bids and triggers a server-side
              re-render when anything changes. Renders nothing visible. */}
          <RealtimeOrderBook skuId={sku.id} />

          <div className="mt-6 rounded-2xl border border-white/10 bg-[#101012] p-6">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <div className="text-[10px] font-semibold tracking-[0.18em] text-amber-400/80 uppercase">
                  Available listings
                </div>
                <h2 className="font-display mt-1 text-2xl font-black tracking-tight text-white">
                  Buy now
                </h2>
              </div>
              <span className="text-xs text-white/50">
                {listings.length} {listings.length === 1 ? "seller" : "sellers"} · lowest first
              </span>
            </div>
            {listings.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-6 py-8 text-center text-sm text-white/50">
                No active listings yet. Be the first —{" "}
                <Link href="/sell" className="font-semibold text-amber-300 hover:underline">
                  list yours
                </Link>
                .
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-white/5">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-white/5 text-left text-[10px] font-semibold tracking-[0.15em] text-white/50 uppercase">
                    <tr>
                      <th className="px-4 py-3">Seller</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Shipping</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {listings.map((l) => (
                      <tr key={l.id} className="transition hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <SellerLink
                              username={l.seller}
                              isVerified={l.sellerVerified}
                              size="sm"
                            />
                            <Link
                              href={`/account/messages/new?to=${l.seller}&sku=${sku.id}`}
                              className="rounded-md p-1 text-white/50 transition hover:bg-white/5 hover:text-amber-300"
                              aria-label={`Message ${l.seller}`}
                              title={`Message ${l.seller}`}
                            >
                              <MessageCircle size={12} />
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-display font-black text-amber-400">
                          {formatUSDFull(l.price)}
                        </td>
                        <td className="px-4 py-3 text-white/60">
                          {l.shipping === 0 ? (
                            <span className="font-semibold text-emerald-400">Free</span>
                          ) : (
                            formatUSD(l.shipping)
                          )}
                        </td>
                        <td className="px-4 py-3 text-white/60">{l.quantity}</td>
                        <td className="px-4 py-3 text-right">
                          <AddToCartButton listing={l} sku={sku} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-[#101012] p-6">
            <div className="text-[10px] font-semibold tracking-[0.18em] text-amber-400/80 uppercase">
              Tape
            </div>
            <h2 className="font-display mt-1 mb-3 text-xl font-black tracking-tight text-white">
              Recent sales
            </h2>
            {sales.length === 0 ? (
              <div className="rounded-md border border-dashed border-white/10 bg-white/[0.02] px-3 py-4 text-center text-xs text-white/60">
                No recorded sales yet.
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {sales.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <span className="text-white/50">
                      {new Date(s.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="font-display font-black text-amber-300">
                      {formatUSDFull(s.price)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-amber-700/30 bg-gradient-to-b from-[#13130f] to-[#101012] p-5 shadow-xl shadow-amber-500/5">
            <BuyBidActions sku={sku} ask={ask} bid={bid} last={last} />
          </div>
        </aside>
      </div>

      <div className="mt-12">
        <RecentlyViewed excludeSkuId={sku.id} />
      </div>

      <TrackView skuId={sku.id} />
      <ProductJsonLd sku={sku} listings={listings} ask={ask} last={last} />
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold tracking-[0.15em] text-white/60 uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-white">{value}</dd>
    </div>
  );
}
