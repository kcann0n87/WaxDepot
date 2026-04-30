import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatUSDFull } from "@/lib/utils";

type DisputeStatus =
  | "Awaiting seller"
  | "Awaiting WaxDepot"
  | "Resolved — refunded"
  | "Resolved — denied";

type DisputeRow = {
  id: string;
  order_id: string;
  reason: string;
  status: DisputeStatus;
  opened_at: string;
  updated_at: string;
  order:
    | {
        id: string;
        total_cents: number;
        sku: { year: number; brand: string; product: string } | { year: number; brand: string; product: string }[] | null;
      }
    | { id: string; total_cents: number; sku: { year: number; brand: string; product: string } | null }[]
    | null;
};

export default async function DisputesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/disputes");

  const { data: rows } = await supabase
    .from("disputes")
    .select(
      "id, order_id, reason, status, opened_at, updated_at, order:orders!disputes_order_id_fkey(id, total_cents, sku:skus!orders_sku_id_fkey(year, brand, product))",
    )
    .eq("reporter_id", user.id)
    .order("opened_at", { ascending: false });

  const disputes = ((rows ?? []) as unknown as DisputeRow[]).map((r) => {
    const orderRel = Array.isArray(r.order) ? r.order[0] : r.order;
    const skuRel = orderRel ? (Array.isArray(orderRel.sku) ? orderRel.sku[0] : orderRel.sku) : null;
    return {
      id: r.id,
      orderId: r.order_id,
      reason: r.reason,
      status: r.status,
      opened: r.opened_at,
      updated: r.updated_at,
      amount: orderRel ? orderRel.total_cents / 100 : 0,
      productTitle: skuRel ? `${skuRel.year} ${skuRel.brand} ${skuRel.product}` : "—",
    };
  });

  const open = disputes.filter((d) => d.status.startsWith("Awaiting"));
  const resolvedRefunded = disputes.filter((d) => d.status.includes("refunded"));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
        <Link href="/account" className="inline-flex items-center gap-1 hover:text-white">
          <ArrowLeft size={14} /> Account
        </Link>
        <span>/</span>
        <span className="text-white">Disputes</span>
      </div>

      <div className="mb-6">
        <h1 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
          Disputes
        </h1>
        <p className="text-sm text-white/50">
          Open or track a dispute. Funds stay held in escrow until each dispute is resolved.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Stat
          icon={<AlertTriangle className="text-amber-400" size={16} />}
          label="Open"
          value={String(open.length)}
          sub="awaiting response"
        />
        <Stat
          icon={<CheckCircle2 className="text-emerald-400" size={16} />}
          label="Refunded"
          value={String(resolvedRefunded.length)}
          sub="lifetime"
        />
        <Stat
          icon={<Clock className="text-white/50" size={16} />}
          label="Total disputes"
          value={String(disputes.length)}
          sub="across all orders"
        />
      </div>

      {disputes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
          <ShieldCheck className="mx-auto text-emerald-400" size={32} />
          <p className="font-display mt-3 text-base font-bold text-white">No disputes</p>
          <p className="mt-1 text-sm text-white/50">
            If you have an issue with an order, open a dispute from the order detail page.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-white/[0.03] text-left text-[10px] font-semibold tracking-[0.15em] text-white/50 uppercase">
              <tr>
                <th className="px-4 py-3">Dispute</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {disputes.map((d) => (
                <tr key={d.id} className="transition hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono text-xs">
                    <span className="text-amber-300">{d.id}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link
                      href={`/account/orders/${d.orderId}`}
                      className="text-amber-300 transition hover:underline"
                    >
                      {d.orderId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-white">
                    {d.productTitle}
                  </td>
                  <td className="px-4 py-3 font-display font-black text-amber-400">
                    {formatUSDFull(d.amount)}
                  </td>
                  <td className="px-4 py-3 text-white/70">{d.reason}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-white/50">{ago(d.updated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#101012] p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.15em] text-white/50 uppercase">
        {icon}
        {label}
      </div>
      <div className="font-display mt-1.5 text-2xl font-black tracking-tight text-white">
        {value}
      </div>
      <div className="text-xs text-white/40">{sub}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: DisputeStatus }) {
  const map: Record<DisputeStatus, string> = {
    "Awaiting seller": "border-amber-700/40 bg-amber-500/15 text-amber-300",
    "Awaiting WaxDepot": "border-sky-700/40 bg-sky-500/15 text-sky-300",
    "Resolved — refunded": "border-emerald-700/40 bg-emerald-500/15 text-emerald-300",
    "Resolved — denied": "border-rose-700/40 bg-rose-500/15 text-rose-300",
  };
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${map[status]}`}
    >
      {status}
    </span>
  );
}

function ago(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.max(Math.floor(diff / 60000), 0);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
