import { NextResponse } from "next/server";
import { createClient as createSbAdmin } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { shouldSendEmail } from "@/lib/email-prefs";
import { siteUrl } from "@/lib/site-url";

/**
 * Daily cron: walk every saved_search and surface new SKUs / new listings
 * that match the user's criteria. Inserts an in-app notification for each
 * match; if alert_email is enabled on the search, also sends a digest
 * email via Resend.
 *
 * Match criteria from the saved_search row:
 *   - sport (optional)
 *   - brand (optional, case-insensitive contains)
 *   - query (optional, matches against sku title)
 *   - price_max_cents (optional, only listings ≤ this)
 *
 * "New" = SKU's release_date OR listing's created_at within the last
 * 24 hours. Cron runs daily so this gives a one-pass digest.
 *
 * Auth: Bearer ${CRON_SECRET} like the other crons.
 */
export const dynamic = "force-dynamic";

const LOOKBACK_HOURS = 24;
const MS_PER_HOUR = 3600 * 1000;

type SavedSearch = {
  id: string;
  user_id: string;
  query: string | null;
  sport: string | null;
  brand: string | null;
  price_max_cents: number | null;
  alert_new_listing: boolean;
  alert_price_drop: boolean;
  alert_email: boolean;
};

type ListingMatch = {
  id: string;
  price_cents: number;
  sku: { slug: string; year: number; brand: string; set_name: string; product: string; sport: string };
};

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const sb = createSbAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const since = new Date(Date.now() - LOOKBACK_HOURS * MS_PER_HOUR).toISOString();

  const { data: searches, error: searchesErr } = await sb
    .from("saved_searches")
    .select(
      "id, user_id, query, sport, brand, price_max_cents, alert_new_listing, alert_price_drop, alert_email",
    );
  if (searchesErr) {
    return NextResponse.json({ error: searchesErr.message }, { status: 500 });
  }

  const summary = {
    searches: searches?.length ?? 0,
    notificationsCreated: 0,
    emailsSent: 0,
    errors: [] as string[],
  };

  for (const s of (searches ?? []) as SavedSearch[]) {
    try {
      // Build the listings query with the user's filters. We look at any
      // Active listing whose owning SKU matches; created in the last 24h
      // OR whose SKU released in the last 24h. (Listing-side scope is the
      // safer one for "new for me" since pre-existing SKUs can get fresh
      // listings every day.)
      let q = sb
        .from("listings")
        .select(
          "id, price_cents, created_at, sku:skus!listings_sku_id_fkey(slug, year, brand, set_name, product, sport)",
        )
        .eq("status", "Active")
        .gte("created_at", since)
        .limit(20);
      if (s.price_max_cents) q = q.lte("price_cents", s.price_max_cents);

      const { data: listings, error: listErr } = await q;
      if (listErr) {
        summary.errors.push(`search ${s.id}: ${listErr.message}`);
        continue;
      }

      // Filter the joined SKU shape in code — Supabase doesn't let us
      // filter on relationship fields directly with `in`/`ilike` chained
      // through .select.
      const matches = ((listings ?? []) as unknown as (ListingMatch & { created_at: string })[])
        .filter((row) => row.sku) // skip detached
        .filter((row) => {
          const sku = row.sku;
          if (s.sport && sku.sport !== s.sport) return false;
          if (s.brand && !sku.brand.toLowerCase().includes(s.brand.toLowerCase())) return false;
          if (s.query) {
            const haystack = `${sku.year} ${sku.brand} ${sku.set_name} ${sku.product}`.toLowerCase();
            if (!haystack.includes(s.query.toLowerCase())) return false;
          }
          return true;
        });

      if (matches.length === 0) continue;
      if (!s.alert_new_listing) continue;

      // Pull the user's email if email-alert is on (need it for Resend).
      let userEmail: string | null = null;
      if (s.alert_email) {
        const { data: authUser } = await sb.auth.admin.getUserById(s.user_id);
        userEmail = authUser?.user?.email ?? null;
      }

      // Insert a single rolled-up notification per saved search per day,
      // linking to /search with the saved query so the user lands on the
      // matching results.
      const top = matches.slice(0, 3);
      const titleSamples = top
        .map((m) => `${m.sku.year} ${m.sku.brand} ${m.sku.set_name}`)
        .join(", ");
      const more = matches.length > 3 ? ` and ${matches.length - 3} more` : "";
      const searchHref = `/search?${[
        s.query ? `q=${encodeURIComponent(s.query)}` : null,
        s.sport ? `sport=${s.sport}` : null,
        s.brand ? `brand=${encodeURIComponent(s.brand)}` : null,
      ]
        .filter(Boolean)
        .join("&")}`;

      // Type is 'new-listing' — these matches are by definition new listings
      // surfaced via a saved search. Older code referenced a 'saved-search-
      // match' type that was never added to the notification_type enum, so
      // every insert was silently failing the Postgres CHECK.
      const { error: notifErr } = await sb.from("notifications").insert({
        user_id: s.user_id,
        type: "new-listing",
        title: `${matches.length} new match${matches.length === 1 ? "" : "es"} for your saved search`,
        body: `${titleSamples}${more}.`,
        href: searchHref,
      });
      if (notifErr) {
        summary.errors.push(`notif ${s.id}: ${notifErr.message}`);
      } else {
        summary.notificationsCreated++;
      }

      // Email digest if opted in (per-saved-search alert_email AND
      // global digest_emails preference).
      if (
        s.alert_email &&
        userEmail &&
        (await shouldSendEmail(s.user_id, "digest_emails"))
      ) {
        try {
          const subject = `${matches.length} new match${matches.length === 1 ? "" : "es"} for your saved search`;
          const itemsHtml = top
            .map(
              (m) =>
                `<li style="margin-bottom:10px;"><a href="${siteUrl()}/product/${m.sku.slug}" style="color:#fcd34d;text-decoration:none;font-weight:600;">${m.sku.year} ${m.sku.brand} ${m.sku.set_name}</a> <span style="color:rgba(255,255,255,0.6);">(${m.sku.product})</span> — <strong style="color:#fbbf24;">$${(m.price_cents / 100).toFixed(2)}</strong></li>`,
            )
            .join("");
          const moreLine = more
            ? `<p style="color:rgba(255,255,255,0.6);font-size:13px;">…and ${matches.length - 3} more. <a href="${siteUrl()}${searchHref}" style="color:#fcd34d;">See all matches →</a></p>`
            : `<p style="color:rgba(255,255,255,0.6);font-size:13px;"><a href="${siteUrl()}${searchHref}" style="color:#fcd34d;">See all matches →</a></p>`;
          const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0b;color:#e5e5e5;padding:32px 16px;"><div style="max-width:560px;margin:0 auto;"><div style="font-size:22px;font-weight:900;letter-spacing:-0.02em;margin-bottom:24px;"><span style="color:#ffffff;">Wax</span><span style="color:#f59e0b;">Depot</span></div><div style="background:#101012;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;"><h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:#ffffff;">${subject}</h1><p style="color:rgba(255,255,255,0.7);font-size:14px;margin:0 0 20px;">From your saved search on WaxDepot:</p><ul style="list-style:none;padding:0;margin:0 0 16px;font-size:14px;">${itemsHtml}</ul>${moreLine}<hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0;"><p style="color:rgba(255,255,255,0.5);font-size:11px;">Manage these alerts: <a href="${siteUrl()}/account/alerts" style="color:rgba(255,255,255,0.7);">/account/alerts</a></p></div></div></div>`;
          const text = `New on WaxDepot:\n\n${top
            .map(
              (m) =>
                `  • ${m.sku.year} ${m.sku.brand} ${m.sku.set_name} (${m.sku.product}) — $${(m.price_cents / 100).toFixed(2)}\n    ${siteUrl()}/product/${m.sku.slug}`,
            )
            .join("\n\n")}${
            more
              ? `\n\n  …and ${matches.length - 3} more.\n  See all: ${siteUrl()}${searchHref}`
              : `\n\n  See all: ${siteUrl()}${searchHref}`
          }\n\nManage your alerts: ${siteUrl()}/account/alerts`;
          await sendEmail({ to: userEmail, subject, html, text });
          summary.emailsSent++;
        } catch (e) {
          summary.errors.push(
            `email ${s.id}: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
    } catch (e) {
      summary.errors.push(
        `search ${s.id}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  return NextResponse.json(summary);
}
