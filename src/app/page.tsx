import Link from "next/link";
import { ArrowUpRight, Hammer, ShieldCheck, Star } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { RecentSalesTicker } from "@/components/recent-sales-ticker";
import { RecentlyViewed } from "@/components/recently-viewed";
import { getCatalogWithPricing, getMarketplaceStats } from "@/lib/db";
import { formatUSD, isPresale } from "@/lib/utils";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const { sport } = await searchParams;
  const [all, stats] = await Promise.all([
    getCatalogWithPricing(),
    getMarketplaceStats(),
  ]);
  const filtered = sport ? all.filter((s) => s.sport === sport) : all;
  const presaleSkus = filtered.filter((s) => isPresale(s.releaseDate));
  const releasedSkus = filtered.filter((s) => !isPresale(s.releaseDate));
  const releases = presaleSkus.length > 0 ? presaleSkus.slice(0, 4) : filtered.slice(0, 4);
  const trending = releasedSkus.slice(0, 4);
  const justDropped = releasedSkus.slice(4, 8);

  const showStats =
    stats.escrowUsd !== null || stats.sellerCount !== null || stats.positivePct !== null;

  return (
    <div>
      {/* Hero */}
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
              The order book for sealed{" "}
              <span className="italic text-amber-400">sports</span> wax.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
              Trade sealed cards like stocks. Real bid, real ask, real escrow — no eBay tax,
              no chargebacks, no guesswork.
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

      {/* Stats — only shown once real numbers cross meaningful thresholds */}
      {showStats && (
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

      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-6">
        {sport && (
          <div className="mb-6 text-sm text-white/50">
            Filtered by <span className="font-semibold text-white">{sport}</span> ·{" "}
            <Link href="/" className="text-amber-400 hover:underline">
              clear
            </Link>
          </div>
        )}

        <RecentSalesTicker />

        <RecentlyViewed />

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
