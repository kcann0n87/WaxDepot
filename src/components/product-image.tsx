import Image from "next/image";
import { Sku } from "@/lib/data";

// Sizes attribute per `size` prop — tells next/image which width to
// fetch at each viewport. Important for keeping the AVIF/WebP variants
// from being too large.
const SIZES_FOR = {
  sm: "48px",
  md: "(max-width: 640px) 30vw, 200px",
  lg: "(max-width: 768px) 80vw, 320px",
  card: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
} as const;

export function ProductImage({
  sku,
  size = "md",
  showText = true,
  className = "",
  children,
}: {
  sku: Sku;
  size?: "sm" | "md" | "lg" | "card";
  showText?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const textSizes = {
    sm: { brand: "text-[7px]", set: "text-xs", year: "text-[8px]" },
    md: { brand: "text-[10px]", set: "text-base", year: "text-[10px]" },
    lg: { brand: "text-xs", set: "text-3xl", year: "text-sm" },
    card: { brand: "text-xs", set: "text-2xl", year: "text-xs" },
  }[size];

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, ${sku.gradient[0]}, ${sku.gradient[1]})`,
      }}
    >
      {sku.imageUrl ? (
        // next/image gives us AVIF/WebP serving + responsive sizing.
        // object-contain (not cover) so the whole product is visible —
        // box images come from a few sources at different aspect ratios,
        // and cover ends up cropping heads/box-tops on portrait or wide
        // shots. Gradient bg fills letterbox space.
        <Image
          src={sku.imageUrl}
          alt={`${sku.brand} ${sku.set} ${sku.product}`}
          fill
          sizes={SIZES_FOR[size]}
          className="object-contain p-2"
          priority={size === "lg"}
        />
      ) : showText ? (
        <div className="px-3 text-center text-white drop-shadow-md">
          <div className={`font-medium tracking-widest opacity-90 uppercase ${textSizes.brand}`}>
            {sku.brand}
          </div>
          <div className={`mt-1 leading-tight font-black ${textSizes.set}`}>{sku.set}</div>
          <div className={`mt-1 font-semibold opacity-90 ${textSizes.year}`}>{sku.year}</div>
        </div>
      ) : (
        <div className="text-[7px] font-bold text-white">
          {sku.brand.slice(0, 4).toUpperCase()}
        </div>
      )}
      {children}
    </div>
  );
}
