import Link from "next/link";
import { Lightbulb, Package, Mail, User, Clock } from "lucide-react";
import { serviceRoleClient } from "@/lib/supabase/admin";
import { FeedbackRow } from "./feedback-row";

export const dynamic = "force-dynamic";

type FeedbackItem = {
  id: string;
  type: "feature" | "set";
  payload: Record<string, string>;
  status: "pending" | "reviewed" | "accepted" | "declined" | "shipped";
  submitted_by: string | null;
  email: string | null;
  admin_notes: string | null;
  created_at: string;
  submitter: { username: string; display_name: string } | null;
};

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>;
}) {
  const { status, type } = await searchParams;
  const sb = serviceRoleClient();

  let query = sb
    .from("feedback")
    .select(
      "id, type, payload, status, submitted_by, email, admin_notes, created_at, submitter:profiles!feedback_submitted_by_fkey(username, display_name)",
    )
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  if (type) query = query.eq("type", type);

  const { data: rawData } = await query;
  // Supabase returns `submitter` as an array even for 1:1 joins — normalize.
  const feedback: FeedbackItem[] = (rawData ?? []).map((r) => {
    const submitter = Array.isArray(r.submitter) ? r.submitter[0] : r.submitter;
    return {
      ...r,
      submitter: submitter
        ? {
            username: submitter.username as string,
            display_name: submitter.display_name as string,
          }
        : null,
    } as FeedbackItem;
  });

  const counts = {
    pending: feedback.filter((f) => f.status === "pending").length,
    reviewed: feedback.filter((f) => f.status === "reviewed").length,
    accepted: feedback.filter((f) => f.status === "accepted").length,
    feature: feedback.filter((f) => f.type === "feature").length,
    set: feedback.filter((f) => f.type === "set").length,
  };

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-black text-white">Feedback</h1>
          <p className="mt-1 text-xs text-white/60">
            {feedback.length} {feedback.length === 1 ? "submission" : "submissions"} ·{" "}
            <span className="text-amber-300">{counts.pending} pending</span> ·{" "}
            {counts.feature} features · {counts.set} set requests
          </p>
        </div>
      </div>

      {/* Filter chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip label="All" href="/admin/feedback" active={!status && !type} />
        <FilterChip
          label="Pending"
          href="/admin/feedback?status=pending"
          active={status === "pending"}
          accent="amber"
        />
        <FilterChip
          label="Reviewed"
          href="/admin/feedback?status=reviewed"
          active={status === "reviewed"}
        />
        <FilterChip
          label="Accepted"
          href="/admin/feedback?status=accepted"
          active={status === "accepted"}
          accent="emerald"
        />
        <FilterChip
          label="Declined"
          href="/admin/feedback?status=declined"
          active={status === "declined"}
        />
        <FilterChip
          label="Shipped"
          href="/admin/feedback?status=shipped"
          active={status === "shipped"}
          accent="emerald"
        />
        <span className="mx-1 self-center text-white/30">·</span>
        <FilterChip
          label="Features"
          href="/admin/feedback?type=feature"
          active={type === "feature"}
        />
        <FilterChip
          label="Set requests"
          href="/admin/feedback?type=set"
          active={type === "set"}
        />
      </div>

      {feedback.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <Lightbulb size={28} className="mx-auto text-white/30" />
          <p className="mt-3 text-sm text-white/60">
            {status || type ? (
              <>
                No submissions match this filter.{" "}
                <Link href="/admin/feedback" className="font-semibold text-amber-300">
                  Clear filter
                </Link>
              </>
            ) : (
              "No feedback yet. Once buyers and sellers start submitting, this is where you triage."
            )}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {feedback.map((f) => (
            <FeedbackRow key={f.id} item={f} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  label,
  href,
  active,
  accent,
}: {
  label: string;
  href: string;
  active: boolean;
  accent?: "amber" | "emerald";
}) {
  const colors = active
    ? accent === "amber"
      ? "border-amber-400/60 bg-amber-500/15 text-amber-200"
      : accent === "emerald"
        ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200"
        : "border-white/40 bg-white/10 text-white"
    : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20 hover:text-white";
  return (
    <Link
      href={href}
      className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition ${colors}`}
    >
      {label}
    </Link>
  );
}

export { Lightbulb, Package, Mail, User, Clock };
