import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  MessageCircle,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { payOrderAndRedirect } from "@/app/actions/stripe-checkout";
import { CancelOrderButton } from "./cancel-order";
import { ConfirmDeliveryButton } from "./confirm-delivery";
import { LeaveReview } from "./leave-review";
import { MarkDeliveredButton } from "./mark-delivered";
import { ShipForm } from "../../listings/[id]/ship-form";
import { formatUSDFull } from "@/lib/utils";
import { getTrackingUrl } from "@/lib/carriers";
import { calcPayout } from "@/lib/fees";
import { SkuThumb } from "@/components/sku-thumb";

type OrderStatus =
  | "Charged"
  | "InEscrow"
  | "Shipped"
  | "Delivered"
  | "Released"
  | "Completed"
  | "Canceled";

type OrderRow = {
  id: string;
  buyer_id: string;
  seller_id: string;
  sku_id: string;
  qty: number;
  price_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  card_last4: string | null;
  status: OrderStatus;
  carrier: string | null;
  tracking: string | null;
  estimated_delivery: string | null;
  ship_to_name: string;
  ship_to_addr1: string;
  ship_to_city: string;
  ship_to_state: string;
  ship_to_zip: string;
  placed_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  released_at: string | null;
  canceled_at: string | null;
  cancel_reason: string | null;
  payment_status: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_transfer_id: string | null;
  sku:
    | {
        slug: string;
        year: number;
        brand: string;
        product: string;
        sport: string;
        image_url: string | null;
        gradient_from: string | null;
        gradient_to: string | null;
      }
    | {
        slug: string;
        year: number;
        brand: string;
        product: string;
        sport: string;
        image_url: string | null;
        gradient_from: string | null;
        gradient_to: string | null;
      }[]
    | null;
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/account/orders/${id}`);

  const { data: order } = (await supabase
    .from("orders")
    .select(
      "*, sku:skus!orders_sku_id_fkey(slug, year, brand, product, sport, image_url, gradient_from, gradient_to)",
    )
    .eq("id", id)
    .maybeSingle()) as { data: OrderRow | null };

  if (!order) notFound();
  const isBuyer = order.buyer_id === user.id;
  const isSeller = order.seller_id === user.id;
  if (!isBuyer && !isSeller) notFound();

  const sku = Array.isArray(order.sku) ? order.sku[0] : order.sku;
  if (!sku) notFound();

  // Look up the counterparty's display info.
  const counterpartyId = isBuyer ? order.seller_id : order.buyer_id;
  const { data: counterparty } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", counterpartyId)
    .maybeSingle();

  // For released/completed orders, look up any existing review so we can
  // show the LeaveReview form only when the buyer hasn't reviewed yet.
  const { data: existingReview } =
    ["Released", "Completed"].includes(order.status)
      ? await supabase
          .from("reviews")
          .select("id, stars, verdict, text, created_at")
          .eq("order_id", order.id)
          .maybeSingle()
      : { data: null };

  const total = order.total_cents / 100;
  const isShipped = ["Shipped", "Delivered", "Released", "Completed"].includes(order.status);
  const isDelivered = ["Delivered", "Released", "Completed"].includes(order.status);
  const isReleased = ["Released", "Completed"].includes(order.status);
  const isCanceled = order.status === "Canceled";
  const addressPending = order.ship_to_addr1 === "ADDRESS_PENDING";

  const events: { state: "done" | "current" | "pending"; label: string; ts?: string; detail?: string }[] = [
    {
      state: "done",
      label: "Order placed",
      ts: formatTs(order.placed_at),
      detail: `Bid accepted by ${counterparty?.display_name ?? "seller"}.`,
    },
    {
      state: order.shipped_at ? "done" : isCanceled ? "pending" : "current",
      label: "Awaiting shipment",
      ts: order.shipped_at ? formatTs(order.shipped_at) : undefined,
      detail: order.tracking ? `${order.carrier} · ${order.tracking}` : undefined,
    },
    {
      state: order.delivered_at
        ? "done"
        : order.shipped_at && !isCanceled
          ? "current"
          : "pending",
      label: "Out for delivery",
      ts: order.delivered_at ? formatTs(order.delivered_at) : undefined,
    },
    {
      state: isReleased ? "done" : isDelivered ? "current" : "pending",
      label: "Funds released",
      ts: order.released_at ? formatTs(order.released_at) : undefined,
      detail: isReleased ? "Buyer confirmed; payment moved to seller's pending balance." : undefined,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
        <Link href="/account" className="inline-flex items-center gap-1 hover:text-white">
          <ArrowLeft size={14} /> Account
        </Link>
        <span>/</span>
        <span className="text-white/70">Orders</span>
        <span>/</span>
        <span className="font-mono text-white">{order.id}</span>
      </div>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.2em] text-amber-400/80 uppercase">
            {isBuyer ? "Your order" : "Sale"}
          </div>
          <h1 className="font-display mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Order {order.id}
          </h1>
          <p className="text-sm text-white/50">
            Placed {formatDate(order.placed_at)} ·{" "}
            {isBuyer ? "sold by " : "bought by "}
            <Link
              href={
                isBuyer && counterparty?.username
                  ? `/seller/${counterparty.username}`
                  : "#"
              }
              className="font-semibold text-amber-300 transition hover:underline"
            >
              {counterparty?.display_name ?? "—"}
            </Link>
            {counterparty?.username && (
              <>
                {" · "}
                <Link
                  href={`/account/messages/new?to=${counterparty.username}&order=${order.id}`}
                  className="inline-flex items-center gap-1 font-semibold text-amber-300 transition hover:underline"
                >
                  <MessageCircle size={11} className="inline" />
                  Message
                </Link>
              </>
            )}
          </p>
        </div>
        <StatusBadge status={order.status} isBuyer={isBuyer} />
      </div>

      {/* Buyer hasn't paid yet — show Pay Now CTA */}
      {isBuyer && order.payment_status === "pending" && !isCanceled && (
        <div className="mb-6 rounded-xl border border-amber-700/40 bg-gradient-to-br from-amber-500/15 to-transparent p-5">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
              <AlertTriangle size={16} />
            </div>
            <div className="flex-1">
              <div className="font-display text-base font-bold text-white">
                Complete payment to lock this order
              </div>
              <p className="mt-0.5 text-sm text-amber-100/80">
                Your order is reserved but the seller can&apos;t ship until you pay. Stripe Checkout
                collects payment + shipping address — funds go into escrow until you confirm
                delivery.
              </p>
              <form action={payOrderAndRedirect} className="mt-3">
                <input type="hidden" name="orderId" value={order.id} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2.5 text-sm font-bold text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400"
                >
                  Pay {formatUSDFull(total)}
                  <ArrowRight size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Seller-side view: buyer hasn't paid yet */}
      {isSeller && order.payment_status === "pending" && !isCanceled && (
        <div className="mb-6 rounded-lg border border-amber-700/40 bg-amber-500/10 px-4 py-3 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
            <div className="text-amber-100">
              <strong className="text-amber-50">Awaiting buyer payment.</strong> Buyer needs to
              complete checkout. You&apos;ll get a notification + can ship as soon as payment is
              confirmed.
            </div>
          </div>
        </div>
      )}

      {addressPending && order.payment_status === "paid" && !isCanceled && (
        <div className="mb-6 rounded-lg border border-amber-700/40 bg-amber-500/10 px-4 py-3 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
            <div className="text-amber-100">
              <strong className="text-amber-50">Shipping address syncing.</strong> Stripe is
              still relaying the address from checkout. Refresh in a moment.
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Product card */}
          <div className="rounded-xl border border-white/10 bg-[#101012] p-4 sm:p-5">
            <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap sm:gap-4">
              <Link
                href={`/product/${sku.slug}`}
                className="block h-20 w-16 shrink-0 overflow-hidden rounded"
                aria-label={`View ${sku.year} ${sku.brand} ${sku.product}`}
              >
                <SkuThumb sku={sku} className="h-full w-full" alt={`${sku.year} ${sku.brand} ${sku.product}`} />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/product/${sku.slug}`}
                  className="text-sm font-bold text-white transition hover:text-amber-300 sm:text-base"
                >
                  {sku.year} {sku.brand} {sku.product}
                </Link>
                <div className="text-xs text-white/60">
                  {sku.sport} · Factory Sealed · Qty {order.qty}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-semibold tracking-wider text-white/60 uppercase">
                  Total
                </div>
                <div className="font-display text-lg font-black text-amber-400 sm:text-xl">
                  {formatUSDFull(total)}
                </div>
                <div className="mt-1 text-[11px] text-white/60 sm:text-xs">
                  {order.card_last4
                    ? `Card •••${order.card_last4}`
                    : order.payment_status === "paid"
                      ? "Paid · Stripe Checkout"
                      : "Payment pending"}
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/5 pt-3 text-xs">
              <Spec label="Item" value={formatUSDFull(order.price_cents / 100)} />
              <Spec
                label="Shipping"
                value={
                  order.shipping_cents === 0
                    ? "Free"
                    : formatUSDFull(order.shipping_cents / 100)
                }
              />
              <Spec label="Tax" value={formatUSDFull(order.tax_cents / 100)} />
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-white/10 bg-[#101012] p-5">
            <h2 className="font-display mb-4 text-base font-black text-white">Order timeline</h2>
            <ol className="relative space-y-3">
              {events.map((e, i) => (
                <li key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    {e.state === "done" ? (
                      <CheckCircle2 className="text-emerald-400" size={18} />
                    ) : e.state === "current" ? (
                      <div className="relative flex h-[18px] w-[18px] items-center justify-center">
                        <span className="absolute h-3 w-3 animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative h-2.5 w-2.5 rounded-full bg-amber-500" />
                      </div>
                    ) : (
                      <Circle className="text-white/50" size={18} />
                    )}
                    {i < events.length - 1 && (
                      <div
                        className={`mt-1 h-full w-px flex-1 ${
                          e.state === "done" ? "bg-emerald-500/40" : "bg-white/10"
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div
                      className={`text-sm font-semibold ${
                        e.state === "pending" ? "text-white/60" : "text-white"
                      }`}
                    >
                      {e.label}
                    </div>
                    {e.detail && <div className="mt-0.5 text-xs text-white/50">{e.detail}</div>}
                    {e.ts && <div className="mt-0.5 text-[11px] text-white/60">{e.ts}</div>}
                  </div>
                </li>
              ))}
            </ol>

            {/* Either party can mark delivered once shipped — kicks off the
                2-day auto-release timer. */}
            {order.status === "Shipped" && (
              <MarkDeliveredButton orderId={order.id} isSeller={isSeller} />
            )}

            {/* Buyer can short-circuit by confirming immediately (gated to
                ≥24h after shipped — see ConfirmDeliveryButton). */}
            {isBuyer && (order.status === "Shipped" || order.status === "Delivered") && (
              <ConfirmDeliveryButton orderId={order.id} shippedAt={order.shipped_at} />
            )}

            {/* Auto-release timer countdown */}
            {order.status === "Delivered" && order.delivered_at && (
              <div className="mt-2 rounded-md border border-amber-700/30 bg-amber-500/5 p-3 text-xs text-amber-200/80">
                <strong className="text-amber-100">Delivered.</strong> Funds auto-release on{" "}
                <strong className="text-amber-100">
                  {new Date(
                    new Date(order.delivered_at).getTime() + 2 * 24 * 60 * 60 * 1000,
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </strong>{" "}
                unless the buyer disputes.
                {isBuyer && " Confirm now to release immediately."}
              </div>
            )}
            {isReleased && (
              <div className="mt-2 rounded-md border border-emerald-700/40 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                <ShieldCheck size={14} className="mr-1 inline align-text-bottom" />
                {isBuyer ? (
                  <>
                    You confirmed this order arrived sealed. Funds were released to{" "}
                    {counterparty?.display_name ?? "the seller"}.
                  </>
                ) : (
                  <>
                    Funds released. {formatUSDFull(calcPayout(total))} has been transferred to your
                    Stripe pending balance ({formatUSDFull(total)} sale minus platform fee).
                  </>
                )}
              </div>
            )}
            {isCanceled && (
              <div className="mt-2 rounded-md border border-rose-700/40 bg-rose-500/10 p-3 text-xs text-rose-200">
                Order canceled{order.cancel_reason ? ` — ${order.cancel_reason}` : ""}.
              </div>
            )}
          </div>

          {/* Seller: ship form (until shipped) */}
          {isSeller && !isShipped && !isCanceled && (
            <div className="rounded-xl border border-white/10 bg-[#101012] p-5">
              <h2 className="font-display mb-3 text-base font-black text-white">Ship this order</h2>
              <ShipForm
                orderId={order.id}
                initialCarrier={order.carrier}
                initialTracking={order.tracking}
                needsShipBy={daysFromNow(order.placed_at, 2)}
              />
            </div>
          )}

          {/* Buyer: leave a review after release */}
          {isBuyer && isReleased && !existingReview && counterparty && (
            <LeaveReview
              orderId={order.id}
              sellerUsername={counterparty.username}
              sellerDisplayName={counterparty.display_name}
            />
          )}

          {/* Either side can see the posted review once it exists */}
          {existingReview && (
            <div className="rounded-xl border border-emerald-700/30 bg-gradient-to-br from-emerald-500/5 to-transparent p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-black text-white">
                  {isBuyer ? "Your review" : "Review from buyer"}
                </h2>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    existingReview.verdict === "positive"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : existingReview.verdict === "neutral"
                        ? "bg-amber-500/15 text-amber-300"
                        : "bg-rose-500/15 text-rose-300"
                  }`}
                >
                  {existingReview.verdict}
                </span>
              </div>
              <div className="mt-1 text-sm text-amber-300">
                {"★".repeat(existingReview.stars)}
                <span className="text-white/20">
                  {"★".repeat(5 - existingReview.stars)}
                </span>
              </div>
              {existingReview.text && (
                <p className="mt-2 text-sm whitespace-pre-line text-white/80">
                  {existingReview.text}
                </p>
              )}
              <div className="mt-2 text-[11px] text-white/60">
                Posted {new Date(existingReview.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          {/* Shipping address */}
          <div className="rounded-xl border border-white/10 bg-[#101012] p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
              <MapPin size={16} className="text-white/60" />
              Shipping to
            </div>
            {addressPending ? (
              <div className="rounded-md border border-amber-700/30 bg-amber-500/10 p-3 text-xs text-amber-100">
                Address pending — buyer confirms during Stripe Checkout (rolling out next).
              </div>
            ) : (
              <div className="text-sm">
                <div className="font-semibold text-white">{order.ship_to_name}</div>
                <div className="text-white/60">{order.ship_to_addr1}</div>
                <div className="text-white/60">
                  {order.ship_to_city}, {order.ship_to_state} {order.ship_to_zip}
                </div>
              </div>
            )}
          </div>

          {/* Tracking */}
          {order.tracking && (
            <div className="rounded-xl border border-white/10 bg-[#101012] p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                <Truck size={16} className="text-white/60" />
                Tracking
              </div>
              <div className="text-xs text-white/60">{order.carrier}</div>
              <div className="font-mono text-sm font-semibold text-white">{order.tracking}</div>
              {(() => {
                const url = getTrackingUrl(order.carrier, order.tracking);
                return url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-300 hover:underline"
                  >
                    Track on {order.carrier} <ArrowRight size={12} />
                  </a>
                ) : null;
              })()}
              {order.estimated_delivery && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-white/60">
                  <Clock size={12} className="text-white/60" />
                  Est. delivery {formatDate(order.estimated_delivery)}
                </div>
              )}
            </div>
          )}

          {/* Buyer-only: cancel until shipped */}
          {isBuyer && !isShipped && !isCanceled && (
            <div className="rounded-xl border border-amber-700/40 bg-amber-500/10 p-5">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-100">
                <Package size={16} className="text-amber-300" />
                Awaiting shipment
              </div>
              <p className="text-xs text-amber-200/80">
                Seller has until <strong>{daysFromNow(order.placed_at, 2)}</strong> to ship.
                You&apos;ll get a notification with tracking once they do.
              </p>
              <div className="mt-3 border-t border-amber-700/30 pt-2">
                <CancelOrderButton orderId={order.id} total={total} />
              </div>
            </div>
          )}

          {/* Buyer protection */}
          {isBuyer && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-white/80">
                <ShieldCheck size={14} className="text-emerald-400" />
                Buyer Protection
              </div>
              <p className="text-xs text-white/60">
                Your payment is held in escrow once Stripe is wired. If the box doesn&apos;t arrive
                sealed, open a dispute within 3 days of delivery.
              </p>
              <Link
                href={`/account/disputes/new?order=${order.id}`}
                className="mt-2 inline-block text-xs font-semibold text-amber-300 transition hover:underline"
              >
                Open a dispute →
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function StatusBadge({ status, isBuyer }: { status: OrderStatus; isBuyer: boolean }) {
  const labelMap: Record<OrderStatus, { bg: string; text: string; label: string }> = {
    Charged: {
      bg: "border-amber-700/40 bg-amber-500/15",
      text: "text-amber-300",
      label: isBuyer ? "Awaiting ship" : "Ready to ship",
    },
    InEscrow: {
      bg: "border-amber-700/40 bg-amber-500/15",
      text: "text-amber-300",
      label: "In escrow",
    },
    Shipped: {
      bg: "border-sky-700/40 bg-sky-500/15",
      text: "text-sky-300",
      label: "In transit",
    },
    Delivered: {
      bg: "border-amber-700/40 bg-amber-500/15",
      text: "text-amber-300",
      label: isBuyer ? "Delivered · Confirm" : "Delivered",
    },
    Released: {
      bg: "border-emerald-700/40 bg-emerald-500/15",
      text: "text-emerald-300",
      label: "Released",
    },
    Completed: {
      bg: "border-emerald-700/40 bg-emerald-500/15",
      text: "text-emerald-300",
      label: "Completed",
    },
    Canceled: {
      bg: "border-rose-700/40 bg-rose-500/15",
      text: "text-rose-300",
      label: "Canceled",
    },
  };
  const cfg = labelMap[status];
  return (
    <span
      className={`inline-flex rounded-md border px-3 py-1.5 text-sm font-bold ${cfg.bg} ${cfg.text}`}
    >
      {cfg.label}
    </span>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold tracking-wider text-white/60 uppercase">{label}</dt>
      <dd className="text-sm font-semibold text-white">{value}</dd>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTs(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${d.toLocaleTimeString(
    "en-US",
    { hour: "numeric", minute: "2-digit" },
  )}`;
}

function daysFromNow(fromIso: string, n: number) {
  const d = new Date(new Date(fromIso).getTime() + n * 24 * 60 * 60 * 1000);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
