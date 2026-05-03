"use client";

import { useState, useTransition } from "react";
import {
  adminBanUser,
  adminUnbanUser,
  adminSetSellerTier,
  adminToggleAdmin,
} from "@/app/actions/admin-users";

type Tier = "Starter" | "Pro" | "Elite" | "Apex";

export function UserAdminActions({
  userId,
  username,
  isBanned,
  isAdmin,
  tier,
  isSelf,
}: {
  userId: string;
  username: string;
  isBanned: boolean;
  isAdmin: boolean;
  tier: Tier;
  isSelf: boolean;
}) {
  const [open, setOpen] = useState<"ban" | "tier" | "admin" | null>(null);
  const [reason, setReason] = useState("");
  const [tierVal, setTierVal] = useState<Tier>(tier);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const reset = () => {
    setOpen(null);
    setReason("");
    setErr(null);
  };

  const banOrUnban = () => {
    setErr(null);
    if (!isBanned && !reason.trim()) {
      setErr("Reason required.");
      return;
    }
    start(async () => {
      const res = isBanned ? await adminUnbanUser(userId) : await adminBanUser(userId, reason.trim());
      if (res.error) setErr(res.error);
      else {
        setOk(`✓ ${isBanned ? "unbanned" : "banned"} @${username}`);
        reset();
      }
    });
  };

  const saveTier = () => {
    setErr(null);
    start(async () => {
      const res = await adminSetSellerTier(userId, tierVal);
      if (res.error) setErr(res.error);
      else {
        setOk(`✓ tier set to ${tierVal}`);
        reset();
      }
    });
  };

  const toggleAdmin = () => {
    setErr(null);
    start(async () => {
      const res = await adminToggleAdmin(userId, !isAdmin);
      if (res.error) setErr(res.error);
      else {
        setOk(`✓ ${isAdmin ? "demoted" : "promoted"} @${username}`);
        reset();
      }
    });
  };

  return (
    <div className="rounded-xl border border-rose-700/30 bg-rose-500/[0.04] p-4">
      <div className="mb-3 text-xs font-semibold tracking-[0.15em] text-rose-300 uppercase">
        Admin actions · destructive
      </div>

      {isSelf && (
        <p className="mb-3 rounded-md border border-amber-700/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
          This is you. Ban and self-demote are disabled.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setOpen(open === "ban" ? null : "ban")}
          disabled={pending || (isSelf && !isBanned)}
          className={`rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
            isBanned
              ? "border-emerald-700/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
              : "border-rose-700/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
          }`}
        >
          {isBanned ? "Unban" : "Ban user"}
        </button>
        <button
          onClick={() => setOpen(open === "tier" ? null : "tier")}
          disabled={pending}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50"
        >
          Override tier
        </button>
        <button
          onClick={() => setOpen(open === "admin" ? null : "admin")}
          disabled={pending || (isSelf && isAdmin)}
          className="rounded-md border border-amber-700/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
        >
          {isAdmin ? "Demote admin" : "Promote to admin"}
        </button>
      </div>

      {open === "ban" && !isBanned && (
        <div className="mt-4 space-y-2">
          <label className="block text-[10px] font-semibold tracking-wider text-white/60 uppercase">
            Reason (logged to admin_actions)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50"
            placeholder="e.g. shill bidding, fraud, repeated chargebacks"
          />
          <button
            onClick={banOrUnban}
            disabled={pending}
            className="rounded-md bg-rose-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-400 disabled:opacity-50"
          >
            {pending ? "Working…" : "Confirm ban"}
          </button>
        </div>
      )}

      {open === "ban" && isBanned && (
        <div className="mt-4">
          <button
            onClick={banOrUnban}
            disabled={pending}
            className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-400 disabled:opacity-50"
          >
            {pending ? "Working…" : "Confirm unban"}
          </button>
        </div>
      )}

      {open === "tier" && (
        <div className="mt-4 space-y-2">
          <label className="block text-[10px] font-semibold tracking-wider text-white/60 uppercase">
            Seller tier
          </label>
          <select
            value={tierVal}
            onChange={(e) => setTierVal(e.target.value as Tier)}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            <option value="Starter">Starter (12%)</option>
            <option value="Pro">Pro (10%)</option>
            <option value="Elite">Elite (8%)</option>
            <option value="Apex">Apex (6%)</option>
          </select>
          <button
            onClick={saveTier}
            disabled={pending}
            className="rounded-md bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-amber-300 disabled:opacity-50"
          >
            {pending ? "Working…" : "Save tier"}
          </button>
        </div>
      )}

      {open === "admin" && (
        <div className="mt-4 space-y-2">
          <p className="text-[11px] text-white/70">
            {isAdmin
              ? `Remove admin privileges from @${username}? They lose access to /admin immediately.`
              : `Grant admin privileges to @${username}? They get full access to /admin including refunds and force-release.`}
          </p>
          <button
            onClick={toggleAdmin}
            disabled={pending}
            className="rounded-md bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-amber-300 disabled:opacity-50"
          >
            {pending ? "Working…" : `Confirm ${isAdmin ? "demote" : "promote"}`}
          </button>
        </div>
      )}

      {err && <p className="mt-3 text-xs text-rose-300">{err}</p>}
      {ok && <p className="mt-3 text-xs text-emerald-300">{ok}</p>}
    </div>
  );
}
