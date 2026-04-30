#!/usr/bin/env node
/**
 * Scrape product images for the SKUs missing image_url, trying multiple
 * sources and search engines until we find something or run out.
 *
 * Strategy:
 *   1. Build a rich query from the slug + (year, brand, set_name, product, sport).
 *   2. Try direct retailer search pages (Steel City, DA Card World, Blowout)
 *      via their public listing HTML, parsing image URLs out.
 *   3. Try Bing image search (no-JS HTML, returns direct image URLs).
 *   4. Try DuckDuckGo image search.
 *   5. For each candidate URL: HEAD-check the host is allowed, GET it with
 *      a real browser User-Agent + Referer, save to public/products/<slug>.jpg.
 *   6. Update Supabase image_url at the end for everything that succeeded.
 *
 * Run: node --env-file=.env.local scripts/scrape-product-images.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRODUCTS_DIR = resolve(__dirname, "..", "public", "products");
if (!existsSync(PRODUCTS_DIR)) mkdirSync(PRODUCTS_DIR, { recursive: true });

const ALLOWED_HOSTS = [
  "steelcitycollectibles.com",
  "blowoutcards.com",
  "dacardworld.com",
  "dacardworld1.imgix.net",
  "imgix.net",
  "beckett-news.com",
  "beckett.com",
  "cardboardconnection.com",
  "tcdb.com",
  "ebayimg.com",
  "i.ebayimg.com",
  "amazon.com",
  "media-amazon.com",
  "ssl-images-amazon.com",
  "shopify.com",
  "shopifycdn.com",
  "cdn.shopify.com",
  "cloudfront.net",
  "paniniamerica.net",
  "topps.com",
  "shop.topps.com",
  "panini.com",
  "shop.panini.com",
  "upperdeck.com",
  "pokemoncenter.com",
  "tcgplayer.com",
  "tcgplayer-cdn.tcgplayer.com",
  "wiki.dpbolvw.net",
  "thecardboardconnection.com",
  "imgur.com",
  "googleusercontent.com", // Google's image proxy
  "cdn11.bigcommerce.com",
  "bigcommerce.com",
  "diamondcardsonline.com",
  "aamintcards.com",
  "directhitsports.com",
  "rookies-cards.com",
  "shoptcgo.com",
  "shopify.com",
  "myshopify.com",
];

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function fetchHtml(url, extra = {}) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      ...extra,
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.text();
}

function isAllowed(url) {
  try {
    const u = new URL(url);
    return ALLOWED_HOSTS.some(
      (h) => u.hostname === h || u.hostname.endsWith(`.${h}`),
    );
  } catch {
    return false;
  }
}

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
  // Standard image URL pattern (jpg/png/webp), optionally with query string.
  const re1 = /https?:\/\/[^\s"'<>)]+?\.(?:jpe?g|png|webp)(?:\?[^\s"'<>)]*)?/gi;
  for (const m of decoded.match(re1) ?? []) matches.add(m);
  // OG meta tags (often the canonical product image).
  const re2 = /<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/gi;
  let mm;
  while ((mm = re2.exec(decoded)) !== null) matches.add(mm[1]);
  // Bing-specific: image URLs sit inside `murl":"<url>"` snippets, sometimes
  // pointing at hosts without a clean extension in the path.
  const re3 = /"murl":"(https?:\/\/[^"]+)"/g;
  while ((mm = re3.exec(decoded)) !== null) matches.add(mm[1]);
  // src/srcset/data-src attributes that might use Imgix/CDN proxies without
  // an explicit extension on the URL.
  const re4 = /(?:src|data-src|srcset)=["']([^"']+(?:imgix|cloudfront|amazonaws|bigcommerce)[^"']+)["']/gi;
  while ((mm = re4.exec(decoded)) !== null) {
    const first = mm[1].split(/\s+/)[0];
    if (first) matches.add(first);
  }
  return [...matches];
}

async function searchBingImages(query) {
  // Bing's static image search HTML embeds the original image URL in
  // `murl&quot;:&quot;<URL>&quot;` snippets (HTML-entity-encoded). The
  // generic extractImageUrls() handles entity decoding + the murl pattern.
  const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2`;
  const html = await fetchHtml(url, { Referer: "https://www.bing.com/" });
  return extractImageUrls(html);
}

async function searchDuckDuckGoImages(query) {
  // DDG's image search has a token-protected JSON API. Use HTML instead.
  const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iar=images&iax=images&ia=images`;
  const html = await fetchHtml(url, { Referer: "https://duckduckgo.com/" });
  return extractImageUrls(html);
}

async function searchGoogleImages(query) {
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch&hl=en`;
  const html = await fetchHtml(url);
  return extractImageUrls(html);
}

async function downloadImage(url, dest, referer) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8",
      Referer: referer ?? new URL(url).origin,
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 5000) throw new Error(`only ${buf.length} bytes`);
  // Sanity: must start with a known image magic byte.
  const sig = buf.slice(0, 4).toString("hex");
  const ok =
    sig.startsWith("ffd8") ||      // JPEG
    sig.startsWith("89504e47") ||  // PNG
    sig.startsWith("52494646") ||  // RIFF (webp)
    sig.startsWith("47494638");    // GIF
  if (!ok) throw new Error(`not an image (sig=${sig})`);
  writeFileSync(dest, buf);
  return buf.length;
}

function richQuery(s) {
  // Slug already has the canonical name. Use it as a phrase + add "sealed".
  const fromSlug = s.slug.replace(/-/g, " ");
  return `${fromSlug} sealed`;
}

async function processSku(s) {
  const dest = resolve(PRODUCTS_DIR, `${s.slug}.jpg`);
  if (existsSync(dest) && statSync(dest).size > 5000) {
    console.log(`\n→ ${s.slug}\n  (already on disk, skipping)`);
    return true;
  }
  const query = richQuery(s);
  console.log(`\n→ ${s.slug}`);
  console.log(`  query: ${query}`);

  const sources = [
    ["bing", searchBingImages],
    ["google", searchGoogleImages],
    ["ddg", searchDuckDuckGoImages],
  ];

  for (const [name, fn] of sources) {
    let urls;
    try {
      urls = await fn(query);
    } catch (e) {
      console.log(`  ${name}: search failed (${e.message})`);
      continue;
    }
    const allowed = urls.filter(isAllowed);
    console.log(
      `  ${name}: ${urls.length} hit(s), ${allowed.length} from allowed hosts`,
    );

    // Try allowed hosts first, then any image as fallback.
    const ordered = [...allowed, ...urls.filter((u) => !allowed.includes(u))];
    for (const url of ordered.slice(0, 8)) {
      try {
        const size = await downloadImage(url, dest);
        const host = new URL(url).hostname;
        console.log(`  ✓ ${(size / 1024).toFixed(0)} KB ← ${host}`);
        return true;
      } catch (e) {
        // Quiet on failures — there are usually many.
      }
    }
  }
  return false;
}

async function main() {
  const { data: skus, error } = await sb.from("skus").select("*");
  if (error) throw error;
  const missing = skus.filter((s) => !s.image_url);
  console.log(`Found ${missing.length} SKUs missing image_url\n`);

  const succeeded = [];
  for (const s of missing) {
    const ok = await processSku(s);
    if (ok) succeeded.push(s);
    // Polite delay so we don't hammer.
    await new Promise((r) => setTimeout(r, 1200));
  }

  if (succeeded.length > 0) {
    console.log(`\n--- Updating Supabase rows ---`);
    for (const s of succeeded) {
      const path = `/products/${s.slug}.jpg`;
      const { error: updErr } = await sb
        .from("skus")
        .update({ image_url: path })
        .eq("id", s.id);
      if (updErr) console.error(`  ✗ ${s.slug}: ${updErr.message}`);
      else console.log(`  ✓ ${s.slug} → ${path}`);
    }
  }

  console.log(`\n=== ${succeeded.length}/${missing.length} resolved ===`);
  if (succeeded.length < missing.length) {
    const failed = missing.filter((s) => !succeeded.includes(s));
    console.log(`\nStill missing (gradient placeholder will show):`);
    for (const s of failed) console.log(`  ${s.slug}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
