import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCatalogWithPricing } from "@/lib/db";
import { SellForm } from "./sell-form";

export default async function SellPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/sell");

  // Catalog with lowest ask + last sale per SKU.
  const catalog = await getCatalogWithPricing();

  // Highest active bid per SKU — used by the smart-pricing card.
  const { data: bids } = await supabase
    .from("bids")
    .select("sku_id, price_cents")
    .eq("status", "Active");

  const highestBidMap: Record<string, number> = {};
  for (const b of bids ?? []) {
    const cur = highestBidMap[b.sku_id];
    if (cur === undefined || b.price_cents > cur) highestBidMap[b.sku_id] = b.price_cents;
  }

  return <SellForm catalog={catalog} highestBidMap={highestBidMap} />;
}
