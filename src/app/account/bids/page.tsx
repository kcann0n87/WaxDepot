import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatUSD, formatUSDFull } from "@/lib/utils";

export const dynamic = "force-dynamic";

type DbBidStatus = "Active" | "Won" | "Outbid" | "Expired" | "Canceled";

type SkuJoin = {
  slug: string;
  year: number;
  brand: string;
  product: string;
  set_name: string;
} | null;

const STATUS_FILTERS = ["all", "active", "won", "lost"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_GROUPS: Record<StatusFilter, readonly DbBidStatus[] | null> = {
  all: null,
  active: ["Active"],
  won: ["Won"],
  // "lost" buckets everything that's terminal-without-purchase: outbid, the
  // seller declined (status flips to Outbid), expired, manually canceled.
  lost: ["Outbid", "Expired", "Canceled"],
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

export default async function BidHistoryPage({
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
  if (!user) redirect("/login?next=/account/bids");

  const { data: rows, error } = await supabase
    .from("bids")
    .select(
      "id, price_cents, status, expires_at, created_at, sku:skus!bids_sku_id_fkey(slug, year, brand, product, set_name)",
    )
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });
  if (error) console.error("bids list load:", error);

  type BidRow = {
    id: string;
    price_cents: number;
    status: DbBidStatus;
    expires_at: string;
    created_at: string;
    sku: SkuJoin | SkuJoin[];
  };

  const bids = ((rows ?? []) as BidRow[]).map((b) => ({
    id: b.id,
    sku: Array.isArray(b.sku) ? b.sku[0] : b.sku,
    price: b.price_cents / 100,
    status: b.status,
    expires: b.expires_at,
    placed: b.created_at,
  }));

  const allowedStatuses = STATUS_GROUPS[filter];
  const term = q?.trim().toLowerCase() ?? "";
  const filtered = bids.filter((b) => {
    if (allowedStatuses && !allowedStatuses.includes(b.status)) return false;
    if (term) {
      const haystack = `${skuTitle(b.sku)} ${b.id}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  const counts: Record<StatusFilter, number> = {
    all: bids.length,
    active: bids.filter((b) => b.status === "Active").length,
    won: bids.filter((b) => b.status === "Won").length,
    lost: bids.filter((b) =>
      STATUS_GROUPS.lost!.includes(b.status),
    ).length,
  };

  const activeTotal = bids
    .filter((b) => b.status === "Active")
    .reduce((s, b) => s + b.price, 0);
  const wonCount = counts.won;

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
        Your bids
      </h1>
      <p className="mt-1 text-sm text-white/50">
        Open offers, accepted bids, and history. Sellers can accept any active
        bid above their lowest ask — or below it if they want to clear inventory.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          icon={<TrendingUp size={14} />}
          label="Active bids"
          value={String(counts.active)}
          sub="open offers"
          accent
        />
        <Stat
          icon={<Clock size={14} />}
          label="In play"
          value={formatUSD(activeTotal)}
          sub="committed if all hit"
        />
        <Stat
          icon={<TrendingUp size={14} />}
          label="Won"
          value={String(wonCount)}
          sub="lifetime"
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <form
          action="/account/bids"
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
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {STATUS_FILTERS.map((f) => {
          const params = new URLSearchParams();
          if (f !== "all") params.set("filter", f);
          if (q) params.set("q", q);
          const href = `/account/bids${params.toString() ? `?${params}` : ""}`;
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
                  : f === "won"
                    ? "Won"
                    : "Lost"}
              {" · "}
              {counts[f]}
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-12 text-center text-sm text-white/50">
          {bids.length === 0
            ? "No bids yet. Place one on any product page."
            : "No bids match this filter."}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-white/[0.03] text-left text-[10px] font-semibold tracking-[0.15em] text-white/50 uppercase">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Bid</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((b) => (
                <tr key={b.id} className="transition hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <Link
                      href={
                        b.sku?.slug
                          ? `/product/${b.sku.slug}`
                          : "/account"
                      }
                      className="text-sm font-semibold text-white transition hover:text-amber-300"
                    >
                      {skuTitle(b.sku)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-display font-black text-amber-400">
                    {formatUSDFull(b.price)}
                  </td>
                  <td className="px-4 py-3">
                    <BidBadge status={b.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-white/50">
                    {b.status === "Active"
                      ? formatShort(b.expires)
                      : "—"}
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

const BID_BADGES: Record<DbBidStatus, string> = {
  Active: "border-amber-700/40 bg-amber-500/15 text-amber-300",
  Won: "border-emerald-700/40 bg-emerald-500/15 text-emerald-300",
  Outbid: "border-rose-700/40 bg-rose-500/15 text-rose-300",
  Expired: "border-white/10 bg-white/5 text-white/60",
  Canceled: "border-white/10 bg-white/5 text-white/60",
};

function BidBadge({ status }: { status: DbBidStatus }) {
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${BID_BADGES[status]}`}
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
