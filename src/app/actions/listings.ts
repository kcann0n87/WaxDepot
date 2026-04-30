"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CreateListingResult = {
  error?: string;
  ok?: boolean;
  listingId?: string;
  skuSlug?: string;
};

/**
 * Creates a new Active listing for the current user.
 * Inputs come from the FormData on the /sell page.
 */
export async function createListing(formData: FormData): Promise<CreateListingResult> {
  const skuId = String(formData.get("skuId") || "").trim();
  const priceStr = String(formData.get("price") || "");
  const shippingStr = String(formData.get("shipping") || "0");
  const qtyStr = String(formData.get("quantity") || "1");

  const priceCents = Math.round(parseFloat(priceStr) * 100);
  // shipping="calc" means calculated-at-checkout. Store 0 cents for now;
  // a future Stripe integration can compute real shipping at order time.
  const shippingCents =
    shippingStr === "calc" ? 0 : Math.round(parseFloat(shippingStr) * 100) || 0;
  const quantity = parseInt(qtyStr, 10);

  if (!skuId) return { error: "Pick a product first." };
  if (!Number.isFinite(priceCents) || priceCents <= 0)
    return { error: "Price must be greater than zero." };
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 100)
    return { error: "Quantity must be between 1 and 100." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "You must be signed in to list a box." };

    const { data, error } = await supabase
      .from("listings")
      .insert({
        sku_id: skuId,
        seller_id: user.id,
        price_cents: priceCents,
        shipping_cents: shippingCents,
        quantity,
        status: "Active",
      })
      .select("id, sku:skus!listings_sku_id_fkey(slug)")
      .single();

    if (error) return { error: error.message };

    const skuRel = Array.isArray(data?.sku) ? data.sku[0] : data?.sku;
    const slug = (skuRel as { slug?: string } | null)?.slug;

    revalidatePath("/");
    revalidatePath("/account");
    if (slug) revalidatePath(`/product/${slug}`);

    return { ok: true, listingId: data?.id, skuSlug: slug };
  } catch (e) {
    console.error("createListing failed:", e);
    return { error: "Something went wrong. Please try again." };
  }
}
