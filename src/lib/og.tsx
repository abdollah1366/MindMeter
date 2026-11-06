/**
 * تصویر اشتراک‌گذاری (Open Graph).
 * فقط متن لاتین دارد، چون موتور ساخت تصویر حروف فارسی را به هم نمی‌چسباند.
 */
export const OG_SIZE = { width: 1200, height: 630 };

function Gauge() {
  return (
    <svg width="120" height="120" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="rgba(255,255,255,0.18)" />
      <path d="M14 42a18 18 0 0 1 36 0" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <path d="M32 42 L42 27" stroke="#ffeadd" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="32" cy="42" r="4.5" fill="#fff" />
    </svg>
  );
}

export function OgCard({ eyebrow, title, subtitle, chips = [] }: { eyebrow: string; title: string; subtitle?: string; chips?: string[] }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "linear-gradient(135deg, #24786f 0%, #31958b 45%, #7360cf 100%)",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", fontSize: 30, opacity: 0.9, letterSpacing: 2 }}>{eyebrow}</div>
        <Gauge />
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: title.length > 14 ? 76 : 120, fontWeight: 800, lineHeight: 1.05 }}>{title}</div>
        {subtitle && <div style={{ display: "flex", fontSize: 40, marginTop: 16, opacity: 0.92 }}>{subtitle}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 14 }}>
          {chips.map((c) => (
            <div key={c} style={{ display: "flex", padding: "10px 22px", borderRadius: 999, background: "rgba(255,255,255,0.18)", fontSize: 26 }}>
              {c}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", fontSize: 32, fontWeight: 700 }}>MindMeter.ir</div>
      </div>
    </div>
  );
}
