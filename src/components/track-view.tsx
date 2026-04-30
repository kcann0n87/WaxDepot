"use client";

import { useEffect } from "react";
import { trackView } from "@/app/actions/recently-viewed";

export function TrackView({ skuId }: { skuId: string }) {
  useEffect(() => {
    // Fire-and-forget — server action no-ops for anonymous users.
    trackView(skuId).catch(() => {});
  }, [skuId]);
  return null;
}
