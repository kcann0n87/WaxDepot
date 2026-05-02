import type { Sku, Listing } from "@/lib/data";
import { formatSkuTitle } from "@/lib/utils";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://waxdepot.io";

/**
 * Schema.org Product + AggregateOffer JSON-LD for product pages. Lets Google
 * surface price/availability in search results — e.g. when someone googles
 * "2025 Topps Chrome Football" they'll see our lowest ask and listing count.
 *
 * Server component; emits a single <script type="application/ld+json"> tag.
 * Hidden when there are no listings, to avoid telling search engines we have
 * a product available when we don't.
 */
export function ProductJsonLd({
  sku,
  listings,
  ask,
  last,
}: {
  sku: Sku;
  listings: Listing[];
  ask: number | null;
  last: number | null;
}) {
  if (listings.length === 0 && ask === null) return null;

  const url = `${BASE}/product/${sku.slug}`;
  const image = sku.imageUrl
    ? sku.imageUrl.startsWith("http")
      ? sku.imageUrl
      : `${BASE}${sku.imageUrl}`
    : undefined;

  const prices = listings.map((l) => l.price).filter((p) => p > 0);
  const lowPrice = prices.length ? Math.min(...prices) : (ask ?? last ?? null);
  const highPrice = prices.length ? Math.max(...prices) : null;

  const offers =
    prices.length > 1
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "USD",
          lowPrice: lowPrice?.toFixed(2),
          highPrice: highPrice?.toFixed(2),
          offerCount: listings.length,
          availability: "https://schema.org/InStock",
        }
      : lowPrice !== null
        ? {
            "@type": "Offer",
            priceCurrency: "USD",
            price: lowPrice.toFixed(2),
            availability: "https://schema.org/InStock",
            url,
          }
        : undefined;

  const productData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: formatSkuTitle(sku),
    description:
      sku.description ||
      `${formatSkuTitle(sku)} — sealed factory ${sku.product.toLowerCase()} on the WaxDepot marketplace.`,
    sku: sku.slug,
    brand: { "@type": "Brand", name: sku.brand },
    category: `Sports Trading Cards / ${sku.sport}`,
    ...(image ? { image } : {}),
    url,
    ...(offers ? { offers } : {}),
  };

  // Breadcrumb structured data: shows up under product results in Google
  // SERP as "WaxDepot › NBA › Topps › 2025-26 Topps Chrome…" giving the
  // user a sense of the path before they click.
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "WaxDepot",
        item: BASE,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: sku.sport,
        item: `${BASE}/?sport=${sku.sport}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: sku.brand,
        item: `${BASE}/search?q=${encodeURIComponent(sku.brand)}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: formatSkuTitle(sku),
        item: url,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Stringified once at render. Schema.org JSON-LD is allowed in body.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
    </>
  );
}
