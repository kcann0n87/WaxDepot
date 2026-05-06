import "server-only";

/**
 * The public origin for outbound links — emails, magic links, OG tags, etc.
 * Reads NEXT_PUBLIC_SITE_URL when set (configured in Vercel for prod and
 * staging), falls back to the prod domain. Trailing slashes stripped.
 *
 * For request-scoped helpers that can read incoming headers (Stripe Connect
 * onboarding URLs, checkout return URLs), prefer the local getOrigin helpers
 * in those files — they correctly handle preview deploys.
 */
export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://waxdepot.io"
  );
}
