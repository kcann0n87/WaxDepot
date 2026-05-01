#!/usr/bin/env node
/**
 * Aggressive image scraper for the SKUs that the main scrape-product-images.mjs
 * couldn't resolve. Differences from the main script:
 *   1. Hand-tuned alternate queries per slug (no quoted phrase requirement).
 *   2. Drops the allowed-hosts filter — anywhere with an image of the box
 *      is fine for these stragglers.
 *   3. Tries direct manufacturer slugs on Topps / Panini / shop pages.
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRODUCTS_DIR = resolve(__dirname, "..", "public", "products");
if (!existsSync(PRODUCTS_DIR)) mkdirSync(PRODUCTS_DIR, { recursive: true });

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// Hand-tuned queries that searched well during interactive debugging.
// One slug → multiple candidate queries; whichever returns a usable image wins.
const QUERIES = {
  "2025-26-panini-prizm-basketball-fotl-hobby-box": [
    "panini prizm basketball 2024-25 first off the line hobby box",
    "panini prizm 2024-25 fotl basketball box",
    "prizm fotl basketball hobby",
  ],
  "2025-panini-immaculate-football-hobby-box": [
    "2024 panini immaculate football hobby box",
    "panini immaculate football hobby box sealed",
    "immaculate football 2024 hobby",
  ],
  "2025-bowman-platinum-baseball-hobby-box": [
    "2025 bowman platinum baseball hobby box",
    "bowman platinum 2025 baseball box",
    "topps bowman platinum 2025 hobby",
  ],
  "2025-26-topps-bowman-best-basketball-hobby-box": [
    "topps bowman best basketball hobby box",
    "bowman best basketball box 2025",
    "topps bowman basketball hobby box",
  ],
  "2025-26-topps-bowman-u-basketball-hobby-box": [
    "topps bowman university basketball hobby box",
    "bowman university basketball 2025",
    "bowman u basketball ncaa hobby",
  ],
  "2025-26-topps-chrome-basketball-fotl-hobby-box": [
    "topps chrome basketball first off the line hobby box",
    "topps chrome 2025-26 basketball fotl",
    "topps chrome basketball fotl hobby",
  ],
  "2025-topps-chrome-football-blaster-box": [
    "2025 topps chrome football blaster box walmart",
    "topps chrome football 2025 retail blaster",
    "topps chrome nfl 2025 blaster box",
  ],
  "2025-topps-chrome-football-fotl-hobby-box": [
    "2025 topps chrome football first off the line hobby",
    "topps chrome nfl 2025 fotl hobby box",
    "topps chrome football fotl 2025",
  ],
};

function decodeEntities(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function extractImageUrls(html) {
  const decoded = decodeEntities(html);
  const matches = new Set();
  const re1 = /https?:\/\/[^\s"'<>)]+?\.(?:jpe?g|png|webp)(?:\?[^\s"'<>)]*)?/gi;
  for (const m of decoded.match(re1) ?? []) matches.add(m);
  const re3 = /"murl":"(https?:\/\/[^"]+)"/g;
  let mm;
  while ((mm = re3.exec(decoded)) !== null) matches.add(mm[1]);
  return [...matches];
}

async function searchBing(query) {
  const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://www.bing.com/",
    },
  });
  if (!res.ok) throw new Error(`bing ${res.status}`);
  return extractImageUrls(await res.text());
}

async function downloadImage(url, dest) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8",
      Referer: new URL(url).origin,
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 5000) throw new Error(`only ${buf.length} bytes`);
  const sig = buf.slice(0, 4).toString("hex");
  const ok =
    sig.startsWith("ffd8") ||
    sig.startsWith("89504e47") ||
    sig.startsWith("52494646") ||
    sig.startsWith("47494638");
  if (!ok) throw new Error(`not an image (sig=${sig})`);
  writeFileSync(dest, buf);
  return buf.length;
}

function urlMatches(url, slug) {
  const lower = decodeURIComponent(url).toLowerCase();

  // Sport must match
  if (slug.includes("basketball") && !lower.includes("basketball")) return false;
  if (slug.includes("football") && !lower.includes("football")) return false;
  if (slug.includes("baseball") && !lower.includes("baseball")) return false;
  if (slug.includes("hockey") && !lower.includes("hockey")) return false;

  // Brand/set token must appear
  const setTokens = [
    "prizm",
    "chrome",
    "platinum",
    "bowman",
    "immaculate",
    "spectra",
    "donruss",
    "contenders",
    "select",
    "mosaic",
    "inception",
    "stadium",
    "monopoly",
  ];
  const wantedSets = setTokens.filter((t) => slug.toLowerCase().includes(t));
  if (wantedSets.length > 0 && !wantedSets.some((t) => lower.includes(t))) return false;

  // Wrong-product disambiguators
  if (slug.includes("basketball") && !slug.includes("wnba") && lower.includes("wnba")) return false;
  if (slug.includes("football") && lower.includes("/pfl")) return false;

  // For specific retail tier, prefer URLs that mention it
  if (slug.includes("blaster") && !lower.includes("blaster")) return false;
  if (slug.includes("hanger") && !lower.includes("hanger")) return false;
  if (slug.includes("mega-box") && !lower.includes("mega")) return false;
  if (slug.includes("fotl") && !lower.includes("fotl") && !lower.includes("first-off")) return false;

  return true;
}

function looksLikeBox(url) {
  const lower = decodeURIComponent(url).toLowerCase();
  let score = 0;
  if (lower.includes("hobby-box") || lower.includes("hobby_box")) score += 2;
  if (lower.includes("blaster")) score += 2;
  if (lower.includes("hanger")) score += 2;
  if (lower.includes("mega-box") || lower.includes("megabox")) score += 2;
  if (/[/_-]box[._-]/.test(lower) || lower.endsWith("-box.jpg")) score += 1;
  if (lower.includes("first-buzz") || lower.includes("checklist")) score -= 2;
  if (lower.includes("autograph") || lower.includes("rookie-card")) score -= 1;
  return score;
}

async function processSlug(slug) {
  const dest = resolve(PRODUCTS_DIR, `${slug}.jpg`);
  if (existsSync(dest) && statSync(dest).size > 5000) {
    return { ok: true, reason: "already on disk" };
  }
  const queries = QUERIES[slug] ?? [slug.replace(/-/g, " ")];
  for (const q of queries) {
    let urls;
    try {
      urls = await searchBing(q);
    } catch (e) {
      console.log(`    bing failed for "${q}": ${e.message}`);
      continue;
    }
    const matched = urls.filter((u) => urlMatches(u, slug));
    const sorted = [...matched].sort((a, b) => looksLikeBox(b) - looksLikeBox(a));
    console.log(
      `    "${q}" → ${urls.length} raw, ${matched.length} match, top score ${looksLikeBox(sorted[0] || "")}`,
    );
    for (const u of sorted.slice(0, 6)) {
      try {
        const size = await downloadImage(u, dest);
        const host = new URL(u).hostname;
        return { ok: true, host, size };
      } catch {
        /* try next */
      }
    }
    // Polite delay between queries.
    await new Promise((r) => setTimeout(r, 800));
  }
  return { ok: false };
}

const slugs = Object.keys(QUERIES);
console.log(`Stragglers — trying ${slugs.length} SKUs with hand-tuned queries\n`);
const succeeded = [];
for (const slug of slugs) {
  console.log(`→ ${slug}`);
  const result = await processSlug(slug);
  if (result.ok) {
    console.log(`  ✓ ${result.size ? `${(result.size / 1024).toFixed(0)} KB` : ""} ${result.host || result.reason}`);
    succeeded.push(slug);
  } else {
    console.log(`  ✗ no usable match`);
  }
  await new Promise((r) => setTimeout(r, 1500));
}

if (succeeded.length > 0) {
  console.log(`\nUpdating ${succeeded.length} Supabase rows…`);
  for (const slug of succeeded) {
    const path = `/products/${slug}.jpg`;
    const { error } = await sb.from("skus").update({ image_url: path }).eq("slug", slug);
    if (error) console.log(`  ✗ ${slug}: ${error.message}`);
    else console.log(`  ✓ ${slug}`);
  }
}

console.log(`\n=== ${succeeded.length}/${slugs.length} resolved ===`);
const failed = slugs.filter((s) => !succeeded.includes(s));
if (failed.length > 0) {
  console.log("\nStill no image — upload manually via /admin/catalog:");
  for (const s of failed) console.log(`  ${s}`);
}
