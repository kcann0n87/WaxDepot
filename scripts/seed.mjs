// Seeds the Supabase project with the existing mock catalog + sellers + listings.
// Idempotent — safe to re-run.
//
// Usage:
//   node --env-file=.env.local scripts/seed.mjs

import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// Deterministic UUID v5-ish from a string, so re-running produces the same ids.
function uuidFor(name) {
  const hash = createHash("sha256").update(name).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "5" + hash.slice(13, 16),
    "8" + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join("-");
}

// Parse src/lib/data.ts and src/lib/sellers.ts as JS so we can pull the seed objects.
// Trick: build TS files into JSON-friendly export by stripping types. We'll just import
// dynamically from the compiled Next dev cache by reading the files and parsing the arrays.
async function loadModule(relPath, exportNames) {
  const filePath = join(__dirname, "..", relPath);
  const source = readFileSync(filePath, "utf8");
  // Strip TypeScript type annotations using a very small heuristic: type-only `export type X = ...`
  // and inline `: Type` annotations on object literals are fine because object property types
  // are inferred. We only need the top-level `export const X: Type = [...]` parts.
  // Build a tiny CommonJS-style sandbox.
  const stripped = source
    .replace(/export type [\s\S]*?;\n/g, "")
    .replace(/export type [\s\S]*?\n}\n/g, "")
    .replace(/: [A-Za-z][A-Za-z0-9_<>\[\]\|\.\s,{}'"]*?(?=[,=\)])/g, "")
    .replace(/^import .*$/gm, "")
    .replace(/export (const|function) /g, "$1 ");
  const fn = new Function(
    `${stripped}\nreturn { ${exportNames.join(", ")} };`,
  );
  return fn();
}

// Easier: just hardcode the source-of-truth seed data here, copied from lib/.
// Avoids brittle TS parsing. Update this when you change lib/data.ts or lib/sellers.ts.
import { skus, sellerSeed, listingFor, basePriceFor } from "./seed-data.mjs";

async function ensureSeller(s) {
  // Try to find an existing user by the synthetic email.
  const email = `${s.username}@waxdepot.demo`;

  // Look for an existing profile by username first (faster).
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", s.username)
    .maybeSingle();

  if (existing) return existing.id;

  // Create the auth user (the on_auth_user_created trigger creates a profile row).
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password: `seed-${s.username}-${Date.now()}`,
    email_confirm: true,
    user_metadata: { display_name: s.displayName },
  });
  if (error) throw new Error(`createUser ${s.username}: ${error.message}`);

  const userId = created.user.id;
  // Update the profile row the trigger created with our fields.
  const { error: upErr } = await supabase
    .from("profiles")
    .update({
      username: s.username,
      display_name: s.displayName,
      bio: s.bio,
      location: s.location,
      is_seller: true,
      is_verified: s.verified,
      avatar_color: s.avatarColor,
    })
    .eq("id", userId);
  if (upErr) throw new Error(`update profile ${s.username}: ${upErr.message}`);

  return userId;
}

async function main() {
  console.log("→ seeding sellers");
  const sellerIdByUsername = {};
  for (const s of sellerSeed) {
    sellerIdByUsername[s.username] = await ensureSeller(s);
    process.stdout.write(`  ${s.username} → ${sellerIdByUsername[s.username].slice(0, 8)}…\n`);
  }

  console.log("→ wiping listings/bids/sales for fresh seed");
  await supabase.from("listings").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("bids").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("sales").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  console.log(`→ upserting ${skus.length} SKUs`);
  const skuRows = skus.map((s) => ({
    id: uuidFor(`sku:${s.slug}`),
    slug: s.slug,
    year: s.year,
    brand: s.brand,
    sport: s.sport,
    set_name: s.set,
    product: s.product,
    release_date: s.releaseDate,
    description: s.description,
    image_url: s.imageUrl ?? null,
    gradient_from: s.gradient[0],
    gradient_to: s.gradient[1],
  }));
  const { error: skuErr } = await supabase.from("skus").upsert(skuRows, { onConflict: "slug" });
  if (skuErr) throw new Error(`upsert skus: ${skuErr.message}`);

  console.log("→ generating listings");
  let listingCount = 0;
  for (const sku of skus) {
    const skuUuid = uuidFor(`sku:${sku.slug}`);
    const listings = listingFor(sku, sellerIdByUsername);
    if (listings.length === 0) continue;
    const rows = listings.map((l) => ({
      sku_id: skuUuid,
      seller_id: l.sellerId,
      price_cents: Math.round(l.price * 100),
      shipping_cents: Math.round(l.shipping * 100),
      quantity: l.quantity,
      status: "Active",
    }));
    const { error } = await supabase.from("listings").insert(rows);
    if (error) throw new Error(`insert listings ${sku.slug}: ${error.message}`);
    listingCount += rows.length;
  }

  console.log("→ generating recent sales");
  let saleCount = 0;
  for (const sku of skus) {
    const skuUuid = uuidFor(`sku:${sku.slug}`);
    const base = basePriceFor(sku.slug);
    if (!base) continue;
    const rows = [];
    const now = Date.now();
    for (let i = 0; i < 8; i++) {
      const variance = 0.92 + Math.random() * 0.16;
      const price = Math.round(base * variance * 100);
      const daysAgo = Math.floor(Math.random() * 30);
      rows.push({
        sku_id: skuUuid,
        price_cents: price,
        sold_at: new Date(now - daysAgo * 86400000).toISOString(),
      });
    }
    const { error } = await supabase.from("sales").insert(rows);
    if (error) throw new Error(`insert sales ${sku.slug}: ${error.message}`);
    saleCount += rows.length;
  }

  console.log(
    `\n✓ Seed complete: ${sellerSeed.length} sellers, ${skus.length} SKUs, ${listingCount} listings, ${saleCount} sales`,
  );
}

main().catch((err) => {
  console.error("✗ Seed failed:", err.message);
  process.exit(1);
});
