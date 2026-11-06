import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";

export const alt = "TwinForge Sovereign Digital Twin Card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TwinOpenGraphImage({
  params,
}: {
  params: Promise<{ twinId: string }>;
}) {
  const { twinId } = await params;
  let reputation = "5.0";
  let energy = "100";
  let status = "ACTIVE";
  let latinLabel = "Sovereign AI Digital Twin";

  try {
    const admin = createAdminClient();
    if (UUID_RE.test(twinId)) {
      const { data } = await admin
        .from("twins")
        .select("name, energy, reputation, status")
        .eq("id", twinId)
        .maybeSingle();
      if (data) {
        reputation = Number(data.reputation ?? 5).toFixed(1);
        energy = String(Math.round(Number(data.energy ?? 100)));
        status = String(data.status || "active").toUpperCase();
        const rawName = String(data.name || "");
        if (/^[\x20-\x7E]+$/.test(rawName) && rawName.trim()) {
          latinLabel = rawName.trim();
        }
      }
    }
  } catch {
    // Graceful static card fallback
  }

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
            "linear-gradient(135deg, #060911 0%, #101a2e 55%, #091d16 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
          border: "4px solid #d4af37",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "18px",
                background: "#090d16",
                border: "3px solid #d4af37",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "34px",
                fontWeight: 900,
                color: "#f5d061",
              }}
            >
              TF
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "34px", fontWeight: 900, color: "#fce79c" }}>
                TwinForge · Verified Twin Card
              </span>
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#3dd68c",
                  letterSpacing: "2.5px",
                }}
              >
                STATUS: {status} · $50/DAY AI ENGINE
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              padding: "10px 22px",
              borderRadius: "999px",
              background: "rgba(61, 214, 140, 0.16)",
              border: "2px solid #3dd68c",
              color: "#6ee7b7",
              fontSize: "18px",
              fontWeight: 800,
            }}
          >
            Reputation ★ {reputation} · Energy {energy}%
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <span
            style={{
              fontSize: "56px",
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.15,
            }}
          >
            {latinLabel}
          </span>
          <span style={{ fontSize: "26px", color: "#f5d061", fontWeight: 700 }}>
            Autonomous Digital Twin · Works & Earns Nightly on TwinForge
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            paddingTop: "22px",
            borderTop: "2px solid rgba(212, 175, 55, 0.35)",
          }}
        >
          <span style={{ fontSize: "21px", color: "#fde68a", fontWeight: 800 }}>
            Join via this Twin Card & Claim +500 ForgeGold + 10 Energy Free
          </span>
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
            Launch Your Twin →
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
