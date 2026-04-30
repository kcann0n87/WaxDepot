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

async function searchEbayListings(query) {
  // eBay's product listing pages have very high-quality seller-uploaded
  // photos hosted at i.ebayimg.com. Sellers always include the product
  // name in the listing title, so eBay's search has tight relevance —
  // exactly what we want for the "is this the right product?" check.
  const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(
    query,
  )}&_sacat=0&LH_BIN=1`;
  const html = await fetchHtml(url, { Referer: "https://www.ebay.com/" });
  // eBay tile images live in `s-l<size>.jpg` format. Pull every i.ebayimg URL.
  const out = new Set();
  const re = /https?:\/\/i\.ebayimg\.com\/[^\s"'<>)]+\.(?:jpe?g|png|webp)(?:\?[^\s"'<>)]*)?/gi;
  for (const m of html.match(re) ?? []) {
    // Bump up the size suffix to s-l1600 for max resolution.
    out.add(m.replace(/s-l\d+\.(jpe?g|png|webp)/i, "s-l1600.$1"));
  }
  return [...out];
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
  // Slug as a quoted phrase forces the search engine to keep the product
  // name intact instead of returning related products. Without quotes,
  // "panini prizm basketball" matched WNBA Prizm; with quotes, only the
  // exact NBA SKU matches.
  const fromSlug = s.slug.replace(/-/g, " ");
  return `"${fromSlug}"`;
}

/**
 * Keywords from the slug that MUST appear in a candidate URL's path/file.
 * Filters out related-but-wrong products. e.g. for slug
 * "2024-25-panini-spectra-basketball-hobby-box", we require the URL to
 * contain "spectra" so we don't accept a Select or Prizm result.
 *
 * Hand-pick the distinctive words per product line.
 */
function distinctiveTokens(slug) {
  // Strip filler words; keep brand/set/variant + product type.
  const tokens = slug
    .toLowerCase()
    .replace(/^\d{4}(-\d{2})?-/, "") // drop leading year
    .split("-")
    .filter((t) => !["hobby", "box", "the", "of", "and"].includes(t));
  return tokens;
}

/** Tokens that MUST appear in a candidate URL — sport + year + variant. */
function requiredTokensFor(slug) {
  const lower = slug.toLowerCase();
  const required = [];
  // Year — match the leading 4-digit year as either "2025" or "2025-26"-style.
  const yearMatch = lower.match(/^(\d{4})(?:-(\d{2}))?/);
  if (yearMatch) {
    const y = yearMatch[1];
    // We accept "2025" alone (covers all "2025/26" variants) so this stays loose.
    required.push(y);
  }
  // Sport — must appear since search engines confuse Baseball/Basketball/etc.
  if (lower.includes("basketball")) required.push("basketball");
  else if (lower.includes("baseball")) required.push("baseball");
  else if (lower.includes("football")) required.push("football");
  else if (lower.includes("hockey")) required.push("hockey");
  else if (lower.includes("pokemon")) required.push("pokemon");
  // Variant / set name — same logic as before, distilled.
  const setNames = [
    "prizm",
    "donruss",
    "contenders",
    "immaculate",
    "spectra",
    "platinum",
    "chrome",
    "update",
    "bowman",
    "topps",
    "panini",
    "sp-authentic",
    "sp",
    "monopoly",
    "fotl",
    "journey-together",
    "journey",
    "destined-rivals",
    "destined",
    "rivals",
  ];
  for (const n of setNames) {
    if (lower.includes(n) && !required.includes(n)) {
      // sp-authentic is more specific than sp; only require the longest match.
      if (n === "sp" && lower.includes("sp-authentic")) continue;
      required.push(n);
    }
  }
  return required;
}

/** Tokens that must NOT appear — wrong-product-type disambiguators. */
function negativeTokensFor(slug) {
  const lower = slug.toLowerCase();
  const out = [
    // Generic placeholder pages that show "anticipated release" cards instead
    // of a real box photo.
    "anticipated",
    "coming-soon",
    "presale-graphic",
  ];
  // Slug is a hobby BOX → reject single-pack listings.
  if (lower.includes("box")) {
    out.push(
      "booster-pack",
      "booster_pack",
      "single-pack",
      "1-pack",
      "additional-game-cards",
    );
  }
  // NBA basketball slugs that aren't WNBA → reject WNBA-named URLs.
  if (lower.includes("basketball") && !lower.includes("wnba")) out.push("wnba");
  // NFL football slugs → reject PFL (mixed martial arts) Contenders.
  if (lower.includes("-football-")) out.push("pfl-", "-pfl", "/pfl");
  // Booster Box (Pokemon) → reject Elite Trainer Box (ETB) URLs.
  if (lower.includes("booster-box")) {
    out.push("elite-trainer-box", "elite_trainer_box", "elitetrainerbox", "etb-", "-etb");
  }
  // Hobby Box → reject blaster, mega, value, retail.
  if (lower.includes("hobby-box") && !lower.includes("jumbo")) {
    out.push("blaster", "mega-box", "megabox", "retail-box", "value-box", "jumbo-box");
  }
  // Authentic-named products → don't accept "game-used" variants.
  if (lower.includes("sp-authentic")) out.push("game-used", "gameused");
  if (lower.includes("-sp-hockey-")) out.push("authentic", "game-used");
  // Update series → must say "update", reject Series-1/Series-2 pure URLs.
  if (lower.includes("topps-update") || lower.includes("topps-chrome-update")) {
    out.push("series-1", "series-2", "series1", "series2");
    if (lower.includes("topps-chrome-update")) out.push("sapphire-edition", "sapphire_edition");
  }
  return out;
}

function urlMatchesProduct(url, slug) {
  const lower = decodeURIComponent(url).toLowerCase();
  // Every required token must appear (year + sport + variant).
  const required = requiredTokensFor(slug);
  if (!required.every((t) => lower.includes(t))) return false;
  // No negative tokens.
  const negatives = negativeTokensFor(slug);
  if (negatives.some((n) => lower.includes(n))) return false;
  return true;
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
    // eBay first — highest signal-to-noise because seller titles are
    // strict about product names, and image quality is professional.
    ["ebay", searchEbayListings],
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
    const matchesProduct = urls.filter((u) => urlMatchesProduct(u, s.slug));
    const allowed = matchesProduct.filter(isAllowed);
    console.log(
      `  ${name}: ${urls.length} raw, ${matchesProduct.length} match product, ${allowed.length} from allowed hosts`,
    );

    // Priority: matching+allowed > matching > nothing. Skip non-matching
    // entirely — accepting them is what produced wrong images last time.
    const ordered = [...allowed, ...matchesProduct.filter((u) => !allowed.includes(u))];
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
