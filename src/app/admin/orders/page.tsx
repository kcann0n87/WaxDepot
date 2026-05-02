import Link from "next/link";
import { serviceRoleClient } from "@/lib/supabase/admin";
import { formatUSDFull } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUSES = ["all", "Charged", "InEscrow", "Shipped", "Delivered", "Released", "Canceled"] as const;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;

  const sb = serviceRoleClient();
  let query = sb
    .from("orders")
    .select(
      "id, status, payment_status, total_cents, placed_at, buyer_id, seller_id, sku:skus!orders_sku_id_fkey(year, brand, product), buyer:profiles!orders_buyer_id_fkey(username), seller:profiles!orders_seller_id_fkey(username)",
    )
    .order("placed_at", { ascending: false })
    .limit(100);
  if (status && status !== "all") query = query.eq("status", status);
  if (q) query = query.or(`id.ilike.%${q}%`);

  const { data: orders, error } = await query;
  if (error) console.error(error);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-3xl font-black text-white">Orders</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/60">{orders?.length ?? 0} shown</span>
          <a
            href="/admin/orders/export"
            download
            className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-amber-400/40 hover:bg-amber-500/10 hover:text-amber-300"
          >
            Download CSV
          </a>
        </div>
      </div>

      {/* Filter row */}
      <form className="mb-4 flex flex-wrap items-center gap-2" action="/admin/orders" method="get">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by order ID (e.g. WM-12345)"
          className="flex-1 min-w-0 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/50"
        />
        <select
          name="status"
          defaultValue={status ?? "all"}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-amber-400 px-3 py-1.5 text-sm font-bold text-slate-900 hover:bg-amber-300"
        >
          Apply
        </button>
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#101012]">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-[10px] font-semibold tracking-[0.15em] text-white/60 uppercase">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Buyer</th>
              <th className="px-4 py-3">Seller</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Placed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(orders ?? []).map((o) => {
              const sku = Array.isArray(o.sku) ? o.sku[0] : o.sku;
              const buyer = Array.isArray(o.buyer) ? o.buyer[0] : o.buyer;
              const seller = Array.isArray(o.seller) ? o.seller[0] : o.seller;
              return (
                <tr key={o.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-mono text-xs font-semibold text-amber-300 hover:underline"
                    >
                      {o.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/80">
                    {sku ? `${sku.year} ${sku.brand} ${sku.product}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-white/80">{buyer?.username ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-white/80">{seller?.username ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-display font-black text-amber-400">
                    {formatUSDFull(o.total_cents / 100)}
                  </td>
                  <td className="px-4 py-3 text-xs text-white/60">
                    {new Date(o.placed_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(orders ?? []).length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-white/60">No orders match.</div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Charged: "bg-amber-500/15 text-amber-300",
    InEscrow: "bg-amber-500/15 text-amber-200",
    Shipped: "bg-sky-500/15 text-sky-300",
    Delivered: "bg-emerald-500/15 text-emerald-300",
    Released: "bg-emerald-500/20 text-emerald-200",
    Canceled: "bg-rose-500/15 text-rose-300",
  };
  return (
    <span
      className={`rounded-md px-2 py-1 text-[10px] font-bold ${styles[status] ?? "bg-white/10 text-white/80"}`}
    >
      {status}
    </span>
  );
}
