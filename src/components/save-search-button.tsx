"use client";

import { useState } from "react";
import { Bell, Check } from "lucide-react";
import { useSavedSearches } from "@/lib/saved-searches";

export function SaveSearchButton({
  query,
  sport,
  brand,
}: {
  query: string;
  sport?: string;
  brand?: string;
}) {
  const { save } = useSavedSearches();
  const [saved, setSaved] = useState(false);

  if (!query && !sport && !brand) return null;

  return (
    <button
      onClick={() => {
        save({ query, sport, brand });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
        saved
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          : "border-white/15 bg-white/5 text-white/80 hover:border-amber-400/40 hover:bg-amber-500/10 hover:text-amber-300"
      }`}
    >
      {saved ? (
        <>
          <Check size={12} />
          Saved
        </>
      ) : (
        <>
          <Bell size={12} />
          Save search & alert me
        </>
      )}
    </button>
  );
}
