import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { serviceRoleClient } from "@/lib/supabase/admin";
import { formatUSDFull } from "@/lib/utils";
import { OrderAdminActions } from "./order-actions";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = serviceRoleClient();

  const { data: order } = await sb
    .from("orders")
    .select(
      "*, sku:skus!orders_sku_id_fkey(slug, year, brand, product, sport, image_url, gradient_from, gradient_to), buyer:profiles!orders_buyer_id_fkey(username, display_name), seller:profiles!orders_seller_id_fkey(username, display_name, stripe_account_id)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();

  const sku = Array.isArray(order.sku) ? order.sku[0] : order.sku;
  const buyer = Array.isArray(order.buyer) ? order.buyer[0] : order.buyer;
  const seller = Array.isArray(order.seller) ? order.seller[0] : order.seller;

  const canRefund =
    order.payment_status === "paid" &&
    !order.stripe_transfer_id &&
    order.status !== "Canceled";
  const canRelease =
    order.payment_status === "paid" &&
    !order.stripe_transfer_id &&
    ["InEscrow", "Shipped", "Delivered"].includes(order.status);
  // Manual mark-delivered: any pre-Delivered state where the package
  // realistically could have arrived. Sets delivered_at so the 2-day
  // auto-release cron picks it up.
  const canMarkDelivered = ["Charged", "InEscrow", "Shipped"].includes(
    order.status,
  );

  return (
    <div>
      <Link
        href="/admin/orders"
        className="mb-3 inline-flex items-center gap-1 text-xs text-white/60 hover:text-white"
      >
        <ArrowLeft size={12} /> All orders
      </Link>

      <h1 className="font-display mb-1 text-2xl font-black text-white">{order.id}</h1>
      <p className="mb-6 text-sm text-white/60">
        {sku ? `${sku.year} ${sku.brand} ${sku.product}` : "—"} · {order.status} · {order.payment_status}
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card title="Parties">
            <Row k="Buyer" v={`${buyer?.display_name ?? "—"} (@${buyer?.username ?? "—"})`} />
            <Row k="Seller" v={`${seller?.display_name ?? "—"} (@${seller?.username ?? "—"})`} />
            <Row k="Stripe account" v={seller?.stripe_account_id ?? "—"} mono />
          </Card>

          <Card title="Money">
            <Row k="Total" v={formatUSDFull(order.total_cents / 100)} />
            <Row k="Item" v={formatUSDFull(order.price_cents / 100)} />
            <Row k="Shipping" v={formatUSDFull(order.shipping_cents / 100)} />
            <Row k="Tax" v={formatUSDFull(order.tax_cents / 100)} />
            <Row k="Charge" v={order.stripe_charge_id ?? "—"} mono />
            <Row k="Payment Intent" v={order.stripe_payment_intent_id ?? "—"} mono />
            <Row k="Transfer" v={order.stripe_transfer_id ?? "(not yet released)"} mono />
          </Card>

          <Card title="Lifecycle">
            <Row k="Placed" v={new Date(order.placed_at).toLocaleString()} />
            <Row k="Shipped" v={order.shipped_at ? new Date(order.shipped_at).toLocaleString() : "—"} />
            <Row k="Delivered" v={order.delivered_at ? new Date(order.delivered_at).toLocaleString() : "—"} />
            <Row k="Released" v={order.released_at ? new Date(order.released_at).toLocaleString() : "—"} />
            <Row k="Canceled" v={order.canceled_at ? new Date(order.canceled_at).toLocaleString() : "—"} />
            {order.cancel_reason && <Row k="Cancel reason" v={order.cancel_reason} />}
          </Card>

          <Card title="Shipping">
            <Row k="Carrier" v={order.carrier ?? "—"} />
            <Row k="Tracking" v={order.tracking ?? "—"} mono />
            <Row k="Address" v={`${order.ship_to_name}, ${order.ship_to_addr1}, ${order.ship_to_city} ${order.ship_to_state} ${order.ship_to_zip}`} />
          </Card>
        </div>

        <div className="space-y-4">
          <OrderAdminActions
            orderId={order.id}
            canRefund={canRefund}
            canRelease={canRelease}
            canMarkDelivered={canMarkDelivered}
          />
          {!canRefund && !canRelease && !canMarkDelivered && (
            <p className="rounded-md border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-white/60">
              Order is in a terminal state — no further admin actions available
              on the platform side. Use Stripe directly if needed.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#101012] p-4">
      <div className="mb-3 text-[10px] font-semibold tracking-[0.18em] text-white/60 uppercase">
        {title}
      </div>
      <dl className="space-y-1.5 text-xs">{children}</dl>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-white/60">{k}</dt>
      <dd className={`text-right text-white ${mono ? "font-mono" : ""}`}>{v}</dd>
    </div>
  );
}
