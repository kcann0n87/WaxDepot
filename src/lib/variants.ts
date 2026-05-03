/**
 * Display labels and ordering for variant_type values stored on the skus
 * table. Each release has 1-N variants (Hobby Box, Hobby Case, Mega Box,
 * Mega Case, etc.) — the product page groups them under a shared
 * variant_group slug and lets buyers toggle between markets.
 *
 * Brand-naming notes:
 *   - Topps uses "First Day Issue" (FDI) for early-print variants
 *   - Panini uses "First Off The Line" (FOTL) for the same idea
 * The two are distinct variant_types so display labels stay accurate.
 *
 * Case naming convention: every "*-box" variant has a "*-case" sibling
 * (e.g. mega-box / mega-case). Cases are real SKUs with their own market
 * — a sealed mega case isn't priced as 6× the per-box rate; it has its
 * own bid/ask.
 */

export const VARIANT_LABELS: Record<string, string> = {
  // Single-box variants
  "blaster-box": "Blaster Box",
  "hanger-box": "Hanger Box",
  "value-box": "Value Box",
  "mega-box": "Mega Box",
  "hobby-box": "Hobby Box",
  "fotl-hobby-box": "FOTL Hobby Box",
  "first-day-issue-hobby-box": "First Day Issue Hobby Box",
  "first-day-issue-hobby-jumbo-box": "First Day Issue Jumbo Box",
  "jumbo-box": "Jumbo Box",
  "hobby-jumbo-box": "Hobby Jumbo Box",
  "booster-box": "Booster Box",
  "elite-trainer-box": "Elite Trainer Box",
  "inner-case": "Inner Case",
  // Sealed-case variants (one per box config above)
  "blaster-case": "Blaster Case",
  "hanger-case": "Hanger Case",
  "value-case": "Value Case",
  "mega-case": "Mega Case",
  "hobby-case": "Hobby Case",
  "fotl-hobby-case": "FOTL Hobby Case",
  "first-day-issue-hobby-case": "First Day Issue Hobby Case",
  "jumbo-case": "Jumbo Case",
  "hobby-jumbo-case": "Hobby Jumbo Case",
  "booster-box-case": "Booster Box Case",
  "elite-trainer-box-case": "Elite Trainer Box Case",
  // Fallback for SKUs that didn't match any known suffix during the 0013
  // backfill. Renders as the human-readable product field instead.
  box: "Box",
};

// Cheapest/smallest → most expensive/largest. Used to lay out the variant
// selector in the order most buyers expect to see it. Single-box variants
// listed first; case variants follow in the same order.
const VARIANT_ORDER: string[] = [
  // Single boxes — retail
  "blaster-box",
  "hanger-box",
  "value-box",
  "mega-box",
  // Single boxes — hobby
  "hobby-box",
  "fotl-hobby-box",
  "first-day-issue-hobby-box",
  "jumbo-box",
  "hobby-jumbo-box",
  "first-day-issue-hobby-jumbo-box",
  // TCG single
  "booster-box",
  "elite-trainer-box",
  // Special
  "inner-case",
  // Cases — retail
  "blaster-case",
  "hanger-case",
  "value-case",
  "mega-case",
  // Cases — hobby
  "hobby-case",
  "fotl-hobby-case",
  "first-day-issue-hobby-case",
  "jumbo-case",
  "hobby-jumbo-case",
  // TCG case
  "booster-box-case",
  "elite-trainer-box-case",
];

/**
 * Visual grouping for the variant selector — five buckets so buyers
 * see a clean "single box vs case, hobby vs retail" decision instead of
 * one long row of chips. Order within each group still follows
 * VARIANT_ORDER.
 */
export type VariantGroup =
  | "hobby-box"
  | "retail-box"
  | "hobby-case"
  | "retail-case"
  | "tcg";

const VARIANT_GROUP_MAP: Record<string, VariantGroup> = {
  // Hobby / premium single-box product
  "hobby-box": "hobby-box",
  "fotl-hobby-box": "hobby-box",
  "first-day-issue-hobby-box": "hobby-box",
  "jumbo-box": "hobby-box",
  "hobby-jumbo-box": "hobby-box",
  "first-day-issue-hobby-jumbo-box": "hobby-box",
  // Retail single-box product (Walmart / Target shelf SKUs)
  "blaster-box": "retail-box",
  "hanger-box": "retail-box",
  "value-box": "retail-box",
  "mega-box": "retail-box",
  // Sealed cases — hobby
  "hobby-case": "hobby-case",
  "fotl-hobby-case": "hobby-case",
  "first-day-issue-hobby-case": "hobby-case",
  "jumbo-case": "hobby-case",
  "hobby-jumbo-case": "hobby-case",
  "inner-case": "hobby-case",
  // Sealed cases — retail
  "blaster-case": "retail-case",
  "hanger-case": "retail-case",
  "value-case": "retail-case",
  "mega-case": "retail-case",
  // TCG (Pokemon, etc.)
  "booster-box": "tcg",
  "elite-trainer-box": "tcg",
  "booster-box-case": "tcg",
  "elite-trainer-box-case": "tcg",
};

export const VARIANT_GROUP_LABEL: Record<VariantGroup, string> = {
  "hobby-box": "Hobby box",
  "retail-box": "Retail box",
  "hobby-case": "Hobby case",
  "retail-case": "Retail case",
  tcg: "TCG",
};

export function variantGroupOf(type: string | null | undefined): VariantGroup {
  if (!type) return "hobby-box";
  return VARIANT_GROUP_MAP[type] ?? "hobby-box";
}

export function variantLabel(type: string | null | undefined): string {
  if (!type) return "Box";
  return (
    VARIANT_LABELS[type] ??
    type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function variantSortIndex(type: string | null | undefined): number {
  if (!type) return VARIANT_ORDER.length;
  const i = VARIANT_ORDER.indexOf(type);
  return i === -1 ? VARIANT_ORDER.length : i;
}

export function sortByVariantOrder<T extends { variantType?: string | null }>(
  arr: T[],
): T[] {
  return [...arr].sort(
    (a, b) =>
      variantSortIndex(a.variantType ?? null) -
      variantSortIndex(b.variantType ?? null),
  );
}
