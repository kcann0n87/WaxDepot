"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { serviceRoleClient } from "@/lib/supabase/admin";
import { emailBidPlaced } from "@/lib/email";

export type CreateBidResult = {
  error?: string;
  needsAuth?: boolean;
  ok?: boolean;
  bidId?: string;
  expiresAt?: string;
};

/**
 * Place a bid on a SKU. The buyer is the current authenticated user.
 * Returns needsAuth=true if there is no session — caller can route to /signup.
 */
export async function createBid(formData: FormData): Promise<CreateBidResult> {
  const skuId = String(formData.get("skuId") || "").trim();
  const priceStr = String(formData.get("price") || "");
  const daysStr = String(formData.get("days") || "7");

  const priceCents = Math.round(parseFloat(priceStr) * 100);
  const days = parseInt(daysStr, 10);

  if (!skuId) return { error: "Missing product." };
  if (!Number.isFinite(priceCents) || priceCents <= 0)
    return { error: "Bid must be greater than zero." };
  if (!Number.isFinite(days) || days < 1 || days > 90)
    return { error: "Expiry must be between 1 and 90 days." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { needsAuth: true };

    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("bids")
      .insert({
        sku_id: skuId,
        buyer_id: user.id,
        price_cents: priceCents,
        expires_at: expiresAt,
        status: "Active",
      })
      .select("id, expires_at, sku:skus!bids_sku_id_fkey(slug, year, brand, product)")
      .single();

    if (error) return { error: error.message };

    const skuRel = Array.isArray(data?.sku) ? data.sku[0] : data?.sku;
    const skuMeta = skuRel as { slug?: string; year?: number; brand?: string; product?: string } | null;
    const slug = skuMeta?.slug;
    const productTitle = skuMeta
      ? `${skuMeta.year} ${skuMeta.brand} ${skuMeta.product}`
      : "your bid";
    const productHref = slug
      ? `https://waxdepot.io/product/${slug}`
      : "https://waxdepot.io/account";

    // Fan out a "bid-placed" notification to the buyer for activity feed.
    if (skuMeta) {
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "bid-placed",
        title: "Bid placed",
        body: `Your bid of $${(priceCents / 100).toFixed(2)} on ${productTitle} is live.`,
        href: slug ? `/product/${slug}` : "/account",
      });
    }

    // Notify every seller with an active listing on this SKU + email the
    // buyer a confirmation. Service role for the seller fan-out (the
    // buyer can't write notifications for other users under RLS); regular
    // supabase client for the buyer's auth email lookup. Both best-effort.
    const admin = serviceRoleClient();
    try {
      const [{ data: activeListings }, { data: buyerAuth }] = await Promise.all(
        [
          admin
            .from("listings")
            .select("seller_id")
            .eq("sku_id", skuId)
            .eq("status", "Active"),
          admin.auth.admin.getUserById(user.id),
        ],
      );
      const sellerIds = Array.from(
        new Set((activeListings ?? []).map((r) => r.seller_id)),
      );
      if (sellerIds.length > 0 && skuMeta) {
        await admin.from("notifications").insert(
          sellerIds.map((sellerId) => ({
            user_id: sellerId,
            type: "bid-placed",
            title: "New bid on your listing",
            body: `Someone bid $${(priceCents / 100).toFixed(2)} on ${productTitle}. Accept it from your listing.`,
            href: slug ? `/product/${slug}` : "/account/listings",
          })),
        );
      }
      if (buyerAuth?.user?.email && skuMeta) {
        await emailBidPlaced({
          to: buyerAuth.user.email,
          productTitle,
          amountDollars: priceCents / 100,
          expiresInDays: days,
          productHref,
        });
      }
    } catch (e) {
      console.error("createBid fan-out failed:", e);
    }

    revalidatePath("/account");
    if (slug) revalidatePath(`/product/${slug}`);

    return { ok: true, bidId: data?.id, expiresAt: data?.expires_at };
  } catch (e) {
    console.error("createBid failed:", e);
    return { error: "Something went wrong. Please try again." };
  }
}
