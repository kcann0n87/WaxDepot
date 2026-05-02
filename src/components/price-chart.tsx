"use client";

import dynamic from "next/dynamic";

/**
 * Lazy-loaded wrapper around price-chart-impl.tsx so the recharts bundle
 * (~80KB minified) isn't pulled into the product-page initial payload.
 * Replaced by a tiny pulse skeleton until recharts mounts.
 *
 * ssr: false because recharts uses ResizeObserver / window APIs that
 * don't exist on the server.
 */
const PriceChartImpl = dynamic(() => import("./price-chart-impl"), {
  ssr: false,
  loading: () => (
    <div className="h-[220px] animate-pulse rounded-lg bg-white/[0.03]" />
  ),
});

export function PriceChart({ data }: { data: { date: string; price: number }[] }) {
  return <PriceChartImpl data={data} />;
}
