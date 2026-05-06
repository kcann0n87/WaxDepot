import "server-only";
import { serviceRoleClient } from "@/lib/supabase/admin";

/**
 * Email preference categories. Map every transactional + cron-driven
 * email send to one of these so users can opt out per category at
 * /account/settings without losing all marketplace communication.
 *
 * `order_emails` covers payment / shipped / delivered / released /
 * canceled / dispute — lifecycle-critical. The settings UI warns
 * users that opting out can mean missing the 2-day auto-release
 * window or a delivery confirmation, but we honor the choice.
 */
export type EmailCategory =
  | "order_emails"
  | "bid_emails"
  | "message_emails"
  | "digest_emails"
  | "marketing_emails";

/**
 * Checks if a user has opted in to receive a given email category.
 *
 * Default is OPT-IN (returns true) — a user without a matching key in
 * profiles.notification_prefs receives the email. They have to explicitly
 * flip a toggle to false to suppress.
 *
 * Best-effort: if the lookup fails (db down, user not found, malformed
 * prefs), we default to sending the email rather than risk the user
 * missing a payment notification.
 */
export async function shouldSendEmail(
  userId: string,
  category: EmailCategory,
): Promise<boolean> {
  try {
    const sb = serviceRoleClient();
    const { data } = await sb
      .from("profiles")
      .select("notification_prefs")
      .eq("id", userId)
      .maybeSingle();
    const prefs = (data?.notification_prefs ?? {}) as Record<string, unknown>;
    const value = prefs[category];
    // Explicit false → opted out. Anything else (missing, true, garbage) → opt in.
    return value !== false;
  } catch (e) {
    console.error("shouldSendEmail lookup failed:", e);
    return true;
  }
}
