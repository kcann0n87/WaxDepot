"use client";

import dynamic from "next/dynamic";

/**
 * Lazy-loaded wrapper around sales-volume-chart-impl.tsx so the recharts
 * bundle isn't pulled into the product-page initial payload (already lazy
 * for the price chart; this stays the same shape so they share the chunk).
 */
const SalesVolumeChartImpl = dynamic(() => import("./sales-volume-chart-impl"), {
  ssr: false,
  loading: () => (
    <div className="h-[160px] animate-pulse rounded-lg bg-white/[0.03]" />
  ),
});

export function SalesVolumeChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  return <SalesVolumeChartImpl data={data} />;
}
