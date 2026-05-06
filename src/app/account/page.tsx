import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownToLine,
  BarChart3,
  Bell,
  Box,
  Clock,
  DollarSign,
  Heart,
  MessageCircle,
  Package,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatUSD, formatUSDFull } from "@/lib/utils";

type DbOrderStatus =
  | "Charged"
  | "InEscrow"
  | "Shipped"
  | "Delivered"
  | "Released"
  | "Completed"
  | "Canceled";
type DbBidStatus = "Active" | "Won" | "Outbid" | "Expired" | "Canceled";
type DbListingStatus = "Active" | "Sold" | "Paused" | "Expired";

type SkuJoin = { slug: string; year: number; brand: string; product: string; set_name: string } | null;

function formatShort(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function skuTitleFromJoin(s: SkuJoin) {
  if (!s) return "Unknown product";
  return `${s.year} ${s.brand} ${s.product}`;
}

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const [ordersRes, bidsRes, listingsRes, profileRes] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, total_cents, status, placed_at, sku:skus!orders_sku_id_fkey(slug, year, brand, product, set_name)",
      )
      .eq("buyer_id", user.id)
      .order("placed_at", { ascending: false })
      .limit(10),
    supabase
      .from("bids")
      .select(
        "id, sku_id, price_cents, status, expires_at, sku:skus!bids_sku_id_fkey(slug, year, brand, product, set_name)",
      )
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("listings")
      .select(
        "id, price_cents, quantity, status, created_at, sku:skus!listings_sku_id_fkey(slug, year, brand, product, set_name)",
      )
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("profiles")
      .select("username, display_name, is_seller, created_at")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  type OrderRow = {
    id: string;
    total_cents: number;
    status: DbOrderStatus;
    placed_at: string;
    sku: SkuJoin | SkuJoin[];
  };
  type BidRow = {
    id: string;
    sku_id: string;
    price_cents: number;
    status: DbBidStatus;
    expires_at: string;
    sku: SkuJoin | SkuJoin[];
  };
  type ListingRow = {
    id: string;
    price_cents: number;
    quantity: number;
    status: DbListingStatus;
    created_at: string;
    sku: SkuJoin | SkuJoin[];
  };

  const orders = ((ordersRes.data ?? []) as OrderRow[]).map((o) => ({
    id: o.id,
    sku: Array.isArray(o.sku) ? o.sku[0] : o.sku,
    total: o.total_cents / 100,
    status: o.status,
    date: o.placed_at,
  }));

  const myBids = ((bidsRes.data ?? []) as BidRow[]).map((b) => ({
    id: b.id.slice(0, 8),
    sku: Array.isArray(b.sku) ? b.sku[0] : b.sku,
    price: b.price_cents / 100,
    status: b.status,
    expires: b.expires_at,
  }));

  const myListings = ((listingsRes.data ?? []) as ListingRow[]).map((l) => ({
    id: l.id.slice(0, 8),
    sku: Array.isArray(l.sku) ? l.sku[0] : l.sku,
    price: l.price_cents / 100,
    status: l.status,
    qty: l.quantity,
    listed: l.created_at,
  }));

  // Last-sale map for the bids table (one round-trip).
  const bidSkuIds = Array.from(new Set(myBids.map((b) => b.id ? bidsRes.data?.find((x) => x.id.startsWith(b.id))?.sku_id : null).filter((x): x is string => !!x)));
  const lastBySku = new Map<string, number>();
  if (bidSkuIds.length) {
    const { data: sales } = await supabase
      .from("sales")
      .select("sku_id, price_cents, sold_at")
      .in("sku_id", bidSkuIds)
      .order("sold_at", { ascending: false });
    for (const s of sales ?? []) {
      if (!lastBySku.has(s.sku_id)) lastBySku.set(s.sku_id, s.price_cents);
    }
  }

  const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);
  const activeBids = myBids.filter((b) => b.status === "Active").length;
  const activeListings = myListings.filter((l) => l.status === "Active").length;
  const hasAnyActivity = orders.length + myBids.length + myListings.length > 0;

  // First-impression state for invitees who just clicked their magic link.
  // Display name defaults to the email-derived username when the invite
  // didn't include one — that's a good signal to nudge them to set it.
  const profile = profileRes.data;
  const firstName = profile?.display_name?.split(/\s+/)[0] ?? null;
  const displayNameIsAuto =
    !!profile && profile.display_name === profile.username;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.2em] text-amber-400/80 uppercase">
            Your account
          </div>
          <h1 className="font-display mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Dashboard
          </h1>
          <p className="text-sm text-white/50">Orders, bids, listings, and seller status</p>
        </div>
        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
          <NavLink href="/account/messages" icon={<MessageCircle size={14} />} label="Messages" />
          <NavLink href="/account/watchlist" icon={<Heart size={14} />} label="Watchlist" />
          <NavLink href="/account/following" icon={<Users size={14} />} label="Following" />
          <NavLink href="/account/disputes" icon={<AlertTriangle size={14} />} label="Disputes" />
          <NavLink href="/account/analytics" icon={<BarChart3 size={14} />} label="Analytics" />
          <NavLink href="/account/payouts" icon={<ArrowDownToLine size={14} />} label="Payouts" />
          <NavLink href="/account/alerts" icon={<Bell size={14} />} label="Alerts" />
          <NavLink href="/account/settings" icon={<Settings size={14} />} label="Settings" />
        </div>
      </div>

      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<Package size={14} />} label="Orders" value={String(orders.length)} sub="all time" />
        <Stat
          icon={<DollarSign size={14} />}
          label="Spent"
          value={formatUSD(totalSpent)}
          sub="lifetime"
          accent
        />
        <Stat icon={<TrendingUp size={14} />} label="Active bids" value={String(activeBids)} sub="open" />
        <Stat icon={<Box size={14} />} label="Listings" value={String(activeListings)} sub="active" />
      </div>

      {!hasAnyActivity && (
        <div className="mb-10 overflow-hidden rounded-2xl border border-amber-700/30 bg-gradient-to-br from-amber-500/[0.08] via-amber-500/[0.03] to-transparent p-8">
          <div className="text-[10px] font-semibold tracking-[0.28em] text-amber-300/80 uppercase">
            You're in
          </div>
          <h2 className="font-display mt-2 text-3xl font-black text-white sm:text-4xl">
            Welcome{firstName ? `, ${firstName}` : ""}.
          </h2>
          <p className="mt-2 max-w-xl text-sm text-white/60">
            WaxDepot is invite-only right now and you've got a seat.
            Three quick things to get the most out of it:
          </p>

          <ol className="mt-6 grid gap-3 sm:grid-cols-3">
            <SetupCard
              done={!displayNameIsAuto}
              step={1}
              title="Set your display name"
              body={
                displayNameIsAuto
                  ? `We've got you as @${profile?.username ?? "—"} for now — pick a name buyers and sellers will see.`
                  : "Done — buyers and sellers will see this on your listings and orders."
              }
              cta={displayNameIsAuto ? "Update name →" : "Edit profile"}
              href="/account/settings"
            />
            <SetupCard
              done={false}
              step={2}
              title="Browse the catalog"
              body="280+ sealed boxes across NBA, MLB, NFL, NHL, Soccer, and Pokemon TCG. Real bid + ask on every one."
              cta="Open marketplace →"
              href="/"
            />
            <SetupCard
              done={false}
              step={3}
              title="Buy or sell"
              body="Place a bid on a box you want, or list one from your collection. Escrow protects both sides."
              cta={profile?.is_seller ? "List a box →" : "Become a seller →"}
              href={profile?.is_seller ? "/sell" : "/sell/tiers"}
            />
          </ol>
        </div>
      )}

      <Section
        eyebrow="Activity"
        title="Recent orders"
        subtitle="Includes escrow status"
        seeAllHref={orders.length > 0 ? "/account/orders" : undefined}
      >
        {orders.length === 0 ? (
          <EmptyRow message="No orders yet — your first purchase will land here." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
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
                {orders.map((o) => (
                  <tr key={o.id} className="transition hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link href={`/account/orders/${o.id}`} className="text-amber-300 hover:underline">
                        {o.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/account/orders/${o.id}`}
                        className="text-sm font-semibold text-white transition hover:text-amber-300"
                      >
                        {skuTitleFromJoin(o.sku)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-display font-black text-amber-400">
                      {formatUSDFull(o.total)}
                    </td>
                    <td className="px-4 py-3">
                      <OrderBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-white/50">{formatShort(o.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        eyebrow="Open"
        title="My bids"
        subtitle="Offers waiting for a seller"
        seeAllHref={myBids.length > 0 ? "/account/bids" : undefined}
      >
        {myBids.length === 0 ? (
          <EmptyRow message="No active bids. Place a bid on any product page." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-white/[0.03] text-left text-[10px] font-semibold tracking-[0.15em] text-white/50 uppercase">
                <tr>
                  <th className="px-4 py-3">Bid</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Bid price</th>
                  <th className="px-4 py-3">Last sale</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {myBids.map((b) => {
                  const skuId = bidsRes.data?.find((x) => x.id.startsWith(b.id))?.sku_id;
                  const last = skuId ? lastBySku.get(skuId) : undefined;
                  return (
                    <tr key={b.id} className="transition hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-mono text-xs">
                        <Link href={`/account/bids/${b.id}`} className="text-amber-300 hover:underline">
                          {b.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/account/bids/${b.id}`}
                          className="text-sm font-semibold text-white transition hover:text-amber-300"
                        >
                          {skuTitleFromJoin(b.sku)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-display font-black text-white">
                        {formatUSDFull(b.price)}
                      </td>
                      <td className="px-4 py-3 text-white/50">
                        {last !== undefined ? formatUSDFull(last / 100) : "—"}
                      </td>
                      <td className="px-4 py-3 text-white/50">{formatShort(b.expires)}</td>
                      <td className="px-4 py-3">
                        <BidBadge status={b.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        eyebrow="Selling"
        title="My listings"
        subtitle="Boxes you've put on the market"
        seeAllHref={myListings.length > 0 ? "/account/listings" : undefined}
      >
        {myListings.length === 0 ? (
          <EmptyRow message="No listings yet. Head to /sell to list your first box." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-white/[0.03] text-left text-[10px] font-semibold tracking-[0.15em] text-white/50 uppercase">
                <tr>
                  <th className="px-4 py-3">Listing</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Ask</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Listed</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {myListings.map((l) => (
                  <tr key={l.id} className="transition hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link href={`/account/listings/${l.id}`} className="text-amber-300 hover:underline">
                        {l.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/account/listings/${l.id}`}
                        className="text-sm font-semibold text-white transition hover:text-amber-300"
                      >
                        {skuTitleFromJoin(l.sku)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-display font-black text-amber-400">
                      {formatUSDFull(l.price)}
                    </td>
                    <td className="px-4 py-3 text-white/50">{l.qty}</td>
                    <td className="px-4 py-3 text-white/50">{formatShort(l.listed)}</td>
                    <td className="px-4 py-3">
                      <ListingBadge status={l.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm font-semibold text-white/80 transition hover:border-amber-400/40 hover:bg-amber-500/10 hover:text-amber-300"
    >
      {icon}
      {label}
    </Link>
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
    <div className="rounded-xl border border-white/10 bg-[#101012] p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.15em] text-white/50 uppercase">
        <span className="text-white/50">{icon}</span>
        {label}
      </div>
      <div
        className={`font-display mt-1.5 text-2xl font-black tracking-tight ${accent ? "text-amber-400" : "text-white"}`}
      >
        {value}
      </div>
      <div className="text-xs text-white/60">{sub}</div>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  subtitle,
  seeAllHref,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  seeAllHref?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.2em] text-amber-400/80 uppercase">
            {eyebrow}
          </div>
          <h2 className="font-display mt-1 text-2xl font-black tracking-tight text-white">{title}</h2>
          <p className="text-xs text-white/50">{subtitle}</p>
        </div>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="shrink-0 text-xs font-semibold text-amber-300 hover:underline"
          >
            See all →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-8 text-center text-sm text-white/50">
      {message}
    </div>
  );
}

function SetupCard({
  step,
  done,
  title,
  body,
  cta,
  href,
}: {
  step: number;
  done: boolean;
  title: string;
  body: string;
  cta: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex flex-col gap-2 rounded-xl border p-4 transition ${
        done
          ? "border-emerald-700/40 bg-emerald-500/[0.05] hover:border-emerald-500/60"
          : "border-white/10 bg-[#101012] hover:border-amber-400/40 hover:bg-amber-500/[0.04]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
            done
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-amber-500/15 text-amber-300"
          }`}
        >
          {done ? "✓" : step}
        </span>
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      <p className="text-xs leading-relaxed text-white/55">{body}</p>
      <div
        className={`mt-1 text-xs font-semibold transition group-hover:translate-x-0.5 ${
          done ? "text-emerald-300" : "text-amber-300"
        }`}
      >
        {cta}
      </div>
    </Link>
  );
}

const ORDER_BADGES: Record<DbOrderStatus, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  Charged: { bg: "border-amber-700/40 bg-amber-500/15", text: "text-amber-300", icon: <ShieldCheck size={11} />, label: "Charged" },
  InEscrow: { bg: "border-amber-700/40 bg-amber-500/15", text: "text-amber-300", icon: <ShieldCheck size={11} />, label: "Escrow" },
  Shipped: { bg: "border-sky-700/40 bg-sky-500/15", text: "text-sky-300", icon: <Package size={11} />, label: "Shipped" },
  Delivered: { bg: "border-emerald-700/40 bg-emerald-500/15", text: "text-emerald-300", icon: <Package size={11} />, label: "Delivered" },
  Released: { bg: "border-emerald-700/40 bg-emerald-500/15", text: "text-emerald-300", icon: <Clock size={11} />, label: "Released" },
  Completed: { bg: "border-white/10 bg-white/5", text: "text-white/70", icon: <Clock size={11} />, label: "Completed" },
  Canceled: { bg: "border-rose-700/40 bg-rose-500/15", text: "text-rose-300", icon: <Clock size={11} />, label: "Canceled" },
};

function OrderBadge({ status }: { status: DbOrderStatus }) {
  const config = ORDER_BADGES[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold ${config.bg} ${config.text}`}
    >
      {config.icon}
      {config.label}
    </span>
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
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${BID_BADGES[status]}`}>
      {status}
    </span>
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
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${LISTING_BADGES[status]}`}>
      {status}
    </span>
  );
}
