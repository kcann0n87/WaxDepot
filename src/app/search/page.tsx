import Link from "next/link";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { SaveSearchButton } from "@/components/save-search-button";
import { getCatalogWithPricing } from "@/lib/db";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sport?: string; brand?: string }>;
}) {
  const { q = "", sport, brand } = await searchParams;
  const query = q.trim().toLowerCase();

  const catalog = await getCatalogWithPricing();

  let results = catalog;
  if (query) {
    results = results.filter((s) => {
      const haystack = `${s.year} ${s.brand} ${s.set} ${s.product} ${s.sport}`.toLowerCase();
      return haystack.includes(query);
    });
  }
  if (sport) results = results.filter((s) => s.sport === sport);
  if (brand) results = results.filter((s) => s.brand === brand);

  // Facet counts come from the FULL catalog so users can see what's available
  // even with a partial query. They tighten when query terms also apply.
  const sportFacets = countBy(catalog, (s) => s.sport);
  const brandFacets = countBy(catalog, (s) => s.brand);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <form action="/search" method="get" className="relative mb-8">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-white/30"
          size={18}
        />
        <input
          name="q"
          defaultValue={q}
          autoFocus
          placeholder='Search "2025 Bowman Hobby" or "Prizm Football"'
          className="w-full rounded-lg border border-white/10 bg-white/5 py-3.5 pr-3 pl-11 text-base text-white placeholder:text-white/30 focus:border-amber-400/50 focus:bg-white/10 focus:outline-none"
        />
      </form>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-7">
          <Facet
            title="Sport"
            items={Object.entries(sportFacets)}
            paramKey="sport"
            currentValue={sport}
            q={q}
          />
          <Facet
            title="Brand"
            items={Object.entries(brandFacets)}
            paramKey="brand"
            currentValue={brand}
            q={q}
          />
        </aside>

        <div>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <div className="text-[10px] font-semibold tracking-[0.2em] text-amber-400/80 uppercase">
                {q ? "Search" : "Catalog"}
              </div>
              <h1 className="font-display mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
                {q ? `Results for "${q}"` : "All sealed boxes"}
              </h1>
              <p className="mt-1 text-sm text-white/50">
                {results.length} {results.length === 1 ? "result" : "results"}
                {sport ? ` · ${sport}` : ""}
                {brand ? ` · ${brand}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(q || sport || brand) && <SaveSearchButton query={q} sport={sport} brand={brand} />}
              {(sport || brand) && (
                <Link
                  href={`/search${q ? `?q=${encodeURIComponent(q)}` : ""}`}
                  className="text-sm text-amber-300 transition hover:text-amber-200"
                >
                  Clear filters
                </Link>
              )}
            </div>
          </div>

          {results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
              <div className="text-white/20">
                <Search size={32} className="mx-auto" />
              </div>
              <p className="font-display mt-3 text-lg font-black text-white">No matches</p>
              <p className="mt-1 text-sm text-white/50">Try a different brand, sport, or year.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {results.map((s) => (
                <ProductCard
                  key={s.id}
                  sku={s}
                  lowestAsk={s.lowestAsk}
                  lastSale={s.lastSale}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Facet({
  title,
  items,
  paramKey,
  currentValue,
  q,
}: {
  title: string;
  items: [string, number][];
  paramKey: string;
  currentValue?: string;
  q: string;
}) {
  return (
    <div>
      <h3 className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-amber-400/80 uppercase">
        {title}
      </h3>
      <ul className="space-y-1">
        {items.map(([value, count]) => {
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          if (currentValue !== value) params.set(paramKey, value);
          const isActive = currentValue === value;
          return (
            <li key={value}>
              <Link
                href={`/search?${params.toString()}`}
                className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-amber-500/15 font-bold text-amber-300"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{value}</span>
                <span className={`text-xs ${isActive ? "text-amber-300/70" : "text-white/40"}`}>
                  {count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function countBy<T>(arr: T[], keyFn: (x: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of arr) {
    const k = keyFn(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}
