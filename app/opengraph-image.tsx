import { ImageResponse } from "next/og";

export const alt = "TwinForge — Your AI Digital Twin Works & Earns While You Sleep";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "54px 64px",
          background:
            "linear-gradient(135deg, #05070c 0%, #0c1424 52%, #0a1b15 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
          border: "4px solid #d4af37",
        }}
      >
        {/* Top Brand Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div
              style={{
                width: "76px",
                height: "76px",
                borderRadius: "20px",
                background: "#090d16",
                border: "3px solid #d4af37",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "36px",
                fontWeight: 900,
                color: "#f5d061",
              }}
            >
              TF
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: "38px",
                  fontWeight: 900,
                  color: "#fce79c",
                  letterSpacing: "-0.5px",
                }}
              >
                TwinForge
              </span>
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#3dd68c",
                  letterSpacing: "3px",
                }}
              >
                V1.0 SOVEREIGN NIGHT ECONOMY
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 22px",
              borderRadius: "999px",
              background: "rgba(212, 175, 55, 0.16)",
              border: "2px solid #d4af37",
              color: "#fce79c",
              fontSize: "18px",
              fontWeight: 800,
            }}
          >
            12 GLOBAL LANGUAGES · LIVE AI
          </div>
        </div>

        {/* Center Hero */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            maxWidth: "980px",
          }}
        >
          <div
            style={{
              fontSize: "58px",
              fontWeight: 900,
              lineHeight: 1.12,
              color: "#ffffff",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>Your Sovereign AI Twin</span>
            <span style={{ color: "#f5d061" }}>
              Works & Earns While You Sleep
            </span>
          </div>
          <div
            style={{
              fontSize: "24px",
              color: "#cbd5e1",
              lineHeight: 1.45,
              display: "flex",
            }}
          >
            Autonomous Night Shift Marketplace · Dual-Currency Immutable Ledger · Voice & Synergy Council
          </div>
        </div>

        {/* Bottom Feature Badges */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            paddingTop: "24px",
            borderTop: "2px solid rgba(212, 175, 55, 0.35)",
          }}
        >
          <div style={{ display: "flex", gap: "16px" }}>
            <div
              style={{
                display: "flex",
                padding: "10px 20px",
                borderRadius: "14px",
                background: "rgba(61, 214, 140, 0.15)",
                border: "1.5px solid #3dd68c",
                color: "#6ee7b7",
                fontSize: "20px",
                fontWeight: 800,
              }}
            >
              +500 ForgeGold Invite Bonus
            </div>
            <div
              style={{
                display: "flex",
                padding: "10px 20px",
                borderRadius: "14px",
                background: "rgba(212, 175, 55, 0.15)",
                border: "1.5px solid #d4af37",
                color: "#fde68a",
                fontSize: "20px",
                fontWeight: 800,
              }}
            >
              $50/Day AI Inference Engine
            </div>
          </div>

          <div
            style={{
              display: "flex",
              padding: "12px 26px",
              borderRadius: "14px",
              background: "linear-gradient(90deg, #d4af37, #f5d061)",
              color: "#161004",
              fontSize: "20px",
              fontWeight: 900,
            }}
          >
            Create Your Free Twin →
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
