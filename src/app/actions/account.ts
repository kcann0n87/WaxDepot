"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { serviceRoleClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import type { EmailCategory } from "@/lib/email-prefs";

const VALID_PREF_KEYS: readonly EmailCategory[] = [
  "order_emails",
  "bid_emails",
  "message_emails",
  "digest_emails",
  "marketing_emails",
];

export type DeleteAccountResult = { ok?: boolean; error?: string };

/**
 * Permanently deletes the current user's account.
 *
 * Hard refuses if there's anything in flight that would orphan a counterparty:
 *   - open orders (Charged / InEscrow / Shipped / Delivered) on either side
 *   - any active listings (seller must delist first to avoid mid-trade exits)
 *   - any active bids (buyer must cancel first)
 *
 * What it does on success:
 *   1. Tries to delete the seller's Stripe Connect account if one exists. If
 *      the Stripe call fails (because the account has volume etc), we log
 *      and continue — the user can pursue Stripe-side cleanup separately.
 *   2. Calls supabase.auth.admin.deleteUser, which cascades to:
 *        profiles → reviews / disputes / messages / watchlist / follows /
 *        recently_viewed / saved_searches / notifications / user_addresses /
 *        user_cards (per the FKs in the schema migrations)
 *   3. Released / Completed / Canceled orders and historical sales are
 *      preserved (those are financial records we keep for 7 years per the
 *      privacy policy). They keep referencing the now-deleted profile id;
 *      our /seller/[username] page already handles missing-profile cases
 *      gracefully, and /admin shows the raw id when the profile is gone.
 */
export async function deleteAccount(
  confirmation: string,
): Promise<DeleteAccountResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "You must be signed in." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, stripe_account_id, is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile) return { error: "Profile not found." };

    if (profile.is_admin) {
      return {
        error:
          "Admin accounts can't be self-deleted. Promote another admin or remove your admin flag first.",
      };
    }

    // Confirmation check — UI asks user to type their username.
    if (confirmation.trim().toLowerCase() !== profile.username.toLowerCase()) {
      return { error: "Confirmation didn't match your username." };
    }

    const admin = serviceRoleClient();

    // Refuse if there are in-flight orders on either side.
    const IN_FLIGHT = ["Charged", "InEscrow", "Shipped", "Delivered"];
    const { count: buyerOrders } = await admin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("buyer_id", user.id)
      .in("status", IN_FLIGHT);
    if ((buyerOrders ?? 0) > 0) {
      return {
        error:
          "You have orders in flight as a buyer. Wait for them to release or open a dispute first.",
      };
    }
    const { count: sellerOrders } = await admin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("seller_id", user.id)
      .in("status", IN_FLIGHT);
    if ((sellerOrders ?? 0) > 0) {
      return {
        error:
          "You have orders in flight as a seller. Ship + deliver them, then come back.",
      };
    }

    // Refuse if there are active listings.
    const { count: activeListings } = await admin
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("seller_id", user.id)
      .eq("status", "Active");
    if ((activeListings ?? 0) > 0) {
      return {
        error: "Delist your active listings first.",
      };
    }

    // Refuse if there are active bids.
    const { count: activeBids } = await admin
      .from("bids")
      .select("*", { count: "exact", head: true })
      .eq("buyer_id", user.id)
      .eq("status", "Active");
    if ((activeBids ?? 0) > 0) {
      return {
        error: "Cancel your active bids first.",
      };
    }

    // Best-effort Stripe Connect cleanup — fire-and-forget. If it fails
    // (account has volume, or already deleted) we just log it; the user
    // can hit Stripe support separately. Account deletion proceeds.
    if (profile.stripe_account_id && stripe) {
      try {
        await stripe.accounts.del(profile.stripe_account_id);
      } catch (e) {
        console.warn("deleteAccount: Stripe account cleanup failed", e);
      }
    }

    // Auth user deletion → cascades to profile + everything FK-referencing it.
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) {
      console.error("deleteAccount: auth deleteUser failed", delErr);
      return { error: "Could not delete account. Please contact support." };
    }
  } catch (e) {
    console.error("deleteAccount failed:", e);
    return { error: "Something went wrong. Please contact support." };
  }

  // Outside the try/catch — Next's redirect throws an internal error that
  // we don't want to swallow.
  redirect("/?account=deleted");
}

/**
 * Persist the current user's email-category opt-outs. The shape mirrors
 * what shouldSendEmail() reads from profiles.notification_prefs.
 *
 * Anything not in VALID_PREF_KEYS is dropped silently to avoid stuffing
 * the JSONB with junk if the client passes through stale schema.
 */
export async function updateNotificationPrefs(
  partial: Partial<Record<EmailCategory, boolean>>,
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const sanitized: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(partial)) {
    if ((VALID_PREF_KEYS as readonly string[]).includes(k) && typeof v === "boolean") {
      sanitized[k] = v;
    }
  }

  // Read-modify-write so toggling one key doesn't blow away the rest.
  // Service role because the JSONB merge is easier without RLS row-rules
  // tripping the upsert; ownership is already validated above.
  const admin = serviceRoleClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("notification_prefs")
    .eq("id", user.id)
    .maybeSingle();
  const current = (existing?.notification_prefs ?? {}) as Record<string, unknown>;
  const merged = { ...current, ...sanitized };

  const { error } = await admin
    .from("profiles")
    .update({ notification_prefs: merged })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/account/settings");
  return { ok: true };
}
