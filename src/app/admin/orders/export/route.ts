import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { serviceRoleClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Admin CSV export — orders. Streams the entire orders table (capped at
 * 10,000 rows for safety) joined with buyer + seller usernames + the SKU
 * title, formatted for spreadsheet ops work (reconciliation, refunds,
 * payout audits).
 *
 * Hard-gated on admin status. Filename includes today's date so
 * downloads don't overwrite each other.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const sb = serviceRoleClient();
  const { data, error } = await sb
    .from("orders")
    .select(
      "id, status, payment_status, price_cents, shipping_cents, tax_cents, total_cents, placed_at, shipped_at, delivered_at, released_at, canceled_at, carrier, tracking, ship_to_state, ship_to_zip, stripe_charge_id, stripe_transfer_id, sku:skus!orders_sku_id_fkey(year, brand, set_name, product, sport), buyer:profiles!orders_buyer_id_fkey(username), seller:profiles!orders_seller_id_fkey(username)",
    )
    .order("placed_at", { ascending: false })
    .limit(10000);

  if (error) {
    return new NextResponse(`Export failed: ${error.message}`, { status: 500 });
  }

  type OrderRow = {
    id: string;
    status: string;
    payment_status: string;
    price_cents: number;
    shipping_cents: number;
    tax_cents: number;
    total_cents: number;
    placed_at: string;
    shipped_at: string | null;
    delivered_at: string | null;
    released_at: string | null;
    canceled_at: string | null;
    carrier: string | null;
    tracking: string | null;
    ship_to_state: string | null;
    ship_to_zip: string | null;
    stripe_charge_id: string | null;
    stripe_transfer_id: string | null;
    sku:
      | { year: number; brand: string; set_name: string; product: string; sport: string }
      | { year: number; brand: string; set_name: string; product: string; sport: string }[]
      | null;
    buyer: { username: string } | { username: string }[] | null;
    seller: { username: string } | { username: string }[] | null;
  };

  const rows = (data ?? []) as unknown as OrderRow[];

  const header = [
    "order_id",
    "status",
    "payment_status",
    "buyer",
    "seller",
    "sport",
    "sku_title",
    "price_usd",
    "shipping_usd",
    "tax_usd",
    "total_usd",
    "placed_at",
    "shipped_at",
    "delivered_at",
    "released_at",
    "canceled_at",
    "carrier",
    "tracking",
    "ship_to_state",
    "ship_to_zip",
    "stripe_charge_id",
    "stripe_transfer_id",
  ];

  const lines = [header.join(",")];
  for (const r of rows) {
    const sku = Array.isArray(r.sku) ? r.sku[0] : r.sku;
    const buyer = Array.isArray(r.buyer) ? r.buyer[0] : r.buyer;
    const seller = Array.isArray(r.seller) ? r.seller[0] : r.seller;
    const skuTitle = sku
      ? `${sku.year} ${sku.brand} ${sku.set_name} ${sku.product}`
      : "";
    lines.push(
      [
        r.id,
        r.status,
        r.payment_status,
        buyer?.username ?? "",
        seller?.username ?? "",
        sku?.sport ?? "",
        csvEscape(skuTitle),
        (r.price_cents / 100).toFixed(2),
        (r.shipping_cents / 100).toFixed(2),
        (r.tax_cents / 100).toFixed(2),
        (r.total_cents / 100).toFixed(2),
        r.placed_at,
        r.shipped_at ?? "",
        r.delivered_at ?? "",
        r.released_at ?? "",
        r.canceled_at ?? "",
        r.carrier ?? "",
        r.tracking ?? "",
        r.ship_to_state ?? "",
        r.ship_to_zip ?? "",
        r.stripe_charge_id ?? "",
        r.stripe_transfer_id ?? "",
      ].join(","),
    );
  }

  const csv = lines.join("\n");
  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="waxdepot-orders-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Escapes a field for CSV — wraps in quotes if it contains , " or newline. */
function csvEscape(s: string): string {
  if (/[,"\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
