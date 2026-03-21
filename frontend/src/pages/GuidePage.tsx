import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import ThemeModeIcon from "../components/ThemeModeIcon";
import type { FlightLookupResult } from "../services/flightLookup";
import { publishVoiceEvent, requestMicrophonePermission, speakText } from "../services/voiceAssistant";

const card: CSSProperties = {
  background: "rgba(255,255,255,0.72)",
  border: "1px solid rgba(0,43,91,0.2)",
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
  {
    heading: string;
    objective: string;
    points: string[];
    why: string;
    prepare: string[];
    qualityChecks: string[];
    commonMistakes: string[];
    timeHint: string;
    proTip?: string;
    warning?: string;
  }
> = {
  arrive: {
    heading: "Arrive at terminal",
    objective: "Start early and get oriented before queues build up.",
    points: [
      "Enter Terminal 1 and confirm your exact flight number, airline, and departure time on FIDS screens.",
      "Validate any airline notifications for gate changes or check-in counter changes before moving.",
      "Keep passport, ticket/PNR, and visa documents in one easy-access pouch.",
      "If this is your first visit, identify check-in zone, nearest restroom, and help desk first.",
    ],
    why: "Most delays start at arrival: wrong counter, missing documents, and late queue entry create avoidable stress.",
    prepare: ["Passport", "PNR or e-ticket", "Visa (if required)"],
    qualityChecks: [
      "You can clearly state your counter row and gate direction.",
      "All travel documents are physically in hand, not buried in baggage.",
      "You still have at least 2.5 to 3 hours before departure for international flights.",
    ],
    commonMistakes: [
      "Standing in the wrong airline queue based on similar flight numbers.",
      "Keeping passport inside checked baggage by mistake.",
      "Ignoring live display updates after entering terminal.",
    ],
    timeHint: "5 to 12 minutes",
    proTip: "Take a quick photo of your check-in counter info so you can return if you get redirected.",
    warning: "Try to arrive at least 3 hours before international departure.",
  },
  checkin: {
    heading: "Check-in and bag drop",
    objective: "Get your boarding pass and clear baggage without rework.",
    points: [
      "Join the check-in or bag-drop queue shown for your airline and flight.",
      "Present passport, ticket/PNR, and visa pages in one set to speed processing.",
      "Confirm seat, meal preference, and baggage tags before leaving the counter.",
      "Ensure cabin baggage has all essentials: passport, medication, chargers, valuables.",
    ],
    why: "Clean check-in prevents backtracking later; missing baggage tags or wrong documents can block boarding.",
    prepare: ["Passport", "Ticket/PNR", "Checked baggage"],
    qualityChecks: [
      "Boarding pass shows correct name, flight number, date, and gate (or TBD).",
      "Checked baggage tag receipt is attached to boarding pass or saved safely.",
      "You know final baggage count and your cabin bag is within limit.",
    ],
    commonMistakes: [
      "Walking away without verifying boarding pass details.",
      "Discarding baggage tag receipt too early.",
      "Placing power bank in checked baggage instead of cabin bag.",
    ],
    timeHint: "12 to 30 minutes",
    proTip: "Ask counter staff if your gate is likely to change so you can monitor the right display area.",
  },
  security: {
    heading: "Security screening",
    objective: "Pass screening in one attempt with no item recovery issues.",
    points: [
      "Before tray, separate laptop/tablet, liquids, and metal items exactly as instructed.",
      "Empty pockets fully and keep phone, wallet, passport in one tray section.",
      "Follow lane-specific instructions from officers; do not assume same process in every lane.",
      "After scan, move to collection area immediately and re-check all personal items.",
    ],
    why: "Security is the highest-friction point; being prepared can cut queue time significantly.",
    prepare: ["Boarding pass", "Cabin baggage"],
    qualityChecks: [
      "You have collected passport, boarding pass, phone, wallet, and electronics.",
      "No bag was left open or unzipped after inspection.",
      "You are clear on next direction toward immigration.",
    ],
    commonMistakes: [
      "Leaving phone or watch in tray.",
      "Carrying oversized liquids or restricted tools.",
      "Repacking in the belt area and blocking others.",
    ],
    timeHint: "10 to 25 minutes",
    proTip: "Keep a dedicated small pouch for metal items so tray prep takes under 20 seconds.",
    warning: "Do not carry sharp objects or oversized liquid containers.",
  },
  immigration: {
    heading: "Immigration control",
    objective: "Complete passport control accurately and proceed directly to departures.",
    points: [
      "Select the correct departure queue for your passport category.",
      "Present passport and boarding pass together; answer officer questions clearly and briefly.",
      "Check passport stamp/date immediately before leaving the counter.",
      "Proceed directly to departures concourse and reconfirm gate.",
    ],
    why: "Any mismatch here can stop travel completely; accuracy matters more than speed.",
    prepare: ["Passport", "Boarding pass"],
    qualityChecks: [
      "Passport is stamped (if required) and returned safely.",
      "Your boarding pass remains with passport for gate checks.",
      "You have revalidated gate information after immigration.",
    ],
    commonMistakes: [
      "Joining an arrivals or wrong-passport lane.",
      "Forgetting to verify stamp/entry details.",
      "Stopping too long for shopping before checking gate status.",
    ],
    timeHint: "8 to 20 minutes",
    proTip: "After immigration, walk 2 minutes toward your gate first, then pause for food or shopping.",
  },
  gate: {
    heading: "Move to boarding gate",
    objective: "Reach boarding area early and board smoothly without last-minute rush.",
    points: [
      "Arrive at gate and verify flight number, destination, and boarding time on gate monitor.",
      "Monitor display at intervals because gate/boarding sequence can change.",
      "Prepare passport and boarding pass before queue call.",
      "Board only when your zone/group is called to keep flow smooth.",
    ],
    why: "Final boarding is time-critical; most missed flights happen in this phase due to poor gate monitoring.",
    prepare: ["Boarding pass", "Passport", "Cabin bag"],
    qualityChecks: [
      "You are physically near the correct gate at least 30 to 45 minutes before departure.",
      "Documents are in hand before joining queue.",
      "Carry-on is closed and ready for cabin storage.",
    ],
    commonMistakes: [
      "Waiting at nearby gate with similar flight number.",
      "Going too far for shopping close to gate closing time.",
      "Joining wrong boarding group and being sent back.",
    ],
    timeHint: "Until boarding completes",
    proTip: "Set a personal alarm 10 minutes before boarding starts as a backup to announcements.",
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
  const [micAllowed, setMicAllowed] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("Voice guidance is off");
  const lastAnnouncementKeyRef = useRef("");

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

  const progress = useMemo(() => Math.round((stepIndex / Math.max(1, steps.length - 1)) * 100), [stepIndex]);
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
  const guideAnnouncement = useMemo(() => {
    const targetPart = currentTarget ? ` Next target is ${currentTarget.name}.` : "";
    const distancePart = metersToTarget != null ? ` You are approximately ${metersToTarget} meters away.` : "";
    return `Step ${stepIndex + 1}: ${currentStep.title}. ${activeGuide.objective}.${targetPart}${distancePart}`;
  }, [activeGuide.objective, currentStep.title, currentTarget, metersToTarget, stepIndex]);

  useEffect(() => {
    if (!micAllowed) return;
    const key = `${flight.flightNo}-${stepIndex}-${currentTarget?.name ?? "none"}`;
    if (lastAnnouncementKeyRef.current === key) return;
    lastAnnouncementKeyRef.current = key;
    publishVoiceEvent({ source: "guide", text: guideAnnouncement });
    speakText(guideAnnouncement, { rate: 0.97, pitch: 1, lang: "en-US" });
    setVoiceStatus("Voice guidance active");
  }, [currentTarget?.name, flight.flightNo, guideAnnouncement, micAllowed, stepIndex]);

  const enableMicForVoiceGuide = async () => {
    const allowed = await requestMicrophonePermission();
    setMicAllowed(allowed);
    if (allowed) {
      setVoiceStatus("Microphone access granted. Step announcements are now active.");
      publishVoiceEvent({ source: "guide", text: "Voice guidance enabled for your live journey." });
      speakText("Voice guidance enabled. I will announce each step.", { rate: 0.98, lang: "en-US" });
      lastAnnouncementKeyRef.current = "";
    } else {
      setVoiceStatus("Microphone permission denied. Enable access to use voice announcements.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          themeMode === "light"
            ? "radial-gradient(circle at 15% 20%, rgba(253, 185, 19, 0.28) 0%, transparent 35%), radial-gradient(circle at 80% 15%, rgba(111, 153, 201, 0.35) 0%, transparent 30%), linear-gradient(160deg,#f6f9ff 0%,#f8fafc 45%,#e6f0ff 100%)"
            : "radial-gradient(circle at 15% 20%, rgba(253, 185, 19, 0.2) 0%, transparent 35%), radial-gradient(circle at 80% 15%, rgba(31, 64, 104, 0.45) 0%, transparent 30%), linear-gradient(160deg,#061227 0%,#0a1f3d 45%,#133761 100%)",
        padding: 20,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 16 }}>
        <header style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, color: "#002B5B", fontSize: 34, letterSpacing: 0.3 }}>AEROGUIDE LIVE GUIDE</h1>
            <p style={{ margin: "6px 0 0", color: "#52627a" }}>
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
              <ThemeModeIcon mode={themeMode} />
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
          <div style={{ borderRadius: 16, padding: 16, background: "linear-gradient(135deg,#002B5B,#214d7c)", color: "#fff" }}>
            <div style={{ fontSize: 13, opacity: 0.85 }}>Current Flight</div>
            <div style={{ fontSize: 34, fontWeight: 700, marginTop: 4 }}>
              {flight.originCode} to {flight.destinationCode}
            </div>
            <div style={{ marginTop: 8, opacity: 0.9 }}>
              {flight.flightNo} | Terminal {flight.terminal} | Gate {flight.gate}
            </div>
            <div style={{ marginTop: 12, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.2)", overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", borderRadius: 999, background: "#FDB913" }} />
            </div>
            <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>Journey progress {progress}%</div>
          </div>

          <div style={{ borderRadius: 16, padding: 16, background: "rgba(255,255,255,0.78)", border: "1px solid rgba(0,43,91,0.2)" }}>
            <div style={{ fontSize: 13, color: "#52627a" }}>Where am I?</div>
            <div style={{ marginTop: 6, fontSize: 20, fontWeight: 700, color: "#002B5B" }}>
              {coords ? `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}` : "Unknown"}
            </div>
            <div style={{ marginTop: 6, color: "#52627a" }}>{locationStatus}</div>
            <div style={{ marginTop: 4, color: "#52627a" }}>{voiceStatus}</div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={chip}>Flight: {flight.flightNo}</span>
              <span style={chip}>PNR: {flight.pnr}</span>
              <span style={chip}>Next: {currentStep.title}</span>
            </div>
            <div style={{ marginTop: 12 }}>
              <button
                onClick={enableMicForVoiceGuide}
                style={{ ...ghostButton, borderColor: micAllowed ? "#16a34a" : "rgba(0,43,91,0.2)" }}
              >
                {micAllowed ? "Microphone Allowed" : "Enable Microphone for Voice Guide"}
              </button>
            </div>
          </div>
        </section>

        <section style={{ ...card, display: "grid", gridTemplateColumns: "1.35fr 0.95fr", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, color: "#002B5B" }}>What do I do next?</h2>
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {steps.map((step, idx) => (
                <div
                  key={step.id}
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${idx === stepIndex ? "#FDB913" : "rgba(0,43,91,0.2)"}`,
                    background: idx <= stepIndex ? "rgba(253,185,19,0.14)" : "#ffffff",
                    padding: "12px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#002B5B" }}>
                      {idx + 1}. {step.title}
                    </div>
                    <div style={{ marginTop: 4, color: "#52627a" }}>{step.detail}</div>
                  </div>
                  <div style={{ color: idx < stepIndex ? "#16a34a" : idx === stepIndex ? "#002B5B" : "#94a3b8", fontWeight: 700 }}>
                    {idx < stepIndex ? "Done" : idx === stepIndex ? "Current" : "Pending"}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12, borderRadius: 12, border: "1px solid rgba(0,43,91,0.2)", background: "#ffffff", padding: 12 }}>
              <h3 style={{ margin: 0, fontSize: 19, color: "#002B5B" }}>
                Friendly Guide: {activeGuide.heading}
              </h3>
              <div style={{ marginTop: 6, color: "#334155", fontWeight: 600 }}>{activeGuide.objective}</div>
              <div style={{ marginTop: 8, display: "inline-flex", borderRadius: 999, background: "#e0ecff", color: "#1e3a8a", padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>
                Typical time: {activeGuide.timeHint}
              </div>
              <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                {activeGuide.points.map((p, idx) => (
                  <div key={p} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ minWidth: 20, height: 20, borderRadius: 999, background: "rgba(253,185,19,0.25)", color: "#002B5B", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                      {idx + 1}
                    </span>
                    <span style={{ color: "#334155", lineHeight: 1.45 }}>{p}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, borderRadius: 10, background: "#eff6ff", border: "1px solid #bfdbfe", padding: "8px 10px" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8" }}>Why this matters</div>
                <div style={{ marginTop: 4, fontSize: 13, color: "#334155" }}>{activeGuide.why}</div>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>Prepare:</div>
              <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {activeGuide.prepare.map((item) => (
                  <span key={item} style={{ borderRadius: 999, border: "1px solid rgba(0,43,91,0.2)", padding: "4px 8px", background: "#f8fafc", color: "#334155", fontSize: 12 }}>
                    {item}
                  </span>
                ))}
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>Quality checks before next step:</div>
              <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                {activeGuide.qualityChecks.map((check) => (
                  <div key={check} style={{ color: "#14532d", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "6px 8px", fontSize: 12 }}>
                    {check}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>Common mistakes to avoid:</div>
              <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                {activeGuide.commonMistakes.map((mistake) => (
                  <div key={mistake} style={{ color: "#9a3412", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "6px 8px", fontSize: 12 }}>
                    {mistake}
                  </div>
                ))}
              </div>

              {activeGuide.proTip ? (
                <div style={{ marginTop: 10, borderRadius: 8, background: "#ecfeff", border: "1px solid #a5f3fc", padding: "8px 10px", color: "#155e75", fontSize: 13 }}>
                  Pro tip: {activeGuide.proTip}
                </div>
              ) : null}
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

          <aside style={{ borderRadius: 14, border: "1px solid rgba(0,43,91,0.2)", background: "#fff", padding: 10 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Live Step Map</div>
            <div style={{ marginTop: 4, fontWeight: 700, color: "#002B5B" }}>{currentStep.title}</div>
            <div style={{ marginTop: 4, fontSize: 13, color: "#475569" }}>
              Target: {currentTarget?.name ?? "Not mapped yet"}
            </div>
            {metersToTarget != null ? (
              <div style={{ marginTop: 4, fontSize: 13, color: "#334155" }}>Distance: ~{metersToTarget}m</div>
            ) : null}
            <div style={{ marginTop: 8, height: 270, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(0,43,91,0.2)" }}>
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
  background: "#FDB913",
  color: "#002B5B",
  fontWeight: 700,
  cursor: "pointer",
};

const ghostButton: CSSProperties = {
  border: "1px solid rgba(0,43,91,0.2)",
  borderRadius: 10,
  padding: "10px 14px",
  background: "#fff",
  color: "#002B5B",
  fontWeight: 700,
  cursor: "pointer",
};

const chip: CSSProperties = {
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 12,
  border: "1px solid rgba(0,43,91,0.2)",
  background: "#fff",
  color: "#1f3b60",
};
