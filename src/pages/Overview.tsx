import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Overview() {
  const navigate = useNavigate();
  const [themeMode, setThemeMode] = useState<"light" | "dark">(() => (localStorage.getItem("aeroguide_theme") === "dark" ? "dark" : "light"));
  const theme = useMemo(
    () =>
      themeMode === "light"
        ? { bg: "#f1f5f9", card: "#fff", border: "#e2e8f0", text: "#0f172a", muted: "#64748b", soft: "#f8fafc", btn: "#0f172a", btnText: "#fff" }
        : { bg: "#020617", card: "#0f172a", border: "#1f2937", text: "#e2e8f0", muted: "#94a3b8", soft: "#111827", btn: "#2563eb", btnText: "#fff" },
    [themeMode]
  );

  useEffect(() => {
    localStorage.setItem("aeroguide_theme", themeMode);
  }, [themeMode]);

  const cardStyle: React.CSSProperties = {
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 16,
    padding: 20,
    boxShadow: themeMode === "dark" ? "0 10px 30px rgba(0,0,0,0.35)" : "0 4px 20px rgba(15, 23, 42, 0.06)",
  };

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, padding: 20 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 16 }}>
        <header style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30, color: theme.text }}>Overview</h1>
            <p style={{ margin: "6px 0 0", color: theme.muted }}>AEROGUIDE quick launch and status</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setThemeMode((p) => (p === "light" ? "dark" : "light"))}
              aria-label={themeMode === "light" ? "Switch to dark mode" : "Switch to light mode"}
              title={themeMode === "light" ? "Switch to dark mode" : "Switch to light mode"}
              style={{ border: `1px solid ${theme.border}`, borderRadius: 10, width: 40, height: 40, background: theme.soft, color: theme.text, cursor: "pointer", fontSize: 18 }}
            >
              {themeMode === "light" ? "🌙" : "☀️"}
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              style={{ border: 0, borderRadius: 10, padding: "10px 14px", background: theme.btn, color: theme.btnText, cursor: "pointer", fontWeight: 600 }}
            >
              Back to Dashboard
            </button>
          </div>
        </header>

        <section style={{ ...cardStyle, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <QuickCard title="Dashboard" desc="Live travel assistant and widgets" onClick={() => navigate("/dashboard")} theme={theme} />
          <QuickCard title="Flights" desc="Search and track departures/arrivals" onClick={() => navigate("/flights")} theme={theme} />
          <QuickCard title="Map" desc="Navigate terminal with route guidance" onClick={() => navigate("/map")} theme={theme} />
        </section>

        <section style={cardStyle}>
          <h2 style={{ margin: "0 0 10px", color: theme.text }}>Current Trip</h2>
          <div style={{ borderRadius: 12, background: theme.soft, border: `1px solid ${theme.border}`, padding: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Info label="Route" value="CMB to DXB" theme={theme} />
              <Info label="Departure" value="12:30 PM" theme={theme} />
              <Info label="Gate" value="A12" theme={theme} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function QuickCard({
  title,
  desc,
  onClick,
  theme,
}: {
  title: string;
  desc: string;
  onClick: () => void;
  theme: { border: string; soft: string; text: string; muted: string };
}) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        background: theme.soft,
        padding: 14,
        cursor: "pointer",
      }}
    >
      <div style={{ fontWeight: 700, color: theme.text }}>{title}</div>
      <div style={{ marginTop: 4, fontSize: 13, color: theme.muted }}>{desc}</div>
    </button>
  );
}

function Info({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: { text: string; muted: string };
}) {
  return (
    <div>
      <div style={{ fontSize: 12, color: theme.muted }}>{label}</div>
      <div style={{ fontWeight: 700, color: theme.text }}>{value}</div>
    </div>
  );
}
