import { ImageResponse } from "next/og";

/** Branded social-share card (auto-used for OpenGraph + Twitter via Next). */
export const alt = "Missed No More Pro — AI receptionist for local service businesses";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#020817",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "#00E5FF",
              marginRight: "18px",
            }}
          />
          <div style={{ display: "flex", gap: "10px", fontSize: "30px", fontWeight: 700 }}>
            <span>Missed No More</span>
            <span style={{ color: "#00E5FF" }}>Pro</span>
          </div>
        </div>
        <div
          style={{
            fontSize: "70px",
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-2px",
            maxWidth: "920px",
          }}
        >
          Every call answered. Every lead captured.
        </div>
        <div style={{ fontSize: "32px", color: "#A7B0C0", marginTop: "30px", maxWidth: "860px" }}>
          The AI receptionist, smart CRM, and business assistant for local service businesses.
        </div>
        <div
          style={{
            marginTop: "46px",
            height: "6px",
            width: "190px",
            background: "#00E5FF",
            borderRadius: "3px",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
