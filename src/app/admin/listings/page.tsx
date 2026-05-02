import Link from "next/link";
import { serviceRoleClient } from "@/lib/supabase/admin";
import { formatUSDFull } from "@/lib/utils";
import { ListingDelistButton } from "./delist-button";

export const dynamic = "force-dynamic";

const STATUSES = ["all", "Active", "Sold", "Expired"] as const;

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; seller?: string }>;
}) {
  const { q, status, seller } = await searchParams;

  const sb = serviceRoleClient();
  let query = sb
    .from("listings")
    .select(
      "id, price_cents, shipping_cents, quantity, status, created_at, sku:skus!listings_sku_id_fkey(year, brand, set_name, product, sport, slug), seller:profiles!listings_seller_id_fkey(id, username, display_name, banned_at)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (status && status !== "all") query = query.eq("status", status);
  else query = query.eq("status", "Active"); // default to active

  const { data: listings, error } = await query;
  if (error) console.error(error);

  // Client-side filter for seller / search since these traverse joined tables
  const filtered = (listings ?? []).filter((l) => {
    const skuObj = Array.isArray(l.sku) ? l.sku[0] : l.sku;
    const sellerObj = Array.isArray(l.seller) ? l.seller[0] : l.seller;
    if (seller && sellerObj?.username?.toLowerCase() !== seller.toLowerCase()) return false;
    if (q) {
      const term = q.toLowerCase();
      const haystack = `${skuObj?.brand ?? ""} ${skuObj?.set_name ?? ""} ${skuObj?.product ?? ""} ${sellerObj?.username ?? ""}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-3xl font-black text-white">Listings</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/60">{filtered.length} shown</span>
          <a
            href={`/admin/listings/export?status=${status ?? "Active"}`}
            download
            className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-amber-400/40 hover:bg-amber-500/10 hover:text-amber-300"
          >
            Download CSV
          </a>
        </div>
      </div>

      <form className="mb-4 flex flex-wrap items-center gap-2" action="/admin/listings" method="get">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search brand, set, seller"
          className="flex-1 min-w-0 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/50"
        />
        <input
          name="seller"
          defaultValue={seller ?? ""}
          placeholder="seller username"
          className="w-44 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/50"
        />
        <select
          name="status"
          defaultValue={status ?? "Active"}
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

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#101012]">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-[10px] font-semibold tracking-[0.15em] text-white/60 uppercase">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Seller</th>
              <th className="px-4 py-3 text-right">Ask</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Listed</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((l) => {
              const skuObj = Array.isArray(l.sku) ? l.sku[0] : l.sku;
              const sellerObj = Array.isArray(l.seller) ? l.seller[0] : l.seller;
              return (
                <tr key={l.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    {skuObj ? (
                      <Link
                        href={`/p/${skuObj.slug}`}
                        className="block hover:text-amber-300"
                      >
                        <div className="text-sm font-semibold text-white">
                          {skuObj.year} {skuObj.brand} {skuObj.set_name}
                        </div>
                        <div className="text-[11px] text-white/50">
                          {skuObj.product} · {skuObj.sport}
                        </div>
                      </Link>
                    ) : (
                      <span className="text-xs text-white/40">missing SKU</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {sellerObj ? (
                      <Link
                        href={`/admin/users/${sellerObj.id}`}
                        className="block"
                      >
                        <div className="flex items-center gap-1.5 text-xs text-white hover:text-amber-300">
                          @{sellerObj.username}
                          {sellerObj.banned_at && (
                            <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold text-rose-300">
                              BANNED
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-white/50">{sellerObj.display_name}</div>
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-display font-black text-amber-400">
                    {formatUSDFull(l.price_cents / 100)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-white/80">{l.quantity}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-white/60">
                    {new Date(l.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {l.status === "Active" && <ListingDelistButton listingId={l.id} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-white/60">No listings match.</div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Active: "bg-emerald-500/15 text-emerald-300",
    Sold: "bg-sky-500/15 text-sky-300",
    Expired: "bg-rose-500/15 text-rose-300",
  };
  return (
    <span
      className={`rounded-md px-2 py-1 text-[10px] font-bold ${styles[status] ?? "bg-white/10 text-white/80"}`}
    >
      {status}
    </span>
  );
}
