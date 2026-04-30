"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, Check, Heart, ShieldCheck, Trophy, UserPlus } from "lucide-react";
import { sellers } from "@/lib/sellers";
import { useFollowing } from "@/lib/follow";

const sports = [
  { id: "NBA", label: "Basketball", emoji: "🏀" },
  { id: "MLB", label: "Baseball", emoji: "⚾" },
  { id: "NFL", label: "Football", emoji: "🏈" },
  { id: "NHL", label: "Hockey", emoji: "🏒" },
  { id: "Pokemon", label: "Pokemon", emoji: "🎴" },
];

type Step = "intro" | "sports" | "notifications" | "follow" | "done";

export default function WelcomePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [notifPrefs, setNotifPrefs] = useState({ priceDrops: true, newListings: true, orders: true });
  const { toggle, has } = useFollowing();

  const finish = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("waxdepot:onboarded", "1");
      window.localStorage.setItem("waxdepot:sports", JSON.stringify([...picked]));
    }
    router.push("/");
  };

  const toggleSport = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-180px)] max-w-2xl items-center justify-center px-4 py-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-20%,rgba(212,175,55,0.12),transparent_50%)]" />
      <div className="w-full">
        <Stepper step={step} />

        {step === "intro" && (
          <Card>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-2xl font-black text-slate-900 shadow-lg shadow-amber-500/20">
                W
              </div>
              <div className="mt-6 text-[10px] font-semibold tracking-[0.2em] text-amber-400/80 uppercase">
                Welcome
              </div>
              <h1 className="font-display mt-1 text-4xl font-black tracking-tight text-white">
                Welcome to <span className="italic text-amber-400">WaxDepot</span>
              </h1>
              <p className="mt-3 text-white/60">
                The marketplace for sealed sports cards. Real bid/ask, real escrow, no eBay tax.
              </p>
              <div className="mt-7 grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
                <Highlight icon={<Trophy size={16} />} title="Real prices" body="Bid/ask orderbook with 90-day price history on every product" />
                <Highlight icon={<ShieldCheck size={16} />} title="Buyer protection" body="Payments held in escrow until you confirm the box arrived sealed" />
                <Highlight icon={<Bell size={16} />} title="Stay in the loop" body="Watchlists, price alerts, and notifications for what you care about" />
              </div>
              <button
                onClick={() => setStep("sports")}
                className="mt-8 inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-3 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400"
              >
                Get started <ArrowRight size={14} />
              </button>
              <div className="mt-3 text-xs text-white/40">
                Takes 60 seconds. Or{" "}
                <Link href="/" className="text-amber-300 transition hover:text-amber-200">
                  skip and explore
                </Link>
                .
              </div>
            </div>
          </Card>
        )}

        {step === "sports" && (
          <Card>
            <div className="text-[10px] font-semibold tracking-[0.2em] text-amber-400/80 uppercase">
              Step 1
            </div>
            <h2 className="font-display mt-1 text-2xl font-black tracking-tight text-white">
              What do you collect?
            </h2>
            <p className="mt-1 text-sm text-white/60">
              Pick one or more — we&apos;ll prioritize these in your feed.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {sports.map((s) => {
                const active = picked.has(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleSport(s.id)}
                    className={`relative flex flex-col items-center gap-2 rounded-xl border p-4 transition ${
                      active
                        ? "border-amber-400/50 bg-amber-500/10"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20"
                    }`}
                  >
                    <span className="text-3xl">{s.emoji}</span>
                    <span className="text-sm font-bold text-white">{s.label}</span>
                    <span className="text-[10px] font-semibold tracking-[0.15em] text-white/40 uppercase">
                      {s.id}
                    </span>
                    {active && (
                      <span className="absolute top-2 right-2 rounded-full bg-amber-400 p-0.5 text-slate-900">
                        <Check size={10} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <Footer
              onBack={() => setStep("intro")}
              onNext={() => setStep("notifications")}
              nextDisabled={picked.size === 0}
            />
          </Card>
        )}

        {step === "notifications" && (
          <Card>
            <div className="text-[10px] font-semibold tracking-[0.2em] text-amber-400/80 uppercase">
              Step 2
            </div>
            <h2 className="font-display mt-1 text-2xl font-black tracking-tight text-white">
              Stay in the loop
            </h2>
            <p className="mt-1 text-sm text-white/60">
              Pick what to notify you about. You can change this anytime.
            </p>
            <ul className="mt-6 divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10">
              <NotifRow
                icon={<Heart size={16} className="text-rose-400" />}
                label="Price drops"
                description="When something on your watchlist gets cheaper"
                on={notifPrefs.priceDrops}
                onChange={(v) => setNotifPrefs((p) => ({ ...p, priceDrops: v }))}
              />
              <NotifRow
                icon={<Bell size={16} className="text-amber-400" />}
                label="New listings"
                description="When a seller lists a product matching a saved search"
                on={notifPrefs.newListings}
                onChange={(v) => setNotifPrefs((p) => ({ ...p, newListings: v }))}
              />
              <NotifRow
                icon={<ShieldCheck size={16} className="text-emerald-400" />}
                label="Order updates"
                description="Shipped, delivered, refunded — required for transactions"
                on={notifPrefs.orders}
                onChange={(v) => setNotifPrefs((p) => ({ ...p, orders: v }))}
              />
            </ul>
            <Footer onBack={() => setStep("sports")} onNext={() => setStep("follow")} />
          </Card>
        )}

        {step === "follow" && (
          <Card>
            <div className="text-[10px] font-semibold tracking-[0.2em] text-amber-400/80 uppercase">
              Step 3
            </div>
            <h2 className="font-display mt-1 text-2xl font-black tracking-tight text-white">
              Follow some sellers
            </h2>
            <p className="mt-1 text-sm text-white/60">
              These are high-rated sellers. You can follow more later.
            </p>
            <ul className="mt-6 space-y-2">
              {sellers.slice(0, 5).map((s) => (
                <li
                  key={s.username}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3"
                >
                  <Avatar name={s.displayName} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white">{s.displayName}</div>
                    <div className="text-xs text-white/50">
                      {s.location} · {s.rating}% positive · {s.totalSales.toLocaleString()} sales
                    </div>
                  </div>
                  <button
                    onClick={() => toggle(s.username)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                      has(s.username)
                        ? "border-emerald-700/40 bg-emerald-500/15 text-emerald-300"
                        : "border-white/15 bg-white/5 text-white/80 hover:border-amber-400/40 hover:bg-amber-500/10 hover:text-amber-300"
                    }`}
                  >
                    {has(s.username) ? (
                      <span className="inline-flex items-center gap-1">
                        <Check size={11} /> Following
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <UserPlus size={11} /> Follow
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <Footer onBack={() => setStep("notifications")} onNext={() => setStep("done")} />
          </Card>
        )}

        {step === "done" && (
          <Card>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-700/40 bg-emerald-500/15">
                <Check className="text-emerald-400" size={32} />
              </div>
              <h2 className="font-display mt-5 text-3xl font-black tracking-tight text-white">
                You&apos;re set
              </h2>
              <p className="mt-2 text-sm text-white/60">Welcome aboard. Here&apos;s what to do next:</p>
              <div className="mx-auto mt-6 max-w-sm space-y-2 text-left">
                <NextStep label="Browse the catalog" href="/" />
                <NextStep label="Check the release calendar" href="/releases" />
                <NextStep label="Set up payouts (if you plan to sell)" href="/sell/payouts" />
              </div>
              <button
                onClick={finish}
                className="mt-7 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-3 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400"
              >
                Take me to the marketplace
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-[#101012] p-8 shadow-2xl shadow-black/40">
      {children}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: Step[] = ["intro", "sports", "notifications", "follow", "done"];
  const idx = steps.indexOf(step);
  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      {steps.map((s, i) => (
        <div
          key={s}
          className={`h-1.5 rounded-full transition-all ${
            i < idx ? "w-6 bg-amber-400" : i === idx ? "w-8 bg-white" : "w-6 bg-white/10"
          }`}
        />
      ))}
    </div>
  );
}

function Highlight({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
        <span className="text-amber-400">{icon}</span>
        {title}
      </div>
      <div className="mt-1 text-xs text-white/60">{body}</div>
    </div>
  );
}

function Footer({
  onBack,
  onNext,
  nextDisabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-7 flex justify-between">
      <button
        onClick={onBack}
        className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:text-white"
      >
        ← Back
      </button>
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-sm font-bold text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Continue <ArrowRight size={14} />
      </button>
    </div>
  );
}

function NotifRow({
  icon,
  label,
  description,
  on,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-white">{label}</div>
        <div className="text-xs text-white/50">{description}</div>
      </div>
      <button
        onClick={() => onChange(!on)}
        className={`relative h-6 w-10 shrink-0 rounded-full transition ${on ? "bg-amber-500" : "bg-white/10"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            on ? "left-[19px]" : "left-0.5"
          }`}
        />
      </button>
    </li>
  );
}

function NextStep({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-semibold text-white transition hover:border-amber-400/40 hover:bg-amber-500/5 hover:text-amber-300"
    >
      {label}
      <ArrowRight size={14} className="text-white/40" />
    </Link>
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
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-md ${color}`}
    >
      {initial}
    </div>
  );
}
