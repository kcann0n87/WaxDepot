import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock, DollarSign, Package, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatUSD, formatUSDFull } from "@/lib/utils";

export const dynamic = "force-dynamic";

type DbOrderStatus =
  | "Charged"
  | "InEscrow"
  | "Shipped"
  | "Delivered"
  | "Released"
  | "Completed"
  | "Canceled";

type SkuJoin = {
  slug: string;
  year: number;
  brand: string;
  product: string;
  set_name: string;
} | null;

const STATUS_FILTERS = ["all", "open", "shipped", "completed", "canceled"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

// Maps the URL-friendly status filter to the underlying DbOrderStatus values
// it covers. "open" rolls Charged + InEscrow together since they're the same
// thing from the buyer's perspective ("paid, waiting on the seller").
const STATUS_GROUPS: Record<StatusFilter, readonly DbOrderStatus[] | null> = {
  all: null,
  open: ["Charged", "InEscrow"],
  shipped: ["Shipped", "Delivered"],
  completed: ["Released", "Completed"],
  canceled: ["Canceled"],
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

export default async function OrderHistoryPage({
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
  if (!user) redirect("/login?next=/account/orders");

  // Pull every order owned by the buyer. RLS already restricts to
  // buyer_id = auth.uid(), so no service role needed.
  const { data: rows, error } = await supabase
    .from("orders")
    .select(
      "id, total_cents, status, placed_at, sku:skus!orders_sku_id_fkey(slug, year, brand, product, set_name)",
    )
    .eq("buyer_id", user.id)
    .order("placed_at", { ascending: false });
  if (error) console.error("orders list load:", error);

  type OrderRow = {
    id: string;
    total_cents: number;
    status: DbOrderStatus;
    placed_at: string;
    sku: SkuJoin | SkuJoin[];
  };

  const orders = ((rows ?? []) as OrderRow[]).map((o) => ({
    id: o.id,
    sku: Array.isArray(o.sku) ? o.sku[0] : o.sku,
    total: o.total_cents / 100,
    status: o.status,
    date: o.placed_at,
  }));

  // Apply filter + search server-side off the in-memory list (fine for the
  // beta scale we're at; revisit with a paginated query if a buyer ever
  // crosses ~500 orders).
  const allowedStatuses = STATUS_GROUPS[filter];
  const term = q?.trim().toLowerCase() ?? "";
  const filtered = orders.filter((o) => {
    if (allowedStatuses && !allowedStatuses.includes(o.status)) return false;
    if (term) {
      const haystack = `${skuTitle(o.sku)} ${o.id}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  // Lifetime totals — calculated against ALL orders, not the filtered set,
  // so the "lifetime spent" tile doesn't shift when you change the status
  // filter (would feel buggy).
  const paidStatuses: DbOrderStatus[] = [
    "InEscrow",
    "Shipped",
    "Delivered",
    "Released",
    "Completed",
  ];
  const lifetimePaid = orders.filter((o) => paidStatuses.includes(o.status));
  const lifetimeSpent = lifetimePaid.reduce((s, o) => s + o.total, 0);
  const avg =
    lifetimePaid.length > 0 ? lifetimeSpent / lifetimePaid.length : 0;

  const counts: Record<StatusFilter, number> = {
    all: orders.length,
    open: orders.filter((o) =>
      STATUS_GROUPS.open!.includes(o.status),
    ).length,
    shipped: orders.filter((o) =>
      STATUS_GROUPS.shipped!.includes(o.status),
    ).length,
    completed: orders.filter((o) =>
      STATUS_GROUPS.completed!.includes(o.status),
    ).length,
    canceled: orders.filter((o) =>
      STATUS_GROUPS.canceled!.includes(o.status),
    ).length,
  };

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
        Order history
      </h1>
      <p className="mt-1 text-sm text-white/50">
        Every order you&apos;ve placed, with escrow status and tracking.
      </p>

      {/* Lifetime totals — fixed, not filter-dependent */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          icon={<Package size={14} />}
          label="Orders"
          value={String(lifetimePaid.length)}
          sub="paid lifetime"
        />
        <Stat
          icon={<DollarSign size={14} />}
          label="Spent"
          value={formatUSD(lifetimeSpent)}
          sub="lifetime"
          accent
        />
        <Stat
          icon={<Clock size={14} />}
          label="Avg order"
          value={lifetimePaid.length > 0 ? formatUSD(avg) : "—"}
          sub="paid"
        />
      </div>

      {/* Search + filter chips */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        <form
          action="/account/orders"
          method="get"
          className="flex flex-1 flex-wrap items-center gap-2"
        >
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by product or order ID"
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
          const href = `/account/orders${params.toString() ? `?${params}` : ""}`;
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
                : f === "open"
                  ? "In escrow"
                  : f === "shipped"
                    ? "Shipped"
                    : f === "completed"
                      ? "Completed"
                      : "Canceled"}
              {" · "}
              {counts[f]}
            </Link>
          );
        })}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-12 text-center text-sm text-white/50">
          {orders.length === 0
            ? "No orders yet. Browse the marketplace to place your first."
            : "No orders match this filter."}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-white/[0.03] text-left text-[10px] font-semibold tracking-[0.15em] text-white/50 uppercase">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((o) => (
                <tr key={o.id} className="transition hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link
                      href={`/account/orders/${o.id}`}
                      className="text-amber-300 hover:underline"
                    >
                      {o.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/account/orders/${o.id}`}
                      className="text-sm font-semibold text-white transition hover:text-amber-300"
                    >
                      {skuTitle(o.sku)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-display font-black text-amber-400">
                    {formatUSDFull(o.total)}
                  </td>
                  <td className="px-4 py-3">
                    <OrderBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-white/50">
                    {formatShort(o.date)}
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

const ORDER_BADGES: Record<DbOrderStatus, { bg: string; text: string; label: string }> = {
  Charged: { bg: "border-amber-700/40 bg-amber-500/15", text: "text-amber-300", label: "Charged" },
  InEscrow: { bg: "border-amber-700/40 bg-amber-500/15", text: "text-amber-300", label: "Escrow" },
  Shipped: { bg: "border-sky-700/40 bg-sky-500/15", text: "text-sky-300", label: "Shipped" },
  Delivered: { bg: "border-emerald-700/40 bg-emerald-500/15", text: "text-emerald-300", label: "Delivered" },
  Released: { bg: "border-emerald-700/40 bg-emerald-500/15", text: "text-emerald-300", label: "Released" },
  Completed: { bg: "border-white/10 bg-white/5", text: "text-white/70", label: "Completed" },
  Canceled: { bg: "border-rose-700/40 bg-rose-500/15", text: "text-rose-300", label: "Canceled" },
};

function OrderBadge({ status }: { status: DbOrderStatus }) {
  const c = ORDER_BADGES[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold ${c.bg} ${c.text}`}
    >
      <ShieldCheck size={11} />
      {c.label}
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
