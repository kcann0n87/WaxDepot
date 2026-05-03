"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Sku } from "@/lib/data";

/**
 * Client wrapper for the product page hero image. Listens for
 * "waxdepot:variant-preview" CustomEvents dispatched by VariantSelector
 * chip hovers and swaps the displayed image accordingly. Click commits
 * the navigation as before; hover is purely visual preview.
 *
 * Falls back to the active variant's image when not previewing.
 *
 * Why a separate component (vs. enhancing ProductImage): keeps the
 * server-rendered ProductImage usable everywhere else (cart, order page,
 * admin) without forcing them all to client. This client variant is only
 * loaded on the product detail hero where the preview is useful.
 */
export function ProductImageWithPreview({
  sku,
  className = "",
  children,
}: {
  sku: Sku;
  className?: string;
  children?: React.ReactNode;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ imageUrl: string | null }>).detail;
      setPreviewUrl(detail?.imageUrl ?? null);
    };
    window.addEventListener("waxdepot:variant-preview", handler);
    return () => window.removeEventListener("waxdepot:variant-preview", handler);
  }, []);

  // Reset preview whenever the active SKU changes (i.e. user clicked a
  // variant and the page re-rendered). Otherwise a stale hover preview
  // can stick around.
  useEffect(() => setPreviewUrl(null), [sku.id]);

  const displayedUrl = previewUrl ?? sku.imageUrl ?? null;

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, ${sku.gradient[0]}, ${sku.gradient[1]})`,
      }}
    >
      {displayedUrl ? (
        <Image
          // key forces React to mount a fresh <img> on swap so the
          // browser doesn't crossfade between WAY-different images
          // (e.g. hobby box → mega box → hobby case). The CSS transition
          // below gives a 150ms fade for polish.
          key={displayedUrl}
          src={displayedUrl}
          alt={`${sku.brand} ${sku.set} ${sku.product}`}
          fill
          sizes="(max-width: 768px) 80vw, 320px"
          className="object-contain p-2 transition-opacity duration-150"
          priority
        />
      ) : (
        <div className="px-3 text-center text-white drop-shadow-md">
          <div className="text-xs font-medium tracking-widest opacity-90 uppercase">
            {sku.brand}
          </div>
          <div className="mt-1 text-3xl leading-tight font-black">{sku.set}</div>
          <div className="mt-1 text-sm font-semibold opacity-90">{sku.year}</div>
        </div>
      )}
      {children}
    </div>
  );
}
