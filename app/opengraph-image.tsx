import { ImageResponse } from "next/og";

export const alt = "colin.place — Colin Johnson, live";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const trafficLights = ["#ff5f57", "#febc2e", "#28c840"];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f0e9db",
          padding: 56,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            background: "#faf7f0",
            border: "1px solid #e7e0d0",
            borderRadius: 24,
            overflow: "hidden",
          }}
        >
          {/* Window chrome */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: 64,
              padding: "0 28px",
              gap: 14,
              borderBottom: "1px solid #e7e0d0",
              background: "#f3ede1",
            }}
          >
            {trafficLights.map((color) => (
              <div
                key={color}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 9999,
                  background: color,
                }}
              />
            ))}
            <div
              style={{
                marginLeft: 16,
                fontSize: 22,
                color: "#78716c",
              }}
            >
              colin.place — live broadcast
            </div>
          </div>

          {/* Body */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flex: 1,
              padding: "0 64px",
            }}
          >
            <div
              style={{
                fontSize: 108,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#1c1917",
              }}
            >
              Colin Johnson
            </div>
            <div
              style={{
                marginTop: 20,
                fontSize: 34,
                color: "#57534e",
              }}
            >
              A site that broadcasts itself — built by agents, in the open
            </div>
            <div
              style={{
                marginTop: 44,
                width: 180,
                height: 10,
                borderRadius: 9999,
                background: "#ff8c42",
              }}
            />
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
