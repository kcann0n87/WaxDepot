import { Mail } from "lucide-react";
import { serviceRoleClient } from "@/lib/supabase/admin";
import { InviteForm } from "./invite-form";

export const dynamic = "force-dynamic";

export default async function AdminInvitePage() {
  const sb = serviceRoleClient();

  // Recent invites — pulled from admin_actions so the admin can see what
  // they've sent without round-tripping to Supabase Auth dashboard.
  const { data: recent } = await sb
    .from("admin_actions")
    .select("created_at, target_id, details")
    .eq("action", "invite_user")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Mail size={18} className="text-amber-400" />
        <h1 className="font-display text-3xl font-black text-white">Invite a user</h1>
      </div>
      <p className="mb-6 max-w-2xl text-sm text-white/60">
        Sends a magic-link sign-in email. The recipient lands on{" "}
        <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-amber-300">
          /account
        </code>{" "}
        already signed in — no password needed. Public sign-up is currently
        disabled, so this is the only way new users get in.
      </p>

      <div className="rounded-xl border border-white/10 bg-[#101012] p-5">
        <InviteForm />
      </div>

      <h2 className="mt-10 mb-3 text-sm font-bold text-white">Recent invites</h2>
      {!recent || recent.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/50">
          No invites sent yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#101012]">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-[10px] font-semibold tracking-[0.15em] text-white/60 uppercase">
              <tr>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Display name</th>
                <th className="px-4 py-2">Sent</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((row) => {
                const details = (row.details ?? {}) as {
                  email?: string;
                  display_name?: string | null;
                };
                return (
                  <tr key={row.created_at} className="border-t border-white/5">
                    <td className="px-4 py-2 text-white">{details.email ?? "—"}</td>
                    <td className="px-4 py-2 text-white/70">
                      {details.display_name ?? <span className="text-white/40">—</span>}
                    </td>
                    <td className="px-4 py-2 text-xs text-white/50">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
