#!/usr/bin/env node
// Reads /public/products/ vs scripts/seed-data.mjs to find image files that
// don't yet have a SKU, parses each slug into year/brand/set/sport/product,
// and emits SQL INSERT statements you can paste into Supabase to create the
// missing SKUs.
//
// Usage: node scripts/_generate-orphan-skus.mjs > /tmp/orphan-skus.sql
//
// The variant_group + variant_type columns are NOT in the INSERT — the
// trigger from migration 0013 derives them automatically from the slug.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = path.join(ROOT, "public", "products");
const SEED = path.join(ROOT, "scripts", "seed-data.mjs");

// Variants ordered longest-suffix-first so suffix matching is greedy.
const VARIANTS = [
  // Case variants (longest suffixes first)
  "first-day-issue-hobby-jumbo-case",
  "first-day-issue-hobby-case",
  "fotl-hobby-case",
  "elite-trainer-box-case",
  "booster-box-case",
  "hobby-jumbo-case",
  "hobby-case",
  "jumbo-case",
  "mega-case",
  "blaster-case",
  "hanger-case",
  "value-case",
  "inner-case",
  // Box variants
  "first-day-issue-hobby-jumbo-box",
  "first-day-issue-hobby-box",
  "fotl-hobby-box",
  "hobby-jumbo-box",
  "elite-trainer-box",
  "booster-box",
  "hobby-box",
  "jumbo-box",
  "mega-box",
  "blaster-box",
  "hanger-box",
  "value-box",
];

const PRODUCT_LABELS = {
  // Boxes
  "hobby-box": "Hobby Box",
  "jumbo-box": "Jumbo Box",
  "hobby-jumbo-box": "Hobby Jumbo Box",
  "mega-box": "Mega Box",
  "blaster-box": "Blaster Box",
  "hanger-box": "Hanger Box",
  "value-box": "Value Box",
  "fotl-hobby-box": "FOTL Hobby Box",
  "first-day-issue-hobby-box": "First Day Issue Hobby Box",
  "first-day-issue-hobby-jumbo-box": "First Day Issue Jumbo Box",
  "booster-box": "Booster Box",
  "elite-trainer-box": "Elite Trainer Box",
  // Cases
  "hobby-case": "Hobby Case",
  "jumbo-case": "Jumbo Case",
  "hobby-jumbo-case": "Hobby Jumbo Case",
  "mega-case": "Mega Case",
  "blaster-case": "Blaster Case",
  "hanger-case": "Hanger Case",
  "value-case": "Value Case",
  "fotl-hobby-case": "FOTL Hobby Case",
  "first-day-issue-hobby-case": "First Day Issue Hobby Case",
  "first-day-issue-hobby-jumbo-case": "First Day Issue Jumbo Case",
  "booster-box-case": "Booster Box Case",
  "elite-trainer-box-case": "Elite Trainer Box Case",
  "inner-case": "Inner Case",
};

const SPORT_FROM_WORD = {
  basketball: "NBA",
  football: "NFL",
  baseball: "MLB",
  hockey: "NHL",
};

const BRANDS = ["upper-deck", "panini", "topps", "bowman"];

// Educated-guess release dates per (sport, year). Sport seasons:
//   NBA: starts October, peaks Dec–March
//   NFL: starts September, peaks Oct–Dec
//   MLB: starts April, peaks June–Sept
//   NHL: starts October, peaks Dec–Feb
const releaseGuess = (year, sportWord) => {
  switch (sportWord) {
    case "basketball":
      return `${year + 1}-02-15`;
    case "football":
      return `${year}-10-15`;
    case "baseball":
      return `${year}-07-15`;
    case "hockey":
      return `${year + 1}-02-15`;
    default:
      return `${year}-06-15`;
  }
};

const cap = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const titleize = (slug) => slug.split("-").map(cap).join(" ");

function parseSlug(slug) {
  const yearMatch = slug.match(/^(\d{4})(?:-(\d{2}))?-(.+)$/);
  if (!yearMatch) return null;
  const year = parseInt(yearMatch[1], 10);
  const yearFull = yearMatch[2] ? `${yearMatch[1]}-${yearMatch[2]}` : yearMatch[1];
  let rest = yearMatch[3];

  let variantType = null;
  for (const v of VARIANTS) {
    if (rest.endsWith(`-${v}`)) {
      variantType = v;
      rest = rest.slice(0, -(`-${v}`.length));
      break;
    }
  }
  if (!variantType) return null;

  const sportMatch = rest.match(/^(.+?)-(basketball|football|baseball|hockey)$/);
  if (!sportMatch) return null;
  const sportWord = sportMatch[2];
  const sport = SPORT_FROM_WORD[sportWord];
  rest = sportMatch[1];

  let brand = null;
  for (const b of BRANDS) {
    if (rest === b || rest.startsWith(`${b}-`)) {
      brand = b === "upper-deck" ? "Upper Deck" : cap(b);
      rest = rest === b ? "" : rest.slice(b.length + 1);
      break;
    }
  }
  if (!brand) return null;

  let setName;
  if (rest === "") {
    // Flagship release of the brand (e.g. "2025 Bowman Baseball Hobby Box")
    setName = brand;
  } else {
    setName = titleize(rest);
    // Bowman convention: subsets like "Bowman Chrome", "Bowman Platinum"
    // include the brand name in the set. Prepend if it's missing.
    if (brand === "Bowman" && !setName.startsWith("Bowman")) {
      setName = `Bowman ${setName}`;
    }
  }

  return {
    year,
    yearFull,
    brand,
    sport,
    sportWord,
    setName,
    productKey: variantType,
    productLabel: PRODUCT_LABELS[variantType],
    releaseDate: releaseGuess(year, sportWord),
  };
}

// SQL string-literal escape (double single-quotes).
const sql = (s) => s.replace(/'/g, "''");

// Pull the existing slug list out of seed-data.mjs.
const seedSrc = readFileSync(SEED, "utf8");
const seedSlugs = new Set(
  [...seedSrc.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]),
);

// Find image files without a corresponding SKU in the seed.
const files = readdirSync(SRC)
  .filter((f) => f.endsWith(".jpg"))
  .map((f) => f.slice(0, -4))
  .sort();

const orphans = files.filter((slug) => !seedSlugs.has(slug));

const rows = [];
const skipped = [];
for (const slug of orphans) {
  const parsed = parseSlug(slug);
  if (!parsed) {
    skipped.push(slug);
    continue;
  }
  // Avoid "Bowman Bowman Chrome" — when the set name already starts with
  // the brand (Bowman convention), use it alone; otherwise prepend brand.
  const titleHead = parsed.setName.startsWith(parsed.brand)
    ? `${parsed.yearFull} ${parsed.setName}`
    : `${parsed.yearFull} ${parsed.brand} ${parsed.setName}`;
  const description = `${titleHead} ${parsed.sport === "Pokemon" ? "TCG" : parsed.sport} ${parsed.productLabel}.`;
  rows.push(
    `  ('${slug}', ${parsed.year}, '${sql(parsed.brand)}', '${parsed.sport}', '${sql(parsed.setName)}', '${parsed.productLabel}', '${parsed.releaseDate}', '${sql(description)}', '/products/${slug}.jpg', '#475569', '#0f172a')`,
  );
}

console.log(
  `-- Auto-generated by scripts/_generate-orphan-skus.mjs on ${new Date().toISOString().slice(0, 10)}.`,
);
console.log(`-- ${rows.length} new SKU(s) for orphan images.`);
console.log(`-- variant_group + variant_type derived automatically by the`);
console.log(`-- skus_derive_variant_trigger from migration 0013.\n`);

if (rows.length > 0) {
  console.log(
    "insert into skus (slug, year, brand, sport, set_name, product, release_date, description, image_url, gradient_from, gradient_to)\nvalues",
  );
  console.log(rows.join(",\n"));
  console.log("on conflict (slug) do nothing;");
}

if (skipped.length > 0) {
  console.log(`\n-- Skipped ${skipped.length} unparseable slug(s):`);
  for (const s of skipped) console.log(`--   ${s}`);
}
