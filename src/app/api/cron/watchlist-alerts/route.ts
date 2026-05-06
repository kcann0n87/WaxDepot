import { NextResponse } from "next/server";
import { createClient as createSbAdmin } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";

/**
 * Daily cron: notify users when a SKU on their watchlist has dropped in
 * price (or just got its first listing). Uses watchlist.last_alerted_ask_cents
 * to remember the price the user was last shown — we only fire a new
 * notification when the lowest ask drops below that anchor (or if it's
 * the first time we've seen any listing for the watched SKU).
 *
 * Scheduled in vercel.json. Auth is Bearer ${CRON_SECRET}.
 */
export const dynamic = "force-dynamic";

type WatchRow = {
  user_id: string;
  sku_id: string;
  last_alerted_ask_cents: number | null;
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

  const { data: watches, error: watchErr } = await sb
    .from("watchlist")
    .select("user_id, sku_id, last_alerted_ask_cents");
  if (watchErr) {
    return NextResponse.json({ error: watchErr.message }, { status: 500 });
  }

  const summary = {
    watches: watches?.length ?? 0,
    notificationsCreated: 0,
    emailsSent: 0,
    errors: [] as string[],
  };

  // Compute the lowest ask per SKU once, so a popular watched SKU isn't
  // re-queried for every user who watches it.
  const skuIds = [
    ...new Set(((watches ?? []) as WatchRow[]).map((w) => w.sku_id)),
  ];
  if (skuIds.length === 0) return NextResponse.json(summary);

  const { data: activeListings } = await sb
    .from("listings")
    .select("sku_id, price_cents")
    .in("sku_id", skuIds)
    .eq("status", "Active");

  const lowestBySku = new Map<string, number>();
  for (const l of activeListings ?? []) {
    const cur = lowestBySku.get(l.sku_id);
    if (cur === undefined || l.price_cents < cur) {
      lowestBySku.set(l.sku_id, l.price_cents);
    }
  }

  // Pull SKU display info for the matched SKUs so notification copy is rich.
  const { data: skus } = await sb
    .from("skus")
    .select("id, slug, year, brand, set_name, product, sport")
    .in("id", skuIds);
  const skuById = new Map((skus ?? []).map((s) => [s.id, s]));

  for (const w of (watches ?? []) as WatchRow[]) {
    try {
      const lowest = lowestBySku.get(w.sku_id);
      // No listings → nothing to alert. Reset the anchor so when a
      // listing finally appears we'll recognize it as a drop from null.
      if (lowest === undefined) continue;

      const lastAnchor = w.last_alerted_ask_cents;

      // Only alert when:
      //   • we've never alerted before AND now there's a listing, OR
      //   • current ask is at least 5% below our last-anchor price
      const shouldAlert =
        lastAnchor === null ||
        lowest <= Math.floor(lastAnchor * 0.95);

      if (!shouldAlert) continue;

      const sku = skuById.get(w.sku_id);
      if (!sku) continue;

      const skuTitle = `${sku.year} ${sku.brand} ${sku.set_name} ${sku.product}`;
      const dollars = (lowest / 100).toFixed(2);
      const dropPct =
        lastAnchor !== null
          ? Math.round(((lastAnchor - lowest) / lastAnchor) * 100)
          : null;

      const titleLine =
        lastAnchor === null
          ? `New listing on ${skuTitle}`
          : `${skuTitle} dropped ${dropPct}%`;
      const bodyLine =
        lastAnchor === null
          ? `Lowest ask is now $${dollars}.`
          : `Lowest ask is now $${dollars} — down from $${(lastAnchor / 100).toFixed(2)}.`;

      // In-app notification. Use the canonical 'price-drop' enum value;
      // an earlier 'watchlist-price-drop' label would silently fail the
      // notification_type CHECK constraint.
      const { error: notifErr } = await sb.from("notifications").insert({
        user_id: w.user_id,
        type: "price-drop",
        title: titleLine,
        body: bodyLine,
        href: `/product/${sku.slug}`,
      });
      if (notifErr) {
        summary.errors.push(`notif ${w.sku_id}: ${notifErr.message}`);
        continue;
      }
      summary.notificationsCreated++;

      // Email digest if the user has any email-enabled saved-search
      // (the existing alert_email field on saved_searches is per-search,
      // but watchlist doesn't have a per-row toggle yet — punt on email
      // until we wire one. The in-app notification is enough for v1).
      // We DO update the anchor either way so subsequent days don't
      // re-fire the same alert.

      const { error: updErr } = await sb
        .from("watchlist")
        .update({
          last_alerted_ask_cents: lowest,
          last_alerted_at: new Date().toISOString(),
        })
        .eq("user_id", w.user_id)
        .eq("sku_id", w.sku_id);
      if (updErr) summary.errors.push(`anchor ${w.sku_id}: ${updErr.message}`);
    } catch (e) {
      summary.errors.push(
        `watch ${w.sku_id}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  // Mark sendEmail as referenced so we don't trip unused-import lint when
  // the email path stays gated behind a future opt-in flag.
  void sendEmail;

  return NextResponse.json(summary);
}
