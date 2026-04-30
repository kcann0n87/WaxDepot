import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// next/og's Satori renderer doesn't support inline SVG paths reliably, so we
// approximate the W mark using overlapping rotated divs. At 32px this reads
// cleanly as a tiled gold square with a dark W glyph.
export default async function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #fcd34d 0%, #fbbf24 50%, #d97706 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 7,
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: 22,
          fontWeight: 900,
          color: "#0f172a",
          letterSpacing: -2,
        }}
      >
        W
      </div>
    ),
    size,
  );
}
