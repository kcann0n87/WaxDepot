import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { skus } from "@/lib/data";
import { formatSkuTitle, formatUSDFull } from "@/lib/utils";

type DisputeStatus = "Awaiting seller" | "Awaiting WaxDepot" | "Resolved — refunded" | "Resolved — denied";

const disputes: {
  id: string;
  orderId: string;
  skuId: string;
  amount: number;
  reason: string;
  status: DisputeStatus;
  opened: string;
  lastUpdate: string;
}[] = [
  {
    id: "DSP-1042",
    orderId: "WM-704112",
    skuId: "5",
    amount: 580,
    reason: "Suspect resealed",
    status: "Awaiting seller",
    opened: "2026-04-26",
    lastUpdate: "2026-04-27",
  },
  {
    id: "DSP-1018",
    orderId: "WM-689221",
    skuId: "8",
    amount: 295,
    reason: "Wrong item shipped",
    status: "Resolved — refunded",
    opened: "2026-03-12",
    lastUpdate: "2026-03-15",
  },
];

export default function DisputesPage() {
  const open = disputes.filter((d) => d.status.startsWith("Awaiting"));
  const resolved = disputes.filter((d) => d.status.startsWith("Resolved"));

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
        <h1 className="text-2xl font-black tracking-tight text-white">Disputes</h1>
        <p className="text-sm text-white/50">
          Open or track a dispute. Funds stay held in escrow until each dispute is resolved.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Stat icon={<AlertTriangle className="text-amber-400" size={16} />} label="Open" value={String(open.length)} sub="awaiting response" />
        <Stat icon={<CheckCircle2 className="text-emerald-400" size={16} />} label="Refunded" value={String(resolved.filter((d) => d.status.includes("refunded")).length)} sub="lifetime" />
        <Stat icon={<Clock className="text-white/50" size={16} />} label="Avg resolution" value="2.4 days" sub="across all disputes" />
      </div>

      {disputes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
          <ShieldCheck className="mx-auto text-emerald-400" size={32} />
          <p className="mt-3 text-sm font-bold text-white">No disputes</p>
          <p className="mt-1 text-sm text-white/50">
            If you have an issue with an order, open a dispute from the order detail page.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-white/[0.02] text-left text-xs font-semibold tracking-wider text-white/50 uppercase">
              <tr>
                <th className="px-4 py-2.5">Dispute</th>
                <th className="px-4 py-2.5">Order</th>
                <th className="px-4 py-2.5">Product</th>
                <th className="px-4 py-2.5">Amount</th>
                <th className="px-4 py-2.5">Reason</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Last update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {disputes.map((d) => {
                const sku = skus.find((s) => s.id === d.skuId);
                return (
                  <tr key={d.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-xs text-white/50">{d.id}</td>
                    <td className="px-4 py-3">
                      <Link href={`/account/orders/${d.orderId}`} className="font-mono text-xs text-amber-300 hover:underline">
                        {d.orderId}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {sku ? (
                        <Link href={`/product/${sku.slug}`} className="text-sm font-semibold text-white hover:text-amber-300">
                          {formatSkuTitle(sku)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">{formatUSDFull(d.amount)}</td>
                    <td className="px-4 py-3 text-white/80">{d.reason}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3 text-white/50">{formatDate(d.lastUpdate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-white/60">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 text-emerald-400" size={14} />
          <div>
            <div className="font-semibold text-white/90">How disputes work</div>
            <p className="mt-1">
              Open a dispute from the order page within 3 days of delivery. Seller has 48 hours to
              respond. WaxDepot Support reviews both sides within 3 business days. We err on the
              side of buyers when authenticity is in question — see{" "}
              <Link href="/help/disputes/dispute-process" className="text-amber-300 hover:underline">
                dispute process
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
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
      <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-white/50 uppercase">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-white/40">{sub}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: DisputeStatus }) {
  const cfg = {
    "Awaiting seller": "bg-amber-500/10 text-amber-300",
    "Awaiting WaxDepot": "bg-sky-500/10 text-sky-300",
    "Resolved — refunded": "bg-emerald-500/10 text-emerald-300",
    "Resolved — denied": "bg-white/5 text-white/60",
  }[status];
  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${cfg}`}>{status}</span>
  );
}

function formatDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
