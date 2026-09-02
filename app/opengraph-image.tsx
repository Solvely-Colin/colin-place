import { ImageResponse } from "next/og";
import { lemniscatePath } from "./lib/loop";

export const alt = "Colin Johnson — ships in the open, keeps the receipts";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const loop = lemniscatePath(300, 600, 300, 200);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          background: "#f6f6f3",
          color: "#101010",
          padding: 64,
          position: "relative",
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        <svg
          width="1200"
          height="630"
          viewBox="0 0 1200 630"
          style={{ position: "absolute", top: -40, left: 0 }}
        >
          <path d={loop} fill="none" stroke="#2b45ff" strokeWidth={3} strokeOpacity={0.9} />
        </svg>
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: "#6b6b66", textTransform: "uppercase" }}>
          Colin Johnson · Mishawaka, IN · colin.place
        </div>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 600, letterSpacing: -4, lineHeight: 1, marginTop: 18 }}>
          Ships in the open.
        </div>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 600, letterSpacing: -4, lineHeight: 1, marginTop: 6 }}>
          Keeps the receipts.
        </div>
      </div>
    ),
    { ...size }
  );
}
