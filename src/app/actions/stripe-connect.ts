"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

async function getOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : "https://waxdepot.io";
}

export type ConnectResult = { ok?: boolean; error?: string; onboardingUrl?: string };

/**
 * Starts (or resumes) the Stripe Express onboarding flow for the current user.
 * - If they don't have a stripe_account_id yet, creates an Express account.
 * - Generates a one-time Account Link for the hosted onboarding page.
 * - Returns the URL; client redirects the user to it.
 */
export async function startSellerOnboarding(): Promise<ConnectResult> {
  if (!stripe) return { error: "Payments are still being set up. Try again in a few minutes." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "You must be signed in." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id, display_name, username")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile) return { error: "Profile not found. Try signing out and back in." };

    let accountId = profile.stripe_account_id;

    // Create the Express account on first run.
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: user.email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: {
          waxdepot_user_id: user.id,
          waxdepot_username: profile.username,
        },
      });
      accountId = account.id;
      const { error } = await supabase
        .from("profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", user.id);
      if (error) {
        console.error("startSellerOnboarding: failed to save account id", error);
        return { error: "Could not save your Stripe account. Please try again." };
      }
    }

    const origin = await getOrigin();
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/sell/payouts?stripe=refresh`,
      return_url: `${origin}/sell/payouts?stripe=return`,
      type: "account_onboarding",
    });

    return { ok: true, onboardingUrl: accountLink.url };
  } catch (e) {
    console.error("startSellerOnboarding failed:", e);
    return { error: "Could not start Stripe onboarding. Please try again." };
  }
}

/**
 * After a seller returns from Stripe's onboarding (return_url), we fetch the
 * latest account state and persist `charges_enabled` / `payouts_enabled` /
 * `details_submitted` on their profile so we know what they're capable of.
 *
 * Webhooks (account.updated) will keep this in sync going forward, but this
 * gives us an immediate refresh on the success redirect.
 */
export async function refreshSellerStripeStatus(): Promise<ConnectResult> {
  if (!stripe) return { error: "Stripe not configured." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "You must be signed in." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.stripe_account_id) return { error: "No Stripe account on file." };

    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    await supabase
      .from("profiles")
      .update({
        stripe_charges_enabled: !!account.charges_enabled,
        stripe_payouts_enabled: !!account.payouts_enabled,
        stripe_details_submitted: !!account.details_submitted,
      })
      .eq("id", user.id);

    revalidatePath("/sell/payouts");
    revalidatePath("/account");
    return { ok: true };
  } catch (e) {
    console.error("refreshSellerStripeStatus failed:", e);
    return { error: "Could not check Stripe status." };
  }
}

/**
 * Creates a Stripe Express dashboard login link so a connected seller can
 * view their payouts, balance, payouts schedule, and tax forms inside
 * Stripe's hosted dashboard.
 */
export async function getSellerDashboardUrl(): Promise<ConnectResult> {
  if (!stripe) return { error: "Stripe not configured." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "You must be signed in." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.stripe_account_id) return { error: "Connect Stripe first." };

    const link = await stripe.accounts.createLoginLink(profile.stripe_account_id);
    return { ok: true, onboardingUrl: link.url };
  } catch (e) {
    console.error("getSellerDashboardUrl failed:", e);
    return { error: "Could not open Stripe dashboard." };
  }
}

/**
 * Server-action wrapper that starts onboarding and redirects the browser
 * to Stripe's hosted page. Used directly as form action on a button.
 */
export async function startOnboardingAndRedirect() {
  const result = await startSellerOnboarding();
  if (result.onboardingUrl) {
    redirect(result.onboardingUrl);
  }
  // If we got here without a URL, the page will show an error from the
  // re-fetched server state.
}

/**
 * Server-action wrapper that opens Stripe Express dashboard.
 */
export async function openStripeDashboardAndRedirect() {
  const result = await getSellerDashboardUrl();
  if (result.onboardingUrl) {
    redirect(result.onboardingUrl);
  }
}
