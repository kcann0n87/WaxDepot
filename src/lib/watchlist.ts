"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "./supabase/client";
import {
  getMyWatchlistIds,
  syncLocalWatchlist,
  toggleWatch,
} from "@/app/actions/watchlist";

const KEY = "waxdepot:watchlist";

function readLocal(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocal(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("waxdepot:watchlist-change"));
}

/**
 * Hybrid watchlist:
 *   - Anonymous users → localStorage (so the feature works pre-signup).
 *   - Logged-in users → Supabase via server actions (persists across devices).
 *   - On login, any localStorage entries are merged into the user's Supabase
 *     watchlist, then the local copy is cleared.
 */
export function useWatchlist() {
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const authedRef = useRef<boolean>(false);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    async function loadServerSide() {
      const localIds = readLocal();
      if (localIds.length > 0) {
        // Migrate any pending local items, then clear them so we don't
        // double-write on subsequent renders.
        await syncLocalWatchlist(localIds);
        if (!mounted) return;
        writeLocal([]);
      }
      const serverIds = await getMyWatchlistIds();
      if (mounted) setIds(serverIds);
    }

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted) return;
      if (user) {
        authedRef.current = true;
        await loadServerSide();
      } else {
        authedRef.current = false;
        setIds(readLocal());
      }
      if (mounted) setHydrated(true);
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_IN") {
        authedRef.current = true;
        await loadServerSide();
      } else if (event === "SIGNED_OUT") {
        authedRef.current = false;
        if (mounted) setIds(readLocal());
      }
    });

    const onLocalChange = () => {
      if (!authedRef.current && mounted) setIds(readLocal());
    };
    window.addEventListener("waxdepot:watchlist-change", onLocalChange);
    window.addEventListener("storage", onLocalChange);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      window.removeEventListener("waxdepot:watchlist-change", onLocalChange);
      window.removeEventListener("storage", onLocalChange);
    };
  }, []);

  const toggle = useCallback(
    (skuId: string) => {
      const isWatching = ids.includes(skuId);
      // Optimistic update — flip immediately, reconcile if the server fails.
      const next = isWatching ? ids.filter((x) => x !== skuId) : [...ids, skuId];
      setIds(next);

      if (authedRef.current) {
        toggleWatch(skuId, isWatching)
          .then((result) => {
            if (!result.ok) {
              // Revert to true server state on failure.
              setIds((prev) =>
                isWatching ? Array.from(new Set([...prev, skuId])) : prev.filter((x) => x !== skuId),
              );
            }
          })
          .catch((e) => console.error("toggleWatch failed:", e));
      } else {
        writeLocal(next);
      }
    },
    [ids],
  );

  return {
    ids,
    hydrated,
    has: (skuId: string) => ids.includes(skuId),
    toggle,
  };
}
