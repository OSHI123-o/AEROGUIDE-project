import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeModeIcon from "../components/ThemeModeIcon";

export default function Overview() {
  const navigate = useNavigate();
  const [themeMode, setThemeMode] = useState<"light" | "dark">(() => (localStorage.getItem("aeroguide_theme") === "dark" ? "dark" : "light"));
  const [serverStatus, setServerStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const theme = useMemo(
    () =>
      themeMode === "light"
        ? { bg: "#f3f7fc", card: "#fff", border: "#d5e0ef", text: "#0b1d3a", muted: "#52627a", soft: "#f7f9fd", btn: "#FDB913", btnText: "#002B5B" }
        : { bg: "#061227", card: "#0a1f3d", border: "#21426d", text: "#e2e8f0", muted: "#b3c1d8", soft: "#0f2748", btn: "#FDB913", btnText: "#002B5B" },
    [themeMode]
  );

  useEffect(() => {
    localStorage.setItem("aeroguide_theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    let alive = true;

    async function checkHealth() {
      try {
        const res = await fetch("/api/health");
        if (!alive) return;
        setServerStatus(res.ok ? "connected" : "disconnected");
      } catch {
        if (!alive) return;
        setServerStatus("disconnected");
      }
    }

    checkHealth();
    const timer = window.setInterval(checkHealth, 15000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

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
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 13,
                color: serverStatus === "connected" ? "#16a34a" : serverStatus === "disconnected" ? "#dc2626" : theme.muted,
                fontWeight: 600,
              }}
            >
              {serverStatus === "connected"
                ? "Server connected"
                : serverStatus === "disconnected"
                ? "Server disconnected"
                : "Checking server connection..."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setThemeMode((p) => (p === "light" ? "dark" : "light"))}
              aria-label={themeMode === "light" ? "Switch to dark mode" : "Switch to light mode"}
              title={themeMode === "light" ? "Switch to dark mode" : "Switch to light mode"}
              style={{ border: `1px solid ${theme.border}`, borderRadius: 10, width: 40, height: 40, background: theme.soft, color: theme.text, cursor: "pointer", fontSize: 18 }}
            >
              <ThemeModeIcon mode={themeMode} />
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





