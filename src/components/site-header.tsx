import Link from "next/link";
import { Search } from "lucide-react";
import { AuthMenu } from "./auth-menu";
import { CartDrawer } from "./cart-drawer";
import { NotificationsBell } from "./notifications-bell";
import { MobileSearch } from "./mobile-search";

const sports = ["Releases", "NBA", "MLB", "NFL", "NHL", "Pokemon"];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0b]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-amber-400 to-amber-600 font-black text-slate-900">
            W
          </div>
          <span className="font-display text-lg font-black tracking-tight text-white">
            Wax<span className="text-amber-400">Depot</span>
          </span>
        </Link>

        <Link
          href="/sell"
          className="rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-1.5 text-sm font-bold text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400"
        >
          Sell
        </Link>

        <form action="/search" method="get" className="relative hidden flex-1 md:block">
          <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/30" size={16} />
          <input
            type="search"
            name="q"
            placeholder='Search "2025 Bowman Hobby"'
            className="w-full rounded-md border border-white/10 bg-white/5 py-2 pr-3 pl-9 text-sm text-white placeholder:text-white/30 focus:border-amber-400/50 focus:bg-white/10 focus:outline-none"
          />
        </form>

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {sports.map((s) => (
            <Link
              key={s}
              href={s === "Releases" ? "/releases" : `/?sport=${s}`}
              className="rounded-md px-3 py-1.5 text-[13px] font-medium tracking-wide text-white/60 transition hover:text-white"
            >
              {s}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <MobileSearch />
          <NotificationsBell />
          <CartDrawer />
          <AuthMenu />
        </div>
      </div>
    </header>
  );
}
