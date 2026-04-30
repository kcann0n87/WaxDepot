"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

export function MobileSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="rounded-md p-2 text-white/60 hover:bg-white/5 md:hidden"
      >
        <Search size={18} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-[#101012]">
          <form
            action="/search"
            method="get"
            className="flex items-center gap-2 border-b border-white/10 px-3 py-3"
            onSubmit={() => setOpen(false)}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-2 text-white/60 hover:bg-white/5"
              aria-label="Close search"
            >
              <X size={18} />
            </button>
            <div className="relative flex-1">
              <label htmlFor="mobile-search-input" className="sr-only">
                Search the marketplace
              </label>
              <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/60" size={16} aria-hidden="true" />
              <input
                id="mobile-search-input"
                autoFocus
                name="q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder='Search "2025 Bowman Hobby"'
                className="w-full rounded-md border border-white/10 bg-white/[0.02] py-2.5 pr-3 pl-9 text-sm focus:border-slate-400 focus:bg-[#101012] focus:outline-none"
              />
            </div>
          </form>
          {q && (
            <div className="px-4 py-2 text-xs text-white/50">
              Press enter to search for &ldquo;{q}&rdquo;
            </div>
          )}
        </div>
      )}
    </>
  );
}
