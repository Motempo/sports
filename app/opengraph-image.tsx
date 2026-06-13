import { ImageResponse } from "next/og";

export const alt = "Motempo Sports — FIFA World Cup 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000000",
          color: "#e7e9ea",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 56, fontWeight: 800 }}>Motempo Sports</div>
        <div style={{ fontSize: 28, marginTop: 16, color: "#71767b" }}>
          FIFA World Cup 2026
        </div>
      </div>
    ),
    { ...size }
  );
}
