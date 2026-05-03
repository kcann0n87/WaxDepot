"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Recharts bar chart for daily sales volume on a SKU. Lives next to the
 * price-line chart on the product page — together they answer the two
 * questions every collector asks: what does it sell for, and is anyone
 * actually buying it?
 *
 * Dim sky-blue bars (lower visual weight than the amber price chart so
 * the price stays the primary read). Empty days render as zero-height
 * bars; the y-axis only shows whole-number ticks since "sales" is integer.
 */
export default function SalesVolumeChartImpl({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="date"
          tickFormatter={(d) =>
            new Date(d).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          }
          tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }}
          axisLine={false}
          tickLine={false}
          interval={Math.floor(data.length / 6)}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }}
          axisLine={false}
          tickLine={false}
          width={32}
          domain={[0, max]}
        />
        <Tooltip
          cursor={{ fill: "rgba(56, 189, 248, 0.08)" }}
          contentStyle={{
            background: "#0a0a0b",
            border: "1px solid rgba(56,189,248,0.3)",
            borderRadius: 8,
            fontSize: 12,
            padding: "8px 12px",
            color: "#fff",
          }}
          itemStyle={{ color: "#7dd3fc" }}
          labelStyle={{ color: "rgba(255,255,255,0.5)" }}
          labelFormatter={(d) =>
            new Date(d).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          }
          formatter={(value) => [
            `${value} ${Number(value) === 1 ? "sale" : "sales"}`,
            "Volume",
          ]}
        />
        <Bar dataKey="count" fill="#38bdf8" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
