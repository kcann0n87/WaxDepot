"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ImagePlus,
  Package,
  ShieldCheck,
  X,
} from "lucide-react";
import { findOrder } from "@/lib/orders";
import { skus } from "@/lib/data";
import { formatSkuTitle, formatUSDFull } from "@/lib/utils";

const reasons = [
  { id: "resealed", label: "Suspect resealed wax", description: "Box looks tampered with — broken tape, weight off, etc." },
  { id: "wrong-item", label: "Wrong item shipped", description: "I received a different product than what I ordered." },
  { id: "damaged", label: "Damaged in transit", description: "Box arrived crushed or otherwise damaged." },
  { id: "not-arrived", label: "Never arrived", description: "Tracking shows delivered but I don't have it (or no tracking at all)." },
  { id: "not-as-described", label: "Not as described", description: "Listing said one thing, what I got was different." },
  { id: "other", label: "Other", description: "Pick this if nothing above fits — describe below." },
];

type Step = "reason" | "details" | "review" | "submitted";

export default function NewDisputePage() {
  return (
    <Suspense fallback={null}>
      <NewDisputeForm />
    </Suspense>
  );
}

function NewDisputeForm() {
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get("order") ?? "";
  const order = findOrder(orderIdParam);
  const sku = order ? skus.find((s) => s.id === order.skuId) : null;

  const [step, setStep] = useState<Step>("reason");
  const [reasonId, setReasonId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<"refund" | "replacement" | "partial">("refund");
  const [agreed, setAgreed] = useState(false);
  const [disputeId] = useState(() => `DSP-${Math.floor(Math.random() * 9000 + 1000)}`);

  const reason = reasons.find((r) => r.id === reasonId);
  const detailsValid = description.length >= 30 && (reasonId !== "resealed" || photos.length >= 1);

  if (!orderIdParam || !order || !sku) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-xl border border-amber-700/40 bg-amber-500/10 p-8 text-center">
          <AlertTriangle className="mx-auto text-amber-400" size={32} />
          <h1 className="mt-3 text-lg font-bold text-white">Pick an order to dispute</h1>
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

  if (step === "submitted") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-xl border border-white/10 bg-[#101012] p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
            <Check className="text-emerald-400" size={28} />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-white">Dispute opened</h1>
          <p className="mt-2 text-sm text-white/60">
            Dispute <span className="font-mono font-bold text-white">{disputeId}</span> is now
            open. Funds for {formatUSDFull(order.total)} stay held in escrow until it&apos;s resolved.
          </p>
          <div className="mx-auto mt-4 max-w-md rounded-md border border-white/10 bg-white/[0.02] p-3 text-xs text-white/60">
            <strong className="text-white/90">What happens next:</strong> {order.seller} has 48
            hours to respond. WaxDepot Support reviews both sides within 3 business days.
            You&apos;ll get a notification at every step.
          </div>
          <div className="mt-6 flex justify-center gap-2">
            <Link
              href="/account/disputes"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              View disputes
            </Link>
            <Link
              href={`/account/orders/${order.id}`}
              className="rounded-md border border-white/15 bg-[#101012] px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/[0.02]"
            >
              Back to order
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
        <Link href={`/account/orders/${order.id}`} className="inline-flex items-center gap-1 hover:text-white">
          <ArrowLeft size={14} /> Order {order.id}
        </Link>
        <span>/</span>
        <span className="text-white">Open dispute</span>
      </div>
      <h1 className="text-2xl font-black tracking-tight text-white">Open a dispute</h1>
      <p className="mt-1 text-sm text-white/50">
        Tell us what went wrong. We&apos;ll hold the seller&apos;s payment until it&apos;s resolved.
      </p>

      <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <div
          className="flex h-12 w-10 shrink-0 items-center justify-center rounded text-[8px] font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${sku.gradient[0]}, ${sku.gradient[1]})` }}
        >
          {sku.brand.slice(0, 4).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-white">{formatSkuTitle(sku)}</div>
          <div className="text-xs text-white/50">
            Order <span className="font-mono">{order.id}</span> · sold by {order.seller}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-white">{formatUSDFull(order.total)}</div>
          <div className="text-[11px] text-white/50">held in escrow</div>
        </div>
      </div>

      <Stepper step={step} />

      {step === "reason" && (
        <Card title="What went wrong?" subtitle="Pick the closest match. You'll add details in the next step.">
          <ul className="space-y-2">
            {reasons.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setReasonId(r.id)}
                  className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition ${
                    reasonId === r.id
                      ? "border-amber-500/40 bg-amber-500/10"
                      : "border-white/10 bg-[#101012] hover:border-white/15"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                      reasonId === r.id ? "border-amber-500/40 bg-indigo-500" : "border-white/15"
                    }`}
                  >
                    {reasonId === r.id && <div className="h-1.5 w-1.5 rounded-full bg-[#101012]" />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{r.label}</div>
                    <div className="text-xs text-white/50">{r.description}</div>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <Footer>
            <Link
              href={`/account/orders/${order.id}`}
              className="rounded-md border border-white/15 bg-[#101012] px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/[0.02]"
            >
              Cancel
            </Link>
            <button
              disabled={!reasonId}
              onClick={() => setStep("details")}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue <ArrowRight size={14} />
            </button>
          </Footer>
        </Card>
      )}

      {step === "details" && (
        <Card title="Details and evidence" subtitle="The more context you give, the faster we can resolve it.">
          <Field label="What happened?" required>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Walk us through what you received, what you expected, and any details (timeline, condition, packaging)."
              className={input}
            />
            <div className="mt-1 flex justify-between text-[11px] text-white/40">
              <span>{description.length < 30 ? `Add at least ${30 - description.length} more characters` : "Looks good"}</span>
              <span>{description.length} / 1000</span>
            </div>
          </Field>

          <Field
            label="Photos"
            required={reasonId === "resealed"}
            hint={reasonId === "resealed" ? "Required for resealed disputes — show the seal, weight, and any irregularities." : "Optional — drag in or click to upload"}
          >
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-md bg-white/5">
                  <div className="flex h-full items-center justify-center text-xs text-white/40">
                    {p}
                  </div>
                  <button
                    onClick={() => setPhotos((arr) => arr.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 rounded-full bg-[#101012]/90 p-0.5 text-white/60 hover:bg-[#101012]"
                    aria-label="Remove"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {photos.length < 6 && (
                <button
                  onClick={() => setPhotos((arr) => [...arr, `photo-${arr.length + 1}.jpg`])}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed border-white/15 text-xs text-white/40 hover:border-white/30 hover:text-white/60"
                >
                  <ImagePlus size={20} />
                  Add photo
                </button>
              )}
            </div>
          </Field>

          <Field label="Preferred outcome" required>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { id: "refund", label: "Full refund", description: "I want my money back." },
                { id: "replacement", label: "Replacement", description: "Send me the right item." },
                { id: "partial", label: "Partial refund", description: "Keep the item, refund part." },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setOutcome(opt.id as typeof outcome)}
                  className={`rounded-lg border p-3 text-left text-xs transition ${
                    outcome === opt.id
                      ? "border-amber-500/40 bg-amber-500/10"
                      : "border-white/10 bg-[#101012] hover:border-white/15"
                  }`}
                >
                  <div className="text-sm font-bold text-white">{opt.label}</div>
                  <div className="mt-0.5 text-white/50">{opt.description}</div>
                </button>
              ))}
            </div>
          </Field>

          <Footer>
            <button
              onClick={() => setStep("reason")}
              className="rounded-md border border-white/15 bg-[#101012] px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/[0.02]"
            >
              ← Back
            </button>
            <button
              disabled={!detailsValid}
              onClick={() => setStep("review")}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Review <ArrowRight size={14} />
            </button>
          </Footer>
        </Card>
      )}

      {step === "review" && (
        <Card title="Review and submit" subtitle="Last look before we notify the seller.">
          <dl className="divide-y divide-white/5 rounded-lg border border-white/10">
            <Row label="Reason" value={reason?.label ?? "—"} />
            <Row label="Preferred outcome" value={outcome === "refund" ? "Full refund" : outcome === "replacement" ? "Replacement" : "Partial refund"} />
            <Row label="Photos attached" value={String(photos.length)} />
          </dl>

          <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <div className="text-xs font-semibold text-white/80">Your description</div>
            <p className="mt-1 text-sm whitespace-pre-line text-white/80">{description}</p>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-md border border-white/10 bg-white/[0.02] p-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-xs text-white/80">
              I confirm the information above is accurate. I understand that filing a fraudulent
              dispute can result in account suspension and that WaxDepot Support reviews each
              dispute to determine the outcome.
            </span>
          </label>

          <Footer>
            <button
              onClick={() => setStep("details")}
              className="rounded-md border border-white/15 bg-[#101012] px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/[0.02]"
            >
              ← Back
            </button>
            <button
              disabled={!agreed}
              onClick={() => setStep("submitted")}
              className="rounded-md bg-rose-600 px-5 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Open dispute
            </button>
          </Footer>

          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-white/40">
            <ShieldCheck size={11} className="text-emerald-400" />
            Funds stay held in escrow throughout the dispute process.
          </div>
        </Card>
      )}
    </div>
  );
}

const input =
  "w-full rounded-md border border-white/15 px-3 py-2.5 text-sm focus:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-400/20";

function Stepper({ step }: { step: Step }) {
  const steps: Step[] = ["reason", "details", "review"];
  const idx = steps.indexOf(step);
  const labels = { reason: "Reason", details: "Details", review: "Review", submitted: "" };
  return (
    <ol className="my-6 flex items-center gap-2">
      {steps.map((s, i) => {
        const isDone = i < idx;
        const isCurrent = i === idx;
        return (
          <li key={s} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                isDone
                  ? "bg-emerald-600 text-white"
                  : isCurrent
                    ? "bg-slate-900 text-white"
                    : "bg-slate-200 text-white/50"
              }`}
            >
              {isDone ? <Check size={14} /> : i + 1}
            </div>
            <span
              className={`hidden text-xs font-semibold sm:inline ${
                isCurrent ? "text-white" : "text-white/50"
              }`}
            >
              {labels[s]}
            </span>
            {i < steps.length - 1 && (
              <div className={`mx-1 h-px flex-1 ${isDone ? "bg-emerald-600" : "bg-slate-200"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#101012] p-6">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <p className="mt-0.5 text-sm text-white/50">{subtitle}</p>
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-white/80">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </span>
        {hint && <span className="text-xs text-white/40">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function Footer({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-between">{children}</div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <dt className="text-sm text-white/60">{label}</dt>
      <dd className="text-sm font-semibold text-white">{value}</dd>
    </div>
  );
}
