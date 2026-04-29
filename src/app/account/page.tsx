import Link from "next/link";
import { AlertTriangle, ArrowDownToLine, BarChart3, Bell, Box, Clock, DollarSign, Heart, MessageCircle, Package, Settings, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { payoutHistory, seller } from "@/lib/payouts";
import { skus, lastSale } from "@/lib/data";
import { formatSkuTitle, formatUSD, formatUSDFull } from "@/lib/utils";

type OrderStatus = "Escrow" | "Shipped" | "Delivered" | "Completed";
type ListingStatus = "Active" | "Sold" | "Expired";
type BidStatus = "Active" | "Won" | "Outbid" | "Expired";

function formatShort(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const orders = [
  { id: "WM-706373", skuId: "1", price: 990, status: "Escrow" as OrderStatus, date: "2026-04-26" },
  { id: "WM-704112", skuId: "5", price: 580, status: "Shipped" as OrderStatus, date: "2026-04-23" },
  { id: "WM-700891", skuId: "10", price: 110, status: "Delivered" as OrderStatus, date: "2026-04-15" },
  { id: "WM-695420", skuId: "4", price: 195, status: "Completed" as OrderStatus, date: "2026-04-02" },
];

const myBids = [
  { id: "B-1042", skuId: "2", price: 705, status: "Active" as BidStatus, expires: "in 6 days" },
  { id: "B-1019", skuId: "11", price: 1310, status: "Active" as BidStatus, expires: "in 13 days" },
  { id: "B-998", skuId: "9", price: 215, status: "Outbid" as BidStatus, expires: "in 2 days" },
];

const myListings = [
  { id: "L-2208", skuId: "7", price: 489, status: "Active" as ListingStatus, qty: 2, listed: "2026-04-21" },
  { id: "L-2150", skuId: "10", price: 109, status: "Sold" as ListingStatus, qty: 1, listed: "2026-04-12" },
  { id: "L-2099", skuId: "12", price: 380, status: "Active" as ListingStatus, qty: 3, listed: "2026-04-08" },
];

export default function AccountPage() {
  const totalSpent = orders.reduce((sum, o) => sum + o.price, 0);
  const activeBids = myBids.filter((b) => b.status === "Active").length;
  const activeListings = myListings.filter((l) => l.status === "Active").length;

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

      <Link
        href="/account/payouts"
        className="mb-8 flex items-center gap-3 rounded-xl border border-amber-700/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent px-4 py-3 text-sm transition hover:border-amber-700/50"
      >
        <ArrowDownToLine className="text-amber-400" size={16} />
        <span className="flex-1 text-amber-100/90">
          <strong className="text-amber-300">Next payout {seller.nextPayoutDate}</strong> ·{" "}
          <span className="text-white/70">
            {payoutHistory.length} weekly payouts to {seller.bankName} •••{seller.bankLast4}
          </span>
        </span>
        <span className="text-xs font-semibold text-amber-300">View →</span>
      </Link>

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

      <Section eyebrow="Activity" title="Recent orders" subtitle="Includes escrow status">
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-white/[0.03] text-left text-[10px] font-semibold tracking-[0.15em] text-white/50 uppercase">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.map((o) => {
                const sku = skus.find((s) => s.id === o.skuId)!;
                return (
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
                        {formatSkuTitle(sku)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-display font-black text-amber-400">
                      {formatUSDFull(o.price)}
                    </td>
                    <td className="px-4 py-3">
                      <OrderBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-white/50">{formatShort(o.date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section eyebrow="Open" title="My bids" subtitle="Offers waiting for a seller">
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
                const sku = skus.find((s) => s.id === b.skuId)!;
                const last = lastSale(b.skuId);
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
                        {formatSkuTitle(sku)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-display font-black text-white">
                      {formatUSDFull(b.price)}
                    </td>
                    <td className="px-4 py-3 text-white/50">{last ? formatUSDFull(last) : "—"}</td>
                    <td className="px-4 py-3 text-white/50">{b.expires}</td>
                    <td className="px-4 py-3">
                      <BidBadge status={b.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section eyebrow="Selling" title="My listings" subtitle="Boxes you've put on the market">
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
              {myListings.map((l) => {
                const sku = skus.find((s) => s.id === l.skuId)!;
                return (
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
                        {formatSkuTitle(sku)}
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
                );
              })}
            </tbody>
          </table>
        </div>
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
        <span className="text-white/30">{icon}</span>
        {label}
      </div>
      <div
        className={`font-display mt-1.5 text-2xl font-black tracking-tight ${accent ? "text-amber-400" : "text-white"}`}
      >
        {value}
      </div>
      <div className="text-xs text-white/40">{sub}</div>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-4">
        <div className="text-[10px] font-semibold tracking-[0.2em] text-amber-400/80 uppercase">
          {eyebrow}
        </div>
        <h2 className="font-display mt-1 text-2xl font-black tracking-tight text-white">{title}</h2>
        <p className="text-xs text-white/50">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function OrderBadge({ status }: { status: OrderStatus }) {
  const config = {
    Escrow: { bg: "bg-amber-500/15 border-amber-700/40", text: "text-amber-300", icon: <ShieldCheck size={11} /> },
    Shipped: { bg: "bg-sky-500/15 border-sky-700/40", text: "text-sky-300", icon: <Package size={11} /> },
    Delivered: { bg: "bg-emerald-500/15 border-emerald-700/40", text: "text-emerald-300", icon: <Package size={11} /> },
    Completed: { bg: "bg-white/5 border-white/10", text: "text-white/70", icon: <Clock size={11} /> },
  }[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold ${config.bg} ${config.text}`}
    >
      {config.icon}
      {status}
    </span>
  );
}

function BidBadge({ status }: { status: BidStatus }) {
  const config = {
    Active: "border-amber-700/40 bg-amber-500/15 text-amber-300",
    Won: "border-emerald-700/40 bg-emerald-500/15 text-emerald-300",
    Outbid: "border-rose-700/40 bg-rose-500/15 text-rose-300",
    Expired: "border-white/10 bg-white/5 text-white/60",
  }[status];
  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${config}`}>
      {status}
    </span>
  );
}

function ListingBadge({ status }: { status: ListingStatus }) {
  const config = {
    Active: "border-emerald-700/40 bg-emerald-500/15 text-emerald-300",
    Sold: "border-amber-700/40 bg-amber-500/15 text-amber-300",
    Expired: "border-white/10 bg-white/5 text-white/60",
  }[status];
  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${config}`}>
      {status}
    </span>
  );
}
