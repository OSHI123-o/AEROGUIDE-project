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

  const shellBg = isDark ? "#091530" : "#f8fafc";
  const panelBg = isDark ? "#112143" : "#ffffff";
  const heroBg = panelBg;
  const chipBg = isDark ? "#1a2e5c" : "#f1f5f9";
  const textMain = isDark ? "#f8fafc" : "#0f172a";
  const textSoft = isDark ? "#94a3b8" : "#475569";
  const textMuted = isDark ? "#64748b" : "#64748b";
  const borderSoft = isDark ? "1px solid #1a2e5c" : "1px solid #e2e8f0";
  const buttonSecondaryBg = chipBg;

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
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
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

      {/* Animated Blobs Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {isDark ? (
          <>
            <div className="absolute top-0 -left-4 w-72 h-72 bg-aeroguide-blue/20 rounded-full mix-blend-screen filter blur-3xl opacity-70 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-900/20 rounded-full mix-blend-screen filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-900/20 rounded-full mix-blend-screen filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
          </>
        ) : (
          <>
            <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-sky-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
          </>
        )}
      </div>

      {/* Subtle grid overlay */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={isDark ? {
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        } : {}}
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

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Box 1: Journey Overview */}
              <div style={{ borderRadius: 28, padding: "22px", background: chipBg, border: borderSoft, backdropFilter: "blur(10px)" }}>
                <div style={{ color: textMuted, fontSize: 12, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase" }}>
                  AeroGuide Journey
                </div>
                <h1 style={{ margin: "12px 0 0", fontSize: "clamp(2rem, 4vw, 3.7rem)", lineHeight: 0.98, color: textMain, fontWeight: 900 }}>
                  Travel status
                </h1>
                <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                  <InfoCard label="Route" value={`${flight.originCode} to ${flight.destinationCode}`} isDark={isDark} />
                  <InfoCard label="Boarding" value={formatClock(details.boardingTime)} isDark={isDark} />
                  <InfoCard label="Passenger" value={titleCase((passengerSession?.lastName || flight.lastName).slice(0, 12))} isDark={isDark} />
                  <InfoCard label="Status" value={flight.status} isDark={isDark} />
                  <InfoCard label="Terminal" value={flight.terminal} isDark={isDark} />
                  <InfoCard label="PNR" value={flight.pnr} isDark={isDark} />
                </div>
              </div>

              <div className="boarding-content-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16 }}>
                {/* Box 2: Next Step Widget */}
                <div className={`relative overflow-hidden group rounded-3xl p-6 border ${isDark ? 'border-aeroguide-blue/30 bg-slate-900/80' : 'border-blue-200 bg-blue-50'} text-slate-800`}>
                  <div className={`absolute inset-0 opacity-20 transition-opacity duration-500 group-hover:opacity-40 bg-gradient-to-br ${isDark ? 'from-aeroguide-blue to-purple-600' : 'from-blue-400 to-indigo-500'}`}></div>
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">✨</span>
                      <div className={`text-xs font-black tracking-[0.16em] uppercase ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>Next Step</div>
                    </div>
                    <div className={`mt-2 text-2xl font-black leading-[1.1] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Proceed through<br />Terminal {flight.terminal}
                    </div>
                    <div className={`mt-auto pt-4 text-sm font-medium leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      Follow airport signs and proceed to gate <strong className={isDark ? 'text-white' : 'text-slate-900'}>{flight.gate}</strong> before the boarding window opens.
                    </div>
                    
                    {/* Glowing Progress Indicator */}
                    <div className="mt-5 w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 relative">
                      <div className={`h-2.5 rounded-full ${isDark ? 'bg-aeroguide-blue' : 'bg-blue-500'} shadow-[0_0_10px_rgba(143,118,255,0.8)]`} style={{ width: '45%' }}></div>
                      <div className="absolute top-1/2 -translate-y-1/2 left-[45%] -translate-x-1/2 w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center">
                        <PlaneGlyph size={12} color={isDark ? "#8f76ff" : "#3b82f6"} />
                      </div>
                    </div>
                    <div className={`mt-2 text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'} text-right`}>45 mins to boarding</div>
                  </div>
                </div>

                {/* Box 3: Airport Checklist */}
                <div style={{ borderRadius: 28, padding: "24px", background: chipBg, border: borderSoft, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ color: textMuted, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>Airport Checklist</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, justifyItems: "center" }}>
                    {[
                      { icon: "🛂", text: `Keep passport and PNR ready for inspection.` },
                      { icon: "🏢", text: `Confirm terminal ${flight.terminal} and gate ${flight.gate}.` },
                      { icon: "⏰", text: `Reach boarding area before ${formatClock(details.boardingTime)}.` },
                    ].map((item) => (
                      <div key={item.text} className={`flex items-start gap-3 rounded-2xl p-3 transition-all ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white/60 hover:bg-white/80 shadow-sm'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm shrink-0 ${isDark ? 'bg-[#0B1021]' : 'bg-slate-50'}`}>
                          {item.icon}
                        </div>
                        <div className={`text-sm font-medium leading-snug pt-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {item.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="boarding-pass-shell group relative"
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
          {/* Top Edge Glow */}
          <div className={`absolute top-0 left-0 right-0 h-1 ${isDark ? 'bg-gradient-to-r from-transparent via-aeroguide-blue to-transparent' : 'bg-gradient-to-r from-transparent via-blue-400 to-transparent'} opacity-50`}></div>

          <div style={{ position: "absolute", left: "50%", top: 0, transform: "translate(-50%, -48%)", width: 34, height: 34, borderRadius: "50%", border: isDark ? "3px solid rgba(255,255,255,0.12)" : "3px solid rgba(255,255,255,0.75)", background: "linear-gradient(180deg, #89c5ff, #66a7ff)", display: "grid", placeItems: "center", zIndex: 10 }}>
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
            <div style={{ textAlign: "center", paddingTop: 18, position: "relative" }}>
              <div style={{ color: textMain, fontWeight: 700, fontSize: 13 }}>{formatFullDate(departure)}</div>
              <div style={{ marginTop: 10, display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}>
                <div className={`absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 border-t-2 border-dashed ${isDark ? 'border-slate-700' : 'border-slate-300'}`}></div>
                <div className="relative z-10 bg-inherit px-2" style={{ background: panelBg }}>
                  <PlaneGlyph size={20} color={textMain} />
                </div>
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

          {/* Perforated Divider with Cutouts */}
          <div className="relative my-8">
            <div className={`absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-10 rounded-r-full shadow-inner ${isDark ? 'bg-[#091530]' : 'bg-[#f8fafc]'} border-r border-t border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}></div>
            <div className={`border-t-2 border-dashed ${isDark ? 'border-slate-700' : 'border-slate-300'}`}></div>
            <div className={`absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-10 rounded-l-full shadow-inner ${isDark ? 'bg-[#091530]' : 'bg-[#f8fafc]'} border-l border-t border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}></div>
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className={`p-3 rounded-2xl ${isDark ? 'bg-white' : 'bg-white shadow-sm border border-slate-100'}`}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(barcode)}&color=000000&bgcolor=ffffff`}
                alt="Boarding Pass QR Code"
                width={160}
                height={160}
                className="rounded-lg"
                style={{ mixBlendMode: 'multiply' }}
              />
            </div>
            <div style={{ marginTop: 12, textAlign: "center", fontSize: 13, color: textMuted, letterSpacing: "0.4em", paddingLeft: "0.4em", fontWeight: 700 }}>
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
