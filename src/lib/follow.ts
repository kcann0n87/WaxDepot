"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "./supabase/client";
import {
  getMyFollowingUsernames,
  syncLocalFollows,
  toggleFollow,
} from "@/app/actions/follows";

const KEY = "waxmarket:following";

function readLocal(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocal(items: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("waxmarket:follow-change"));
}

/**
 * Hybrid follow store:
 *   - Anonymous → localStorage.
 *   - Logged in → Supabase via server actions, with one-time merge from
 *     localStorage on login.
 */
export function useFollowing() {
  const [usernames, setUsernames] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const authedRef = useRef<boolean>(false);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    async function loadServerSide() {
      const localItems = readLocal();
      if (localItems.length > 0) {
        await syncLocalFollows(localItems);
        if (!mounted) return;
        writeLocal([]);
      }
      const serverItems = await getMyFollowingUsernames();
      if (mounted) setUsernames(serverItems);
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
        setUsernames(readLocal());
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
        if (mounted) setUsernames(readLocal());
      }
    });

    const onLocalChange = () => {
      if (!authedRef.current && mounted) setUsernames(readLocal());
    };
    window.addEventListener("waxmarket:follow-change", onLocalChange);
    window.addEventListener("storage", onLocalChange);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      window.removeEventListener("waxmarket:follow-change", onLocalChange);
      window.removeEventListener("storage", onLocalChange);
    };
  }, []);

  const toggle = useCallback(
    (username: string) => {
      const isFollowing = usernames.includes(username);
      const next = isFollowing
        ? usernames.filter((x) => x !== username)
        : [...usernames, username];
      setUsernames(next);

      if (authedRef.current) {
        toggleFollow(username, isFollowing)
          .then((result) => {
            if (!result.ok) {
              setUsernames((prev) =>
                isFollowing
                  ? Array.from(new Set([...prev, username]))
                  : prev.filter((x) => x !== username),
              );
            }
          })
          .catch((e) => console.error("toggleFollow failed:", e));
      } else {
        writeLocal(next);
      }
    },
    [usernames],
  );

  return {
    usernames,
    hydrated,
    has: (u: string) => usernames.includes(u),
    toggle,
  };
}
