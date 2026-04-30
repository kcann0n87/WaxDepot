import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MapPin, UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type FollowedProfile = {
  username: string;
  display_name: string;
  bio: string | null;
  location: string | null;
  is_verified: boolean;
};

export default async function FollowingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/following");

  const { data } = await supabase
    .from("follows")
    .select(
      "created_at, followed:profiles!follows_followed_id_fkey(username, display_name, bio, location, is_verified)",
    )
    .eq("follower_id", user.id)
    .order("created_at", { ascending: false });

  const followed: FollowedProfile[] = (data ?? [])
    .map((row) => {
      const f = Array.isArray(row.followed) ? row.followed[0] : row.followed;
      return f as FollowedProfile | null;
    })
    .filter((p): p is FollowedProfile => p !== null);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
        <Link href="/account" className="inline-flex items-center gap-1 hover:text-white">
          <ArrowLeft size={14} /> Account
        </Link>
        <span>/</span>
        <span className="text-white">Following</span>
      </div>
      <h1 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
        Following
      </h1>
      <p className="mt-1 text-sm text-white/50">
        Sellers you follow show up in your activity feed when they list new boxes.
      </p>

      {followed.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-300">
            <Users size={24} />
          </div>
          <h3 className="font-display mt-4 text-base font-bold text-white">
            Not following anyone yet
          </h3>
          <p className="mt-1 text-sm text-white/50">
            Tap Follow on any seller&apos;s profile to track their listings.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-sm font-bold text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400"
          >
            <UserPlus size={14} />
            Browse marketplace
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          {followed.map((s) => (
            <li
              key={s.username}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#101012] p-4 transition hover:border-amber-400/30"
            >
              <Avatar name={s.display_name} />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/seller/${s.username}`}
                  className="line-clamp-1 text-base font-bold text-white transition hover:text-amber-300"
                >
                  {s.display_name}
                </Link>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-white/50">
                  {s.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={11} />
                      {s.location}
                    </span>
                  )}
                  <span className="text-white/30">@{s.username}</span>
                </div>
                {s.bio && <div className="mt-1 line-clamp-1 text-xs text-white/60">{s.bio}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initial = name[0]?.toUpperCase() ?? "?";
  const colors = [
    "from-emerald-400 to-emerald-600",
    "from-sky-400 to-sky-600",
    "from-rose-400 to-rose-600",
    "from-amber-400 to-amber-600",
    "from-violet-400 to-violet-600",
    "from-cyan-400 to-cyan-600",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-base font-bold text-white shadow-md ${color}`}
    >
      {initial}
    </div>
  );
}
