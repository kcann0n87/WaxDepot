"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns usernames the current user is following.
 * Returns empty array for anonymous users.
 */
export async function getMyFollowingUsernames(): Promise<string[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("follows")
      .select("followed:profiles!follows_followed_id_fkey(username)")
      .eq("follower_id", user.id);
    if (error) throw error;
    return (data ?? [])
      .map((r) => {
        const f = Array.isArray(r.followed) ? r.followed[0] : r.followed;
        return (f as { username?: string } | null)?.username ?? null;
      })
      .filter((u): u is string => !!u);
  } catch (e) {
    console.error("getMyFollowingUsernames failed:", e);
    return [];
  }
}

export async function toggleFollow(
  username: string,
  currentlyFollowing: boolean,
): Promise<{ ok: boolean; following: boolean }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, following: currentlyFollowing };

    // Look up the target profile's UUID by username.
    const { data: target } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (!target) return { ok: false, following: currentlyFollowing };
    if (target.id === user.id) return { ok: false, following: false };

    if (currentlyFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("followed_id", target.id);
      if (error) throw error;
      revalidatePath("/account/following");
      return { ok: true, following: false };
    } else {
      const { error } = await supabase
        .from("follows")
        .upsert(
          { follower_id: user.id, followed_id: target.id },
          { onConflict: "follower_id,followed_id", ignoreDuplicates: true },
        );
      if (error) throw error;
      revalidatePath("/account/following");
      return { ok: true, following: true };
    }
  } catch (e) {
    console.error("toggleFollow failed:", e);
    return { ok: false, following: currentlyFollowing };
  }
}

/**
 * Bulk-migrate localStorage follows into Supabase on first login.
 */
export async function syncLocalFollows(usernames: string[]): Promise<{ ok: boolean }> {
  if (!usernames.length) return { ok: true };
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false };

    const { data: targets } = await supabase
      .from("profiles")
      .select("id, username")
      .in("username", usernames);
    if (!targets?.length) return { ok: true };

    const rows = targets
      .filter((t) => t.id !== user.id)
      .map((t) => ({ follower_id: user.id, followed_id: t.id }));
    if (!rows.length) return { ok: true };

    const { error } = await supabase
      .from("follows")
      .upsert(rows, { onConflict: "follower_id,followed_id", ignoreDuplicates: true });
    if (error) throw error;
    revalidatePath("/account/following");
    return { ok: true };
  } catch (e) {
    console.error("syncLocalFollows failed:", e);
    return { ok: false };
  }
}
