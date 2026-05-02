import Link from "next/link";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { SaveSearchButton } from "@/components/save-search-button";
import { getCatalogWithPricing } from "@/lib/db";

type SortKey = "relevance" | "lowest-ask" | "highest-ask" | "newest" | "name-asc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "relevance", label: "Best match" },
  { value: "lowest-ask", label: "Lowest ask" },
  { value: "highest-ask", label: "Highest ask" },
  { value: "newest", label: "Newest release" },
  { value: "name-asc", label: "Name A–Z" },
];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    sport?: string;
    brand?: string;
    year?: string;
    product?: string;
    sort?: string;
  }>;
}) {
  const { q = "", sport, brand, year, product, sort } = await searchParams;
  const query = q.trim().toLowerCase();
  const yearNum = year ? Number(year) : undefined;
  const sortKey = (SORT_OPTIONS.find((o) => o.value === sort)?.value ??
    "relevance") as SortKey;

  const catalog = await getCatalogWithPricing();

  // Multi-token matching — split the query on whitespace and require
  // every token to appear somewhere in the haystack. "2024 chrome football"
  // matches a SKU as long as it contains "2024" AND "chrome" AND "football"
  // in any order, instead of needing the literal substring.
  const tokens = query ? query.split(/\s+/).filter(Boolean) : [];

  function relevance(s: (typeof catalog)[number]): number {
    if (tokens.length === 0) return 0;
    const haystack =
      `${s.year} ${s.brand} ${s.set} ${s.product} ${s.sport}`.toLowerCase();
    // Exact full-query substring is highest signal
    let score = 0;
    if (haystack.includes(query)) score += 10;
    // Each token contributes
    for (const t of tokens) {
      if (haystack.includes(t)) score += 3;
    }
    // Bonus when the query begins the title (prefix match)
    if (haystack.startsWith(query)) score += 5;
    // Slight nudge for SKUs with active listings (more useful results)
    if (s.lowestAsk !== null) score += 2;
    if (s.lastSale !== null) score += 1;
    return score;
  }

  let results = catalog.filter((s) => {
    if (tokens.length > 0) {
      const haystack =
        `${s.year} ${s.brand} ${s.set} ${s.product} ${s.sport}`.toLowerCase();
      if (!tokens.every((t) => haystack.includes(t))) return false;
    }
    if (sport && s.sport !== sport) return false;
    if (brand && s.brand !== brand) return false;
    if (yearNum && s.year !== yearNum) return false;
    if (product && s.product !== product) return false;
    return true;
  });

  // Sort. Default = relevance when there's a query, lowest-ask when not.
  const effectiveSort: SortKey =
    sortKey === "relevance" && tokens.length === 0 ? "lowest-ask" : sortKey;

  results = [...results].sort((a, b) => {
    switch (effectiveSort) {
      case "lowest-ask":
        if (a.lowestAsk === null && b.lowestAsk === null) return 0;
        if (a.lowestAsk === null) return 1;
        if (b.lowestAsk === null) return -1;
        return a.lowestAsk - b.lowestAsk;
      case "highest-ask":
        return (b.lowestAsk ?? -Infinity) - (a.lowestAsk ?? -Infinity);
      case "newest":
        return b.releaseDate.localeCompare(a.releaseDate);
      case "name-asc":
        return `${a.year} ${a.brand} ${a.set}`.localeCompare(
          `${b.year} ${b.brand} ${b.set}`,
        );
      case "relevance":
      default: {
        const dr = relevance(b) - relevance(a);
        if (dr !== 0) return dr;
        // Secondary tiebreak: SKUs with listings before unstocked, then newest
        if ((a.lowestAsk === null) !== (b.lowestAsk === null)) {
          return a.lowestAsk === null ? 1 : -1;
        }
        return b.releaseDate.localeCompare(a.releaseDate);
      }
    }
  });

  // Facet counts come from the FULL catalog so users can always see what's
  // available even with a partial query. Counts respect the OTHER filters
  // currently applied so totals are accurate per drill-down.
  const facetableForFacet = (excludeKey: "sport" | "brand" | "year" | "product") =>
    catalog.filter((s) => {
      if (tokens.length > 0) {
        const haystack =
          `${s.year} ${s.brand} ${s.set} ${s.product} ${s.sport}`.toLowerCase();
        if (!tokens.every((t) => haystack.includes(t))) return false;
      }
      if (excludeKey !== "sport" && sport && s.sport !== sport) return false;
      if (excludeKey !== "brand" && brand && s.brand !== brand) return false;
      if (excludeKey !== "year" && yearNum && s.year !== yearNum) return false;
      if (excludeKey !== "product" && product && s.product !== product) return false;
      return true;
    });

  const sportFacets = countBy(facetableForFacet("sport"), (s) => s.sport);
  const brandFacets = countBy(facetableForFacet("brand"), (s) => s.brand);
  const yearFacets = countBy(facetableForFacet("year"), (s) => String(s.year));
  const productFacets = countBy(facetableForFacet("product"), (s) => s.product);

  const baseParams = (extras: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (sort && sort !== "relevance") p.set("sort", sort);
    if (sport) p.set("sport", sport);
    if (brand) p.set("brand", brand);
    if (year) p.set("year", year);
    if (product) p.set("product", product);
    for (const [k, v] of Object.entries(extras)) {
      if (v === undefined) p.delete(k);
      else p.set(k, v);
    }
    return p.toString();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <form action="/search" method="get" role="search" className="relative mb-8">
        <label htmlFor="search-q" className="sr-only">
          Search the marketplace
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-white/50"
          size={18}
          aria-hidden="true"
        />
        <input
          id="search-q"
          name="q"
          defaultValue={q}
          autoFocus
          placeholder='Search "2025 Bowman Hobby" or "Prizm Football"'
          className="w-full rounded-lg border border-white/10 bg-white/5 py-3.5 pr-3 pl-11 text-base text-white placeholder:text-white/50 focus:border-amber-400/50 focus:bg-white/10 focus:outline-none"
        />
        {/* Preserve filters when the user types a new query so they don't
            lose their place on a refinement. */}
        {sort && <input type="hidden" name="sort" value={sort} />}
        {sport && <input type="hidden" name="sport" value={sport} />}
        {brand && <input type="hidden" name="brand" value={brand} />}
        {year && <input type="hidden" name="year" value={year} />}
        {product && <input type="hidden" name="product" value={product} />}
      </form>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-7">
          <Facet
            title="Sport"
            items={Object.entries(sportFacets)}
            paramKey="sport"
            currentValue={sport}
            baseParams={baseParams}
          />
          <Facet
            title="Brand"
            items={Object.entries(brandFacets).sort((a, b) => b[1] - a[1])}
            paramKey="brand"
            currentValue={brand}
            baseParams={baseParams}
          />
          <Facet
            title="Year"
            items={Object.entries(yearFacets).sort((a, b) => Number(b[0]) - Number(a[0]))}
            paramKey="year"
            currentValue={year}
            baseParams={baseParams}
          />
          <Facet
            title="Product"
            items={Object.entries(productFacets).sort((a, b) => b[1] - a[1])}
            paramKey="product"
            currentValue={product}
            baseParams={baseParams}
          />
        </aside>

        <div>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
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
                {year ? ` · ${year}` : ""}
                {product ? ` · ${product}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Sort selector — sticks within the existing query string. */}
              <form action="/search" method="get" className="flex items-center gap-2">
                <label htmlFor="sort" className="text-xs text-white/50">
                  Sort
                </label>
                <select
                  id="sort"
                  name="sort"
                  defaultValue={sortKey}
                  className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white focus:border-amber-400/50 focus:outline-none"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {q && <input type="hidden" name="q" value={q} />}
                {sport && <input type="hidden" name="sport" value={sport} />}
                {brand && <input type="hidden" name="brand" value={brand} />}
                {year && <input type="hidden" name="year" value={year} />}
                {product && <input type="hidden" name="product" value={product} />}
                <button
                  type="submit"
                  className="rounded-md bg-amber-400 px-2.5 py-1.5 text-xs font-bold text-slate-900 hover:bg-amber-300"
                >
                  Apply
                </button>
              </form>
              {(q || sport || brand || year || product) && (
                <SaveSearchButton query={q} sport={sport} brand={brand} />
              )}
              {(sport || brand || year || product) && (
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
              <p className="mt-1 text-sm text-white/50">
                Try fewer words, a different brand, or browse by{" "}
                <Link href="/?sport=NBA" className="text-amber-300 hover:underline">
                  sport
                </Link>
                .
              </p>
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
  baseParams,
}: {
  title: string;
  items: [string, number][];
  paramKey: string;
  currentValue?: string;
  baseParams: (extras: Record<string, string | undefined>) => string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-amber-400/80 uppercase">
        {title}
      </h3>
      <ul className="space-y-1">
        {items.map(([value, count]) => {
          const isActive = currentValue === value;
          // Toggling: clicking the active value clears it; otherwise sets it
          const next = baseParams({ [paramKey]: isActive ? undefined : value });
          return (
            <li key={value}>
              <Link
                href={`/search${next ? `?${next}` : ""}`}
                className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-amber-500/15 font-bold text-amber-300"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{value}</span>
                <span className={`text-xs ${isActive ? "text-amber-300/70" : "text-white/60"}`}>
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
