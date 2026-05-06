import Link from "next/link";
import { Inbox } from "lucide-react";
import { serviceRoleClient } from "@/lib/supabase/admin";
import { WaitlistTable } from "./waitlist-table";
import { BulkInviteButton } from "./bulk-invite-button";

export const dynamic = "force-dynamic";

const FILTERS = ["all", "pending", "invited", "activated"] as const;
type Filter = (typeof FILTERS)[number];

export default async function AdminWaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const { filter: filterRaw, q } = await searchParams;
  const filter: Filter = (FILTERS as readonly string[]).includes(filterRaw ?? "")
    ? (filterRaw as Filter)
    : "all";

  const sb = serviceRoleClient();

  let waitlistQ = sb
    .from("waitlist")
    .select("id, email, source, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (q) {
    const term = q.trim().replace(/[%,]/g, "");
    if (term) waitlistQ = waitlistQ.ilike("email", `%${term}%`);
  }
  const { data: waitlist, error } = await waitlistQ;
  if (error) console.error("waitlist load:", error);

  // Pull invite logs and build an email → invited-at map. Lets us tag each
  // waitlist row as Invited vs Pending without round-tripping per row.
  const { data: inviteLogs } = await sb
    .from("admin_actions")
    .select("created_at, details")
    .eq("action", "invite_user")
    .order("created_at", { ascending: false })
    .limit(2000);
  const invitedAt = new Map<string, string>();
  for (const row of inviteLogs ?? []) {
    const email = (row.details as { email?: string } | null)?.email?.toLowerCase();
    if (email && !invitedAt.has(email)) invitedAt.set(email, row.created_at);
  }

  // Pull auth users to detect who's actually activated (email_confirmed_at
  // gets set the first time they click the magic link). Service-role
  // listUsers returns up to 1000 with perPage=1000 — fine for beta scale.
  const { data: usersList } = await sb.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const activatedAt = new Map<string, string>();
  for (const u of usersList?.users ?? []) {
    if (u.email && u.email_confirmed_at) {
      activatedAt.set(u.email.toLowerCase(), u.email_confirmed_at);
    }
  }

  const rows = (waitlist ?? []).map((w) => {
    const key = w.email.toLowerCase();
    return {
      ...w,
      invitedAt: invitedAt.get(key) ?? null,
      activatedAt: activatedAt.get(key) ?? null,
    };
  });
  const filtered = rows.filter((r) => {
    if (filter === "pending") return !r.invitedAt;
    if (filter === "invited") return !!r.invitedAt && !r.activatedAt;
    if (filter === "activated") return !!r.activatedAt;
    return true;
  });

  const counts = {
    all: rows.length,
    pending: rows.filter((r) => !r.invitedAt).length,
    invited: rows.filter((r) => !!r.invitedAt && !r.activatedAt).length,
    activated: rows.filter((r) => !!r.activatedAt).length,
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Inbox size={18} className="text-amber-400" />
          <h1 className="font-display text-3xl font-black text-white">Waitlist</h1>
        </div>
        {counts.pending > 0 && <BulkInviteButton pendingCount={counts.pending} />}
      </div>
      <p className="mb-6 max-w-2xl text-sm text-white/60">
        Anyone who entered their email on the coming-soon page lands here. Use
        the inline button to send them a magic-link invite — picks up the email
        and display name from the row, no retyping.
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <form
          action="/admin/waitlist"
          method="get"
          className="flex flex-1 flex-wrap items-center gap-2"
        >
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by email"
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

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {FILTERS.map((f) => {
          const params = new URLSearchParams();
          if (f !== "all") params.set("filter", f);
          if (q) params.set("q", q);
          const href = `/admin/waitlist${params.toString() ? `?${params}` : ""}`;
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
                : f === "pending"
                  ? "Pending"
                  : f === "invited"
                    ? "Invited"
                    : "Activated"}
              {" · "}
              {counts[f]}
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-12 text-center text-sm text-white/50">
          {rows.length === 0
            ? "No waitlist signups yet."
            : "No rows match this filter."}
        </div>
      ) : (
        <WaitlistTable rows={filtered} />
      )}
    </div>
  );
}
