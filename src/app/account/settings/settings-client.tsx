"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  Building2,
  Check,
  CreditCard,
  Loader2,
  Lock,
  MapPin,
  Plus,
  Star,
  Trash2,
  User,
} from "lucide-react";
import { updateProfile } from "../../auth/actions";
import { deleteAccount } from "../../actions/account";

type CardOnFile = { id: string; brand: string; last4: string; exp: string; isDefault: boolean };
type Address = {
  id: string;
  name: string;
  addr1: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
};

const initialCards: CardOnFile[] = [
  { id: "c1", brand: "Visa", last4: "4242", exp: "08/27", isDefault: true },
  { id: "c2", brand: "Mastercard", last4: "5454", exp: "02/26", isDefault: false },
];

const initialAddresses: Address[] = [
  { id: "a1", name: "Home", addr1: "123 Main St", city: "Austin", state: "TX", zip: "78701", isDefault: true },
];

export function SettingsClient({
  initialDisplayName,
  initialUsername,
  email,
}: {
  initialDisplayName: string;
  initialUsername: string;
  email: string;
}) {
  const [cards, setCards] = useState<CardOnFile[]>(initialCards);
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [emailMarketing, setEmailMarketing] = useState(false);
  const [emailOrders, setEmailOrders] = useState(true);
  const [emailMessages, setEmailMessages] = useState(true);
  const [pushAll, setPushAll] = useState(true);

  const [profileMsg, setProfileMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  // Delete-account flow state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [deletePending, startDelete] = useTransition();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
        <Link href="/account" className="inline-flex items-center gap-1 hover:text-white">
          <ArrowLeft size={14} /> Account
        </Link>
        <span>/</span>
        <span className="text-white">Settings</span>
      </div>
      <h1 className="font-display text-2xl font-black tracking-tight text-white">Settings</h1>

      <Section icon={<User size={16} />} title="Profile" subtitle="Your basic info">
        <form
          action={(formData) => {
            setProfileMsg(null);
            startTransition(async () => {
              const result = await updateProfile(formData);
              if (result?.error) setProfileMsg({ kind: "err", text: result.error });
              else if (result?.ok) setProfileMsg({ kind: "ok", text: "Saved." });
            });
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Display name">
              <input
                name="displayName"
                defaultValue={initialDisplayName}
                required
                className={input}
              />
            </Field>
            <Field label="Username">
              <input
                name="username"
                defaultValue={initialUsername}
                required
                pattern="^[a-z0-9_]{3,32}$"
                title="3-32 chars, lowercase letters, numbers, underscore"
                className={input}
              />
            </Field>
          </div>
          <Field label="Email">
            <input
              defaultValue={email}
              disabled
              className={`${input} cursor-not-allowed opacity-60`}
              type="email"
            />
            <p className="mt-1 text-[11px] text-white/60">
              To change your email, contact support.
            </p>
          </Field>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-sm font-bold text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? <Loader2 size={14} className="animate-spin" /> : null}
              Save profile
            </button>
            {profileMsg && (
              <span
                className={`text-xs font-semibold ${
                  profileMsg.kind === "ok" ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {profileMsg.text}
              </span>
            )}
          </div>
        </form>
      </Section>

      <Section icon={<MapPin size={16} />} title="Addresses" subtitle="Where you ship to">
        <ul className="divide-y divide-white/5 rounded-lg border border-white/10">
          {addresses.map((a) => (
            <li key={a.id} className="flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  {a.name}
                  {a.isDefault && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      DEFAULT
                    </span>
                  )}
                </div>
                <div className="text-xs text-white/50">
                  {a.addr1}, {a.city}, {a.state} {a.zip}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!a.isDefault && (
                  <button
                    onClick={() =>
                      setAddresses((arr) => arr.map((x) => ({ ...x, isDefault: x.id === a.id })))
                    }
                    className="rounded-md px-2 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/10"
                  >
                    Set default
                  </button>
                )}
                <button
                  onClick={() => setAddresses((arr) => arr.filter((x) => x.id !== a.id))}
                  className="rounded-md p-1.5 text-white/60 hover:bg-rose-500/10 hover:text-rose-400"
                  aria-label="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
        <button className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-dashed border-white/15 px-3 py-2 text-sm font-semibold text-white/80 hover:border-white/30 hover:bg-white/[0.02]">
          <Plus size={14} />
          Add address
        </button>
      </Section>

      <Section
        icon={<CreditCard size={16} />}
        title="Payment methods"
        subtitle="Cards on file"
        right={<Lock size={11} className="text-white/60" />}
      >
        <ul className="divide-y divide-white/5 rounded-lg border border-white/10">
          {cards.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded bg-slate-900 text-[10px] font-bold text-white">
                {c.brand.slice(0, 4).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  {c.brand} •••{c.last4}
                  {c.isDefault && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      DEFAULT
                    </span>
                  )}
                </div>
                <div className="text-xs text-white/50">Expires {c.exp}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!c.isDefault && (
                  <button
                    onClick={() => setCards((arr) => arr.map((x) => ({ ...x, isDefault: x.id === c.id })))}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/10"
                  >
                    Set default
                  </button>
                )}
                <button
                  onClick={() => setCards((arr) => arr.filter((x) => x.id !== c.id))}
                  className="rounded-md p-1.5 text-white/60 hover:bg-rose-500/10 hover:text-rose-400"
                  aria-label="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
        <button className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-dashed border-white/15 px-3 py-2 text-sm font-semibold text-white/80 hover:border-white/30 hover:bg-white/[0.02]">
          <Plus size={14} />
          Add card
        </button>
      </Section>

      <Section icon={<Bell size={16} />} title="Notifications" subtitle="When and how we reach out">
        <ul className="divide-y divide-white/5 rounded-lg border border-white/10">
          <NotifRow label="Order updates" description="Shipped, delivered, refunded" on={emailOrders} onChange={setEmailOrders} />
          <NotifRow label="Messages" description="New messages from sellers and support" on={emailMessages} onChange={setEmailMessages} />
          <NotifRow label="Push notifications" description="Real-time alerts via the app" on={pushAll} onChange={setPushAll} />
          <NotifRow label="Marketing emails" description="Newsletters, drops, promotions" on={emailMarketing} onChange={setEmailMarketing} />
        </ul>
      </Section>

      <Section icon={<Star size={16} />} title="Linked accounts" subtitle="Optional integrations">
        <div className="rounded-lg border border-white/10 bg-[#101012] p-4">
          <div className="text-sm font-bold text-white">Apple Pay</div>
          <div className="text-xs text-white/50">For one-tap checkout</div>
          <button className="mt-2 rounded-md border border-white/15 bg-[#101012] px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/[0.02]">
            Connect
          </button>
        </div>
      </Section>

      <Section icon={<Building2 size={16} />} title="Danger zone" subtitle="Irreversible actions">
        <div className="rounded-lg border border-rose-700/40 bg-rose-500/10 p-4">
          <div className="text-sm font-bold text-white">Delete account</div>
          <div className="text-xs text-white/60">
            Permanently removes your profile and personal data. Active orders,
            listings, and bids must be settled first. Financial records (released
            sales, payouts) are retained for 7 years per the{" "}
            <Link href="/privacy" className="text-amber-300 hover:underline">
              Privacy Policy
            </Link>
            .
          </div>

          {!deleteOpen && (
            <button
              type="button"
              onClick={() => {
                setDeleteOpen(true);
                setDeleteErr(null);
              }}
              className="mt-2 rounded-md border border-rose-700/50 bg-[#101012] px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10"
            >
              Delete account…
            </button>
          )}

          {deleteOpen && (
            <div className="mt-4 space-y-3 rounded-md border border-rose-700/40 bg-[#101012] p-4">
              <p className="text-xs text-white/80">
                Type your username{" "}
                <code className="rounded bg-rose-500/15 px-1 py-0.5 font-mono text-rose-200">
                  {initialUsername}
                </code>{" "}
                to confirm. This cannot be undone.
              </p>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="username"
                autoComplete="off"
                className="w-full rounded-md border border-rose-700/40 bg-rose-500/5 px-3 py-2 text-sm font-mono text-rose-100 placeholder:text-white/30 focus:border-rose-500 focus:outline-none"
              />
              {deleteErr && (
                <div className="rounded-md border border-rose-700/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {deleteErr}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={deletePending || deleteConfirm.trim() === ""}
                  onClick={() => {
                    setDeleteErr(null);
                    startDelete(async () => {
                      const res = await deleteAccount(deleteConfirm);
                      if (res?.error) setDeleteErr(res.error);
                      // success path: server action redirected; no-op here
                    });
                  }}
                  className="rounded-md bg-rose-500 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-rose-500/20 transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletePending ? "Deleting…" : "Permanently delete my account"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteOpen(false);
                    setDeleteConfirm("");
                    setDeleteErr(null);
                  }}
                  disabled={deletePending}
                  className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

const input =
  "w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-amber-400/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400/20";

function Section({
  icon,
  title,
  subtitle,
  right,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-xl border border-white/10 bg-[#101012] p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300">
            {icon}
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{title}</h2>
            <p className="text-xs text-white/50">{subtitle}</p>
          </div>
        </div>
        {right && <div className="text-xs text-white/60">{right}</div>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-white/80">{label}</span>
      {children}
    </label>
  );
}

function NotifRow({
  label,
  description,
  on,
  onChange,
}: {
  label: string;
  description: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="text-xs text-white/50">{description}</div>
      </div>
      <button
        onClick={() => onChange(!on)}
        className={`relative h-6 w-10 shrink-0 rounded-full transition ${on ? "bg-amber-500" : "bg-white/10"}`}
        aria-label={on ? "Turn off" : "Turn on"}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            on ? "left-[19px]" : "left-0.5"
          }`}
        >
          {on && <Check size={11} className="absolute top-1.5 left-1.5 text-amber-500" />}
        </span>
      </button>
    </li>
  );
}
