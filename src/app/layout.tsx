import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { Analytics } from "@/components/analytics";
import { MobileNav } from "@/components/mobile-nav";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SiteJsonLd } from "@/components/site-jsonld";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://waxdepot.io";
const TITLE = "WaxDepot — Sealed sports wax. Bought right. Sold right.";
const DESCRIPTION =
  "Buy and sell sealed NBA, MLB, NFL, and NHL wax at real market prices. Live bid and ask, escrow on every order, no eBay tax.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · WaxDepot",
  },
  description: DESCRIPTION,
  applicationName: "WaxDepot",
  keywords: [
    "sealed sports cards",
    "sealed wax",
    "sports card marketplace",
    "trading card boxes",
    "card auction",
    "P2P card marketplace",
  ],
  openGraph: {
    type: "website",
    url: "/",
    siteName: "WaxDepot",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    creator: "@waxdepot",
    site: "@waxdepot",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
};

// The header reads auth state from cookies, so every page is dynamic.
// Marking this explicitly skips Next's static-prerender attempts and
// silences the resulting DYNAMIC_SERVER_USAGE log noise during build.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-[#0a0a0b] pb-14 text-white md:pb-0">
        {/* Analytics initializer + SPA route-change tracker. No-ops without
            NEXT_PUBLIC_POSTHOG_KEY. Wrapped in Suspense because it reads
            useSearchParams which Next requires inside a Suspense boundary. */}
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
        {/* Site-wide Organization + WebSite JSON-LD for Google Knowledge
            Graph + sitelinks search box. Renders nothing visible. */}
        <SiteJsonLd />
        <SiteHeader />
        <main id="main" tabIndex={-1} className="flex-1 outline-none">{children}</main>
        <SiteFooter />
        <MobileNav />
      </body>
    </html>
  );
}
