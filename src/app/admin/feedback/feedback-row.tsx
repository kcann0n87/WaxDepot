"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Clock,
  Lightbulb,
  Loader2,
  Mail,
  Package,
  User,
  X,
} from "lucide-react";
import { adminUpdateFeedbackStatus } from "@/app/actions/feedback";

type Status = "pending" | "reviewed" | "accepted" | "declined" | "shipped";

const STATUS_LABEL: Record<Status, string> = {
  pending: "Pending",
  reviewed: "Reviewed",
  accepted: "Accepted",
  declined: "Declined",
  shipped: "Shipped",
};

const STATUS_COLOR: Record<Status, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  reviewed: "bg-white/10 text-white/80",
  accepted: "bg-sky-500/15 text-sky-300",
  declined: "bg-rose-500/15 text-rose-300",
  shipped: "bg-emerald-500/15 text-emerald-300",
};

/**
 * One row in the admin feedback queue. Expanded inline so triage can
 * happen in-place without a route change. Status buttons fire a server
 * action and revalidate /admin/feedback.
 *
 * For "set" requests, surfaces a "Add to catalog →" deep-link with the
 * payload pre-encoded into /admin/catalog/new query params so the admin
 * doesn't have to re-type the brand/set/year/sport/product.
 */
export function FeedbackRow({
  item,
}: {
  item: {
    id: string;
    type: "feature" | "set";
    payload: Record<string, string>;
    status: Status;
    submitted_by: string | null;
    email: string | null;
    admin_notes: string | null;
    created_at: string;
    submitter: { username: string; display_name: string } | null;
  };
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(item.status === "pending");
  const [adminNotes, setAdminNotes] = useState(item.admin_notes ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = (status: Status) => {
    setError(null);
    startTransition(async () => {
      const res = await adminUpdateFeedbackStatus(
        item.id,
        status,
        adminNotes.trim() || undefined,
      );
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  };

  // Build the /admin/catalog/new deep-link for set requests.
  const newSkuHref = (() => {
    if (item.type !== "set") return null;
    const p = item.payload;
    const year = parseInt(p.year || "", 10);
    if (!year || !p.brand || !p.set_name || !p.sport) return null;
    const slug = [
      year,
      p.brand,
      p.set_name,
      p.sport === "NBA" ? "basketball" : p.sport === "NFL" ? "football" : p.sport === "NHL" ? "hockey" : "baseball",
      "hobby-box",
    ]
      .join("-")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-");
    const params = new URLSearchParams({
      slug,
      year: String(year),
      brand: p.brand,
      set_name: p.set_name,
      product: p.product || "Hobby Box",
      sport: p.sport,
    });
    return `/admin/catalog/new?${params.toString()}`;
  })();

  return (
    <li className="overflow-hidden rounded-xl border border-white/10 bg-[#101012]">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.02]"
      >
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            item.type === "feature"
              ? "bg-amber-500/15 text-amber-300"
              : "bg-sky-500/15 text-sky-300"
          }`}
        >
          {item.type === "feature" ? (
            <Lightbulb size={14} />
          ) : (
            <Package size={14} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-bold text-white">
              {item.type === "feature"
                ? item.payload.title
                : `${item.payload.year} ${item.payload.brand} ${item.payload.set_name} ${item.payload.sport}`}
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${STATUS_COLOR[item.status]}`}
            >
              {STATUS_LABEL[item.status]}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/50">
            {item.submitter ? (
              <span className="inline-flex items-center gap-1">
                <User size={10} />@{item.submitter.username}
              </span>
            ) : item.email ? (
              <span className="inline-flex items-center gap-1">
                <Mail size={10} />
                {item.email}
              </span>
            ) : (
              <span className="text-white/30">anonymous</span>
            )}
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock size={10} />
              {ago(item.created_at)}
            </span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/5 p-4">
          {/* Payload detail */}
          <div className="mb-4 rounded-md border border-white/5 bg-white/[0.02] p-3">
            {item.type === "feature" ? (
              <p className="text-sm whitespace-pre-line text-white/90">
                {item.payload.description}
              </p>
            ) : (
              <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                <Field k="Year" v={item.payload.year} />
                <Field k="Sport" v={item.payload.sport} />
                <Field k="Brand" v={item.payload.brand} />
                <Field k="Set" v={item.payload.set_name} />
                <Field k="Product" v={item.payload.product || "Hobby Box"} />
                {item.payload.notes && (
                  <div className="col-span-full mt-2 border-t border-white/5 pt-2">
                    <dt className="text-[10px] font-semibold tracking-wider text-white/50 uppercase">
                      Notes
                    </dt>
                    <dd className="mt-0.5 text-sm whitespace-pre-line text-white/80">
                      {item.payload.notes}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>

          {/* Admin notes textarea */}
          <label className="mb-3 block">
            <span className="mb-1 block text-[10px] font-semibold tracking-wider text-white/60 uppercase">
              Admin notes (optional)
            </span>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={2}
              placeholder='e.g. "duplicate of #12" or "shipped in v1.4"'
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-amber-400/50 focus:outline-none"
            />
          </label>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {item.status === "pending" && (
              <button
                onClick={() => submit("reviewed")}
                disabled={pending}
                className="rounded-md border border-white/15 bg-[#101012] px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/[0.05] disabled:opacity-50"
              >
                Mark reviewed
              </button>
            )}
            <button
              onClick={() => submit("accepted")}
              disabled={pending || item.status === "accepted"}
              className="rounded-md border border-sky-700/40 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-200 transition hover:bg-sky-500/20 disabled:opacity-50"
            >
              <Check size={11} className="mr-1 inline" />
              Accept
            </button>
            {item.type === "set" && newSkuHref && (
              <Link
                href={newSkuHref}
                className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/20"
              >
                Add to catalog →
              </Link>
            )}
            <button
              onClick={() => submit("shipped")}
              disabled={pending || item.status === "shipped"}
              className="rounded-md border border-emerald-700/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/20 disabled:opacity-50"
            >
              Mark shipped
            </button>
            <button
              onClick={() => submit("declined")}
              disabled={pending || item.status === "declined"}
              className="rounded-md border border-rose-700/40 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50"
            >
              <X size={11} className="mr-1 inline" />
              Decline
            </button>
            {pending && (
              <Loader2 size={14} className="animate-spin text-white/60" />
            )}
          </div>

          {error && (
            <p className="mt-2 text-xs text-rose-300">{error}</p>
          )}
        </div>
      )}
    </li>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold tracking-wider text-white/50 uppercase">
        {k}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-white">{v}</dd>
    </div>
  );
}

function ago(iso: string) {
  const min = Math.max(
    Math.floor((Date.now() - new Date(iso).getTime()) / 60000),
    0,
  );
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
