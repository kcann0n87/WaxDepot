import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { serviceRoleClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Admin CSV export — users. Pulls profile metadata + Stripe Connect status
 * + lifetime sales aggregates so ops can answer "who are my top sellers"
 * or "which accounts haven't completed onboarding" in a spreadsheet.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return new NextResponse("Forbidden", { status: 403 });

  const sb = serviceRoleClient();
  const { data: profiles, error } = await sb
    .from("profiles")
    .select(
      "id, username, display_name, location, is_admin, is_seller, is_verified, banned_at, ban_reason, seller_tier, stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(10000);

  if (error) {
    return new NextResponse(`Export failed: ${error.message}`, { status: 500 });
  }

  // Pull lifetime released-sales totals per seller in one batch.
  const { data: salesAgg } = await sb
    .from("orders")
    .select("seller_id, total_cents")
    .in("status", ["Released", "Completed"]);

  const salesBySeller = new Map<string, { units: number; cents: number }>();
  for (const o of salesAgg ?? []) {
    const cur = salesBySeller.get(o.seller_id) ?? { units: 0, cents: 0 };
    cur.units += 1;
    cur.cents += o.total_cents ?? 0;
    salesBySeller.set(o.seller_id, cur);
  }

  const header = [
    "user_id",
    "username",
    "display_name",
    "location",
    "is_admin",
    "is_seller",
    "is_verified",
    "is_banned",
    "ban_reason",
    "seller_tier",
    "stripe_account_id",
    "stripe_charges_enabled",
    "stripe_payouts_enabled",
    "lifetime_sales_units",
    "lifetime_sales_usd",
    "created_at",
  ];
  const lines = [header.join(",")];

  for (const p of profiles ?? []) {
    const sales = salesBySeller.get(p.id) ?? { units: 0, cents: 0 };
    lines.push(
      [
        p.id,
        p.username,
        csvEscape(p.display_name ?? ""),
        csvEscape(p.location ?? ""),
        p.is_admin ? "true" : "false",
        p.is_seller ? "true" : "false",
        p.is_verified ? "true" : "false",
        p.banned_at ? "true" : "false",
        csvEscape(p.ban_reason ?? ""),
        p.seller_tier ?? "Starter",
        p.stripe_account_id ?? "",
        p.stripe_charges_enabled ? "true" : "false",
        p.stripe_payouts_enabled ? "true" : "false",
        String(sales.units),
        (sales.cents / 100).toFixed(2),
        p.created_at,
      ].join(","),
    );
  }

  const csv = lines.join("\n");
  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="waxdepot-users-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

function csvEscape(s: string): string {
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
