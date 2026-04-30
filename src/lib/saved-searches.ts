"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "./supabase/client";
import {
  createSavedSearch,
  deleteSavedSearch,
  getMySavedSearches,
  syncLocalSavedSearches,
  updateSavedSearchAlerts,
  type SavedSearchRecord,
} from "@/app/actions/saved-searches";

const KEY = "waxmarket:saved-searches";

export type SavedSearch = SavedSearchRecord;

function readLocal(): SavedSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedSearch[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(items: SavedSearch[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("waxmarket:saved-search-change"));
}

export function useSavedSearches() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const authedRef = useRef<boolean>(false);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    async function loadServerSide() {
      const localItems = readLocal();
      if (localItems.length > 0) {
        await syncLocalSavedSearches(
          localItems.map(({ query, sport, brand, priceMax, alerts }) => ({
            query,
            sport,
            brand,
            priceMax,
            alerts,
          })),
        );
        if (!mounted) return;
        writeLocal([]);
      }
      const serverItems = await getMySavedSearches();
      if (mounted) setSearches(serverItems);
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
        setSearches(readLocal());
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
        if (mounted) setSearches(readLocal());
      }
    });

    const onLocalChange = () => {
      if (!authedRef.current && mounted) setSearches(readLocal());
    };
    window.addEventListener("waxmarket:saved-search-change", onLocalChange);
    window.addEventListener("storage", onLocalChange);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      window.removeEventListener("waxmarket:saved-search-change", onLocalChange);
      window.removeEventListener("storage", onLocalChange);
    };
  }, []);

  const save = useCallback(
    async (params: {
      query: string;
      sport?: string;
      brand?: string;
      priceMax?: number;
      alerts?: { newListing: boolean; priceDrop: boolean; email: boolean };
    }) => {
      const alerts = params.alerts ?? { newListing: true, priceDrop: true, email: false };
      if (authedRef.current) {
        const result = await createSavedSearch(params);
        if (!result.ok) return null;
        const fresh = await getMySavedSearches();
        setSearches(fresh);
        return result.id ?? null;
      }
      const id = `ss-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const next: SavedSearch[] = [
        {
          id,
          query: params.query,
          sport: params.sport,
          brand: params.brand,
          priceMax: params.priceMax,
          alerts,
          createdAt: Date.now(),
        },
        ...searches,
      ];
      setSearches(next);
      writeLocal(next);
      return id;
    },
    [searches],
  );

  const remove = useCallback(
    (id: string) => {
      const next = searches.filter((s) => s.id !== id);
      setSearches(next);
      if (authedRef.current) {
        deleteSavedSearch(id).catch(() => {});
      } else {
        writeLocal(next);
      }
    },
    [searches],
  );

  const updateAlerts = useCallback(
    (id: string, alerts: Partial<SavedSearch["alerts"]>) => {
      const next = searches.map((s) =>
        s.id === id ? { ...s, alerts: { ...s.alerts, ...alerts } } : s,
      );
      setSearches(next);
      if (authedRef.current) {
        updateSavedSearchAlerts(id, alerts).catch(() => {});
      } else {
        writeLocal(next);
      }
    },
    [searches],
  );

  return { searches, hydrated, save, remove, updateAlerts };
}
