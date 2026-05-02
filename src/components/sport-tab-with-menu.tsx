"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * Header sport tab + hover dropdown of years.
 *
 * Uses real JS state with setTimeout-based close delay instead of pure CSS
 * hover. The CSS-only version had two failure modes:
 *   - Even tiny mouse jitter between trigger and menu killed `:hover`
 *     because the parent group's bounding box doesn't include the
 *     absolutely-positioned menu in some browser/zoom combinations
 *   - There was no way to give the user a generous "I meant to hover here"
 *     window without complex `::before` shenanigans
 *
 * 250ms close delay is the sweet spot — long enough that you can fumble
 * across the trigger→menu gap, short enough that the menu doesn't linger
 * after you've clearly moved away. Click on the trigger still navigates
 * (the Link is unchanged); the menu is purely a quick-jump enhancement.
 */
export function SportTabWithMenu({
  sport,
  label,
  years,
}: {
  sport: string;
  label: string;
  years: number[];
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 250);
  };

  // Cleanup on unmount.
  useEffect(() => () => cancelClose(), []);

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onFocus={() => {
        cancelClose();
        setOpen(true);
      }}
      onBlur={(e) => {
        // Only close if focus leaves the entire group, not just moves to
        // a child link.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          scheduleClose();
        }
      }}
    >
      <Link
        href={`/?sport=${sport}`}
        className={`block rounded-md px-3 py-1.5 text-[13px] font-medium tracking-wide transition ${
          open ? "text-white" : "text-white/70 hover:text-white"
        }`}
      >
        {label}
      </Link>
      {years.length > 0 && open && (
        // top-full + no margin keeps the menu touching the trigger so the
        // mouse-bridge between them stays inside the React event boundary.
        // pt-2 inside gives visual breathing room without breaking it.
        <div
          className="absolute right-0 top-full z-40 min-w-[180px] origin-top-right rounded-md border border-white/10 bg-[#101012] p-1 pt-2 shadow-xl shadow-black/40"
          // Re-cancel close if the user moves into the menu — prevents the
          // edge case where the timer fires mid-transit between trigger
          // and menu.
          onMouseEnter={cancelClose}
        >
          <Link
            href={`/?sport=${sport}`}
            className="block rounded px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-white/5"
          >
            All {label}
          </Link>
          <div className="my-1 border-t border-white/5" />
          {years.map((y) => (
            <Link
              key={y}
              href={`/?sport=${sport}&year=${y}`}
              className="block rounded px-3 py-1.5 text-[12px] font-medium text-white/80 hover:bg-white/5 hover:text-white"
            >
              {formatYearLabel(sport, y)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function formatYearLabel(sport: string, year: number) {
  return ["NBA", "NHL"].includes(sport)
    ? `${year}-${(year + 1).toString().slice(2)}`
    : String(year);
}
