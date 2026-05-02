const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://waxdepot.io";

/**
 * Site-wide structured data — emitted once on the home page (and inherited
 * by every page through the layout). Two schemas:
 *
 *   1. Organization — tells Google "WaxDepot LLC" is one brand entity.
 *      Drives the Knowledge Graph card that appears on the right side of
 *      branded searches over time.
 *
 *   2. WebSite — declares the site's search action so Google can render
 *      a sitelinks search box ("Search waxdepot.io") in branded SERP
 *      results, taking users straight to /search?q=... when they type.
 *
 * Server component; renders nothing visible. Mount in the root layout.
 */
export function SiteJsonLd() {
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "WaxDepot",
      legalName: "WaxDepot LLC",
      url: BASE,
      logo: `${BASE}/logo-full.svg`,
      description:
        "Live order book for sealed sports trading card boxes. Real bid, real ask, real escrow.",
      foundingDate: "2026",
      foundingLocation: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressRegion: "WY",
          addressCountry: "US",
        },
      },
      sameAs: [
        // Add your social profiles here as you create them. Google uses
        // these to confirm the same entity across the web.
        // "https://twitter.com/waxdepot",
        // "https://www.instagram.com/waxdepot",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "support@waxdepot.io",
        url: `${BASE}/help/contact`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "WaxDepot",
      url: BASE,
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${BASE}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
