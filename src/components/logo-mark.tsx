/**
 * WaxDepot logo mark — gold-gradient rounded square with a custom-stroked W.
 * Use everywhere you previously rendered a `<div>` with a "W" letter.
 *
 * Sizes: defaults to 32px, but accepts any size. Inner geometry scales
 * with the viewBox (100×100) so it stays crisp at favicon (16/32) and
 * marketing (200+) sizes.
 */
export function LogoMark({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  // Stable but unique gradient id per render so multiple instances on the
  // page don't collide. (Browsers tolerate dup IDs but it warns; using a
  // suffix from the size keeps it stable for SSR hydration.)
  const id = `wd-gold-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="WaxDepot"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill={`url(#${id})`} />
      <rect
        x="2"
        y="2"
        width="96"
        height="96"
        rx="20"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1"
      />
      <path
        d="M 18 22 L 32 78 L 44 38 L 50 78 L 56 38 L 68 78 L 82 22"
        stroke="#0f172a"
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Full lockup — mark + WaxDepot wordmark side-by-side.
 * Use in the header and login/signup hero areas.
 */
export function LogoLockup({
  size = 32,
  textClassName = "font-display text-lg font-black tracking-tight text-white",
}: {
  size?: number;
  textClassName?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className={textClassName}>
        Wax<span className="text-amber-400">Depot</span>
      </span>
    </span>
  );
}
