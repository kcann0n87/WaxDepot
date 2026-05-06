import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Box, DollarSign, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatUSD, formatUSDFull } from "@/lib/utils";

export const dynamic = "force-dynamic";

type DbListingStatus = "Active" | "Sold" | "Paused" | "Expired";

type SkuJoin = {
  slug: string;
  year: number;
  brand: string;
  product: string;
  set_name: string;
} | null;

const STATUS_FILTERS = ["all", "active", "sold", "paused"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_GROUPS: Record<StatusFilter, readonly DbListingStatus[] | null> = {
  all: null,
  active: ["Active"],
  sold: ["Sold"],
  paused: ["Paused", "Expired"],
};

function formatShort(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function skuTitle(sku: SkuJoin) {
  if (!sku) return "Unknown product";
  return `${sku.year} ${sku.brand} ${sku.product}`;
}

export default async function ListingHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const { filter: filterRaw, q } = await searchParams;
  const filter: StatusFilter = (STATUS_FILTERS as readonly string[]).includes(
    filterRaw ?? "",
  )
    ? (filterRaw as StatusFilter)
    : "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/listings");

  const { data: rows, error } = await supabase
    .from("listings")
    .select(
      "id, price_cents, quantity, status, created_at, sku:skus!listings_sku_id_fkey(slug, year, brand, product, set_name)",
    )
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });
  if (error) console.error("listings list load:", error);

  type ListingRow = {
    id: string;
    price_cents: number;
    quantity: number;
    status: DbListingStatus;
    created_at: string;
    sku: SkuJoin | SkuJoin[];
  };

  const listings = ((rows ?? []) as ListingRow[]).map((l) => ({
    id: l.id,
    sku: Array.isArray(l.sku) ? l.sku[0] : l.sku,
    price: l.price_cents / 100,
    qty: l.quantity,
    status: l.status,
    listed: l.created_at,
  }));

  const allowedStatuses = STATUS_GROUPS[filter];
  const term = q?.trim().toLowerCase() ?? "";
  const filtered = listings.filter((l) => {
    if (allowedStatuses && !allowedStatuses.includes(l.status)) return false;
    if (term) {
      const haystack = `${skuTitle(l.sku)} ${l.id}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  const counts: Record<StatusFilter, number> = {
    all: listings.length,
    active: listings.filter((l) => l.status === "Active").length,
    sold: listings.filter((l) => l.status === "Sold").length,
    paused: listings.filter((l) =>
      STATUS_GROUPS.paused!.includes(l.status),
    ).length,
  };

  // GMV is the sum of price * qty for Sold listings — not perfect (doesn't
  // account for partial-quantity sales), but close enough for the at-a-
  // glance number; real numbers live on /account/analytics.
  const sold = listings.filter((l) => l.status === "Sold");
  const grossSold = sold.reduce((s, l) => s + l.price * l.qty, 0);
  const activeQty = listings
    .filter((l) => l.status === "Active")
    .reduce((s, l) => s + l.qty, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-6">
      <Link
        href="/account"
        className="mb-3 inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white"
      >
        <ArrowLeft size={12} />
        Back to dashboard
      </Link>
      <h1 className="font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
        Your listings
      </h1>
      <p className="mt-1 text-sm text-white/50">
        Boxes you&apos;ve put on the order book. Active ones are visible to buyers
        and accepting bids.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          icon={<Box size={14} />}
          label="Active"
          value={String(counts.active)}
          sub={`${activeQty} ${activeQty === 1 ? "box" : "boxes"} live`}
          accent
        />
        <Stat
          icon={<Package size={14} />}
          label="Sold"
          value={String(counts.sold)}
          sub="lifetime listings"
        />
        <Stat
          icon={<DollarSign size={14} />}
          label="Gross sold"
          value={formatUSD(grossSold)}
          sub="before fees"
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <form
          action="/account/listings"
          method="get"
          className="flex flex-1 flex-wrap items-center gap-2"
        >
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by product"
            className="flex-1 min-w-0 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/40"
          />
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
          <button
            type="submit"
            className="rounded-md bg-amber-400 px-3 py-1.5 text-sm font-bold text-slate-900 hover:bg-amber-300"
          >
            Search
          </button>
        </form>
        <Link
          href="/sell"
          className="rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-1.5 text-sm font-bold text-slate-900 transition hover:from-amber-300 hover:to-amber-400"
        >
          + List a box
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {STATUS_FILTERS.map((f) => {
          const params = new URLSearchParams();
          if (f !== "all") params.set("filter", f);
          if (q) params.set("q", q);
          const href = `/account/listings${params.toString() ? `?${params}` : ""}`;
          const active = filter === f;
          return (
            <Link
              key={f}
              href={href}
              className={`rounded-full border px-3 py-1 font-semibold transition ${
                active
                  ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
                  : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
              }`}
            >
              {f === "all"
                ? "All"
                : f === "active"
                  ? "Active"
                  : f === "sold"
                    ? "Sold"
                    : "Paused"}
              {" · "}
              {counts[f]}
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-12 text-center text-sm text-white/50">
          {listings.length === 0
            ? "No listings yet. Click +List a box to put your first one on the market."
            : "No listings match this filter."}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-white/[0.03] text-left text-[10px] font-semibold tracking-[0.15em] text-white/50 uppercase">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Listed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((l) => (
                <tr key={l.id} className="transition hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/account/listings/${l.id}`}
                      className="text-sm font-semibold text-white transition hover:text-amber-300"
                    >
                      {skuTitle(l.sku)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-display font-black text-amber-400">
                    {formatUSDFull(l.price)}
                  </td>
                  <td className="px-4 py-3 text-white/70">{l.qty}</td>
                  <td className="px-4 py-3">
                    <ListingBadge status={l.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-white/50">
                    {formatShort(l.listed)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const LISTING_BADGES: Record<DbListingStatus, string> = {
  Active: "border-emerald-700/40 bg-emerald-500/15 text-emerald-300",
  Sold: "border-amber-700/40 bg-amber-500/15 text-amber-300",
  Paused: "border-white/10 bg-white/5 text-white/60",
  Expired: "border-white/10 bg-white/5 text-white/60",
};

function ListingBadge({ status }: { status: DbListingStatus }) {
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${LISTING_BADGES[status]}`}
    >
      {status}
    </span>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-[#101012] p-4 ${
        accent ? "border-amber-700/30 bg-amber-500/[0.04]" : "border-white/10"
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-white/60 uppercase">
        {icon}
        {label}
      </div>
      <div
        className={`font-display mt-2 text-2xl font-black ${accent ? "text-amber-300" : "text-white"}`}
      >
        {value}
      </div>
      <div className="mt-1 text-[11px] text-white/50">{sub}</div>
    </div>
  );
}
