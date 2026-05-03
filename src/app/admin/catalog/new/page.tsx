import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SkuForm } from "../sku-form";

export const dynamic = "force-dynamic";

/**
 * Admin "create SKU" page. Accepts query params to pre-fill the form
 * — used by the /admin/feedback "Add to catalog →" deep-link so admins
 * don't re-type a set request's brand/year/sport/etc.
 *
 * Supported params: slug, year, brand, set_name, product, sport
 */
export default async function AdminNewSkuPage({
  searchParams,
}: {
  searchParams: Promise<{
    slug?: string;
    year?: string;
    brand?: string;
    set_name?: string;
    product?: string;
    sport?: string;
  }>;
}) {
  const sp = await searchParams;
  const validSports = ["NBA", "MLB", "NFL", "NHL"] as const;
  const sport = validSports.includes(sp.sport as (typeof validSports)[number])
    ? (sp.sport as (typeof validSports)[number])
    : undefined;
  const yearNum = sp.year ? parseInt(sp.year, 10) : undefined;
  const initial =
    sp.slug || sp.brand || sp.set_name
      ? {
          slug: sp.slug,
          year: Number.isFinite(yearNum) ? yearNum : undefined,
          brand: sp.brand,
          set_name: sp.set_name,
          product: sp.product || "Hobby Box",
          sport,
        }
      : undefined;

  return (
    <div>
      <Link
        href="/admin/catalog"
        className="mb-3 inline-flex items-center gap-1 text-xs text-white/60 hover:text-white"
      >
        <ArrowLeft size={12} /> Catalog
      </Link>
      <h1 className="font-display mb-1 text-2xl font-black text-white">Add new SKU</h1>
      {initial && (
        <p className="mb-6 text-xs text-amber-300">
          Pre-filled from a feedback set request. Adjust fields as needed
          and click Create SKU.
        </p>
      )}
      <div className="rounded-xl border border-white/10 bg-[#101012] p-5">
        <SkuForm initial={initial} />
      </div>
    </div>
  );
}
