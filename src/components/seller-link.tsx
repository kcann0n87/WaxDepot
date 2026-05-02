import Link from "next/link";
import { ShieldCheck } from "lucide-react";

/**
 * Inline seller link with optional verified pill. Used everywhere a username
 * appears next to a price (order book row, listings table, recent sales,
 * seller storefront link). Centralizes the visual treatment so the
 * "Verified" badge always appears the same way and is consistently
 * connected to the public seller storefront at /seller/[username].
 */
export function SellerLink({
  username,
  isVerified = false,
  size = "sm",
  onClickClose,
}: {
  username: string;
  isVerified?: boolean;
  size?: "sm" | "md";
  onClickClose?: () => void;
}) {
  if (!username || username === "unknown") {
    return <span className="text-xs text-white/50">unknown</span>;
  }
  const text = size === "md" ? "text-sm" : "text-xs";
  const badgeText = size === "md" ? "text-[10px]" : "text-[9px]";
  return (
    <span className="inline-flex items-center gap-1.5">
      <Link
        href={`/seller/${username}`}
        onClick={onClickClose}
        className={`font-semibold text-white transition hover:text-amber-300 ${text}`}
      >
        @{username}
      </Link>
      {isVerified && (
        <span
          title="Stripe-verified seller"
          className={`inline-flex items-center gap-0.5 rounded bg-emerald-500/15 px-1.5 py-0.5 font-bold tracking-wider text-emerald-300 uppercase ${badgeText}`}
        >
          <ShieldCheck size={9} />
          Verified
        </span>
      )}
    </span>
  );
}
