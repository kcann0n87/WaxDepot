"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Building2, Check, CreditCard, FileText, Lock, ShieldCheck, User } from "lucide-react";

type Step = "identity" | "bank" | "tax" | "review" | "done";

export default function PayoutsOnboardingPage() {
  const [step, setStep] = useState<Step>("identity");

  const [legalFirst, setLegalFirst] = useState("");
  const [legalLast, setLegalLast] = useState("");
  const [dob, setDob] = useState("");
  const [ssnLast4, setSsnLast4] = useState("");
  const [addr1, setAddr1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

  const [bankName, setBankName] = useState("");
  const [routing, setRouting] = useState("");
  const [account, setAccount] = useState("");
  const [accountConfirm, setAccountConfirm] = useState("");

  const [tin, setTin] = useState<"ssn" | "ein">("ssn");
  const [businessName, setBusinessName] = useState("");
  const [agreed, setAgreed] = useState(false);

  const identityValid =
    legalFirst && legalLast && dob && ssnLast4.length === 4 && addr1 && city && state && zip.length >= 5;
  const bankValid =
    bankName && routing.length === 9 && account.length >= 6 && account === accountConfirm;
  const taxValid = tin === "ssn" || (tin === "ein" && businessName.length > 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
        <Link href="/sell" className="hover:text-white">
          Sell
        </Link>
        <span>/</span>
        <span className="text-white">Payout setup</span>
      </div>
      <h1 className="text-3xl font-black tracking-tight text-white">Get paid for your sales</h1>
      <p className="mt-1 text-white/60">
        We pay you via weekly ACH every Friday for sales released that week. Setup takes about 4
        minutes.
      </p>

      <div className="mt-4 flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white/60">
        <Lock size={14} className="text-emerald-400" />
        <span>
          Your information is securely processed by our payments partner. WaxDepot never stores
          full bank or SSN data.
        </span>
      </div>

      <Stepper step={step} />

      {step === "identity" && (
        <Card icon={<User size={20} />} title="Verify your identity" subtitle="Required by US law to send you ACH transfers">
          <Grid>
            <Field label="Legal first name">
              <input
                value={legalFirst}
                onChange={(e) => setLegalFirst(e.target.value)}
                className={input}
              />
            </Field>
            <Field label="Legal last name">
              <input
                value={legalLast}
                onChange={(e) => setLegalLast(e.target.value)}
                className={input}
              />
            </Field>
            <Field label="Date of birth">
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className={input}
              />
            </Field>
            <Field label="Last 4 of SSN" hint="We never see your full SSN">
              <input
                inputMode="numeric"
                maxLength={4}
                value={ssnLast4}
                onChange={(e) => setSsnLast4(e.target.value.replace(/\D/g, ""))}
                className={input}
                placeholder="••••"
              />
            </Field>
          </Grid>
          <div className="mt-4">
            <Field label="Address">
              <input
                value={addr1}
                onChange={(e) => setAddr1(e.target.value)}
                placeholder="123 Main St"
                className={input}
              />
            </Field>
          </div>
          <Grid>
            <Field label="City">
              <input value={city} onChange={(e) => setCity(e.target.value)} className={input} />
            </Field>
            <Field label="State">
              <input
                value={state}
                onChange={(e) => setState(e.target.value.slice(0, 2).toUpperCase())}
                placeholder="CA"
                maxLength={2}
                className={input}
              />
            </Field>
            <Field label="ZIP">
              <input
                inputMode="numeric"
                maxLength={5}
                value={zip}
                onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
                className={input}
              />
            </Field>
          </Grid>
          <Footer>
            <button
              disabled={!identityValid}
              onClick={() => setStep("bank")}
              className={primary}
            >
              Continue <ArrowRight size={14} className="inline" />
            </button>
          </Footer>
        </Card>
      )}

      {step === "bank" && (
        <Card icon={<Building2 size={20} />} title="Where should we send your money?" subtitle="Weekly ACH to a US checking or savings account">
          <Field label="Bank name">
            <input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Chase, Wells Fargo, etc."
              className={input}
            />
          </Field>
          <Grid>
            <Field label="Routing number" hint="9 digits, on the bottom-left of your check">
              <input
                inputMode="numeric"
                maxLength={9}
                value={routing}
                onChange={(e) => setRouting(e.target.value.replace(/\D/g, ""))}
                placeholder="123456789"
                className={input}
              />
            </Field>
            <Field label="Account number">
              <input
                inputMode="numeric"
                value={account}
                onChange={(e) => setAccount(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••••"
                className={input}
              />
            </Field>
          </Grid>
          <Field label="Confirm account number">
            <input
              inputMode="numeric"
              value={accountConfirm}
              onChange={(e) => setAccountConfirm(e.target.value.replace(/\D/g, ""))}
              className={input}
            />
            {accountConfirm && account !== accountConfirm && (
              <p className="mt-1 text-xs text-rose-400">Account numbers don&apos;t match.</p>
            )}
          </Field>
          <div className="mt-4 rounded-md border border-white/10 bg-white/[0.02] p-3 text-xs text-white/60">
            <strong className="text-white/90">First payout heads-up:</strong> The first ACH after
            verification can take 2-3 business days to clear. After that, payouts arrive every
            Friday for sales released the prior week.
          </div>
          <Footer>
            <button onClick={() => setStep("identity")} className={secondary}>
              ← Back
            </button>
            <button disabled={!bankValid} onClick={() => setStep("tax")} className={primary}>
              Continue <ArrowRight size={14} className="inline" />
            </button>
          </Footer>
        </Card>
      )}

      {step === "tax" && (
        <Card icon={<FileText size={20} />} title="Tax information" subtitle="Required for IRS 1099-K reporting on US sellers earning $600+">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-white/80">I&apos;m selling as</legend>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition ${
                  tin === "ssn" ? "border-amber-500/40 bg-amber-500/10" : "border-white/10"
                }`}
              >
                <input
                  type="radio"
                  name="tin"
                  checked={tin === "ssn"}
                  onChange={() => setTin("ssn")}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-semibold text-white">Individual</div>
                  <div className="text-xs text-white/50">Use my SSN. 1099-K issued in my name.</div>
                </div>
              </label>
              <label
                className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition ${
                  tin === "ein" ? "border-amber-500/40 bg-amber-500/10" : "border-white/10"
                }`}
              >
                <input
                  type="radio"
                  name="tin"
                  checked={tin === "ein"}
                  onChange={() => setTin("ein")}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-semibold text-white">Business</div>
                  <div className="text-xs text-white/50">Use an EIN. 1099-K issued to the entity.</div>
                </div>
              </label>
            </div>
          </fieldset>

          {tin === "ein" && (
            <div className="mt-4">
              <Field label="Legal business name">
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className={input}
                />
              </Field>
            </div>
          )}

          <div className="mt-5 rounded-md border border-amber-700/40 bg-amber-500/10 p-3 text-xs text-amber-200">
            We&apos;ll mail your 1099-K by January 31 of the following year if you crossed the IRS
            threshold. You&apos;re responsible for reporting and paying tax on your sales.
          </div>

          <Footer>
            <button onClick={() => setStep("bank")} className={secondary}>
              ← Back
            </button>
            <button disabled={!taxValid} onClick={() => setStep("review")} className={primary}>
              Continue <ArrowRight size={14} className="inline" />
            </button>
          </Footer>
        </Card>
      )}

      {step === "review" && (
        <Card icon={<ShieldCheck size={20} />} title="Review & submit" subtitle="One last look before we verify your account">
          <dl className="divide-y divide-white/5 rounded-lg border border-white/10">
            <Row label="Legal name" value={`${legalFirst} ${legalLast}`} />
            <Row label="Date of birth" value={dob || "—"} />
            <Row label="SSN (last 4)" value={`•••-••-${ssnLast4}`} />
            <Row label="Address" value={`${addr1}, ${city}, ${state} ${zip}`} />
            <Row label="Bank" value={`${bankName} •••${account.slice(-4)}`} />
            <Row label="Routing" value={`•••••${routing.slice(-4)}`} />
            <Row label="Tax filing as" value={tin === "ssn" ? "Individual (SSN)" : `Business — ${businessName}`} />
          </dl>

          <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-md border border-white/10 bg-white/[0.02] p-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-xs text-white/80">
              I agree to the{" "}
              <a href="#" className="text-amber-300 underline">
                Seller Agreement
              </a>
              ,{" "}
              <a href="#" className="text-amber-300 underline">
                Payout Terms
              </a>
              , and confirm the information above is accurate. I authorize WaxDepot to initiate ACH
              credits to my bank account.
            </span>
          </label>

          <Footer>
            <button onClick={() => setStep("tax")} className={secondary}>
              ← Back
            </button>
            <button
              disabled={!agreed}
              onClick={() => setStep("done")}
              className={primary.replace("bg-emerald-600", "bg-slate-900").replace("hover:bg-emerald-700", "hover:bg-slate-700")}
            >
              Submit for verification
            </button>
          </Footer>
        </Card>
      )}

      {step === "done" && (
        <Card icon={<Check size={20} />} title="You're verified" subtitle="Your payout setup is complete">
          <div className="flex flex-col items-center py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
              <Check className="text-emerald-400" size={28} />
            </div>
            <div className="mt-4 text-lg font-bold text-white">All set, {legalFirst}</div>
            <div className="mt-1 max-w-sm text-sm text-white/60">
              Sales will be paid out via ACH to {bankName} •••{account.slice(-4)} every Friday for
              the prior week&apos;s released sales. Your first payout may take 2-3 business days to
              clear.
            </div>
            <div className="mt-6 flex gap-2">
              <Link href="/sell" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
                List a box
              </Link>
              <Link href="/account/payouts" className="rounded-md border border-white/15 bg-[#101012] px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/[0.02]">
                View payouts
              </Link>
            </div>
          </div>
        </Card>
      )}

      <div className="mt-6 flex items-center gap-2 text-xs text-white/50">
        <CreditCard size={14} />
        <span>Need to update bank info later? Manage it from your <Link href="/account/payouts" className="text-amber-300 hover:underline">Payouts dashboard</Link>.</span>
      </div>
    </div>
  );
}

const input =
  "w-full rounded-md border border-white/15 px-3 py-2.5 text-sm focus:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-400/20";
const primary =
  "rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 inline-flex items-center gap-1.5";
const secondary =
  "rounded-md border border-white/15 bg-[#101012] px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/[0.02]";

function Stepper({ step }: { step: Step }) {
  const steps: Step[] = ["identity", "bank", "tax", "review", "done"];
  const labels = { identity: "Identity", bank: "Bank", tax: "Tax", review: "Review", done: "Done" };
  const idx = steps.indexOf(step);
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

function Card({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#101012] p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300">
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <p className="text-sm text-white/50">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-semibold text-white/80">{label}</span>
        {hint && <span className="text-xs text-white/40">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">{children}</div>;
}

function Footer({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex justify-between">{children}</div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="text-sm text-white/60">{label}</dt>
      <dd className="text-sm font-semibold text-white">{value}</dd>
    </div>
  );
}
