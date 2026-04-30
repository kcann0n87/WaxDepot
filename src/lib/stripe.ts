import "server-only";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  // Don't throw — let server actions fail gracefully when Stripe isn't
  // configured (e.g., local dev without env vars). Each action gates on
  // `stripe` being non-null below.
  console.warn("STRIPE_SECRET_KEY is not set; Stripe-dependent actions will fail.");
}

export const stripe: Stripe | null = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-04-22.dahlia",
      typescript: true,
    })
  : null;

export const STRIPE_CONFIGURED = !!stripe;
