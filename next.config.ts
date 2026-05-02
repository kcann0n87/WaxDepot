import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // next/image — optimize the box thumbnails. Most images are local under
  // /public/products/, but admins can paste external URLs in /admin/catalog,
  // so we whitelist the hosts that have shipped an image into the DB so
  // far (StockX direct CDN + a handful of seller-friendly retailers).
  // Anything else falls back to unoptimized rendering via the
  // `unoptimized` prop on a per-image basis.
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.stockx.com" },
      { protocol: "https", hostname: "cdn11.bigcommerce.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "i0.wp.com" },
      { protocol: "https", hostname: "slabstat-production.s3.amazonaws.com" },
      { protocol: "https", hostname: "*.amazonaws.com" },
      // Admin uploads from /admin/catalog land in the Supabase Storage
      // `product-images` bucket; the public URL is on the project's
      // supabase.co subdomain. Wildcard so we don't have to bake the
      // project ref into next.config.
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
