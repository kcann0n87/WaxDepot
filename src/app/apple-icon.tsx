import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
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
          borderRadius: 40,
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: 130,
          fontWeight: 900,
          color: "#0f172a",
          letterSpacing: -8,
          boxShadow: "inset 0 2px 0 rgba(255,255,255,0.25)",
        }}
      >
        W
      </div>
    ),
    size,
  );
}
