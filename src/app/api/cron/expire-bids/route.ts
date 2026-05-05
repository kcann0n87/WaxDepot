import { NextResponse } from "next/server";
import { createClient as createSbAdmin } from "@supabase/supabase-js";

/**
 * Hourly cron: flip bids whose expires_at has passed from Active to Expired.
 * Without this they sit at Active forever — /account counts them as open
 * bids, sellers see them in the order book, the highest-bid map on /sell
 * uses them for pricing suggestions. All wrong.
 *
 * Hourly is fine: bids carry day-granularity expiries, so the worst case
 * delay for a freshly-expired bid is ~1 hour, well under the 1-day floor
 * users actually pick.
 *
 * Auth: Bearer ${CRON_SECRET} like the other crons.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Supabase service credentials not configured" },
      { status: 503 },
    );
  }

  const sb = createSbAdmin(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = new Date().toISOString();

  // Pull what we're about to expire so we can fan out notifications. Cap at
  // 500 per run to keep the hourly cron well-bounded.
  const { data: expiring, error: selectErr } = await sb
    .from("bids")
    .select(
      "id, buyer_id, price_cents, expires_at, sku:skus!bids_sku_id_fkey(slug, year, brand, product)",
    )
    .eq("status", "Active")
    .lt("expires_at", now)
    .limit(500);

  if (selectErr) {
    console.error("expire-bids select failed:", selectErr);
    return NextResponse.json({ error: "Select failed" }, { status: 500 });
  }

  if (!expiring || expiring.length === 0) {
    return NextResponse.json({ ok: true, expired: 0 });
  }

  // Update in one shot, then notify per-user.
  const ids = expiring.map((b) => b.id);
  const { error: updateErr } = await sb
    .from("bids")
    .update({ status: "Expired" })
    .in("id", ids);
  if (updateErr) {
    console.error("expire-bids update failed:", updateErr);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  // Best-effort notification fan-out — failures here don't roll back the
  // expiration. Each row gets one notification, no batching needed since
  // one buyer-id at most maps to a handful of expiring bids per cycle.
  const notifications = expiring
    .map((b) => {
      const skuRel = Array.isArray(b.sku) ? b.sku[0] : b.sku;
      const skuMeta = skuRel as
        | { slug?: string; year?: number; brand?: string; product?: string }
        | null;
      if (!skuMeta) return null;
      return {
        user_id: b.buyer_id,
        type: "bid-placed" as const,
        title: "Bid expired",
        body: `Your $${(b.price_cents / 100).toFixed(2)} bid on ${skuMeta.year} ${skuMeta.brand} ${skuMeta.product} expired without a seller accepting. Re-bid to keep it open.`,
        href: skuMeta.slug ? `/product/${skuMeta.slug}` : "/account",
      };
    })
    .filter((n): n is NonNullable<typeof n> => n !== null);

  if (notifications.length > 0) {
    const { error: notifyErr } = await sb
      .from("notifications")
      .insert(notifications);
    if (notifyErr) console.error("expire-bids notify failed:", notifyErr);
  }

  return NextResponse.json({ ok: true, expired: expiring.length });
}
