/**
 * Tiny product thumbnail used in lists, tables, cart, order rows, and
 * anywhere we want a square-ish box image but only have ~16-32px of width.
 *
 * Accepts SKUs in either of the two shapes that exist in this codebase:
 *   - DB row shape:    { image_url?, gradient_from?, gradient_to?, brand, ... }
 *   - Lib data shape:  { imageUrl?, gradient: [from, to], brand, ... }
 *
 * Renders the real <img> when a URL is present (with object-cover), otherwise
 * falls back to a gradient tile with the brand abbreviation. Decorative —
 * gets aria-hidden.
 */

type SkuThumbInput = {
  brand: string;
  // either-or for image url
  image_url?: string | null;
  imageUrl?: string | null;
  // either-or for gradient
  gradient_from?: string | null;
  gradient_to?: string | null;
  gradient?: [string, string] | string[];
};

export function SkuThumb({
  sku,
  className = "",
  alt,
}: {
  sku: SkuThumbInput;
  className?: string;
  alt?: string;
}) {
  const url = sku.image_url ?? sku.imageUrl ?? null;
  const from = sku.gradient_from ?? sku.gradient?.[0] ?? "#475569";
  const to = sku.gradient_to ?? sku.gradient?.[1] ?? "#0f172a";

  return (
    <div
      className={`relative shrink-0 overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      aria-hidden={!alt}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt ?? ""}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[8px] font-bold tracking-wider text-white">
          {sku.brand.slice(0, 4).toUpperCase()}
        </div>
      )}
    </div>
  );
}
