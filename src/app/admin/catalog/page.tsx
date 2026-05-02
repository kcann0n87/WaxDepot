import Link from "next/link";
import { Plus } from "lucide-react";
import { serviceRoleClient } from "@/lib/supabase/admin";
import { InlineImageUpload } from "./inline-image-upload";

export const dynamic = "force-dynamic";

export default async function AdminCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sport?: string }>;
}) {
  const { q, sport } = await searchParams;
  const sb = serviceRoleClient();

  let query = sb
    .from("skus")
    .select("id, slug, year, brand, set_name, product, sport, release_date, image_url")
    .order("release_date", { ascending: false });
  if (sport) query = query.eq("sport", sport);
  if (q) query = query.ilike("slug", `%${q}%`);

  const { data: skus } = await query;

  const totalCount = (skus ?? []).length;
  const withImages = (skus ?? []).filter((s) => s.image_url).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-black text-white">Catalog</h1>
          <p className="mt-1 text-xs text-white/60">
            {totalCount} SKUs · {withImages} with photos · {totalCount - withImages} on
            placeholder
          </p>
        </div>
        <Link
          href="/admin/catalog/new"
          className="inline-flex items-center gap-1 rounded-md bg-amber-400 px-3 py-1.5 text-sm font-bold text-slate-900 hover:bg-amber-300"
        >
          <Plus size={14} />
          Add SKU
        </Link>
      </div>

      {/* Filter row */}
      <form className="mb-4 flex flex-wrap items-center gap-2" action="/admin/catalog" method="get">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search slug…"
          className="flex-1 min-w-0 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/50"
        />
        <select
          name="sport"
          defaultValue={sport ?? ""}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white"
        >
          <option value="">All sports</option>
          <option value="NBA">NBA</option>
          <option value="MLB">MLB</option>
          <option value="NFL">NFL</option>
          <option value="NHL">NHL</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-amber-400 px-3 py-1.5 text-sm font-bold text-slate-900 hover:bg-amber-300"
        >
          Apply
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#101012]">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-[10px] font-semibold tracking-[0.15em] text-white/60 uppercase">
            <tr>
              <th className="px-4 py-3">Image</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Sport</th>
              <th className="px-4 py-3">Release</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(skus ?? []).map((s) => (
              <tr key={s.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-2">
                  <InlineImageUpload
                    skuId={s.id}
                    slug={s.slug}
                    currentUrl={s.image_url ?? null}
                    alt={`${s.year} ${s.brand} ${s.set_name}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-semibold text-white">
                    {s.year} {s.brand} {s.set_name}
                  </div>
                  <div className="font-mono text-[10px] text-white/60">{s.slug}</div>
                </td>
                <td className="px-4 py-3 text-xs text-white/80">{s.sport}</td>
                <td className="px-4 py-3 text-xs text-white/60">
                  {s.release_date ? new Date(s.release_date).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/catalog/${s.id}`}
                    className="text-xs font-semibold text-amber-300 hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalCount === 0 && (
          <div className="px-4 py-12 text-center text-sm text-white/60">
            No SKUs match.
          </div>
        )}
      </div>
    </div>
  );
}
