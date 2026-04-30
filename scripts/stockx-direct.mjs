#!/usr/bin/env node
/**
 * Targeted StockX-direct downloader for the SKUs whose StockX image-CDN
 * key isn't a clean transform of our slug. Run this when the generic
 * scrape-product-images.mjs heuristics miss.
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRODUCTS_DIR = resolve(__dirname, "..", "public", "products");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

// our_slug → StockX image-CDN key (the part between /images/ and .jpg)
const MAP = {
  "2026-bowman-baseball-hobby-box": "2026-Bowman-Baseball-Hobby-Box",
  "2025-26-topps-cosmic-chrome-basketball-hobby-box":
    "2026-Topps-Cosmic-Chrome-Basketball-Hobby-Box",
  "2026-topps-series-1-baseball-jumbo-box":
    "2026-Topps-Series-1-Baseball-Hobby-Jumbo-Box",
  "2025-topps-allen-and-ginter-baseball-hobby-box":
    "2025-Topps-Allen-Ginter-Baseball-Hobby-Box",
  "2025-bowman-draft-baseball-jumbo-box":
    "2025-Bowman-Draft-Baseball-Hobby-Box",
  "2024-topps-update-baseball-hobby-box":
    "2024-Topps-Update-Series-Baseball-Hobby-Box",
  "2025-pokemon-tcg-journey-together-booster-box":
    "Pokemon-Scarlet-Violet-Journey-Together-SV09-Enhanced-Booster-Box",
  "2025-pokemon-tcg-destined-rivals-booster-box":
    "2025-Pokemon-Scarlet-Violet-Destined-Rivals-Booster-Box",
};

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function fetchJpg(key) {
  const url = `https://images.stockx.com/images/${key}.jpg`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Referer: "https://stockx.com/" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 5000) throw new Error(`only ${buf.length} bytes`);
  const sig = buf.slice(0, 4).toString("hex");
  if (!sig.startsWith("ffd8") && !sig.startsWith("89504e47") && !sig.startsWith("52494646")) {
    throw new Error(`not an image (sig=${sig})`);
  }
  return buf;
}

console.log(`Targeted StockX-direct download for ${Object.keys(MAP).length} SKUs\n`);
const succeeded = [];
for (const [slug, key] of Object.entries(MAP)) {
  try {
    const buf = await fetchJpg(key);
    const dest = resolve(PRODUCTS_DIR, `${slug}.jpg`);
    writeFileSync(dest, buf);
    console.log(`  ✓ ${(buf.length / 1024).toFixed(0)} KB ${slug}`);
    succeeded.push(slug);
  } catch (e) {
    console.log(`  ✗ ${slug}: ${e.message}`);
  }
}

if (succeeded.length > 0) {
  console.log("\nUpdating Supabase rows…");
  for (const slug of succeeded) {
    const { error } = await sb
      .from("skus")
      .update({ image_url: `/products/${slug}.jpg` })
      .eq("slug", slug);
    if (error) console.error(`  ✗ ${slug}: ${error.message}`);
    else console.log(`  ✓ ${slug}`);
  }
}
