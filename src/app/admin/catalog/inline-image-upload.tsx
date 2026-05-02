"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImageOff, Loader2 } from "lucide-react";
import { adminUploadSkuImage } from "@/app/actions/admin";

/**
 * Click-to-replace image cell for the /admin/catalog table. Avoids the
 * extra click-into-Edit step when an admin just wants to swap a photo.
 *
 * Uploads through the same `adminUploadSkuImage` action the SKU form
 * uses — which means it also writes the new public URL to skus.image_url
 * server-side, so the row reflects the change after `router.refresh()`.
 */
export function InlineImageUpload({
  skuId,
  slug,
  currentUrl,
  alt,
}: {
  skuId: string;
  slug: string;
  currentUrl: string | null;
  alt: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [optimistic, setOptimistic] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const url = optimistic ?? currentUrl;

  const handleFile = (file: File | null) => {
    if (!file) return;
    setError(null);
    // Optimistic preview via FileReader so the cell updates the moment
    // the user picks a file.
    const reader = new FileReader();
    reader.onload = () => setOptimistic(reader.result as string);
    reader.readAsDataURL(file);

    const fd = new FormData();
    fd.set("file", file);
    fd.set("slug", slug);
    fd.set("skuId", skuId);

    startTransition(async () => {
      const result = await adminUploadSkuImage(fd);
      if (result.error) {
        setError(result.error);
        setOptimistic(null);
        return;
      }
      // Server has written the new image_url; refresh to pick up the
      // canonical URL (and drop the data: optimistic preview).
      setOptimistic(null);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={pending}
        title={pending ? "Uploading…" : "Click to replace image"}
        className="group relative h-12 w-9 overflow-hidden rounded border border-white/10 bg-white/5 transition hover:border-amber-400/40 disabled:cursor-wait"
      >
        {url ? (
          // next/image needs absolute URLs in remotePatterns; for data: URLs
          // (the optimistic preview) we drop back to a plain <img> since
          // next/image doesn't accept those.
          url.startsWith("data:") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={alt} className="h-full w-full object-cover" />
          ) : (
            <Image
              src={url}
              alt={alt}
              fill
              sizes="36px"
              className="object-cover"
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/50">
            <ImageOff size={14} />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition group-hover:opacity-100">
          {pending ? (
            <Loader2 size={14} className="animate-spin text-white" />
          ) : (
            <span className="text-[9px] font-bold tracking-wider text-white uppercase">
              {url ? "Replace" : "Upload"}
            </span>
          )}
        </div>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        className="hidden"
      />
      {error && (
        <span className="max-w-[120px] text-[10px] leading-tight text-rose-300">
          {error}
        </span>
      )}
    </div>
  );
}
