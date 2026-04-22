import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeModeIcon from "../components/ThemeModeIcon";
import type { FlightLookupResult } from "../services/flightLookup";
import { getPassengerSession } from "../services/passengerSession";

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

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatClock(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatFullDate(date: Date) {
  return date.toLocaleDateString([], { day: "2-digit", month: "long", year: "numeric" });
}

function deriveArrival(departure: Date, flightNo: string) {
  const digits = Number.parseInt(flightNo.replace(/\D/g, ""), 10) || 225;
  const durationMinutes = 240 + (digits % 7) * 15;
  return new Date(departure.getTime() + durationMinutes * 60000);
}

function formatDuration(start: Date, end: Date) {
  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${String(remainder).padStart(2, "0")}m`;
}

function buildBoardingDetails(flight: FlightLookupResult) {
  const seed = flight.pnr
    .split("")
    .reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);

  const row = 2 + (seed % 24);
  const seatLetter = ["A", "B", "C", "D", "E", "F"][seed % 6];
  const boardingMinutes = 35 + (seed % 20);
  const className = seed % 5 === 0 ? "Business" : "Economy";
  const baggage = className === "Business" ? "14 kg" : "7 kg";

  return {
    seat: `${row}${seatLetter}`,
    boardingTime: new Date(new Date(flight.departureIso).getTime() - boardingMinutes * 60000),
    travelClass: className,
    baggage,
    airlineCode: `${flight.originCode}${String(100 + (seed % 900))}`,
  };
}

function barcodePattern(value: string) {
  return value
    .split("")
    .map((char, index) => {
      const base = (char.charCodeAt(0) + index * 7) % 4;
      return `${base + 1}${(base % 3) + 1}`;
    })
    .join("");
}

function PlaneGlyph({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
      <path
        d="M21 3 3 11l7 2 2 7 9-17Zm-9 17-2-7-7-2"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoCard({
  label,
  value,
  isDark,
}: {
  label: string;
  value: string;
  isDark: boolean;
}) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: "14px 16px",
        background: isDark ? "rgba(15,23,42,0.55)" : "rgba(255,255,255,0.55)",
        border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.6)",
      }}
    >
      <div style={{ fontSize: 11, color: isDark ? "rgba(226,232,240,0.58)" : "rgba(15,23,42,0.48)" }}>{label}</div>
      <div style={{ marginTop: 5, fontSize: 22, fontWeight: 800, color: isDark ? "#f8fafc" : "#0f172a" }}>{value}</div>
    </div>
  );
}

export default function BoardingPassPage() {
  const navigate = useNavigate();
  const [themeMode, setThemeMode] = useState<"light" | "dark">(() => (localStorage.getItem("aeroguide_theme") === "dark" ? "dark" : "light"));
  const [flight, setFlight] = useState<FlightLookupResult>(DEFAULT_FLIGHT);

  useEffect(() => {
    const raw = localStorage.getItem("aeroguide_active_flight");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as FlightLookupResult;
      if (parsed?.flightNo) setFlight(parsed);
    } catch {
      // ignore malformed local storage
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("aeroguide_theme", themeMode);
    if (themeMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [themeMode]);

  const isDark = themeMode === "dark";
  const passengerSession = getPassengerSession();
  const departure = useMemo(() => new Date(flight.departureIso), [flight.departureIso]);
  const arrival = useMemo(() => deriveArrival(departure, flight.flightNo), [departure, flight.flightNo]);
  const details = useMemo(() => buildBoardingDetails(flight), [flight]);
  const passengerName = useMemo(() => {
    const source = passengerSession?.lastName || flight.lastName;
    return `Passenger ${titleCase(source)}`;
  }, [flight.lastName, passengerSession?.lastName]);
  const barcode = useMemo(
    () => barcodePattern(`${flight.pnr}${flight.flightNo}${details.seat}${flight.gate}`),
    [details.seat, flight.flightNo, flight.gate, flight.pnr]
  );

  const shellBg = isDark
    ? "linear-gradient(180deg, #071120 0%, #0b1730 35%, #122240 100%)"
    : "linear-gradient(180deg, #d9edff 0%, #cfe7ff 35%, #bddcff 100%)";
  const panelBg = isDark
    ? "linear-gradient(180deg, rgba(15,23,42,0.82) 0%, rgba(19,36,63,0.86) 100%)"
    : "linear-gradient(180deg, rgba(255,255,255,0.62) 0%, rgba(228,240,255,0.7) 30%, rgba(212,231,255,0.86) 100%)";
  const heroBg = isDark
    ? "linear-gradient(180deg, rgba(15,23,42,0.74), rgba(15,23,42,0.5))"
    : "linear-gradient(180deg, rgba(230,243,255,0.56), rgba(214,232,255,0.32))";
  const textMain = isDark ? "#f8fafc" : "#0f172a";
  const textSoft = isDark ? "rgba(226,232,240,0.72)" : "rgba(15,23,42,0.66)";
  const textMuted = isDark ? "rgba(226,232,240,0.56)" : "rgba(15,23,42,0.48)";
  const borderSoft = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.6)";
  const chipBg = isDark ? "rgba(15,23,42,0.55)" : "rgba(255,255,255,0.7)";
  const buttonSecondaryBg = isDark ? "rgba(15,23,42,0.76)" : "rgba(255,255,255,0.72)";

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px",
        background: shellBg,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes passFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes routePulse {
          0%, 100% { opacity: 0.65; }
          50% { opacity: 1; }
        }
        @media (max-width: 980px) {
          .boarding-page-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .boarding-pass-shell {
            padding: 20px 14px 18px !important;
          }
          .boarding-hero-grid,
          .boarding-content-grid {
            grid-template-columns: 1fr !important;
          }
          .floating-actions {
            left: 16px !important;
            bottom: 16px !important;
          }
        }
      `}</style>

      <img
        src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1800&q=80"
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: isDark ? 0.08 : 0.16,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: isDark
            ? "radial-gradient(circle at 12% 12%, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0.04) 18%, transparent 30%), radial-gradient(circle at 86% 18%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 18%, transparent 34%)"
            : "radial-gradient(circle at 12% 12%, rgba(73,150,255,0.35) 0%, rgba(73,150,255,0.08) 18%, transparent 30%), radial-gradient(circle at 86% 18%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.06) 18%, transparent 34%)",
          pointerEvents: "none",
        }}
      />

      <div
        className="boarding-page-grid"
        style={{
          width: "100%",
          position: "relative",
          zIndex: 1,
          minHeight: "calc(100vh - 48px)",
          display: "grid",
          gridTemplateColumns: "minmax(320px, 0.95fr) minmax(360px, 520px)",
          gap: 28,
          alignItems: "stretch",
        }}
      >
        <section
          style={{
            position: "relative",
            borderRadius: 34,
            overflow: "hidden",
            border: borderSoft,
            boxShadow: isDark ? "0 32px 70px rgba(2,6,23,0.45)" : "0 32px 70px rgba(76,113,158,0.2)",
            minHeight: 680,
            background: heroBg,
            backdropFilter: "blur(12px)",
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1517479149777-5f3b1511d5ad?auto=format&fit=crop&w=1600&q=80"
            alt="Aircraft above clouds"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: isDark ? 0.12 : 0.2,
            }}
          />

          <div style={{ position: "relative", zIndex: 1, padding: "28px", display: "grid", gap: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => navigate("/dashboard")}
                style={{
                  border: borderSoft,
                  borderRadius: 999,
                  padding: "10px 14px",
                  background: buttonSecondaryBg,
                  color: textMain,
                  fontWeight: 700,
                  cursor: "pointer",
                  backdropFilter: "blur(10px)",
                }}
              >
                Back
              </button>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={() => setThemeMode((prev) => (prev === "light" ? "dark" : "light"))}
                  style={{
                    border: borderSoft,
                    borderRadius: 999,
                    padding: "10px 12px",
                    background: buttonSecondaryBg,
                    color: textMain,
                    fontWeight: 700,
                    cursor: "pointer",
                    backdropFilter: "blur(10px)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  aria-label="Toggle theme"
                >
                  <ThemeModeIcon mode={themeMode} />
                </button>
                <button
                  onClick={() => navigate(`/map?gate=${encodeURIComponent(flight.gate)}`)}
                  style={{
                    border: 0,
                    borderRadius: 999,
                    padding: "10px 16px",
                    background: isDark ? "#8f76ff" : "#0f172a",
                    color: "#eff6ff",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: isDark ? "0 12px 24px rgba(143,118,255,0.24)" : "0 12px 24px rgba(15,23,42,0.18)",
                  }}
                >
                  Find Gate {flight.gate}
                </button>
              </div>
            </div>

            <div className="boarding-hero-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(220px, 0.8fr)", gap: 16 }}>
              <div style={{ borderRadius: 28, padding: "22px", background: chipBg, border: borderSoft, backdropFilter: "blur(10px)" }}>
                <div style={{ color: textMuted, fontSize: 12, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase" }}>
                  AeroGuide Journey
                </div>
                <h1 style={{ margin: "12px 0 0", fontSize: "clamp(2rem, 4vw, 3.7rem)", lineHeight: 0.98, color: textMain, fontWeight: 900 }}>
                  Travel status
                  <br />
                  before boarding
                </h1>
                <p style={{ margin: "16px 0 0", maxWidth: 520, color: textSoft, fontSize: 15, lineHeight: 1.65 }}>
                  The boarding pass stays on the right. This side now follows the active theme and stays in sync with the rest of the app.
                </p>

                <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                  <InfoCard label="Route" value={`${flight.originCode} to ${flight.destinationCode}`} isDark={isDark} />
                  <InfoCard label="Boarding" value={formatClock(details.boardingTime)} isDark={isDark} />
                  <InfoCard label="Passenger" value={titleCase((passengerSession?.lastName || flight.lastName).slice(0, 12))} isDark={isDark} />
                </div>
              </div>

              <div style={{ borderRadius: 28, padding: "18px", background: isDark ? "rgba(15,23,42,0.82)" : "rgba(15,23,42,0.82)", border: borderSoft, color: "#eff6ff" }}>
                <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(219,234,254,0.64)" }}>Next Step</div>
                <div style={{ marginTop: 10, fontSize: 24, fontWeight: 800, lineHeight: 1.05 }}>
                  Proceed through
                  <br />
                  Terminal {flight.terminal}
                </div>
                <div style={{ marginTop: 10, color: "rgba(226,232,240,0.76)", fontSize: 14, lineHeight: 1.5 }}>
                  Use airport signs and keep moving toward gate {flight.gate} before the boarding window opens.
                </div>
              </div>
            </div>

            <div className="boarding-content-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.08fr) minmax(0, 0.92fr)", gap: 14 }}>
              <div style={{ borderRadius: 26, overflow: "hidden", minHeight: 228, position: "relative", boxShadow: isDark ? "0 18px 40px rgba(2,6,23,0.24)" : "0 18px 40px rgba(66,104,152,0.16)" }}>
                <img
                  src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1400&q=80"
                  alt="Airplane at airport"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{ position: "absolute", inset: 0, background: isDark ? "linear-gradient(180deg, rgba(2,6,23,0.2), rgba(2,6,23,0.82))" : "linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.72))" }} />
                <div style={{ position: "absolute", left: 18, right: 18, bottom: 18, color: "#eff6ff" }}>
                  <div style={{ fontSize: 13, opacity: 0.82 }}>Airport Guidance</div>
                  <div style={{ marginTop: 4, fontSize: 24, fontWeight: 800 }}>Move from terminal entry to gate with less confusion</div>
                </div>
              </div>

              <div style={{ borderRadius: 26, padding: "18px", background: chipBg, border: borderSoft, display: "grid", gap: 14 }}>
                <div style={{ color: textMuted, fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Airport Checklist</div>
                {[
                  `Passport and PNR ${flight.pnr} should stay ready for inspection.`,
                  `Confirm terminal ${flight.terminal} and recheck gate ${flight.gate} on airport displays.`,
                  `Reach the boarding area before ${formatClock(details.boardingTime)}.`,
                ].map((item) => (
                  <div key={item} style={{ borderRadius: 18, padding: "12px 14px", background: isDark ? "rgba(15,23,42,0.45)" : "rgba(255,255,255,0.58)", color: textSoft }}>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
              <InfoCard label="Status" value={flight.status} isDark={isDark} />
              <InfoCard label="Terminal" value={flight.terminal} isDark={isDark} />
              <InfoCard label="PNR" value={flight.pnr} isDark={isDark} />
            </div>
          </div>
        </section>

        <section
          className="boarding-pass-shell"
          style={{
            position: "relative",
            borderRadius: 32,
            padding: "24px 18px 20px",
            background: panelBg,
            border: borderSoft,
            boxShadow: isDark ? "0 30px 60px rgba(2,6,23,0.45)" : "0 30px 60px rgba(76,113,158,0.28)",
            overflow: "hidden",
            backdropFilter: "blur(18px)",
            animation: "passFloat 7s ease-in-out infinite",
            alignSelf: "center",
            width: "100%",
            maxWidth: 520,
          }}
        >
          <div style={{ position: "absolute", left: "50%", top: 0, transform: "translate(-50%, -48%)", width: 34, height: 34, borderRadius: "50%", border: isDark ? "3px solid rgba(255,255,255,0.12)" : "3px solid rgba(255,255,255,0.75)", background: "linear-gradient(180deg, #89c5ff, #66a7ff)", display: "grid", placeItems: "center" }}>
            <PlaneGlyph size={14} color="#ffffff" />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "18px 12px", borderRadius: 18, background: chipBg, border: borderSoft }}>
            <div>
              <div style={{ fontWeight: 800, color: textMain, fontSize: 17 }}>AeroGuide Airways</div>
              <div style={{ marginTop: 2, color: textMuted, fontSize: 11 }}>{details.airlineCode}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: textMuted, fontSize: 12 }}>Class</div>
              <div style={{ marginTop: 4, color: textMain, fontSize: 13, fontWeight: 600 }}>{details.travelClass}</div>
            </div>
          </div>

          <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 6 }}>
            <div>
              <div style={{ color: textMuted, fontSize: 12 }}>{formatClock(departure)}</div>
              <div style={{ marginTop: 6, fontSize: 44, lineHeight: 1, fontWeight: 900, color: textMain, letterSpacing: "-0.05em" }}>{flight.originCode}</div>
              <div style={{ marginTop: 6, color: textSoft, fontSize: 13 }}>{flight.originCity}</div>
            </div>
            <div style={{ textAlign: "center", paddingTop: 18 }}>
              <div style={{ color: textMain, fontWeight: 700, fontSize: 13 }}>{formatFullDate(departure)}</div>
              <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
                <PlaneGlyph size={20} color={textMain} />
              </div>
              <div style={{ marginTop: 10, color: textMain, fontWeight: 700, fontSize: 13 }}>{formatDuration(departure, arrival)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: textMuted, fontSize: 12 }}>{formatClock(arrival)}</div>
              <div style={{ marginTop: 6, fontSize: 44, lineHeight: 1, fontWeight: 900, color: textMain, letterSpacing: "-0.05em" }}>{flight.destinationCode}</div>
              <div style={{ marginTop: 6, color: textSoft, fontSize: 13 }}>{flight.destinationCity}</div>
            </div>
          </div>

          <div style={{ marginTop: 28, display: "grid", gap: 12 }}>
            <InfoCard label="Passenger" value={passengerName} isDark={isDark} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <InfoCard label="Flight No" value={flight.flightNo} isDark={isDark} />
              <InfoCard label="Time" value={formatClock(departure)} isDark={isDark} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <InfoCard label="Seat" value={details.seat} isDark={isDark} />
              <InfoCard label="Gate" value={flight.gate} isDark={isDark} />
              <InfoCard label="Boarding" value={formatClock(details.boardingTime)} isDark={isDark} />
            </div>
          </div>

          <div style={{ marginTop: 22 }}>
            <div
              aria-hidden="true"
              style={{
                height: 74,
                borderRadius: 12,
                background: isDark
                  ? "repeating-linear-gradient(90deg, #f8fafc 0 2px, transparent 2px 5px, #f8fafc 5px 7px, transparent 7px 10px, #f8fafc 10px 11px, transparent 11px 13px)"
                  : "repeating-linear-gradient(90deg, #0f172a 0 2px, transparent 2px 5px, #0f172a 5px 7px, transparent 7px 10px, #0f172a 10px 11px, transparent 11px 13px)",
              }}
            />
            <div style={{ marginTop: 8, textAlign: "center", fontSize: 12, color: textMuted, letterSpacing: "0.32em", paddingLeft: "0.32em" }}>
              {barcode}
            </div>
          </div>
        </section>
      </div>

      <div className="floating-actions" style={{ position: "fixed", left: 24, bottom: 24, zIndex: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={() => navigate("/guide")}
          style={{
            border: borderSoft,
            borderRadius: 999,
            padding: "10px 16px",
            background: buttonSecondaryBg,
            color: textMain,
            fontWeight: 700,
            cursor: "pointer",
            backdropFilter: "blur(10px)",
          }}
        >
          Open Guide
        </button>
        <button
          onClick={() => navigate(`/map?gate=${encodeURIComponent(flight.gate)}`)}
          style={{
            border: borderSoft,
            borderRadius: 999,
            padding: "10px 16px",
            background: buttonSecondaryBg,
            color: textMain,
            fontWeight: 700,
            cursor: "pointer",
            backdropFilter: "blur(10px)",
          }}
        >
          Navigate to Gate
        </button>
      </div>
    </div>
  );
}
