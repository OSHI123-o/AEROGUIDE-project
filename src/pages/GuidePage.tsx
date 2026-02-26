import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import type { FlightLookupResult } from "../services/flightLookup";

const card: CSSProperties = {
  background: "rgba(255,255,255,0.72)",
  border: "1px solid rgba(255,255,255,0.75)",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 16px 30px rgba(15, 23, 42, 0.1)",
  backdropFilter: "blur(10px)",
};

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

const steps = [
  { id: "arrive", title: "Arrive at Terminal", detail: "Enter terminal and keep passport + ticket ready." },
  { id: "checkin", title: "Check-in / Bag Drop", detail: "Finish check-in and drop checked baggage." },
  { id: "security", title: "Security Check", detail: "Follow screening instructions and liquids policy." },
  { id: "immigration", title: "Immigration", detail: "Passport control before departure area." },
  { id: "gate", title: "Go to Boarding Gate", detail: "Reach gate early and monitor flight updates." },
];

const stepGuide: Record<
  string,
  { heading: string; points: string[]; prepare: string[]; warning?: string }
> = {
  arrive: {
    heading: "Arrive at terminal",
    points: [
      "Enter Terminal 1 and confirm your flight number on the display board.",
      "Keep passport and booking details ready before moving to counters.",
      "If you are unsure, ask at the information desk immediately.",
    ],
    prepare: ["Passport", "PNR or e-ticket", "Visa (if required)"],
    warning: "Try to arrive at least 3 hours before international departure.",
  },
  checkin: {
    heading: "Check-in and bag drop",
    points: [
      "Go to your airline check-in counters shown on screen.",
      "Submit travel documents and receive boarding pass/seat confirmation.",
      "Drop checked baggage and keep cabin baggage with valuables.",
    ],
    prepare: ["Passport", "Ticket/PNR", "Checked baggage"],
  },
  security: {
    heading: "Security screening",
    points: [
      "Keep laptop, liquids, and electronics ready for separate tray screening.",
      "Remove prohibited items before entering the queue.",
      "Follow officer instructions and collect all items after scan.",
    ],
    prepare: ["Boarding pass", "Cabin baggage"],
    warning: "Do not carry sharp objects or oversized liquid containers.",
  },
  immigration: {
    heading: "Immigration control",
    points: [
      "Join the correct departure immigration line.",
      "Present passport and boarding pass to officer.",
      "After stamping, proceed directly toward your gate area.",
    ],
    prepare: ["Passport", "Boarding pass"],
  },
  gate: {
    heading: "Move to boarding gate",
    points: [
      "Reach your gate and verify flight number plus destination on gate display.",
      "Stay near gate, keep announcements audible, and charge your phone if needed.",
      "Join boarding group only when your row/group is called.",
    ],
    prepare: ["Boarding pass", "Passport", "Cabin bag"],
    warning: "Gate may close 20-30 minutes before departure time.",
  },
};

type StepTarget = {
  name: string;
  lat: number;
  lon: number;
};

function haversineMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Math.round(R * (2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))));
}

function getTargetForStep(stepId: string, gate: string): StepTarget | null {
  const stepTargets = {
    arrive: { name: "Help Desk (Arrivals)", lat: 7.1781, lon: 79.8842 },
    checkin: { name: "Check-in Counters", lat: 7.1794, lon: 79.8853 },
    security: { name: "Security Screening", lat: 7.1798, lon: 79.8857 },
    immigration: { name: "Immigration", lat: 7.1807, lon: 79.8846 },
  } as const;

  const gateTargets: Record<string, StepTarget> = {
    A12: { name: "Gate A12", lat: 7.1802, lon: 79.8848 },
  };

  if (stepId === "arrive") {
    return stepTargets.arrive;
  }
  if (stepId === "checkin") {
    return stepTargets.checkin;
  }
  if (stepId === "security") {
    return stepTargets.security;
  }
  if (stepId === "immigration") {
    return stepTargets.immigration;
  }
  if (stepId === "gate") {
    return gateTargets[gate] ?? gateTargets.A12;
  }
  return null;
}

export default function GuidePage() {
  const navigate = useNavigate();
  const [themeMode, setThemeMode] = useState<"light" | "dark">(() => (localStorage.getItem("aeroguide_theme") === "dark" ? "dark" : "light"));
  const [flight, setFlight] = useState<FlightLookupResult>(DEFAULT_FLIGHT);
  const [stepIndex, setStepIndex] = useState(0);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState("Locating you...");

  useEffect(() => {
    localStorage.setItem("aeroguide_theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    const raw = localStorage.getItem("aeroguide_active_flight");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as FlightLookupResult;
      if (parsed?.flightNo && parsed?.gate) setFlight(parsed);
    } catch {
      // ignore malformed storage
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("Location unavailable in this browser");
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude, lon: p.coords.longitude });
        setLocationStatus("Live location tracking on");
      },
      () => setLocationStatus("Allow location access for accurate guidance"),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const progress = useMemo(() => Math.round(((stepIndex + 1) / steps.length) * 100), [stepIndex]);
  const currentStep = steps[stepIndex];
  const activeGuide = stepGuide[currentStep.id] ?? stepGuide.arrive;
  const currentTarget = useMemo(() => getTargetForStep(currentStep.id, flight.gate), [currentStep.id, flight.gate]);
  const metersToTarget = useMemo(
    () => (coords && currentTarget ? haversineMeters(coords, { lat: currentTarget.lat, lon: currentTarget.lon }) : null),
    [coords, currentTarget]
  );
  const mapEmbedUrl = useMemo(() => {
    if (!currentTarget) return "";
    if (coords) {
      return `https://maps.google.com/maps?saddr=${coords.lat},${coords.lon}&daddr=${currentTarget.lat},${currentTarget.lon}&z=18&output=embed`;
    }
    return `https://maps.google.com/maps?q=${currentTarget.lat},${currentTarget.lon}&z=18&output=embed`;
  }, [coords, currentTarget]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          themeMode === "light"
            ? "radial-gradient(circle at 15% 20%, rgba(252, 209, 220, 0.55) 0%, transparent 35%), radial-gradient(circle at 80% 15%, rgba(186, 230, 253, 0.55) 0%, transparent 30%), linear-gradient(160deg,#fdf2f8 0%,#f8fafc 45%,#eff6ff 100%)"
            : "radial-gradient(circle at 15% 20%, rgba(30, 41, 59, 0.6) 0%, transparent 35%), radial-gradient(circle at 80% 15%, rgba(30, 64, 175, 0.4) 0%, transparent 30%), linear-gradient(160deg,#020617 0%,#0f172a 45%,#111827 100%)",
        padding: 20,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 16 }}>
        <header style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, color: "#0f172a", fontSize: 34, letterSpacing: 0.3 }}>AEROGUIDE LIVE GUIDE</h1>
            <p style={{ margin: "6px 0 0", color: "#475569" }}>
              Personal airport companion for solo travelers, step by step.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setThemeMode((p) => (p === "light" ? "dark" : "light"))}
              aria-label={themeMode === "light" ? "Switch to dark mode" : "Switch to light mode"}
              title={themeMode === "light" ? "Switch to dark mode" : "Switch to light mode"}
              style={{ ...ghostButton, width: 42, padding: 0, fontSize: 18 }}
            >
              {themeMode === "light" ? "🌙" : "☀️"}
            </button>
            <button onClick={() => navigate("/dashboard")} style={ghostButton}>
              Back to Dashboard
            </button>
            <button onClick={() => navigate(`/map?gate=${encodeURIComponent(flight.gate)}`)} style={primaryButton}>
              Navigate to Gate {flight.gate}
            </button>
          </div>
        </header>

        <section style={{ ...card, display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 14 }}>
          <div style={{ borderRadius: 16, padding: 16, background: "linear-gradient(135deg,#0f172a,#1d4ed8)", color: "#fff" }}>
            <div style={{ fontSize: 13, opacity: 0.85 }}>Current Flight</div>
            <div style={{ fontSize: 34, fontWeight: 700, marginTop: 4 }}>
              {flight.originCode} to {flight.destinationCode}
            </div>
            <div style={{ marginTop: 8, opacity: 0.9 }}>
              {flight.flightNo} | Terminal {flight.terminal} | Gate {flight.gate}
            </div>
            <div style={{ marginTop: 12, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.2)", overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", borderRadius: 999, background: "#86efac" }} />
            </div>
            <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>Journey progress {progress}%</div>
          </div>

          <div style={{ borderRadius: 16, padding: 16, background: "rgba(255,255,255,0.7)", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 13, color: "#64748b" }}>Where am I?</div>
            <div style={{ marginTop: 6, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
              {coords ? `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}` : "Unknown"}
            </div>
            <div style={{ marginTop: 6, color: "#475569" }}>{locationStatus}</div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={chip}>Flight: {flight.flightNo}</span>
              <span style={chip}>PNR: {flight.pnr}</span>
              <span style={chip}>Next: {currentStep.title}</span>
            </div>
          </div>
        </section>

        <section style={{ ...card, display: "grid", gridTemplateColumns: "1.35fr 0.95fr", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, color: "#0f172a" }}>What do I do next?</h2>
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {steps.map((step, idx) => (
                <div
                  key={step.id}
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${idx === stepIndex ? "#3b82f6" : "#e2e8f0"}`,
                    background: idx <= stepIndex ? "#eff6ff" : "#ffffff",
                    padding: "12px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
                      {idx + 1}. {step.title}
                    </div>
                    <div style={{ marginTop: 4, color: "#475569" }}>{step.detail}</div>
                  </div>
                  <div style={{ color: idx < stepIndex ? "#16a34a" : idx === stepIndex ? "#2563eb" : "#94a3b8", fontWeight: 700 }}>
                    {idx < stepIndex ? "Done" : idx === stepIndex ? "Current" : "Pending"}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12, borderRadius: 12, border: "1px solid #e2e8f0", background: "#ffffff", padding: 12 }}>
              <h3 style={{ margin: 0, fontSize: 19, color: "#0f172a" }}>
                Friendly Guide: {activeGuide.heading}
              </h3>
              <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                {activeGuide.points.map((p, idx) => (
                  <div key={p} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ minWidth: 20, height: 20, borderRadius: 999, background: "#dbeafe", color: "#1d4ed8", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                      {idx + 1}
                    </span>
                    <span style={{ color: "#334155", lineHeight: 1.45 }}>{p}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>Prepare:</div>
              <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {activeGuide.prepare.map((item) => (
                  <span key={item} style={{ borderRadius: 999, border: "1px solid #e2e8f0", padding: "4px 8px", background: "#f8fafc", color: "#334155", fontSize: 12 }}>
                    {item}
                  </span>
                ))}
              </div>
              {activeGuide.warning ? (
                <div style={{ marginTop: 10, borderRadius: 8, background: "#fff7ed", border: "1px solid #fed7aa", padding: "8px 10px", color: "#9a3412", fontSize: 13 }}>
                  {activeGuide.warning}
                </div>
              ) : null}
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                style={primaryButton}
                onClick={() => setStepIndex((v) => (v < steps.length - 1 ? v + 1 : v))}
                disabled={stepIndex >= steps.length - 1}
              >
                Mark Done / Next Step
              </button>
              <button style={ghostButton} onClick={() => navigate(`/map?gate=${encodeURIComponent(flight.gate)}`)}>
                Open Indoor Map
              </button>
              <button style={ghostButton} onClick={() => navigate(`/flights?pnr=${encodeURIComponent(flight.pnr)}`)}>
                View All PNR Flights
              </button>
            </div>
          </div>

          <aside style={{ borderRadius: 14, border: "1px solid #e2e8f0", background: "#fff", padding: 10 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Live Step Map</div>
            <div style={{ marginTop: 4, fontWeight: 700, color: "#0f172a" }}>{currentStep.title}</div>
            <div style={{ marginTop: 4, fontSize: 13, color: "#475569" }}>
              Target: {currentTarget?.name ?? "Not mapped yet"}
            </div>
            {metersToTarget != null ? (
              <div style={{ marginTop: 4, fontSize: 13, color: "#334155" }}>Distance: ~{metersToTarget}m</div>
            ) : null}
            <div style={{ marginTop: 8, height: 270, borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0" }}>
              {mapEmbedUrl ? (
                <iframe title="Live step map" src={mapEmbedUrl} width="100%" height="100%" style={{ border: 0 }} loading="lazy" />
              ) : (
                <div style={{ padding: 12, color: "#64748b" }}>No map data for this step.</div>
              )}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
              {coords ? `You: ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}` : "Waiting for your location..."}
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}

const primaryButton: CSSProperties = {
  border: 0,
  borderRadius: 10,
  padding: "10px 14px",
  background: "#0f172a",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const ghostButton: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "10px 14px",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer",
};

const chip: CSSProperties = {
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 12,
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#334155",
};
