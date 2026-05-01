import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatUSDFull } from "@/lib/utils";
import { SkuThumb } from "@/components/sku-thumb";
import { NewDisputeForm } from "./new-dispute-form";

export default async function NewDisputePage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/account/disputes/new${orderId ? `?order=${orderId}` : ""}`);

  if (!orderId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-xl border border-amber-700/40 bg-amber-500/10 p-8 text-center">
          <AlertTriangle className="mx-auto text-amber-400" size={32} />
          <h1 className="font-display mt-3 text-lg font-bold text-white">
            Pick an order to dispute
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Disputes are tied to a specific order. Open one from your{" "}
            <Link href="/account" className="font-semibold text-amber-300 hover:underline">
              order list
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, buyer_id, seller_id, status, total_cents, sku:skus!orders_sku_id_fkey(slug, year, brand, product, image_url, gradient_from, gradient_to)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!order) notFound();
  if (order.buyer_id !== user.id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-xl border border-rose-700/40 bg-rose-500/10 p-8 text-center">
          <AlertTriangle className="mx-auto text-rose-400" size={32} />
          <h1 className="font-display mt-3 text-lg font-bold text-white">
            Not your order
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Only the buyer of an order can file a dispute on it.
          </p>
        </div>
      </div>
    );
  }
  if (["Released", "Completed", "Canceled"].includes(order.status)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-xl border border-amber-700/40 bg-amber-500/10 p-8 text-center">
          <AlertTriangle className="mx-auto text-amber-400" size={32} />
          <h1 className="font-display mt-3 text-lg font-bold text-white">
            This order is past the dispute window
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Order is {order.status}. For help, message{" "}
            <a href="mailto:support@waxdepot.io" className="font-semibold text-amber-300 hover:underline">
              support@waxdepot.io
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  const skuRel = Array.isArray(order.sku) ? order.sku[0] : order.sku;
  if (!skuRel) notFound();

  const { data: existingDispute } = await supabase
    .from("disputes")
    .select("id, status")
    .eq("order_id", order.id)
    .maybeSingle();

  if (existingDispute && !existingDispute.status.startsWith("Resolved")) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-xl border border-amber-700/40 bg-amber-500/10 p-8 text-center">
          <AlertTriangle className="mx-auto text-amber-400" size={32} />
          <h1 className="font-display mt-3 text-lg font-bold text-white">
            Dispute already open
          </h1>
          <p className="mt-1 text-sm text-white/60">
            <span className="font-mono text-white">{existingDispute.id}</span> is currently being
            reviewed.{" "}
            <Link href="/account/disputes" className="font-semibold text-amber-300 hover:underline">
              View disputes →
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
        <Link
          href={`/account/orders/${order.id}`}
          className="inline-flex items-center gap-1 hover:text-white"
        >
          <ArrowLeft size={14} /> Order {order.id}
        </Link>
        <span>/</span>
        <span className="text-white">Open dispute</span>
      </div>
      <h1 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
        Open a dispute
      </h1>
      <p className="mt-1 text-sm text-white/50">
        Tell us what went wrong. We&apos;ll hold the seller&apos;s payment until it&apos;s
        resolved.
      </p>

      <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <SkuThumb sku={skuRel} className="h-12 w-10 rounded" alt={`${skuRel.year} ${skuRel.brand} ${skuRel.product}`} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-white">
            {skuRel.year} {skuRel.brand} {skuRel.product}
          </div>
          <div className="text-xs text-white/50">
            Order <span className="font-mono">{order.id}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-sm font-black text-amber-400">
            {formatUSDFull(order.total_cents / 100)}
          </div>
          <div className="text-[11px] text-white/50">held in escrow</div>
        </div>
      </div>

      <NewDisputeForm orderId={order.id} />
    </div>
  );
}
