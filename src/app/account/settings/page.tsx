import { redirect } from "next/navigation";
import { getProfile, getUser } from "@/lib/supabase/user";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const [user, profile] = await Promise.all([getUser(), getProfile()]);

  // Middleware already redirects unauth users for /account/*, but in case
  // env is missing, fall back to login.
  if (!user) redirect("/login?next=/account/settings");

  // notification_prefs is on profiles too — fetch separately rather than
  // bloating getProfile() which is used in many places that don't need it.
  const supabase = await createClient();
  const { data: prefRow } = await supabase
    .from("profiles")
    .select("notification_prefs")
    .eq("id", user.id)
    .maybeSingle();
  const prefs = (prefRow?.notification_prefs ?? {}) as Record<string, boolean>;

  return (
    <SettingsClient
      initialDisplayName={profile?.display_name ?? user.email?.split("@")[0] ?? ""}
      initialUsername={profile?.username ?? ""}
      email={user.email ?? ""}
      initialPrefs={{
        order_emails: prefs.order_emails !== false,
        bid_emails: prefs.bid_emails !== false,
        message_emails: prefs.message_emails !== false,
        digest_emails: prefs.digest_emails !== false,
        marketing_emails: prefs.marketing_emails === true,
      }}
    />
  );
}
