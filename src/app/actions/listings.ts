"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { serviceRoleClient } from "@/lib/supabase/admin";

export type CreateListingResult = {
  error?: string;
  ok?: boolean;
  listingId?: string;
  skuSlug?: string;
};

const MAX_SHIPPING_OPTIONS = 3;

type IncomingShippingOption = { name?: unknown; shippingCents?: unknown };

/**
 * Parse + validate the seller's shipping options. Sellers post a JSON array
 * of `{ name, shippingCents }` (1–3 entries) via FormData. We normalize
 * names, dedupe by lowercase, clamp price to non-negative ints, and reject
 * the whole submission if the shape is unsalvageable.
 */
function parseShippingOptions(
  raw: string,
):
  | { ok: true; options: { name: string; shippingCents: number }[] }
  | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw || "[]");
  } catch {
    return { ok: false, error: "Shipping options were malformed." };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, error: "Shipping options must be a list." };
  }
  if (parsed.length === 0) {
    return { ok: false, error: "Add at least one shipping option." };
  }
  if (parsed.length > MAX_SHIPPING_OPTIONS) {
    return { ok: false, error: `Up to ${MAX_SHIPPING_OPTIONS} options.` };
  }

  const seen = new Set<string>();
  const out: { name: string; shippingCents: number }[] = [];
  for (const item of parsed as IncomingShippingOption[]) {
    const name = String(item?.name ?? "").trim().slice(0, 40);
    const cents = Math.round(Number(item?.shippingCents) || 0);
    if (!name) return { ok: false, error: "Shipping option name is required." };
    if (!Number.isFinite(cents) || cents < 0) {
      return { ok: false, error: `Invalid price for "${name}".` };
    }
    const key = name.toLowerCase();
    if (seen.has(key)) {
      return { ok: false, error: `Duplicate option name "${name}".` };
    }
    seen.add(key);
    out.push({ name, shippingCents: cents });
  }
  return { ok: true, options: out };
}

/**
 * Creates a new Active listing for the current user.
 * Inputs come from the FormData on the /sell page.
 *
 * Multi-tier shipping: the listing carries a denormalized `shipping_cents`
 * (set to the cheapest option for sorting + display in the order book) and
 * the full set of options live in `listing_shipping_options`. The buyer
 * picks one at Stripe Checkout.
 */
export async function createListing(formData: FormData): Promise<CreateListingResult> {
  const skuId = String(formData.get("skuId") || "").trim();
  const priceStr = String(formData.get("price") || "");
  const qtyStr = String(formData.get("quantity") || "1");
  const shippingOptionsRaw = String(formData.get("shippingOptions") || "");

  const priceCents = Math.round(parseFloat(priceStr) * 100);
  const quantity = parseInt(qtyStr, 10);

  if (!skuId) return { error: "Pick a product first." };
  if (!Number.isFinite(priceCents) || priceCents <= 0)
    return { error: "Price must be greater than zero." };
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 100)
    return { error: "Quantity must be between 1 and 100." };

  const parsed = parseShippingOptions(shippingOptionsRaw);
  if (!parsed.ok) return { error: parsed.error };
  const options = parsed.options;
  // Lowest cents — denormalized onto listings.shipping_cents so order-book
  // queries can sort + display "from $X" without a join.
  const cheapestCents = Math.min(...options.map((o) => o.shippingCents));

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "You must be signed in to list a box." };

    // Refuse to create the listing unless this seller can actually be paid
    // out. The /sell page already gates the UI on this, so reaching here
    // means someone called the action directly. Mirroring the gate server-
    // side prevents orphan listings that would dead-end at checkout.
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_charges_enabled")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.stripe_charges_enabled) {
      return {
        error:
          "You need to finish payout setup before you can list. Visit /sell/payouts.",
      };
    }

    const { data, error } = await supabase
      .from("listings")
      .insert({
        sku_id: skuId,
        seller_id: user.id,
        price_cents: priceCents,
        shipping_cents: cheapestCents,
        quantity,
        status: "Active",
      })
      .select("id, sku:skus!listings_sku_id_fkey(slug)")
      .single();

    if (error) return { error: error.message };

    // Insert the shipping options. RLS would let the seller's auth client do
    // it, but we use service role for atomicity (one round-trip, no half-
    // baked listings if the second insert fails). If the options insert
    // does fail, roll the listing back so we don't ship a broken row.
    const admin = serviceRoleClient();
    const { error: optsErr } = await admin
      .from("listing_shipping_options")
      .insert(
        options.map((o, i) => ({
          listing_id: data.id,
          name: o.name,
          shipping_cents: o.shippingCents,
          sort_order: i,
        })),
      );
    if (optsErr) {
      await admin.from("listings").delete().eq("id", data.id);
      return { error: `Could not save shipping options: ${optsErr.message}` };
    }

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
