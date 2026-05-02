import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { serviceRoleClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Admin CSV export — listings. Currently active by default; pass
 * ?status=all to export every listing regardless of state.
 */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return new NextResponse("Forbidden", { status: 403 });

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status") ?? "Active";

  const sb = serviceRoleClient();
  let q = sb
    .from("listings")
    .select(
      "id, price_cents, shipping_cents, quantity, status, created_at, updated_at, sku:skus!listings_sku_id_fkey(year, brand, set_name, product, sport, slug), seller:profiles!listings_seller_id_fkey(username)",
    )
    .order("created_at", { ascending: false })
    .limit(10000);
  if (statusFilter !== "all") q = q.eq("status", statusFilter);

  const { data, error } = await q;
  if (error) return new NextResponse(`Export failed: ${error.message}`, { status: 500 });

  type ListingRow = {
    id: string;
    price_cents: number;
    shipping_cents: number;
    quantity: number;
    status: string;
    created_at: string;
    updated_at: string | null;
    sku:
      | {
          year: number;
          brand: string;
          set_name: string;
          product: string;
          sport: string;
          slug: string;
        }
      | {
          year: number;
          brand: string;
          set_name: string;
          product: string;
          sport: string;
          slug: string;
        }[]
      | null;
    seller: { username: string } | { username: string }[] | null;
  };

  const rows = (data ?? []) as unknown as ListingRow[];

  const header = [
    "listing_id",
    "status",
    "seller",
    "sport",
    "sku_slug",
    "sku_title",
    "price_usd",
    "shipping_usd",
    "quantity",
    "created_at",
    "updated_at",
  ];
  const lines = [header.join(",")];

  for (const r of rows) {
    const sku = Array.isArray(r.sku) ? r.sku[0] : r.sku;
    const seller = Array.isArray(r.seller) ? r.seller[0] : r.seller;
    const skuTitle = sku
      ? `${sku.year} ${sku.brand} ${sku.set_name} ${sku.product}`
      : "";
    lines.push(
      [
        r.id,
        r.status,
        seller?.username ?? "",
        sku?.sport ?? "",
        sku?.slug ?? "",
        csvEscape(skuTitle),
        (r.price_cents / 100).toFixed(2),
        (r.shipping_cents / 100).toFixed(2),
        String(r.quantity),
        r.created_at,
        r.updated_at ?? "",
      ].join(","),
    );
  }

  const csv = lines.join("\n");
  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="waxdepot-listings-${statusFilter}-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

function csvEscape(s: string): string {
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
