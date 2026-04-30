import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-white/5 bg-[#08080a]">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-amber-400 to-amber-600 font-black text-slate-900">
              W
            </div>
            <span className="font-display text-base font-black tracking-tight text-white">
              Wax<span className="text-amber-400">Depot</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-xs leading-relaxed text-white/40">
            The marketplace for serious collectors. Real bid/ask, real escrow, no eBay tax.
          </p>
        </div>

        <FooterCol
          title="Marketplace"
          links={[
            { label: "Browse", href: "/" },
            { label: "Sell", href: "/sell" },
            { label: "Search", href: "/search" },
            { label: "My account", href: "/account" },
          ]}
        />
        <FooterCol
          title="Sports"
          links={[
            { label: "Basketball", href: "/?sport=NBA" },
            { label: "Baseball", href: "/?sport=MLB" },
            { label: "Football", href: "/?sport=NFL" },
            { label: "Hockey", href: "/?sport=NHL" },
          ]}
        />
        <FooterCol
          title="Help"
          links={[
            { label: "Help center", href: "/help" },
            { label: "Buyer protection", href: "/help/buying/buyer-protection" },
            { label: "Fees", href: "/help/selling/fees" },
            { label: "Contact support", href: "/help/contact" },
          ]}
        />
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto max-w-7xl px-4 py-4 text-[11px] text-white/30">
          © {new Date().getFullYear()} WaxDepot · Demo build
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-white/50 uppercase">
        {title}
      </h4>
      <ul className="space-y-1.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="text-xs text-white/50 transition hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
