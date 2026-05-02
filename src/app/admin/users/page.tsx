import Link from "next/link";
import { serviceRoleClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const FILTERS = ["all", "admin", "banned", "seller"] as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const { q, filter } = await searchParams;

  const sb = serviceRoleClient();
  let query = sb
    .from("profiles")
    .select(
      "id, username, display_name, is_admin, is_seller, is_verified, banned_at, ban_reason, seller_tier, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (q) {
    const term = q.replace(/[%,]/g, "");
    query = query.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`);
  }
  if (filter === "admin") query = query.eq("is_admin", true);
  if (filter === "seller") query = query.eq("is_seller", true);
  if (filter === "banned") query = query.not("banned_at", "is", null);

  const { data: users, error } = await query;
  if (error) console.error(error);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-3xl font-black text-white">Users</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/60">{users?.length ?? 0} shown</span>
          <a
            href="/admin/users/export"
            download
            className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-amber-400/40 hover:bg-amber-500/10 hover:text-amber-300"
          >
            Download CSV
          </a>
        </div>
      </div>

      <form className="mb-4 flex flex-wrap items-center gap-2" action="/admin/users" method="get">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by username or display name"
          className="flex-1 min-w-0 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/50"
        />
        <select
          name="filter"
          defaultValue={filter ?? "all"}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white"
        >
          {FILTERS.map((f) => (
            <option key={f} value={f}>
              {f === "all" ? "All users" : f === "admin" ? "Admins only" : f === "banned" ? "Banned only" : "Sellers only"}
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
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Roles</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Signed up</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(users ?? []).map((u) => (
              <tr key={u.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="block"
                  >
                    <div className="text-sm font-semibold text-white hover:text-amber-300">
                      {u.display_name}
                    </div>
                    <div className="text-[11px] text-white/50">@{u.username}</div>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {u.is_seller ? (
                    <TierBadge tier={u.seller_tier ?? "Starter"} />
                  ) : (
                    <span className="text-[11px] text-white/40">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.is_admin && (
                      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                        ADMIN
                      </span>
                    )}
                    {u.is_seller && (
                      <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">
                        seller
                      </span>
                    )}
                    {u.is_verified && (
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                        verified
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {u.banned_at ? (
                    <span className="rounded bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                      BANNED
                    </span>
                  ) : (
                    <span className="text-[11px] text-emerald-300/80">active</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-white/60">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(users ?? []).length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-white/60">No users match.</div>
        )}
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    Starter: "bg-white/10 text-white/70",
    Pro: "bg-sky-500/15 text-sky-300",
    Elite: "bg-amber-500/15 text-amber-300",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${styles[tier] ?? "bg-white/10 text-white/70"}`}>
      {tier}
    </span>
  );
}
