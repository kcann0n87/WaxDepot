"use client";

import Link from "next/link";
import {
  variantGroupOf,
  variantLabel,
  VARIANT_GROUP_LABEL,
  type VariantGroup,
} from "@/lib/variants";
import { formatUSD } from "@/lib/utils";

export type VariantOption = {
  variantType: string;
  lowestAskCents: number | null;
};

const GROUP_ORDER: VariantGroup[] = [
  "hobby-box",
  "retail-box",
  "hobby-case",
  "retail-case",
  "tcg",
];

const GROUP_ACCENT: Record<VariantGroup, string> = {
  "hobby-box": "text-amber-400/80",
  "retail-box": "text-sky-400/80",
  "hobby-case": "text-fuchsia-400/80",
  "retail-case": "text-rose-400/80",
  tcg: "text-emerald-400/80",
};

/**
 * Variant selector grouped by Box / Retail / Case / TCG so buyers see the
 * "single box vs sealed case" decision as a top-level scan instead of one
 * long row of chips. Each group renders its own labeled section; groups
 * with no variants are skipped entirely.
 *
 * Active variant is bordered amber and bold; inactive variants are normal
 * weight and link to /product/<group>?variant=<type> with scroll: false
 * so the page state survives the navigation.
 */
export function VariantSelector({
  groupSlug,
  variants,
  activeType,
}: {
  groupSlug: string;
  variants: VariantOption[];
  activeType: string;
}) {
  if (variants.length <= 1) return null;

  // Bucket variants by their semantic group.
  const buckets = new Map<VariantGroup, VariantOption[]>();
  for (const v of variants) {
    const g = variantGroupOf(v.variantType);
    if (!buckets.has(g)) buckets.set(g, []);
    buckets.get(g)!.push(v);
  }
  const visibleGroups = GROUP_ORDER.filter((g) => buckets.has(g));

  return (
    <div className="mb-6 space-y-4">
      <div className="text-[10px] font-semibold tracking-[0.18em] text-amber-400/80 uppercase">
        Variants
      </div>
      {visibleGroups.map((g) => (
        <div key={g}>
          {visibleGroups.length > 1 && (
            <div
              className={`mb-1.5 text-[10px] font-semibold tracking-[0.15em] uppercase ${GROUP_ACCENT[g]}`}
            >
              {VARIANT_GROUP_LABEL[g]}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {buckets.get(g)!.map((v) => (
              <VariantChip
                key={v.variantType}
                groupSlug={groupSlug}
                variant={v}
                active={v.variantType === activeType}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function VariantChip({
  groupSlug,
  variant,
  active,
}: {
  groupSlug: string;
  variant: VariantOption;
  active: boolean;
}) {
  const ask =
    variant.lowestAskCents !== null
      ? formatUSD(variant.lowestAskCents / 100)
      : null;
  return (
    <Link
      href={`/product/${groupSlug}?variant=${variant.variantType}`}
      aria-current={active ? "page" : undefined}
      scroll={false}
      className={
        active
          ? "rounded-md border border-amber-400/60 bg-amber-500/[0.08] px-3 py-2 text-sm font-bold text-amber-200 shadow-md shadow-amber-500/10"
          : "rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-sm font-semibold text-white/80 transition hover:border-amber-400/40 hover:bg-white/5 hover:text-white"
      }
    >
      <div>{variantLabel(variant.variantType)}</div>
      <div
        className={`text-[11px] font-normal ${active ? "text-amber-200/80" : "text-white/50"}`}
      >
        {ask ? `from ${ask}` : "no listings"}
      </div>
    </Link>
  );
}
