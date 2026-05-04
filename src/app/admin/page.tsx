import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  DollarSign,
  Inbox,
  Mail,
  Package2,
  Receipt,
  ShieldCheck,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { serviceRoleClient } from "@/lib/supabase/admin";
import { TIER_FEE } from "@/lib/fees";
import { formatUSDFull } from "@/lib/utils";

export const dynamic = "force-dynamic";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Pulls everything the overview needs in one batch. Each query has the
 * minimum projection it needs — no SELECT * on big tables.
 */
async function loadOverview() {
  const sb = serviceRoleClient();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * MS_PER_DAY).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * MS_PER_DAY).toISOString();
  const fiveDaysAgo = new Date(now.getTime() - 5 * MS_PER_DAY).toISOString();
  const releasedStatuses = ["Released", "Completed"];

  const [
    countersRes,
    escrowRes,
    actionsRes,
    gmv30Res,
    gmv7Res,
    signups30Res,
    signups7Res,
    topSellersRes,
    topSkusRes,
    staleEscrowRes,
    waitlistRes,
    waitlistEmailsRes,
    inviteLogsRes,
  ] = await Promise.all([
    // Counters in one round-trip via parallel sub-queries
    Promise.all([
      sb.from("orders").select("*", { count: "exact", head: true }),
      sb
        .from("disputes")
        .select("*", { count: "exact", head: true })
        .neq("status", "Resolved"),
      sb.from("skus").select("*", { count: "exact", head: true }),
      sb.from("listings").select("*", { count: "exact", head: true }).eq("status", "Active"),
    ]),

    // Money currently held in escrow (paid, in-escrow, not yet released).
    sb
      .from("orders")
      .select("total_cents")
      .eq("status", "InEscrow")
      .eq("payment_status", "paid"),

    // Audit log tail.
    sb
      .from("admin_actions")
      .select("id, action, target_type, target_id, created_at")
      .order("created_at", { ascending: false })
      .limit(8),

    // GMV last 30 days — released orders, summed price_cents (excludes shipping/tax).
    sb
      .from("orders")
      .select("price_cents, seller_id, sku_id, released_at, placed_at")
      .in("status", releasedStatuses)
      .gte("placed_at", thirtyDaysAgo),

    // GMV last 7 days for the trend pill.
    sb
      .from("orders")
      .select("price_cents")
      .in("status", releasedStatuses)
      .gte("placed_at", sevenDaysAgo),

    // New signups
    sb
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo),
    sb
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),

    // Active sellers (those with at least one Active listing) — used as
    // a denominator for the seller-pool view.
    sb.from("listings").select("seller_id").eq("status", "Active"),

    // Top SKUs by 30d volume
    sb
      .from("orders")
      .select("sku_id, price_cents, sku:skus!orders_sku_id_fkey(year, brand, set_name, product)")
      .in("status", releasedStatuses)
      .gte("placed_at", thirtyDaysAgo),

    // Stale escrow — paid + InEscrow + placed > 5 days ago, hasn't shipped.
    sb
      .from("orders")
      .select(
        "id, placed_at, total_cents, seller_id, sku:skus!orders_sku_id_fkey(year, brand, product), seller:profiles!orders_seller_id_fkey(username)",
      )
      .eq("status", "InEscrow")
      .eq("payment_status", "paid")
      .lt("placed_at", fiveDaysAgo)
      .order("placed_at", { ascending: true })
      .limit(10),

    // Waitlist counter (total) + recent-7d for the trend pill.
    sb.from("waitlist").select("*", { count: "exact", head: true }),
    // Pull all waitlist emails so we can compute pending = total minus
    // those already invited per admin_actions. Cheap (just text).
    sb.from("waitlist").select("email"),
    // Invite logs — used both for the "pending invites" derivation and
    // a 7d-rate signal.
    sb
      .from("admin_actions")
      .select("created_at, details")
      .eq("action", "invite_user")
      .order("created_at", { ascending: false }),
  ]);

  const [
    { count: orderCount },
    { count: openDisputes },
    { count: skuCount },
    { count: listingCount },
  ] = countersRes;

  const escrowSum =
    (escrowRes.data ?? []).reduce((s, o) => s + (o.total_cents ?? 0), 0) / 100;

  // 30-day GMV + estimated platform fees. We assume Starter tier (10%) since
  // we don't have per-seller tier joined here — close enough for an at-a-
  // glance figure; the real number is per-seller and lives in Stripe.
  const gmv30Cents =
    (gmv30Res.data ?? []).reduce((s, o) => s + (o.price_cents ?? 0), 0);
  const gmv30 = gmv30Cents / 100;
  const fees30Estimate = (gmv30Cents * TIER_FEE.Starter) / 100;

  const gmv7 =
    (gmv7Res.data ?? []).reduce((s, o) => s + (o.price_cents ?? 0), 0) / 100;

  // Aggregate top sellers from the 30d order set.
  type OrderForAgg = {
    price_cents: number;
    seller_id: string;
    sku_id: string;
    sku: { year: number; brand: string; set_name: string; product: string } | { year: number; brand: string; set_name: string; product: string }[] | null;
  };
  const sellerVolume = new Map<string, { units: number; cents: number }>();
  const skuVolume = new Map<
    string,
    { title: string; units: number; cents: number }
  >();
  for (const o of (gmv30Res.data ?? []) as unknown as OrderForAgg[]) {
    const sCur = sellerVolume.get(o.seller_id) ?? { units: 0, cents: 0 };
    sCur.units += 1;
    sCur.cents += o.price_cents;
    sellerVolume.set(o.seller_id, sCur);
  }

  // Top SKUs need the join, so use the dedicated topSkusRes pull.
  for (const o of (topSkusRes.data ?? []) as unknown as OrderForAgg[]) {
    const skuMeta = Array.isArray(o.sku) ? o.sku[0] : o.sku;
    if (!skuMeta) continue;
    const title = `${skuMeta.year} ${skuMeta.brand} ${skuMeta.set_name}`;
    const cur = skuVolume.get(o.sku_id) ?? { title, units: 0, cents: 0 };
    cur.units += 1;
    cur.cents += o.price_cents;
    skuVolume.set(o.sku_id, cur);
  }

  // Materialize top-5 lists.
  const topSellerIds = [...sellerVolume.entries()]
    .sort((a, b) => b[1].cents - a[1].cents)
    .slice(0, 5);
  const topSellerProfiles = topSellerIds.length
    ? await sb
        .from("profiles")
        .select("id, username, display_name")
        .in("id", topSellerIds.map(([id]) => id))
    : { data: [] as { id: string; username: string; display_name: string }[] };
  const profileById = new Map(
    (topSellerProfiles.data ?? []).map((p) => [p.id, p]),
  );
  const topSellers = topSellerIds.map(([id, agg]) => ({
    id,
    username: profileById.get(id)?.username ?? "—",
    displayName: profileById.get(id)?.display_name ?? "—",
    units: agg.units,
    cents: agg.cents,
  }));

  const topSkus = [...skuVolume.entries()]
    .sort((a, b) => b[1].cents - a[1].cents)
    .slice(0, 5)
    .map(([id, v]) => ({ id, ...v }));

  // Active sellers in the last 30 days = sellers with an Active listing.
  const activeSellerSet = new Set(
    (topSellersRes.data ?? []).map((r) => r.seller_id),
  );

  // Stale escrow for the alert row.
  type StaleRow = {
    id: string;
    placed_at: string;
    total_cents: number;
    seller_id: string;
    sku: { year: number; brand: string; product: string } | { year: number; brand: string; product: string }[] | null;
    seller: { username: string } | { username: string }[] | null;
  };
  const stale = ((staleEscrowRes.data ?? []) as unknown as StaleRow[]).map(
    (r) => {
      const skuMeta = Array.isArray(r.sku) ? r.sku[0] : r.sku;
      const sellerMeta = Array.isArray(r.seller) ? r.seller[0] : r.seller;
      const days = Math.floor(
        (Date.now() - new Date(r.placed_at).getTime()) / MS_PER_DAY,
      );
      return {
        id: r.id,
        days,
        title: skuMeta ? `${skuMeta.year} ${skuMeta.brand} ${skuMeta.product}` : "—",
        seller: sellerMeta?.username ?? "—",
        cents: r.total_cents,
      };
    },
  );

  // Waitlist breakdown — pending = waitlist emails with no invite log yet.
  const waitlistTotal = waitlistRes.count ?? 0;
  const invitedEmails = new Set(
    (inviteLogsRes.data ?? [])
      .map((r) => (r.details as { email?: string } | null)?.email?.toLowerCase())
      .filter((e): e is string => !!e),
  );
  const waitlistPending = (waitlistEmailsRes.data ?? []).filter(
    (w) => !invitedEmails.has(w.email.toLowerCase()),
  ).length;
  const invites7 = (inviteLogsRes.data ?? []).filter(
    (r) => r.created_at >= sevenDaysAgo,
  ).length;

  return {
    orderCount: orderCount ?? 0,
    openDisputes: openDisputes ?? 0,
    skuCount: skuCount ?? 0,
    listingCount: listingCount ?? 0,
    escrowSum,
    gmv30,
    gmv7,
    fees30Estimate,
    signups30: signups30Res.count ?? 0,
    signups7: signups7Res.count ?? 0,
    activeSellers: activeSellerSet.size,
    topSellers,
    topSkus,
    stale,
    lastActions: actionsRes.data ?? [],
    waitlistTotal,
    waitlistPending,
    invites7,
  };
}

export default async function AdminOverview() {
  const data = await loadOverview();

  return (
    <div>
      <h1 className="font-display mb-6 text-3xl font-black text-white">Overview</h1>

      {/* Beta-state row — surface waitlist + invite bottleneck. Once we
          open public sign-up, swap the focus here back to GMV. */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={<Inbox size={14} />}
          label="Waitlist · total"
          value={data.waitlistTotal}
          sub={
            data.waitlistPending > 0
              ? `${data.waitlistPending} awaiting invite`
              : "all caught up"
          }
          accent={data.waitlistPending > 0 ? "amber" : undefined}
          href="/admin/waitlist"
        />
        <Stat
          icon={<Mail size={14} />}
          label="Invites · 7d"
          value={data.invites7}
          sub="sent this week"
          href="/admin/invite"
        />
        <Stat
          icon={<UserPlus size={14} />}
          label="Signups · 30d"
          value={data.signups30}
          sub={`${data.signups7} last 7d`}
        />
        <Stat
          icon={<Package2 size={14} />}
          label="Active sellers"
          value={data.activeSellers}
          sub={`${data.listingCount} active listings`}
        />
      </div>

      {/* KPI row — money */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={<TrendingUp size={14} />}
          label="GMV · 30d"
          value={formatUSDFull(data.gmv30)}
          sub={`${formatUSDFull(data.gmv7)} last 7d`}
          accent="amber"
        />
        <Stat
          icon={<DollarSign size={14} />}
          label="Est. fees · 30d"
          value={formatUSDFull(data.fees30Estimate)}
          sub="assumes Starter tier"
        />
        <Stat
          icon={<Receipt size={14} />}
          label="Total orders"
          value={data.orderCount}
        />
        <Stat
          icon={<ShieldCheck size={14} />}
          label="In escrow"
          value={formatUSDFull(data.escrowSum)}
        />
      </div>

      {/* Operational counters — alerts + catalog size */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-2">
        <Stat
          icon={<AlertTriangle size={14} />}
          label="Open disputes"
          value={data.openDisputes}
          accent={data.openDisputes > 0 ? "rose" : undefined}
        />
        <Stat
          icon={<Package2 size={14} />}
          label="SKUs"
          value={data.skuCount}
          sub="catalog size"
        />
      </div>

      {/* Stale-escrow alert. Only shown when there's something to action. */}
      {data.stale.length > 0 && (
        <section className="mb-8 rounded-xl border border-rose-700/40 bg-rose-500/[0.04] p-4">
          <div className="mb-3 flex items-center gap-2 text-rose-300">
            <Clock size={14} />
            <h2 className="text-xs font-semibold tracking-[0.18em] uppercase">
              Stale escrow — {data.stale.length}
            </h2>
          </div>
          <p className="mb-3 text-xs text-rose-200/70">
            Orders paid more than 5 days ago that haven&apos;t shipped. Nudge the
            seller, or cancel + refund if they&apos;ve gone dark.
          </p>
          <ul className="divide-y divide-white/5 rounded-lg bg-[#101012]">
            {data.stale.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div>
                  <Link
                    href={`/admin/orders/${s.id}`}
                    className="font-mono text-xs font-semibold text-amber-300 hover:underline"
                  >
                    {s.id}
                  </Link>
                  <div className="text-[11px] text-white/60">
                    {s.title} · @{s.seller}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-sm font-black text-amber-400">
                    {formatUSDFull(s.cents / 100)}
                  </div>
                  <div className="text-[11px] text-rose-300">{s.days}d in escrow</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Top sellers + top SKUs side by side */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-[#101012] p-4">
          <h2 className="mb-3 text-xs font-semibold tracking-[0.18em] text-white/60 uppercase">
            Top sellers · 30d
          </h2>
          {data.topSellers.length === 0 ? (
            <div className="px-2 py-6 text-center text-xs text-white/50">
              No sales yet in the last 30 days.
            </div>
          ) : (
            <ol className="divide-y divide-white/5">
              {data.topSellers.map((s, i) => (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="w-4 text-right text-[11px] font-bold text-white/40">
                      {i + 1}
                    </span>
                    <Link
                      href={`/admin/users/${s.id}`}
                      className="block hover:text-amber-300"
                    >
                      <div className="text-sm font-semibold text-white">
                        {s.displayName}
                      </div>
                      <div className="text-[11px] text-white/50">@{s.username}</div>
                    </Link>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-sm font-black text-amber-400">
                      {formatUSDFull(s.cents / 100)}
                    </div>
                    <div className="text-[11px] text-white/50">
                      {s.units} {s.units === 1 ? "unit" : "units"}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-xl border border-white/10 bg-[#101012] p-4">
          <h2 className="mb-3 text-xs font-semibold tracking-[0.18em] text-white/60 uppercase">
            Top SKUs · 30d
          </h2>
          {data.topSkus.length === 0 ? (
            <div className="px-2 py-6 text-center text-xs text-white/50">
              No volume yet in the last 30 days.
            </div>
          ) : (
            <ol className="divide-y divide-white/5">
              {data.topSkus.map((s, i) => (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="w-4 text-right text-[11px] font-bold text-white/40">
                      {i + 1}
                    </span>
                    <Link
                      href={`/admin/catalog/${s.id}`}
                      className="block hover:text-amber-300"
                    >
                      <div className="line-clamp-1 text-sm font-semibold text-white">
                        {s.title}
                      </div>
                    </Link>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-sm font-black text-amber-400">
                      {formatUSDFull(s.cents / 100)}
                    </div>
                    <div className="text-[11px] text-white/50">
                      {s.units} {s.units === 1 ? "unit" : "units"}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <h2 className="mb-3 text-xs font-semibold tracking-[0.18em] text-white/60 uppercase">
        Recent admin actions
      </h2>
      <div className="rounded-xl border border-white/10 bg-[#101012]">
        {data.lastActions.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-white/60">
            No admin actions yet.
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {data.lastActions.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-mono font-semibold text-amber-300">
                    {a.action}
                  </span>{" "}
                  <span className="text-white/60">on</span>{" "}
                  <span className="font-mono text-white/80">
                    {a.target_type}/{a.target_id}
                  </span>
                </div>
                <div className="text-xs text-white/60">
                  {new Date(a.created_at).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
  accent,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: "rose" | "amber";
  href?: string;
}) {
  const border =
    accent === "rose"
      ? "border-rose-700/40 bg-rose-500/[0.04]"
      : accent === "amber"
        ? "border-amber-700/40 bg-amber-500/[0.04]"
        : "border-white/10";
  const valueClass =
    accent === "rose"
      ? "text-rose-300"
      : accent === "amber"
        ? "text-amber-300"
        : "text-white";
  const inner = (
    <>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-white/60 uppercase">
        {icon}
        {label}
      </div>
      <div className={`font-display mt-2 text-2xl font-black ${valueClass}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-[11px] text-white/60">{sub}</div>}
    </>
  );
  const baseClass = `block rounded-xl border bg-[#101012] p-4 ${border}`;
  if (href) {
    return (
      <Link href={href} className={`${baseClass} transition hover:border-white/20`}>
        {inner}
      </Link>
    );
  }
  return <div className={baseClass}>{inner}</div>;
}
