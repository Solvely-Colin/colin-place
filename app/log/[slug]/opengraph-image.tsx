import { ImageResponse } from "next/og";
import { getEntry, KIND_META } from "../../lib/timeline";
import { formatDate } from "../../lib/dates";

export const alt = "An entry from the colin.place log";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getEntry(slug);
  const kind = entry ? KIND_META[entry.kind] : KIND_META.agents;
  const title = entry?.title ?? "The log";
  const date = entry ? formatDate(entry.date) : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f0e9db",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 28,
              fontWeight: 700,
              color: "#dc2626",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 9999,
                background: "#ef4444",
              }}
            />
            Live
          </div>
          <div
            style={{
              fontSize: 30,
              color: kind.color,
              background: kind.bg,
              padding: "8px 24px",
              borderRadius: 9999,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {kind.label}
          </div>
          <div style={{ fontSize: 30, color: "#78716c" }}>{date}</div>
        </div>

        <div
          style={{
            fontSize: title.length > 60 ? 60 : 76,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            color: "#1c1917",
          }}
        >
          {title}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 120,
              height: 10,
              borderRadius: 9999,
              background: "#ff8c42",
            }}
          />
          <div style={{ fontSize: 34, color: "#57534e", fontWeight: 600 }}>
            colin.place — the log
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
