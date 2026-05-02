import Link from "next/link";
import { ArrowUpRight, Flame, Hammer, ShieldCheck, Sparkles, Star } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { RecentSalesTicker } from "@/components/recent-sales-ticker";
import { RecentlyViewed } from "@/components/recently-viewed";
import { getCatalogWithPricing, getMarketplaceStats } from "@/lib/db";
import { formatUSD, isPresale } from "@/lib/utils";
import type { Sku } from "@/lib/data";

/**
 * Heat score for a SKU when there's no marketplace activity yet (or as a
 * tiebreaker when there is). Pulls signal from objective data:
 *   - release-date proximity (pre-release + just-released score highest)
 *   - brand/set premium tier (the boxes the hobby talks about)
 *   - rookie class premium (2025-26 NBA Cooper Flagg era)
 *
 * Higher = hotter. Range roughly 0..15.
 */
const PREMIUM_SETS = new Set([
  "National Treasures",
  "Flawless",
  "Immaculate",
  "The Cup",
  "Five Star",
  "Pristine",
  "Sterling",
  "Inception",
]);
const FLAGSHIP_SETS = new Set([
  "Chrome",
  "Cosmic Chrome",
  "Bowman",
  "Bowman Chrome",
  "Prizm",
  "Series 1",
]);

function heatScore(sku: Sku & { lowestAsk?: number | null }, now: Date): number {
  let score = 0;

  // Release-date proximity. Pre-releases inside 60d and just-released inside 90d both score.
  const release = new Date(sku.releaseDate);
  const days = (release.getTime() - now.getTime()) / 86400000;
  if (days >= 0 && days <= 30) score += 6; // hot pre-release
  else if (days >= 0 && days <= 60) score += 4;
  else if (days < 0 && days >= -60) score += 4; // just released
  else if (days < 0 && days >= -180) score += 2;

  // Set tier
  if (PREMIUM_SETS.has(sku.set)) score += 3;
  else if (FLAGSHIP_SETS.has(sku.set)) score += 2;

  // 2025-26 NBA rookie class is a known premium right now
  if (sku.sport === "NBA" && sku.year === 2025) score += 2;

  // Hobby-only configurations are hotter than retail tiers in the order book
  if (sku.product === "Hobby Box" || sku.product === "Jumbo Box") score += 1;
  if (sku.product === "FotL Hobby Box") score += 2;

  return score;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; year?: string; sort?: string }>;
}) {
  const { sport, year, sort } = await searchParams;
  const yearNum = year ? Number(year) : undefined;
  const isBrowseMode = !!(sport || yearNum);
  const [all, stats] = await Promise.all([
    getCatalogWithPricing(),
    getMarketplaceStats(),
  ]);
  let filtered = all.filter((s) => {
    if (sport && s.sport !== sport) return false;
    if (yearNum && s.year !== yearNum) return false;
    return true;
  });
  // Apply sort when in browse mode.
  if (isBrowseMode) {
    filtered = [...filtered].sort((a, b) => {
      switch (sort) {
        case "highest-ask":
          return (b.lowestAsk ?? -Infinity) - (a.lowestAsk ?? -Infinity);
        case "last-sale":
          return (b.lastSale ?? -Infinity) - (a.lastSale ?? -Infinity);
        case "newest":
          return b.releaseDate.localeCompare(a.releaseDate);
        case "oldest":
          return a.releaseDate.localeCompare(b.releaseDate);
        case "name-asc":
          return a.set.localeCompare(b.set);
        case "lowest-ask":
        default:
          // Lowest ask first; nulls (no listings) go last.
          if (a.lowestAsk === null && b.lowestAsk === null) return 0;
          if (a.lowestAsk === null) return 1;
          if (b.lowestAsk === null) return -1;
          return a.lowestAsk - b.lowestAsk;
      }
    });
  }
  const presaleSkus = filtered.filter((s) => isPresale(s.releaseDate));
  const releasedSkus = filtered.filter((s) => !isPresale(s.releaseDate));
  const releases = presaleSkus.length > 0 ? presaleSkus.slice(0, 4) : filtered.slice(0, 4);
  const trending = releasedSkus.slice(0, 4);
  const justDropped = releasedSkus.slice(4, 8);

  const showStats =
    stats.escrowUsd !== null || stats.sellerCount !== null || stats.positivePct !== null;

  // "Marketplace activity" check — if no SKU has a lowest-ask AND no SKU has
  // a recent sale, the order book is essentially empty (e.g. brand-new
  // launch, or just-wiped demo). In that case we replace the curated
  // "Trending / Just dropped" sections with a single "What's Hot" reading
  // ranked by objective signals (release calendar, set tier, rookie class).
  // The user still gets a useful, populated home page.
  const hasMarketplaceActivity = filtered.some(
    (s) => s.lowestAsk !== null || s.lastSale !== null,
  );
  const now = new Date();
  const whatsHot = !hasMarketplaceActivity
    ? [...filtered]
        .map((s) => ({ sku: s, heat: heatScore(s, now) }))
        .sort((a, b) => b.heat - a.heat)
        .slice(0, 8)
        .map((x) => x.sku)
    : [];

  return (
    <div>
      {/* Hero — home view only. In browse mode the user is already
          shopping, so the marketing pitch is just dead space pushing the
          actual products below the fold. */}
      {!isBrowseMode && (
        <section className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-10%,rgba(212,175,55,0.18),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_110%,rgba(124,58,237,0.12),transparent_50%)]" />
          <div className="relative mx-auto max-w-7xl px-6 py-20 lg:py-28">
            <div className="max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-white/70 uppercase backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600" />
                Sealed Sports Cards · Est. 2026
              </div>
              <h1 className="font-display text-5xl leading-[1.05] font-black tracking-tight text-white lg:text-7xl">
                Sealed{" "}
                <span className="italic text-amber-400">sports</span> wax.
                <br />
                Bought right. Sold right.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
                Pay what the market actually pays. Sell without the eBay tax. Every box
                arrives sealed — or your money back, no questions.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  href="#featured"
                  className="rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-3 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400"
                >
                  Browse the catalog
                </Link>
                <Link
                  href="/sell"
                  className="rounded-md border border-white/15 px-5 py-3 text-sm font-semibold text-white/90 transition hover:border-white/30 hover:bg-white/5"
                >
                  List a box →
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Stats — also home only. Same reasoning. */}
      {showStats && !isBrowseMode && (
        <section className="border-b border-white/5">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-px bg-white/5 sm:grid-cols-3">
            {stats.escrowUsd !== null && (
              <Stat
                k={formatStatMoney(stats.escrowUsd)}
                v="in escrow"
                sub="across active orders"
              />
            )}
            {stats.sellerCount !== null && (
              <Stat
                k={`${stats.sellerCount.toLocaleString()}+`}
                v="active sellers"
                sub="Stripe-verified"
              />
            )}
            {stats.positivePct !== null && (
              <Stat
                k={`${stats.positivePct.toFixed(1)}%`}
                v="positive feedback"
                sub="across all reviews"
              />
            )}
          </div>
        </section>
      )}

      <div
        className={`mx-auto max-w-7xl px-4 lg:px-6 ${isBrowseMode ? "py-6" : "py-16"}`}
      >
        {(sport || yearNum) && (
          <div className="mb-6 text-sm text-white/50">
            Filtered by{" "}
            {sport && <span className="font-semibold text-white">{sport}</span>}
            {sport && yearNum && " · "}
            {yearNum && (
              <span className="font-semibold text-white">
                {sport && ["NBA", "NHL"].includes(sport)
                  ? `${yearNum}-${(yearNum + 1).toString().slice(2)}`
                  : yearNum}
              </span>
            )}
            {" · "}
            <Link href="/" className="text-amber-400 hover:underline">
              clear
            </Link>
          </div>
        )}

        <RecentSalesTicker sport={sport as import("@/lib/data").Sport | undefined} />

        {/* Hide "Pick back up" when sport-filtered — viewing history mixes sports
            and would surface the wrong-sport SKUs the filter is excluding. */}
        {!sport && !yearNum && <RecentlyViewed />}

        {isBrowseMode ? (
          /* BROWSE MODE: flat sortable grid of every product matching the filter. */
          <BrowseGrid filtered={filtered} sort={sort} sport={sport} year={year} />
        ) : !hasMarketplaceActivity ? (
          /* EMPTY-STATE MODE: order book has no listings + no sales yet.
             Show "What's Hot" ranked by objective market signals so the
             home page still has content while liquidity builds. */
          <>
            <section className="mb-6 rounded-2xl border border-amber-700/40 bg-gradient-to-br from-amber-500/10 to-transparent p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
                  <Sparkles size={20} />
                </div>
                <div className="flex-1">
                  <h2 className="font-display text-xl font-black tracking-tight text-white">
                    The order book is just opening up.
                  </h2>
                  <p className="mt-1 text-sm text-white/70">
                    No listings yet — be one of the first sellers and lock in the
                    lowest ask before competition shows up. Or browse what the
                    hobby&apos;s talking about, ranked by release calendar +
                    product tier.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href="/sell"
                      className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-sm font-bold text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400"
                    >
                      List the first box
                    </Link>
                    <Link
                      href="/how-it-works"
                      className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-amber-400/40 hover:text-amber-300"
                    >
                      How it works
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {whatsHot.length > 0 && (
              <Section
                eyebrow="What's hot"
                title="The hobby's reading"
                subtitle="Ranked by release calendar, set tier, and 2025-26 rookie class — not user activity yet"
              >
                <Grid>
                  {whatsHot.slice(0, 4).map((s) => (
                    <ProductCard
                      key={s.id}
                      sku={s}
                      lowestAsk={s.lowestAsk}
                      lastSale={s.lastSale}
                      presale={isPresale(s.releaseDate)}
                    />
                  ))}
                </Grid>
              </Section>
            )}

            {whatsHot.length > 4 && (
              <Section
                eyebrow="Also worth watching"
                title="Premium and pre-release"
                subtitle="Box configurations the market typically pays a premium for"
              >
                <Grid>
                  {whatsHot.slice(4, 8).map((s) => (
                    <ProductCard
                      key={s.id}
                      sku={s}
                      lowestAsk={s.lowestAsk}
                      lastSale={s.lastSale}
                      presale={isPresale(s.releaseDate)}
                    />
                  ))}
                </Grid>
              </Section>
            )}
          </>
        ) : (
          <>
            {releases.length > 0 && (
              <Section
                id="featured"
                eyebrow={presaleSkus.length > 0 ? "Now open" : "Open Market"}
                title={presaleSkus.length > 0 ? "Pre-orders open" : "Tonight's book"}
                subtitle={
                  presaleSkus.length > 0
                    ? "List early to lock the lowest ask"
                    : "Hot boxes this week"
                }
              >
                <Grid>
                  {releases.map((s) => (
                    <ProductCard
                      key={s.id}
                      sku={s}
                      lowestAsk={s.lowestAsk}
                      lastSale={s.lastSale}
                      presale={isPresale(s.releaseDate)}
                    />
                  ))}
                </Grid>
              </Section>
            )}

            {trending.length > 0 && (
              <Section
                eyebrow="Trending"
                title="New lowest ask"
                subtitle="Sellers just dropped prices"
              >
                <Grid>
                  {trending.map((s) => (
                    <ProductCard key={s.id} sku={s} lowestAsk={s.lowestAsk} lastSale={s.lastSale} />
                  ))}
                </Grid>
              </Section>
            )}

            {justDropped.length > 0 && (
              <Section eyebrow="Just dropped" title="Newest releases" subtitle="Hot off the printer">
                <Grid>
                  {justDropped.map((s) => (
                    <ProductCard key={s.id} sku={s} lowestAsk={s.lowestAsk} lastSale={s.lastSale} />
                  ))}
                </Grid>
              </Section>
            )}
          </>
        )}
      </div>

      {/* Value props */}
      <section className="border-y border-white/5 bg-gradient-to-b from-[#0a0a0b] to-[#101013]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-20 md:grid-cols-3">
          {[
            {
              icon: <Hammer size={20} />,
              title: "Real bid/ask",
              body: "A live order book like Wall Street, not a flea market. Buyers bid up, sellers undercut, prices discover.",
            },
            {
              icon: <ShieldCheck size={20} />,
              title: "Held in escrow",
              body: "Every transaction is held until the box arrives sealed. No middleman risk, no resealed wax slipping through.",
            },
            {
              icon: <Star size={20} />,
              title: "Tier-based fees",
              body: "Earn 10% → 8% → 6% commission savings as you climb. Elite sellers get paid every three days.",
            },
          ].map((f) => (
            <div key={f.title}>
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-amber-700/40 bg-amber-500/10 text-amber-400">
                {f.icon}
              </div>
              <h3 className="font-display text-2xl font-black text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

type FilteredSku = Awaited<ReturnType<typeof getCatalogWithPricing>>[number];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "lowest-ask", label: "Lowest ask" },
  { value: "highest-ask", label: "Highest ask" },
  { value: "last-sale", label: "Last sale (high → low)" },
  { value: "newest", label: "Newest releases" },
  { value: "oldest", label: "Oldest releases" },
  { value: "name-asc", label: "Name A → Z" },
];

function BrowseGrid({
  filtered,
  sort,
  sport,
  year,
}: {
  filtered: FilteredSku[];
  sort?: string;
  sport?: string;
  year?: string;
}) {
  return (
    <section className="mb-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.2em] text-amber-400/80 uppercase">
            Browse
          </div>
          <h2 className="font-display mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
            {filtered.length} {filtered.length === 1 ? "product" : "products"}
          </h2>
        </div>
        <form
          action="/"
          method="get"
          className="flex items-center gap-2"
        >
          {/* Preserve current filter when sort changes */}
          {sport && <input type="hidden" name="sport" value={sport} />}
          {year && <input type="hidden" name="year" value={year} />}
          <label htmlFor="browse-sort" className="text-xs text-white/60">
            Sort by
          </label>
          <select
            id="browse-sort"
            name="sort"
            defaultValue={sort ?? "lowest-ask"}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-amber-400/50 focus:outline-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-amber-300"
          >
            Apply
          </button>
        </form>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center text-sm text-white/60">
          No products match this filter.{" "}
          <Link href="/" className="font-semibold text-amber-300 hover:underline">
            Clear filter
          </Link>
        </div>
      ) : (
        <Grid>
          {filtered.map((s) => (
            <ProductCard
              key={s.id}
              sku={s}
              lowestAsk={s.lowestAsk}
              lastSale={s.lastSale}
              presale={isPresale(s.releaseDate)}
            />
          ))}
        </Grid>
      )}
    </section>
  );
}

function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-16">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.2em] text-amber-400/80 uppercase">
            {eyebrow}
          </div>
          <h2 className="font-display mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
            {title}
          </h2>
          <p className="mt-1 text-sm text-white/50">{subtitle}</p>
        </div>
        <Link
          href="/search"
          className="inline-flex items-center gap-1 text-xs font-semibold text-white/60 transition hover:text-amber-300"
        >
          View all <ArrowUpRight size={12} />
        </Link>
      </div>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">{children}</div>;
}

function Stat({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <div className="bg-[#0a0a0b] px-8 py-10">
      <div className="font-display text-4xl font-black text-amber-400">{k}</div>
      <div className="mt-1 text-sm font-semibold text-white">{v}</div>
      <div className="mt-0.5 text-xs text-white/50">{sub}</div>
    </div>
  );
}

function formatStatMoney(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 10_000) return `$${(usd / 1000).toFixed(0)}K`;
  return formatUSD(usd);
}
