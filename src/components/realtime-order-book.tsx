"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to Supabase Realtime changes on listings + bids for a single
 * SKU and triggers a server re-render whenever something changes. The
 * <OrderBookDepth/> tree is a server component, so we don't try to merge
 * deltas client-side — we just nudge React with router.refresh() and let
 * the next request build the fresh server tree (cheap because the
 * relevant queries are already getActiveBidsForSku + getListingsForSku
 * which are O(N) on a per-SKU index).
 *
 * Renders nothing — pure side-effect component. Mount it adjacent to the
 * order-book card on the product page.
 *
 * Requires Realtime to be enabled on the `listings` and `bids` tables in
 * the Supabase dashboard (Database → Replication → toggle each table on).
 * If it's not enabled, the subscribe call quietly does nothing and the
 * page falls back to the original behavior of refresh-on-navigate.
 */
export function RealtimeOrderBook({ skuId }: { skuId: string }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    // One channel per SKU. The filter syntax targets the postgres
    // realtime extension's row-level filtering, so we don't get spammed
    // with every other SKU's listing/bid changes.
    const channel = supabase
      .channel(`order-book-${skuId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "listings",
          filter: `sku_id=eq.${skuId}`,
        },
        () => {
          if (!cancelled) router.refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bids",
          filter: `sku_id=eq.${skuId}`,
        },
        () => {
          if (!cancelled) router.refresh();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [skuId, router]);

  return null;
}
