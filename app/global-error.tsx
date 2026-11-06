"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#070a10",
          color: "#f1f5f9",
          fontFamily: "system-ui, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "420px", textAlign: "center" }}>
          <h1 style={{ color: "#f5d061", fontSize: "28px", marginBottom: "12px" }}>
            TwinForge
          </h1>
          <p style={{ color: "#cbd5e1", marginBottom: "20px" }}>
            حدث خطأ غير متوقع أثناء تحميل الواجهة. يرجى المحاولة مرة أخرى.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: "#d4af37",
              color: "#161004",
              fontWeight: 700,
              border: "none",
              borderRadius: "12px",
              padding: "12px 24px",
              cursor: "pointer",
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
