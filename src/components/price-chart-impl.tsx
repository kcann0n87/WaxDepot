"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Recharts implementation. Imported via next/dynamic from price-chart.tsx
 * so the ~80KB recharts bundle isn't pulled into the initial product-page
 * payload. Default export so dynamic() picks it up cleanly.
 */
export default function PriceChartImpl({ data }: { data: { date: string; price: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4af37" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#d4af37" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tickFormatter={(d) => {
            const date = new Date(d);
            return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          }}
          tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }}
          axisLine={false}
          tickLine={false}
          interval={Math.floor(data.length / 6)}
        />
        <YAxis
          tickFormatter={(v) => `$${v}`}
          tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }}
          axisLine={false}
          tickLine={false}
          width={50}
          domain={["dataMin - 20", "dataMax + 20"]}
        />
        <Tooltip
          contentStyle={{
            background: "#0a0a0b",
            border: "1px solid rgba(212,175,55,0.3)",
            borderRadius: 8,
            fontSize: 12,
            padding: "8px 12px",
            color: "#fff",
          }}
          itemStyle={{ color: "#d4af37" }}
          labelStyle={{ color: "rgba(255,255,255,0.5)" }}
          labelFormatter={(d) =>
            new Date(d).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          }
          formatter={(value) => [`$${Number(value).toLocaleString()}`, "Sale"]}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke="#d4af37"
          strokeWidth={2}
          fill="url(#priceFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
