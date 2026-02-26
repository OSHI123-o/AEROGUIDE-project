import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FlightLookupResult } from "../services/flightLookup";

const DEFAULT_FLIGHT: FlightLookupResult = {
  pnr: "AG1234",
  lastName: "PERERA",
  flightNo: "UL225",
  originCode: "CMB",
  originCity: "Colombo",
  destinationCode: "DXB",
  destinationCity: "Dubai",
  departureIso: "2026-02-25T12:30:00+05:30",
  gate: "A12",
  terminal: "T1",
  status: "On Schedule",
};

function formatBoardingDate(date: Date) {
  return date.toLocaleDateString([], { day: "2-digit", month: "short", year: "2-digit" });
}

type JourneyStep = {
  id: string;
  title: string;
  detail: string;
  targetName: string;
  lat: number;
  lon: number;
};

const STEP_TEMPLATE: Omit<JourneyStep, "targetName" | "lat" | "lon">[] = [
  { id: "arrive", title: "Arrive at Terminal", detail: "Enter terminal and keep passport + ticket ready." },
  { id: "checkin", title: "Check-in / Bag Drop", detail: "Finish check-in and drop checked baggage." },
  { id: "security", title: "Security Check", detail: "Complete security screening." },
  { id: "immigration", title: "Immigration", detail: "Complete passport control." },
  { id: "gate", title: "Go to Boarding Gate", detail: "Proceed to your boarding gate." },
];

const STEP_TARGETS = {
  arrive: { targetName: "Help Desk (Arrivals)", lat: 7.1781, lon: 79.8842 },
  checkin: { targetName: "Check-in Counters", lat: 7.1794, lon: 79.8853 },
  security: { targetName: "Security Screening", lat: 7.1798, lon: 79.8857 },
  immigration: { targetName: "Immigration", lat: 7.1807, lon: 79.8846 },
  gate: { targetName: "Gate A12", lat: 7.1802, lon: 79.8848 },
} as const;

export default function BoardingPassPage() {
  const navigate = useNavigate();
  const [themeMode, setThemeMode] = useState<"light" | "dark">(() => (localStorage.getItem("aeroguide_theme") === "dark" ? "dark" : "light"));
  const [flight, setFlight] = useState<FlightLookupResult>(DEFAULT_FLIGHT);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [stepIndex, setStepIndex] = useState<number>(() => {
    const saved = Number(localStorage.getItem("aeroguide_journey_step") || "0");
    if (Number.isNaN(saved)) return 0;
    return Math.max(0, Math.min(saved, STEP_TEMPLATE.length - 1));
  });

  useEffect(() => {
    localStorage.setItem("aeroguide_theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
      },
      () => {}
    );
  }, []);

  useEffect(() => {
    localStorage.setItem("aeroguide_journey_step", String(stepIndex));
  }, [stepIndex]);

  useEffect(() => {
    const raw = localStorage.getItem("aeroguide_active_flight");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as FlightLookupResult;
      if (parsed?.flightNo) setFlight(parsed);
    } catch {
      // ignore malformed storage
    }
  }, []);

  const departure = useMemo(() => new Date(flight.departureIso), [flight.departureIso]);
  const gateCloses = useMemo(() => new Date(departure.getTime() - 30 * 60000), [departure]);
  const steps: JourneyStep[] = useMemo(() => {
    const gateTarget = {
      targetName: `Gate ${flight.gate}`,
      lat: STEP_TARGETS.gate.lat,
      lon: STEP_TARGETS.gate.lon,
    };
    return STEP_TEMPLATE.map((s) => ({
      ...s,
      ...(s.id === "gate" ? gateTarget : STEP_TARGETS[s.id as keyof typeof STEP_TARGETS]),
    }));
  }, [flight.gate]);
  const activeStep = steps[stepIndex];
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);

  const bg = themeMode === "light"
    ? "linear-gradient(165deg,#e0f2fe 0%,#fdf2f8 45%,#eef2ff 100%)"
    : "linear-gradient(165deg,#020617 0%,#0f172a 45%,#1e293b 100%)";

  const textMain = themeMode === "light" ? "#0f172a" : "#e2e8f0";
  const textMuted = themeMode === "light" ? "#475569" : "#94a3b8";
  const panel = themeMode === "light" ? "rgba(255,255,255,0.75)" : "rgba(15,23,42,0.72)";
  const panelBorder = themeMode === "light" ? "rgba(255,255,255,0.85)" : "rgba(148,163,184,0.22)";

  return (
    <div style={{ minHeight: "100vh", background: bg, padding: 24, position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes floatY {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes movePlane {
          0% { transform: translateX(-20px) rotate(-8deg); opacity: 0.75; }
          50% { transform: translateX(22px) rotate(0deg); opacity: 1; }
          100% { transform: translateX(-20px) rotate(-8deg); opacity: 0.75; }
        }
      `}</style>

      <img
        src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1800&q=80"
        alt="Aviation background"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: themeMode === "light" ? 0.2 : 0.16,
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "absolute", top: 90, left: 80, width: 180, height: 180, borderRadius: "50%", background: "rgba(59,130,246,0.25)", filter: "blur(50px)", animation: "floatY 6s ease-in-out infinite" }} />
      <div style={{ position: "absolute", bottom: 80, right: 70, width: 220, height: 220, borderRadius: "50%", background: "rgba(244,114,182,0.2)", filter: "blur(50px)", animation: "floatY 7s ease-in-out infinite" }} />

      <div style={{ maxWidth: 980, margin: "0 auto", position: "relative", zIndex: 2 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ color: textMain }}>
            <div style={{ fontSize: 32, fontWeight: 800 }}>Digital Boarding Pass</div>
            <div style={{ color: textMuted }}>AEROGUIDE verified passenger details</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setThemeMode((p) => (p === "light" ? "dark" : "light"))}
              aria-label={themeMode === "light" ? "Switch to dark mode" : "Switch to light mode"}
              title={themeMode === "light" ? "Switch to dark mode" : "Switch to light mode"}
              style={{ width: 42, height: 42, borderRadius: 10, border: `1px solid ${panelBorder}`, background: panel, color: textMain, cursor: "pointer", fontSize: 18 }}
            >
              {themeMode === "light" ? "🌙" : "☀️"}
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              style={{ border: 0, borderRadius: 10, padding: "10px 14px", background: "#0f172a", color: "#fff", fontWeight: 700, cursor: "pointer" }}
            >
              Back to Dashboard
            </button>
          </div>
        </header>

        <section
          style={{
            background: panel,
            border: `1px solid ${panelBorder}`,
            borderRadius: 22,
            overflow: "hidden",
            boxShadow: "0 28px 50px rgba(15,23,42,0.22)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10 }}>
            <div>
              <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, color: "#1d4ed8" }}>{flight.originCode}</div>
              <div style={{ marginTop: 8, color: textMuted, fontSize: 26 }}>{flight.originCity}</div>
            </div>
            <div style={{ fontSize: 38, color: textMuted, animation: "movePlane 3s ease-in-out infinite" }}>✈</div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, color: "#1d4ed8" }}>{flight.destinationCode}</div>
              <div style={{ marginTop: 8, color: textMuted, fontSize: 26 }}>{flight.destinationCity}</div>
            </div>
          </div>

          <div style={{ background: "#1d4ed8", color: "#fff", display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
            <PassCell label="Date" value={formatBoardingDate(departure)} />
            <PassCell label="Gate Closes" value={gateCloses.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} />
            <PassCell label="Departure" value={departure.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} />
          </div>

          <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: 10 }}>
            <div style={{ border: "2px dashed #1d4ed8", borderRadius: 12, padding: 12, background: "rgba(255,255,255,0.55)" }}>
              <div style={{ fontSize: 13, color: "#334155", fontWeight: 700 }}>PNR</div>
              <div style={{ marginTop: 2, fontSize: 42, fontWeight: 900, color: "#0f172a", letterSpacing: 1 }}>{flight.pnr}</div>
            </div>
            <InfoCard label="Flight" value={flight.flightNo} />
            <InfoCard label="Seat" value="13C" />
            <InfoCard label="Gate" value={flight.gate} />
            <InfoCard label="Terminal" value={flight.terminal} />
            <InfoCard label="Passenger" value={flight.lastName} />
            <InfoCard label="Status" value={flight.status} />
            <InfoCard label="Baggage" value="Free carry-on bag" />
          </div>
        </section>

        <section
          style={{
            marginTop: 16,
            background: panel,
            border: `1px solid ${panelBorder}`,
            borderRadius: 18,
            padding: 16,
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ color: textMain, fontWeight: 800, fontSize: 24 }}>Step-by-Step Navigation</div>
              <div style={{ color: textMuted }}>Current step: {activeStep.title}</div>
            </div>
            <div style={{ minWidth: 220 }}>
              <div style={{ height: 8, borderRadius: 999, background: "rgba(148,163,184,0.35)", overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: "#22c55e" }} />
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: textMuted, textAlign: "right" }}>{progress}% complete</div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {steps.map((s, idx) => (
              <div
                key={s.id}
                style={{
                  borderRadius: 10,
                  border: `1px solid ${idx === stepIndex ? "#3b82f6" : "#cbd5e1"}`,
                  background: idx <= stepIndex ? "rgba(239,246,255,0.75)" : "rgba(255,255,255,0.55)",
                  padding: "10px 12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{idx + 1}. {s.title}</div>
                  <div style={{ color: "#475569", fontSize: 13 }}>{s.detail}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: idx < stepIndex ? "#16a34a" : idx === stepIndex ? "#2563eb" : "#64748b" }}>
                  {idx < stepIndex ? "Done" : idx === stepIndex ? "Current" : "Pending"}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => {
                const params = new URLSearchParams({
                  navigation: "true",
                  search: activeStep.targetName,
                  destLat: String(activeStep.lat),
                  destLon: String(activeStep.lon),
                });
                if (userCoords) {
                  params.set("userLat", String(userCoords.lat));
                  params.set("userLon", String(userCoords.lon));
                }
                navigate(`/map?${params.toString()}`);
              }}
              style={{ border: 0, borderRadius: 10, padding: "10px 14px", background: "#0f172a", color: "#fff", fontWeight: 700, cursor: "pointer" }}
            >
              Navigate This Step
            </button>
            <button
              onClick={() => setStepIndex((v) => (v < steps.length - 1 ? v + 1 : v))}
              style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: "10px 14px", background: "#fff", color: "#0f172a", fontWeight: 700, cursor: "pointer" }}
            >
              Mark Step Done
            </button>
            <button
              onClick={() => navigate("/guide")}
              style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: "10px 14px", background: "rgba(255,255,255,0.75)", color: "#0f172a", fontWeight: 700, cursor: "pointer" }}
            >
              Open Full Guide
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function PassCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "14px 16px", borderRight: "1px solid rgba(255,255,255,0.25)" }}>
      <div style={{ fontSize: 13, opacity: 0.85 }}>{label}</div>
      <div style={{ marginTop: 2, fontSize: 34, fontWeight: 900, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ borderRadius: 10, border: "1px solid #dbeafe", background: "rgba(255,255,255,0.72)", padding: 10 }}>
      <div style={{ fontSize: 12, color: "#64748b" }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 19, fontWeight: 800, color: "#0f172a" }}>{value}</div>
    </div>
  );
}
