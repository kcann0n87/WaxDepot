#!/usr/bin/env node
/**
 * Populate the live order book with realistic demo activity:
 *   • multiple Active listings (asks) per SKU at various price points
 *   • standing Active bids below the lowest ask on popular SKUs
 *   • 30-90 days of historical sales for the price chart + recent-sales tape
 *
 * Idempotent on listings/bids/sales: wipes those three tables first and
 * re-generates them deterministically from each SKU's metadata. Does NOT
 * touch orders, profiles, or anything Stripe-related — real test orders
 * placed by the operator are preserved.
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-demo.mjs
 *
 * The seller pool is the existing demo accounts (created by seed.mjs);
 * if any are missing we skip the listing rather than fail.
 */
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// ============================================================================
// Pricing heuristic — dollar value per box in $USD.
//
// Looked up by (brand, set, product, sport) in increasing specificity. Each
// returns the rough "lowest ask" for a Hobby Box; retail variants get scaled.
// ============================================================================

const PREMIUM_NBA_2025_26 = 1.6; // Cooper Flagg / Dylan Harper era multiplier

function basePrice(sku) {
  const key = `${sku.brand}|${sku.set_name}`;
  const isPremiumNBARookie = sku.sport === "NBA" && sku.year === 2025;

  // Ultra-premium high-end
  const ultra = {
    "Panini|National Treasures": 1800,
    "Panini|Immaculate": 1400,
    "Panini|Flawless": 2500,
    "Topps|Inception": 950,
    "Upper Deck|The Cup": 1350,
  };
  if (ultra[key]) return ultra[key] * (isPremiumNBARookie ? PREMIUM_NBA_2025_26 : 1);

  // Premium hobby
  const premium = {
    "Topps|Five Star": 380,
    "Topps|Pristine": 480,
    "Topps|Sterling": 420,
    "Topps|Tribute": 280,
    "Topps|Tier One": 240,
    "Topps|Chrome Black": 350,
    "Topps|Chrome Sapphire": 220,
    "Topps|Cosmic Chrome": 950,
    "Panini|Spectra": 320,
    "Panini|Court Kings": 165,
    "Panini|Contenders": 420,
    "Upper Deck|SP Authentic": 280,
    "Upper Deck|SP": 195,
  };
  if (premium[key]) return premium[key] * (isPremiumNBARookie ? PREMIUM_NBA_2025_26 : 1);

  // Chrome / flagship
  const chrome = {
    "Topps|Chrome": sku.sport === "NBA" ? 540 : sku.sport === "NFL" ? 195 : 110,
    "Topps|Chrome Update": 175,
    "Topps|Finest": 330,
    "Topps|Stadium Club": 105,
    "Topps|Heritage": 95,
    "Topps|Allen and Ginter": 100,
    "Topps|Holiday": 32,
    "Topps|Series 1": 95,
    "Topps|Series 2": 90,
    "Topps|Update": 85,
    "Bowman|Bowman": 220,
    "Bowman|Chrome": 470,
    "Bowman|Draft": 185,
    "Bowman|Platinum": 130,
    "Bowman|Best": 320,
    "Bowman|U": 250,
    "Panini|Prizm": sku.sport === "NBA" ? 760 : 540,
    "Panini|Prizm Monopoly": 920,
    "Panini|Mosaic": sku.sport === "NBA" ? 145 : 130,
    "Panini|Donruss": 110,
    "Panini|Donruss Optic": 215,
    "Panini|Hoops": 160,
    "Panini|Select": sku.sport === "NBA" ? 235 : 290,
    "Upper Deck|Series 1": 165,
    "Upper Deck|Series 2": 145,
  };
  if (chrome[key]) return chrome[key] * (isPremiumNBARookie ? PREMIUM_NBA_2025_26 : 1);

  // Generic fallback by sport
  return sku.sport === "NBA" ? 200 : sku.sport === "NFL" ? 150 : 110;
}

// Retail-tier multipliers. Hobby Box is the baseline.
const RETAIL_MULT = {
  "Hobby Box": 1.0,
  "Jumbo Box": 1.55,
  "FotL Hobby Box": 1.85,
  "Mega Box": 0.07,
  "Value Box": 0.05,
  "Blaster Box": 0.06,
  "Hanger Box": 0.04,
  "Booster Box": 0.4,
  "Elite Trainer Box": 0.13,
};

function priceFor(sku) {
  const base = basePrice(sku);
  const mult = RETAIL_MULT[sku.product] ?? 1.0;
  return Math.round(base * mult);
}

// Heat tier — how many listings/bids/sales we generate.
function heat(sku) {
  // 2025-26 NBA flagship + Cosmic Chrome are extremely hot right now.
  if (sku.sport === "NBA" && sku.year === 2025) return "hot";
  // Bowman MLB current-year is always hot for prospectors.
  if (sku.brand === "Bowman" && sku.year >= 2025) return "hot";
  // Recent NFL premium is warm.
  if (sku.sport === "NFL" && sku.year === 2025) return "warm";
  // Everything else is "cool" — a few listings, a couple of historical sales.
  return "cool";
}

// ============================================================================
// Deterministic PRNG so re-runs reproduce the same demo state.
// ============================================================================
function seededRandom(seed) {
  let s = (seed * 16807) % 2147483647;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

// ============================================================================
// Load sellers + SKUs from the DB
// ============================================================================
console.log("→ loading demo sellers");
const { data: sellers, error: sellersErr } = await sb
  .from("profiles")
  .select("id, username")
  .like("username", "%")
  .eq("is_seller", true)
  .order("username", { ascending: true });
if (sellersErr) {
  console.error(sellersErr);
  process.exit(1);
}

// Only use the demo accounts created by seed.mjs (suffixed with @waxdepot.demo
// in the auth table). We can't see emails from profiles, so we filter by the
// known username list.
const DEMO_USERNAMES = [
  "sealed_only",
  "boxbreaker_pro",
  "northwestcards",
  "augies_collectibles",
  "luchpaka_0",
  "thatdudedavid96",
  "nbkisit",
  "alehow-70",
  "hobbyhouse",
  "pristinepacks",
];
const demoSellers = sellers.filter((s) => DEMO_USERNAMES.includes(s.username));
if (demoSellers.length === 0) {
  console.error(
    "No demo sellers found. Run scripts/seed.mjs first to create them.",
  );
  process.exit(1);
}
console.log(`  found ${demoSellers.length} demo sellers`);

// Buyers for bids — we'll reuse the same demo profile pool but pretend they're
// buying. RLS doesn't care; we just need a valid profile id.
const buyerPool = demoSellers;

console.log("→ loading SKUs");
const { data: skus, error: skuErr } = await sb
  .from("skus")
  .select("id, slug, year, brand, set_name, product, sport, release_date")
  .order("release_date", { ascending: false });
if (skuErr) {
  console.error(skuErr);
  process.exit(1);
}
console.log(`  ${skus.length} SKUs`);

// ============================================================================
// Wipe + re-seed listings, bids, sales
// ============================================================================
console.log("\n→ wiping listings/bids/sales");
await sb.from("listings").delete().neq("id", "00000000-0000-0000-0000-000000000000");
await sb.from("bids").delete().neq("id", "00000000-0000-0000-0000-000000000000");
await sb.from("sales").delete().neq("id", "00000000-0000-0000-0000-000000000000");

const HEAT_SETTINGS = {
  hot: { listingsRange: [5, 9], bidsRange: [4, 8], salesRange: [12, 22] },
  warm: { listingsRange: [3, 6], bidsRange: [2, 5], salesRange: [6, 14] },
  cool: { listingsRange: [2, 4], bidsRange: [0, 2], salesRange: [3, 8] },
};

const allListings = [];
const allBids = [];
const allSales = [];
const now = Date.now();
const MS_DAY = 86400000;

let seedCounter = 1;
for (const sku of skus) {
  const rand = seededRandom(seedCounter++);
  const base = priceFor(sku);
  const tier = heat(sku);
  const settings = HEAT_SETTINGS[tier];

  // ---- Listings (asks) -----------------------------------------------------
  const listingCount =
    settings.listingsRange[0] +
    Math.floor(rand() * (settings.listingsRange[1] - settings.listingsRange[0] + 1));
  for (let i = 0; i < listingCount; i++) {
    // Variance: ±10% around base. Earlier listings tend to be lower, climbing
    // up — gives a clean ascending order book.
    const skewed = 0.95 + (i / Math.max(1, listingCount - 1)) * 0.18 + (rand() - 0.5) * 0.04;
    const seller = pick(rand, demoSellers);
    allListings.push({
      sku_id: sku.id,
      seller_id: seller.id,
      price_cents: Math.max(100, Math.round(base * skewed * 100)),
      shipping_cents: rand() > 0.45 ? 0 : Math.round((6 + rand() * 12) * 100),
      quantity: 1 + Math.floor(rand() * 3),
      status: "Active",
    });
  }

  // ---- Bids (offers) -------------------------------------------------------
  const bidCount =
    settings.bidsRange[0] +
    Math.floor(rand() * (settings.bidsRange[1] - settings.bidsRange[0] + 1));
  for (let i = 0; i < bidCount; i++) {
    // Bids sit BELOW the lowest ask — typically 5-25% below base.
    const discount = 0.78 + rand() * 0.16; // 78-94% of base
    const buyer = pick(rand, buyerPool);
    const expiresInDays = 1 + Math.floor(rand() * 14);
    allBids.push({
      sku_id: sku.id,
      buyer_id: buyer.id,
      price_cents: Math.max(100, Math.round(base * discount * 100)),
      status: "Active",
      expires_at: new Date(now + expiresInDays * MS_DAY).toISOString(),
    });
  }

  // ---- Sales history -------------------------------------------------------
  const saleCount =
    settings.salesRange[0] +
    Math.floor(rand() * (settings.salesRange[1] - settings.salesRange[0] + 1));
  for (let i = 0; i < saleCount; i++) {
    // Sales clustered in the last 60 days, with a slight downward price drift
    // to mimic post-release cooling. Hot SKUs trend up.
    const daysAgo = Math.floor(rand() * 60);
    const drift =
      tier === "hot"
        ? 1 + (60 - daysAgo) * 0.001
        : tier === "warm"
          ? 1 - daysAgo * 0.0005
          : 1 - daysAgo * 0.001;
    const variance = drift * (0.93 + rand() * 0.14);
    allSales.push({
      sku_id: sku.id,
      price_cents: Math.max(100, Math.round(base * variance * 100)),
      sold_at: new Date(now - daysAgo * MS_DAY).toISOString(),
    });
  }
}

console.log(
  `\n→ inserting ${allListings.length} listings, ${allBids.length} bids, ${allSales.length} sales`,
);

// Batch inserts so we don't blow the row-count limit.
async function insertBatch(table, rows) {
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error } = await sb.from(table).insert(slice);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

await insertBatch("listings", allListings);
await insertBatch("bids", allBids);
await insertBatch("sales", allSales);

console.log("\n✓ Demo seed complete.");
console.log("  Visit / to see the live order book populate across the catalog.");
