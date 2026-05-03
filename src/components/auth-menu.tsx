import Link from "next/link";
import {
  ArrowDownToLine,
  BarChart3,
  Bell,
  Crown,
  Heart,
  LogIn,
  LogOut,
  MessageCircle,
  Settings,
  ShieldCheck,
  Star,
  TrendingUp,
  Trophy,
  User,
  Users,
} from "lucide-react";
import { getProfile } from "@/lib/supabase/user";
import { getSellerTierStats } from "@/lib/db";
import {
  TIER_FEE,
  TIER_THRESHOLDS,
  type SellerTier,
} from "@/lib/fees";
import { signOut } from "@/app/auth/actions";

const TIER_ICON: Record<SellerTier, typeof Star> = {
  Starter: Star,
  Pro: TrendingUp,
  Elite: Trophy,
  Apex: Crown,
};

const TIER_COLOR: Record<
  SellerTier,
  { text: string; bg: string; ring: string; bar: string }
> = {
  Starter: {
    text: "text-white",
    bg: "bg-white/10",
    ring: "border-white/15",
    bar: "bg-white/40",
  },
  Pro: {
    text: "text-sky-300",
    bg: "bg-sky-500/15",
    ring: "border-sky-500/40",
    bar: "bg-sky-400",
  },
  Elite: {
    text: "text-amber-300",
    bg: "bg-amber-500/15",
    ring: "border-amber-400/50",
    bar: "bg-amber-400",
  },
  Apex: {
    text: "text-fuchsia-300",
    bg: "bg-fuchsia-500/15",
    ring: "border-fuchsia-500/50",
    bar: "bg-fuchsia-400",
  },
};

const NEXT_TIER: Record<SellerTier, SellerTier | null> = {
  Starter: "Pro",
  Pro: "Elite",
  Elite: "Apex",
  Apex: null,
};

export async function AuthMenu() {
  const profile = await getProfile();

  if (!profile) {
    return (
      <div className="flex items-center gap-1.5">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-white/70 transition hover:text-white"
          aria-label="Log in"
        >
          <LogIn size={14} />
          <span className="hidden sm:inline">Sign in</span>
        </Link>
        <Link
          href="/signup"
          className="inline-flex items-center rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-sm font-bold text-amber-300 transition hover:border-amber-400/70 hover:bg-amber-500/20 hover:text-amber-200"
          aria-label="Sign up"
        >
          <span className="hidden sm:inline">Sign up</span>
          <span className="sm:hidden">Join</span>
        </Link>
      </div>
    );
  }

  // Tier-card stats — best-effort. If the lookup fails we just don't show
  // the card; everything else in the dropdown still works.
  const currentTier: SellerTier =
    (profile.seller_tier as SellerTier | null) ?? "Starter";
  let stats: { salesLast30d: number; gmvLast30dCents: number } | null = null;
  try {
    stats = await getSellerTierStats(profile.id);
  } catch (e) {
    console.error("getSellerTierStats failed:", e);
  }

  return (
    <details className="group relative">
      <summary
        className="flex cursor-pointer list-none items-center gap-1.5 rounded-md p-1 transition hover:bg-white/5"
        aria-label={`Account menu for ${profile.display_name}`}
      >
        <Avatar name={profile.display_name} />
        <span className="sr-only">Account menu</span>
      </summary>
      <div className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-xl border border-white/10 bg-[#101012] shadow-xl shadow-black/40">
        <div className="border-b border-white/5 bg-gradient-to-br from-amber-500/5 to-transparent px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar name={profile.display_name} large />
            <div className="min-w-0">
              <div className="truncate font-display text-sm font-black text-white">
                {profile.display_name}
              </div>
              <div className="truncate text-xs text-white/50">@{profile.username}</div>
            </div>
          </div>
        </div>

        {stats && (
          <TierBadge
            currentTier={currentTier}
            salesLast30d={stats.salesLast30d}
            gmvLast30dCents={stats.gmvLast30dCents}
          />
        )}

        <ul className="py-1">
          <Item href="/account" icon={<User size={14} />} label="Account" />
          <Item href="/account/messages" icon={<MessageCircle size={14} />} label="Messages" />
          <Item href="/account/watchlist" icon={<Heart size={14} />} label="Watchlist" />
          <Item href="/account/following" icon={<Users size={14} />} label="Following" />
          <Item href="/account/payouts" icon={<ArrowDownToLine size={14} />} label="Payouts" />
          <Item href="/account/analytics" icon={<BarChart3 size={14} />} label="Analytics" />
          <Item href="/account/disputes" icon={<ShieldCheck size={14} />} label="Disputes" />
          <Item href="/account/alerts" icon={<Bell size={14} />} label="Alerts" />
          <Item href="/account/settings" icon={<Settings size={14} />} label="Settings" />
        </ul>
        <div className="border-t border-white/5 p-1">
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-rose-400 transition hover:bg-rose-500/10"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </details>
  );
}

/**
 * Live tier badge in the account dropdown. Shows current tier + fee, plus a
 * progress bar to the next tier with the smaller of (sales-needed,
 * GMV-needed) gap. Renders the OR logic explicitly so sellers see both
 * paths to qualify.
 */
function TierBadge({
  currentTier,
  salesLast30d,
  gmvLast30dCents,
}: {
  currentTier: SellerTier;
  salesLast30d: number;
  gmvLast30dCents: number;
}) {
  const colors = TIER_COLOR[currentTier];
  const Icon = TIER_ICON[currentTier];
  const next = NEXT_TIER[currentTier];
  const nextThreshold = next
    ? TIER_THRESHOLDS[next as Exclude<SellerTier, "Starter">]
    : null;

  const salesProgress = nextThreshold
    ? Math.min(salesLast30d / nextThreshold.sales, 1)
    : 1;
  const gmvProgress = nextThreshold
    ? Math.min(gmvLast30dCents / nextThreshold.gmvCents, 1)
    : 1;
  // Show progress along whichever path the seller is closer on.
  const progress = Math.max(salesProgress, gmvProgress);

  const salesGap = nextThreshold
    ? Math.max(0, nextThreshold.sales - salesLast30d)
    : 0;
  const gmvGapDollars = nextThreshold
    ? Math.max(0, (nextThreshold.gmvCents - gmvLast30dCents) / 100)
    : 0;

  return (
    <Link
      href="/sell/tiers"
      className={`block border-b border-white/5 px-4 py-3 transition hover:bg-white/[0.02]`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${colors.ring} ${colors.bg} ${colors.text}`}
        >
          <Icon size={11} />
          {currentTier}
        </span>
        <span className="text-[10px] text-white/60">
          {(TIER_FEE[currentTier] * 100).toFixed(0)}% seller fee
        </span>
      </div>

      {next && nextThreshold ? (
        <>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className={`h-full rounded-full ${TIER_COLOR[next].bar} transition-all`}
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <div className="mt-1.5 text-[11px] leading-snug text-white/70">
            <strong className="text-white">{salesGap}</strong> more sales{" "}
            <span className="text-white/50">or</span>{" "}
            <strong className="text-white">${gmvGapDollars.toLocaleString()}</strong>{" "}
            more in 30d for{" "}
            <strong className={TIER_COLOR[next].text}>{next}</strong> (
            {(TIER_FEE[next] * 100).toFixed(0)}% fee)
          </div>
        </>
      ) : (
        <div className="mt-2 text-[11px] leading-snug text-white/70">
          You&apos;re at the top tier — lowest fee on the platform.
        </div>
      )}

      <div className="mt-2 text-[10px] font-semibold text-amber-300">
        See all tiers + benefits →
      </div>
    </Link>
  );
}

function Item({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/[0.04] hover:text-amber-300"
      >
        <span className="text-white/60">{icon}</span>
        {label}
      </Link>
    </li>
  );
}

function Avatar({ name, large }: { name: string; large?: boolean }) {
  const initial = name[0]?.toUpperCase() ?? "?";
  const colors = ["from-emerald-400 to-emerald-600", "from-sky-400 to-sky-600", "from-rose-400 to-rose-600", "from-amber-400 to-amber-600", "from-violet-400 to-violet-600", "from-cyan-400 to-cyan-600"];
  const color = colors[name.charCodeAt(0) % colors.length];
  const size = large ? "h-10 w-10 text-base" : "h-7 w-7 text-xs";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shadow-md ${color} ${size}`}
    >
      {initial}
    </div>
  );
}
