import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "#f6f2ea",
          color: "#090907",
          display: "flex",
          fontFamily: "Arial, Helvetica, sans-serif",
          height: "100%",
          justifyContent: "space-between",
          overflow: "hidden",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "76px", width: "62%" }}>
          <div style={{ fontSize: 34, fontWeight: 900, marginBottom: 24 }}>{siteConfig.name}</div>
          <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 0.95 }}>Free AI Dance Video Generator From Photo</div>
          <div style={{ color: "rgba(9,9,7,0.68)", fontSize: 30, lineHeight: 1.25, marginTop: 28 }}>
            Turn one adult solo photo into a short vertical AI dance clip for TikTok, Reels, and Shorts.
          </div>
        </div>
        <div
          style={{
            alignItems: "center",
            background: "#c6ff00",
            clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 100%)",
            display: "flex",
            justifyContent: "center",
            width: "48%",
          }}
        >
          <div
            style={{
              alignItems: "center",
              background: "#090907",
              borderRadius: 48,
              color: "#c6ff00",
              display: "flex",
              fontSize: 42,
              fontWeight: 900,
              height: 430,
              justifyContent: "center",
              lineHeight: 1,
              textAlign: "center",
              width: 242,
            }}
          >
            9:16
            <br />
            AI
            <br />
            CLIP
          </div>
        </div>
      </div>
    ),
    size,
  );
}
