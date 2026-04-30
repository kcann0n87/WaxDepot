"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2, ShieldCheck } from "lucide-react";
import { submitDispute } from "@/app/actions/disputes";

const reasons = [
  {
    id: "Suspect resealed wax",
    label: "Suspect resealed wax",
    description: "Box looks tampered with — broken tape, weight off, etc.",
  },
  {
    id: "Wrong item shipped",
    label: "Wrong item shipped",
    description: "I received a different product than what I ordered.",
  },
  {
    id: "Damaged in transit",
    label: "Damaged in transit",
    description: "Box arrived crushed or otherwise damaged.",
  },
  {
    id: "Never arrived",
    label: "Never arrived",
    description: "Tracking shows delivered but I don't have it (or no tracking at all).",
  },
  {
    id: "Not as described",
    label: "Not as described",
    description: "Listing said one thing, what I got was different.",
  },
  {
    id: "Other",
    label: "Other",
    description: "Pick this if nothing above fits — describe below.",
  },
] as const;

const outcomes = [
  { id: "refund", label: "Full refund", description: "I want my money back." },
  { id: "replacement", label: "Replacement", description: "Send me the right item." },
  { id: "partial", label: "Partial refund", description: "Keep the item, refund part." },
] as const;

type Step = "form" | "submitted";

export function NewDisputeForm({ orderId }: { orderId: string }) {
  const [step, setStep] = useState<Step>("form");
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [outcome, setOutcome] = useState<"refund" | "replacement" | "partial">("refund");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canSubmit = reason && description.length >= 30 && agreed && !pending;

  const submit = () => {
    if (!canSubmit) return;
    setError(null);
    const formData = new FormData();
    formData.set("orderId", orderId);
    formData.set("reason", reason);
    formData.set("description", description);
    formData.set("outcome", outcome);
    startTransition(async () => {
      const result = await submitDispute(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.disputeId) {
        setSubmittedId(result.disputeId);
        setStep("submitted");
      }
    });
  };

  if (step === "submitted" && submittedId) {
    return (
      <div className="mt-6 rounded-xl border border-white/10 bg-[#101012] p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-700/40 bg-emerald-500/15">
          <Check className="text-emerald-400" size={28} />
        </div>
        <h2 className="font-display mt-4 text-2xl font-black tracking-tight text-white">
          Dispute opened
        </h2>
        <p className="mt-2 text-sm text-white/60">
          Dispute <span className="font-mono font-bold text-white">{submittedId}</span> is now
          open. Funds stay held in escrow until it&apos;s resolved.
        </p>
        <div className="mx-auto mt-4 max-w-md rounded-md border border-white/10 bg-white/[0.02] p-3 text-xs text-white/60">
          <strong className="text-white/90">What happens next:</strong> the seller has 48 hours
          to respond. WaxDepot Support reviews both sides within 3 business days. You&apos;ll get
          a notification at every step. If you have additional photos or evidence, email{" "}
          <a href="mailto:support@waxdepot.io" className="text-amber-300 hover:underline">
            support@waxdepot.io
          </a>{" "}
          referencing your dispute id.
        </div>
        <div className="mt-6 flex justify-center gap-2">
          <Link
            href="/account/disputes"
            className="rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-sm font-bold text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400"
          >
            View disputes
          </Link>
          <Link
            href={`/account/orders/${orderId}`}
            className="rounded-md border border-white/15 bg-[#101012] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/[0.02]"
          >
            Back to order
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <Card title="What went wrong?" subtitle="Pick the closest match.">
        <ul className="space-y-2">
          {reasons.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setReason(r.id)}
                className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition ${
                  reason === r.id
                    ? "border-amber-500/40 bg-amber-500/10"
                    : "border-white/10 bg-[#101012] hover:border-white/15"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    reason === r.id ? "border-amber-400 bg-amber-400" : "border-white/15"
                  }`}
                >
                  {reason === r.id && <div className="h-1.5 w-1.5 rounded-full bg-slate-900" />}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{r.label}</div>
                  <div className="text-xs text-white/50">{r.description}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Details" subtitle="Walk us through what happened.">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder="What did you receive? What did you expect? Timeline, condition, packaging — the more detail, the faster support can resolve."
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-amber-400/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
        />
        <div className="mt-1 flex justify-between text-[11px] text-white/40">
          <span>
            {description.length < 30
              ? `Add at least ${30 - description.length} more characters`
              : "Looks good"}
          </span>
          <span>{description.length} chars</span>
        </div>
        <div className="mt-3 rounded-md border border-white/10 bg-white/[0.02] p-3 text-xs text-white/60">
          Have photos? File the dispute first, then email{" "}
          <a href="mailto:support@waxdepot.io" className="text-amber-300 hover:underline">
            support@waxdepot.io
          </a>{" "}
          with photos referencing your dispute id (we&apos;ll send it after submit). Photo upload
          UI is coming.
        </div>
      </Card>

      <Card title="Preferred outcome" subtitle="What would resolve this for you?">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {outcomes.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setOutcome(opt.id)}
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
      </Card>

      <label className="flex cursor-pointer items-start gap-2 rounded-md border border-white/10 bg-white/[0.02] p-3">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5"
        />
        <span className="text-xs text-white/80">
          I confirm the information above is accurate. I understand that filing a fraudulent
          dispute can result in account suspension and that WaxDepot Support reviews each dispute
          to determine the outcome.
        </span>
      </label>

      {error && (
        <div className="rounded-md border border-rose-700/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[11px] text-white/40">
          <ShieldCheck size={11} className="text-emerald-400" />
          Funds stay held in escrow throughout the dispute process.
        </div>
        <button
          disabled={!canSubmit}
          onClick={submit}
          className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
          Open dispute
        </button>
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#101012] p-6">
      <h2 className="font-display text-lg font-black text-white">{title}</h2>
      <p className="mt-0.5 text-sm text-white/50">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}
