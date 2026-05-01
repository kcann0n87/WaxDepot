import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Package, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_USER_TIER, TIER_FEE } from "@/lib/fees";
import { ShipForm } from "./ship-form";
import { BidActions } from "./bid-actions";
import { ListingActions } from "./listing-actions";
import { formatUSD, formatUSDFull } from "@/lib/utils";
import { SkuThumb } from "@/components/sku-thumb";

type ListingRow = {
  id: string;
  sku_id: string;
  seller_id: string;
  price_cents: number;
  shipping_cents: number;
  quantity: number;
  status: "Active" | "Sold" | "Paused" | "Expired";
  created_at: string;
  sku:
    | { slug: string; year: number; brand: string; product: string; sport: string; image_url: string | null; gradient_from: string | null; gradient_to: string | null }
    | { slug: string; year: number; brand: string; product: string; sport: string; image_url: string | null; gradient_from: string | null; gradient_to: string | null }[]
    | null;
};

type BidRow = {
  id: string;
  buyer_id: string;
  price_cents: number;
  expires_at: string;
  created_at: string;
  buyer: { username: string; display_name: string } | { username: string; display_name: string }[] | null;
};

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/account/listings/${id}`);

  const { data: listing } = (await supabase
    .from("listings")
    .select(
      "id, sku_id, seller_id, price_cents, shipping_cents, quantity, status, created_at, sku:skus!listings_sku_id_fkey(slug, year, brand, product, sport, image_url, gradient_from, gradient_to)",
    )
    .eq("id", id)
    .maybeSingle()) as { data: ListingRow | null };

  if (!listing) notFound();
  if (listing.seller_id !== user.id) notFound();

  const sku = Array.isArray(listing.sku) ? listing.sku[0] : listing.sku;
  if (!sku) notFound();

  const ask = listing.price_cents / 100;
  const fee = ask * TIER_FEE[CURRENT_USER_TIER];
  const payout = ask - fee;

  // Active bids on this SKU (not just this listing — bids are SKU-level).
  const { data: bidRows } = await supabase
    .from("bids")
    .select(
      "id, buyer_id, price_cents, expires_at, created_at, buyer:profiles!bids_buyer_id_fkey(username, display_name)",
    )
    .eq("sku_id", listing.sku_id)
    .eq("status", "Active")
    .order("price_cents", { ascending: false });

  const bids = ((bidRows ?? []) as BidRow[]).map((b) => {
    const buyer = Array.isArray(b.buyer) ? b.buyer[0] : b.buyer;
    return {
      id: b.id,
      priceUsd: b.price_cents / 100,
      expiresAt: b.expires_at,
      createdAt: b.created_at,
      buyerUsername: buyer?.username ?? "unknown",
      buyerDisplayName: buyer?.display_name ?? "Unknown",
    };
  });

  // Open order linked to this listing (if Sold).
  const { data: order } =
    listing.status === "Sold"
      ? await supabase
          .from("orders")
          .select("id, status, placed_at, carrier, tracking, total_cents")
          .eq("listing_id", listing.id)
          .order("placed_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
        <Link href="/account" className="inline-flex items-center gap-1 hover:text-white">
          <ArrowLeft size={14} /> Account
        </Link>
        <span>/</span>
        <span className="hover:text-white">Listings</span>
        <span>/</span>
        <span className="font-mono text-white">{listing.id.slice(0, 8)}</span>
      </div>

      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.2em] text-amber-400/80 uppercase">
            Listing
          </div>
          <h1 className="font-display mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
            {sku.year} {sku.brand} {sku.product}
          </h1>
          <p className="text-sm text-white/50">
            Listed {formatDate(listing.created_at)} · {listing.quantity} qty available
          </p>
        </div>
        <ListingStatusBadge status={listing.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-[#101012] p-5">
            <div className="flex items-start gap-4">
              <Link
                href={`/product/${sku.slug}`}
                className="block h-20 w-16 shrink-0 overflow-hidden rounded"
              >
                <SkuThumb sku={sku} className="h-full w-full" alt={`${sku.year} ${sku.brand} ${sku.product}`} />
              </Link>
              <div className="flex-1">
                <Link
                  href={`/product/${sku.slug}`}
                  className="text-base font-bold text-white transition hover:text-amber-300"
                >
                  {sku.year} {sku.brand} {sku.product}
                </Link>
                <div className="text-xs text-white/50">{sku.sport} · Factory Sealed</div>
              </div>
            </div>
          </div>

          {(listing.status === "Active" || listing.status === "Paused") && (
            <div className="rounded-xl border border-white/10 bg-[#101012] p-5">
              <h2 className="font-display mb-3 text-base font-black text-white">Listing details</h2>
              {listing.status === "Paused" && (
                <div className="mb-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/60">
                  This listing is paused. Buyers can&apos;t see it. Resume to put it back live.
                </div>
              )}
              <dl className="divide-y divide-white/5 rounded-lg border border-white/10">
                <Row label="Asking price" value={formatUSDFull(ask)} />
                <Row
                  label="Shipping"
                  value={
                    listing.shipping_cents === 0
                      ? "Free"
                      : formatUSDFull(listing.shipping_cents / 100)
                  }
                />
                <Row label="Quantity available" value={String(listing.quantity)} />
                <Row
                  label={`${CURRENT_USER_TIER} tier fee (${(TIER_FEE[CURRENT_USER_TIER] * 100).toFixed(0)}%)`}
                  value={`-${formatUSDFull(fee)}`}
                />
                <Row label="Payout per box" value={formatUSDFull(payout)} bold />
              </dl>
              <ListingActions
                listingId={listing.id}
                currentAsk={ask}
                currentQty={listing.quantity}
                currentStatus={listing.status}
              />
            </div>
          )}

          {listing.status === "Expired" && (
            <div className="rounded-xl border border-white/10 bg-[#101012] p-5 text-sm text-white/60">
              This listing has ended. It&apos;s no longer visible on the marketplace. To list this
              product again, head to <Link href="/sell" className="font-semibold text-amber-300 hover:underline">/sell</Link>.
            </div>
          )}

          {/* Bid inbox — only when Active */}
          {listing.status === "Active" && (
            <div className="rounded-xl border border-white/10 bg-[#101012] p-5">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <h2 className="font-display text-base font-black text-white">Active bids</h2>
                  <p className="text-xs text-white/50">
                    Buyers offering on{" "}
                    <Link
                      href={`/product/${sku.slug}`}
                      className="text-amber-300 hover:underline"
                    >
                      this product
                    </Link>{" "}
                    — accept any to lock the sale.
                  </p>
                </div>
                <div className="text-[10px] font-semibold tracking-wider text-white/60 uppercase">
                  {bids.length} {bids.length === 1 ? "bid" : "bids"}
                </div>
              </div>

              {bids.length === 0 ? (
                <div className="rounded-md border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/50">
                  No bids yet. They&apos;ll show up here in real time.
                </div>
              ) : (
                <ul className="divide-y divide-white/5 overflow-hidden rounded-lg border border-white/10">
                  {bids.map((b) => {
                    const meetsAsk = b.priceUsd >= ask;
                    return (
                      <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                        <Avatar name={b.buyerDisplayName} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-white">
                              {b.buyerDisplayName}
                            </span>
                            <span className="text-[11px] text-white/60">@{b.buyerUsername}</span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/50">
                            <span>Placed {ago(b.createdAt)}</span>
                            <span>·</span>
                            <span>Expires {expiresIn(b.expiresAt)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`font-display text-lg font-black ${
                              meetsAsk ? "text-emerald-300" : "text-white"
                            }`}
                          >
                            {formatUSD(b.priceUsd)}
                          </div>
                          {meetsAsk ? (
                            <div className="text-[10px] font-semibold text-emerald-300">
                              Meets your ask
                            </div>
                          ) : (
                            <div className="text-[10px] text-white/60">
                              {formatUSD(ask - b.priceUsd)} below ask
                            </div>
                          )}
                        </div>
                        <BidActions bidId={b.id} />
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-3 rounded-md border border-amber-700/30 bg-amber-500/5 p-3 text-[11px] text-amber-200/80">
                <strong>How accept works:</strong> picks your lowest active listing for this SKU,
                creates an order at the bid price, and notifies the buyer. Payment processing rolls
                out next — for now the order is created without a charge.
              </div>
            </div>
          )}

          {listing.status === "Sold" && order && (
            <div className="rounded-xl border border-white/10 bg-[#101012] p-5">
              <h2 className="font-display mb-1 text-base font-black text-white">Sold to a buyer</h2>
              <p className="mb-4 text-xs text-white/50">
                Order{" "}
                <Link
                  href={`/account/orders/${order.id}`}
                  className="font-mono text-amber-300 transition hover:underline"
                >
                  {order.id}
                </Link>{" "}
                · sold {formatDate(order.placed_at)}
              </p>

              <div className="mb-4 grid grid-cols-3 gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-center text-sm">
                <Stat label="Sold for" value={formatUSDFull(order.total_cents / 100)} />
                <Stat label="Fees" value={`-${formatUSDFull(fee)}`} accent="rose" />
                <Stat
                  label="Net to you"
                  value={formatUSDFull(order.total_cents / 100 - fee)}
                  accent="emerald"
                />
              </div>

              <ShipForm
                orderId={order.id}
                initialCarrier={order.carrier}
                initialTracking={order.tracking}
                needsShipBy={daysFromNow(2)}
              />
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-[#101012] p-5">
            <div className="text-[10px] font-semibold tracking-wider text-white/60 uppercase">
              Listing ID
            </div>
            <div className="mt-0.5 font-mono text-xs font-semibold text-white">{listing.id}</div>
            <div className="mt-3 text-[10px] font-semibold tracking-wider text-white/60 uppercase">
              SKU
            </div>
            <div className="mt-0.5 text-sm font-semibold text-white">
              {sku.year} {sku.brand} {sku.product}
            </div>
          </div>

          {listing.status === "Active" && bids.length > 0 && (
            <div className="rounded-xl border border-amber-700/30 bg-gradient-to-br from-amber-500/10 to-transparent p-4">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-amber-300/80 uppercase">
                <TrendingUp size={11} />
                Highest bid
              </div>
              <div className="font-display mt-1 text-2xl font-black text-amber-400">
                {formatUSD(bids[0].priceUsd)}
              </div>
              <div className="text-[11px] text-white/50">
                {bids[0].priceUsd >= ask
                  ? "Meets or beats your ask. Accept to sell now."
                  : `${formatUSD(ask - bids[0].priceUsd)} below your ask.`}
              </div>
            </div>
          )}

          {listing.status === "Sold" && order && !order.tracking && (
            <div className="rounded-xl border border-amber-700/40 bg-amber-500/10 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-100">
                <Package size={14} />
                Ship soon
              </div>
              <p className="mt-1 text-xs text-amber-200/80">
                Add tracking within 2 business days to keep your seller score high.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "rose" | "emerald";
}) {
  const tone =
    accent === "rose"
      ? "text-rose-400"
      : accent === "emerald"
        ? "text-emerald-300"
        : "text-white";
  return (
    <div>
      <div className="text-[10px] font-semibold tracking-wider text-white/60 uppercase">
        {label}
      </div>
      <div className={`mt-0.5 font-display font-black ${tone}`}>{value}</div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <dt className="text-sm text-white/60">{label}</dt>
      <dd
        className={`text-sm ${bold ? "font-display text-base font-black text-amber-400" : "font-semibold text-white"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function ListingStatusBadge({ status }: { status: ListingRow["status"] }) {
  const map: Record<ListingRow["status"], string> = {
    Active: "border-emerald-700/40 bg-emerald-500/15 text-emerald-300",
    Sold: "border-amber-700/40 bg-amber-500/15 text-amber-300",
    Paused: "border-white/10 bg-white/5 text-white/60",
    Expired: "border-white/10 bg-white/5 text-white/60",
  };
  return (
    <span
      className={`inline-flex rounded-md border px-3 py-1.5 text-sm font-bold ${map[status]}`}
    >
      {status}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  const initial = name[0]?.toUpperCase() ?? "?";
  const colors = [
    "from-emerald-400 to-emerald-600",
    "from-sky-400 to-sky-600",
    "from-rose-400 to-rose-600",
    "from-amber-400 to-amber-600",
    "from-violet-400 to-violet-600",
    "from-cyan-400 to-cyan-600",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-md ${color}`}
    >
      {initial}
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ago(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.max(Math.floor(diff / 60000), 0);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function expiresIn(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "expired";
  const day = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (day >= 1) return `in ${day}d`;
  const hr = Math.floor(diff / (60 * 60 * 1000));
  return `in ${hr}h`;
}

function daysFromNow(n: number) {
  const d = new Date(Date.now() + n * 24 * 60 * 60 * 1000);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

