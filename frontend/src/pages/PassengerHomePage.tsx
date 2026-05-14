import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeModeIcon from "../components/ThemeModeIcon";
import { lookupFlightsByPnr, type FlightLookupResult } from "../services/flightLookup";
import { lookupPassengerProfile, type PassengerProfile } from "../services/passengerProfile";
import { getPassengerSession } from "../services/passengerSession";
import DestinationGuide from "../components/DestinationGuide";
import { getDestinationData } from "../services/destinationData";
import tarmacBg from "../assets/tarmac_bg.jpg";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatClock(value: Date) {
  return value.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function deriveBoardingTime(iso: string) {
  return new Date(new Date(iso).getTime() - 45 * 60000);
}

function formatDurationFromFlightNo(flightNo: string) {
  const digits = Number.parseInt(flightNo.replace(/\D/g, ""), 10) || 200;
  const minutes = 170 + (digits % 6) * 18;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${String(remainder).padStart(2, "0")}m`;
}

function initialsFromProfile(profile: PassengerProfile | null, fallbackLastName: string | undefined) {
  const first = profile?.firstName?.[0] ?? "P";
  const last = (profile?.lastName || fallbackLastName || "A")[0] ?? "A";
  return `${first}${last}`.toUpperCase();
}

function InfoTile({
  label,
  value,
  caption,
  isDark,
  displayFont,
}: {
  label: string;
  value: string;
  caption?: string;
  isDark: boolean;
  displayFont: string;
}) {
  const isMissing = !value || value === "Not available";

  return (
    <div
      style={{
        borderRadius: 22,
        padding: "18px 18px 16px",
        background: isDark ? "rgba(15,23,42,0.55)" : "rgba(255,255,255,0.66)",
        border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.68)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.16em", color: isDark ? "rgba(226,232,240,0.54)" : "rgba(15,23,42,0.42)" }}>
        {label}
      </div>
      
      {isMissing ? (
        <div style={{ marginTop: 10, display: "inline-block", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 800, background: isDark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.15)", color: isDark ? "#fcd34d" : "#d97706", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Verify at Counter
        </div>
      ) : (
        <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, fontFamily: displayFont, letterSpacing: "-0.03em", color: isDark ? "#f8fafc" : "#0f172a" }}>
          {value}
        </div>
      )}
      
      {caption && !isMissing ? (
        <div style={{ marginTop: 6, fontSize: 13, color: isDark ? "rgba(226,232,240,0.68)" : "rgba(15,23,42,0.58)" }}>
          {caption}
        </div>
      ) : null}
    </div>
  );
}

export default function PassengerHomePage() {
  const navigate = useNavigate();
  const [themeMode, setThemeMode] = useState<"light" | "dark">(() => (localStorage.getItem("aeroguide_theme") === "dark" ? "dark" : "light"));
  const [flights, setFlights] = useState<FlightLookupResult[]>([]);
  const [profile, setProfile] = useState<PassengerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const session = getPassengerSession();

  useEffect(() => {
    localStorage.setItem("aeroguide_theme", themeMode);
    if (themeMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [themeMode]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!session) {
        setError("Passenger session not found. Please connect a booking from the dashboard.");
        setLoading(false);
        return;
      }

      try {
        const [flightData, profileData] = await Promise.all([
          lookupFlightsByPnr(session.pnr, session.lastName),
          lookupPassengerProfile(session.pnr, session.lastName).catch(() => null),
        ]);

        if (cancelled) return;

        const sorted = [...flightData].sort((a, b) => new Date(a.departureIso).getTime() - new Date(b.departureIso).getTime());
        setFlights(sorted);
        setProfile(profileData);

        if (sorted[0]) {
          localStorage.setItem("aeroguide_active_flight", JSON.stringify(sorted[0]));
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load passenger journey data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const nextFlight = useMemo(() => {
    if (!flights.length) return null;
    const now = Date.now();
    return flights.find((f) => new Date(f.departureIso).getTime() >= now) ?? flights[0];
  }, [flights]);

  const isDark = themeMode === "dark";

  const panel = isDark ? "rgba(0,0,0,0.2)" : "#ffffff";
  const border = isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0";
  const text = isDark ? "#f8fafc" : "#0f172a";
  const muted = isDark ? "rgba(255,255,255,0.7)" : "#64748b"; // slate-400 / slate-500
  const soft = isDark ? "rgba(255,255,255,0.5)" : "#94a3b8";
  const displayFont = '"Bahnschrift", "Aptos Display", "Segoe UI", sans-serif';
  const bodyFont = '"Aptos", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

  const displayName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName || session?.lastName || ""}`.trim()
    : session?.lastName
      ? titleCase(session.lastName)
      : "Passenger";

  return (
    <div className={`min-h-[100vh] transition-colors duration-300 ${isDark ? "bg-gradient-to-br from-[#0B1021] via-[#1B2845] to-[#5A77A2] text-slate-100" : "bg-gradient-to-r from-[#2C6CBC] via-[#71C3F7] to-[#F5F5F5] text-slate-900"}`} style={{ position: "relative", overflow: "hidden", fontFamily: bodyFont }}>
      <style>{`
        @media (max-width: 980px) {
          .passenger-grid {
            grid-template-columns: 1fr !important;
          }
          .passenger-summary {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .passenger-summary,
          .passenger-hero,
          .passenger-quick {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Destination-based Background Image */}
        {nextFlight && (
          <div className="absolute inset-0 transition-all duration-1000 ease-in-out">
            <img 
              src={getDestinationData(nextFlight.destinationCity)?.countryInfo.image || tarmacBg} 
              className="w-full h-full object-cover opacity-30 scale-100 blur-[80px] animate-slow-zoom" 
              alt="Destination Background" 
            />
            {/* Vignette & Gradients */}
            <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-b from-[#0B1021]/60 via-transparent to-[#0B1021]' : 'bg-gradient-to-b from-white/60 via-transparent to-white'}`}></div>
            <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.4)]"></div>
          </div>
        )}

        {/* Animated Blobs */}
        <div className={`absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob ${isDark ? 'bg-aeroguide-blue/40' : 'bg-blue-300/50'}`}></div>
        <div className={`absolute top-[20%] right-[-10%] w-[600px] h-[600px] rounded-full mix-blend-screen filter blur-[120px] opacity-30 animate-blob [animation-delay:2s] ${isDark ? 'bg-indigo-500/30' : 'bg-aeroguide-pale/40'}`}></div>
        
        {/* Universal Grid Pattern Overlay */}
        <div 
          className={`absolute inset-0 ${isDark ? 'opacity-80' : 'opacity-40'}`}
          style={{
            backgroundImage: `
              linear-gradient(${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'} 1px, transparent 1px),
              linear-gradient(90deg, ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'} 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      <div style={{ width: "100%", padding: 24, position: "relative", zIndex: 1, display: "grid", gap: 18 }}>
        <header
          style={{
            borderRadius: 28,
            padding: "20px 22px",
            background: panel,
            border,
            backdropFilter: "blur(14px)",
            boxShadow: isDark ? "0 24px 50px rgba(2,6,23,0.34)" : "0 24px 50px rgba(158,185,227,0.16)",
            display: "flex",
            justifyContent: "space-between",
            gap: 14,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.18em", color: soft, fontWeight: 800 }}>
              Passenger Home
            </div>
             <h1 style={{ margin: "8px 0 0", fontSize: 38, lineHeight: 0.98, fontWeight: 800, color: text, fontFamily: displayFont, letterSpacing: "-0.04em" }}>
               Welcome back, {displayName}
             </h1>
            <div style={{ marginTop: 8, color: muted, fontSize: 14 }}>
              Booking reference {session?.pnr ?? "--"} • A single place for your journey, flight timeline, and airport actions
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => setThemeMode((prev) => (prev === "light" ? "dark" : "light"))}
              aria-label="Toggle theme"
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                border,
                background: isDark ? "rgba(15,23,42,0.72)" : "rgba(255,255,255,0.74)",
                color: text,
                cursor: "pointer",
              }}
            >
              <ThemeModeIcon mode={themeMode} />
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                border: 0,
                borderRadius: 14,
                padding: "12px 16px",
                background: "#8f76ff",
                color: "#fff",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 14px 28px rgba(143,118,255,0.24)",
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </header>

        {loading ? (
          <section style={{ borderRadius: 26, background: panel, border, padding: 24, backdropFilter: "blur(14px)" }}>
            <div style={{ fontWeight: 700, color: muted }}>Loading passenger journey...</div>
          </section>
        ) : error ? (
          <section style={{ borderRadius: 26, background: panel, border, padding: 24, backdropFilter: "blur(14px)" }}>
            <div style={{ color: "#ef4444", fontWeight: 800 }}>{error}</div>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                marginTop: 14,
                border: 0,
                borderRadius: 14,
                padding: "12px 16px",
                background: "#8f76ff",
                color: "#fff",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Connect Booking
            </button>
          </section>
        ) : (
          <>
            {nextFlight ? (
              <section
                className="passenger-hero"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.5fr) minmax(300px, 0.8fr)",
                  gap: 20,
                  perspective: "1000px" // For 3D hover effects
                }}
              >
                {/* 🎫 DIGITAL BOARDING PASS */}
                <div
                  className={`relative overflow-hidden group transition-all duration-500 hover:rotate-y-2 hover:rotate-x-2 ${isDark ? "bg-gradient-to-br from-[#1e293b]/90 to-[#0f172a]/90" : "bg-gradient-to-br from-white/90 to-slate-50/90"}`}
                  style={{
                    borderRadius: 24,
                    border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.05)",
                    backdropFilter: "blur(20px)",
                    boxShadow: isDark ? "0 30px 60px rgba(0,0,0,0.6)" : "0 30px 60px rgba(158,185,227,0.3)",
                  }}
                >
                  {/* Subtle Background Pattern */}
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)", backgroundSize: "20px 20px" }}></div>
                  
                  {/* Top Bar of Boarding Pass */}
                  <div className={`px-8 py-4 border-b flex justify-between items-center ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-100/50"}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-aeroguide-blue flex items-center justify-center shadow-lg shadow-aeroguide-blue/40">
                        <span className="text-white text-sm font-black">✈️</span>
                      </div>
                      <span className={`text-sm font-black tracking-widest uppercase ${isDark ? "text-slate-300" : "text-slate-600"}`}>AeroGuide Airlines</span>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700"}`}>
                      {nextFlight.status}
                    </div>
                  </div>

                  {/* Flight Info Main Area */}
                  <div className="p-8 flex flex-col md:flex-row gap-8 relative">
                    <div className="flex-1">
                      <div className="flex justify-between items-end mb-6 relative">
                        {/* Airplane Path Animation */}
                        <div className="absolute top-1/2 left-[20%] right-[20%] h-px border-t-2 border-dashed border-aeroguide-blue/30 -z-10"></div>
                        <div className="absolute top-[35%] left-1/2 transform -translate-x-1/2 text-aeroguide-blue/50 text-2xl -z-10">✈</div>

                        <div>
                          <div className={`text-5xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>{nextFlight.originCode}</div>
                          <div className={`text-sm font-bold mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{nextFlight.originCity}</div>
                        </div>
                        <div>
                          <div className={`text-5xl font-black text-right ${isDark ? "text-white" : "text-slate-900"}`}>{nextFlight.destinationCode}</div>
                          <div className={`text-sm font-bold mt-1 text-right ${isDark ? "text-slate-400" : "text-slate-500"}`}>{nextFlight.destinationCity}</div>
                        </div>
                      </div>

                      <div className="passenger-summary grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <div>
                          <div className={`text-[10px] uppercase font-black tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}>Flight</div>
                          <div className={`text-lg font-black mt-1 ${isDark ? "text-slate-200" : "text-slate-800"}`}>{nextFlight.flightNo}</div>
                        </div>
                        <div>
                          <div className={`text-[10px] uppercase font-black tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}>Departure</div>
                          <div className={`text-lg font-black mt-1 ${isDark ? "text-slate-200" : "text-slate-800"}`}>{formatTime(nextFlight.departureIso)}</div>
                        </div>
                        <div>
                          <div className={`text-[10px] uppercase font-black tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}>Terminal</div>
                          <div className={`text-lg font-black mt-1 ${isDark ? "text-slate-200" : "text-slate-800"}`}>T{nextFlight.terminal}</div>
                        </div>
                        <div>
                          <div className={`text-[10px] uppercase font-black tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}>Gate</div>
                          <div className={`text-lg font-black mt-1 text-aeroguide-blue`}>{nextFlight.gate}</div>
                        </div>
                      </div>
                    </div>

                    {/* Perforated Divider */}
                    <div className={`hidden md:block w-px border-l-2 border-dashed ${isDark ? "border-white/10" : "border-slate-200"} relative mx-2`}>
                      <div className={`absolute -top-10 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full ${isDark ? "bg-[#0B1021]" : "bg-[#F5F5F5]"} shadow-inner`}></div>
                      <div className={`absolute -bottom-10 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full ${isDark ? "bg-[#0B1021]" : "bg-[#F5F5F5]"} shadow-inner`}></div>
                    </div>

                    {/* QR Code / Actions Section */}
                    <div className="md:w-48 flex flex-col items-center justify-center border-t md:border-t-0 pt-6 md:pt-0">
                      <div className={`w-32 h-32 rounded-xl p-2 mb-4 bg-white shadow-lg`}>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=AeroGuidePass" alt="QR Code" className="w-full h-full object-contain mix-blend-multiply" />
                      </div>
                      <button
                        onClick={() => navigate(`/map?gate=${encodeURIComponent(nextFlight.gate)}`)}
                        className={`w-full py-2.5 rounded-lg text-sm font-black uppercase tracking-widest transition-all ${isDark ? "bg-aeroguide-blue text-white hover:bg-blue-600" : "bg-aeroguide-blue text-white hover:bg-blue-600 shadow-md"}`}
                      >
                        Find Gate
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 24,
                    padding: "24px",
                    background: panel,
                    border,
                    backdropFilter: "blur(14px)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: isDark ? "rgba(143,118,255,0.22)" : "rgba(143,118,255,0.14)",
                        color: isDark ? "#f8fafc" : "#5b47d6",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 900,
                        fontSize: 26,
                        boxShadow: "0 10px 25px rgba(143,118,255,0.2)",
                      }}
                    >
                      {initialsFromProfile(profile, session?.lastName)}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.18em", color: soft, fontWeight: 800 }}>
                        Traveller
                      </div>
                       <div style={{ marginTop: 4, fontSize: 24, fontWeight: 900, fontFamily: displayFont, letterSpacing: "-0.03em" }}>{displayName}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 mt-2">
                    <InfoTile label="Booking Ref" value={session?.pnr ?? "--"} isDark={isDark} displayFont={displayFont} />
                    <div className="grid grid-cols-2 gap-4">
                      <InfoTile label="Cabin" value={profile?.cabin ?? detailsFallbackCabin(nextFlight)} isDark={isDark} displayFont={displayFont} />
                      <InfoTile label="Seat" value={profile?.seat ?? detailsFallbackSeat(nextFlight)} isDark={isDark} displayFont={displayFont} />
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="passenger-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)", gap: 16 }}>
              <div className="flex flex-col gap-4">
                <div
                  style={{
                    borderRadius: 24,
                    padding: "16px 20px",
                    background: panel,
                    border,
                    backdropFilter: "blur(14px)",
                  }}
                >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.18em", color: soft, fontWeight: 800 }}>
                      Booking Timeline
                    </div>
                     <h2 style={{ margin: "8px 0 0", fontSize: 26, fontWeight: 800, fontFamily: displayFont, letterSpacing: "-0.03em" }}>All flights in your booking</h2>
                  </div>
                  <div style={{ color: muted, fontSize: 13 }}>{flights.length} flights linked</div>
                </div>

                <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 0, position: "relative" }}>
                  {/* Vertical Progress Line */}
                  <div className={`absolute top-6 bottom-6 left-[25px] w-0.5 border-l-2 border-dashed ${isDark ? 'border-aeroguide-blue/30' : 'border-blue-300'} z-0`}></div>

                  {flights.map((flight, index) => {
                    const isNext = nextFlight?.flightNo === flight.flightNo && nextFlight?.departureIso === flight.departureIso;
                    return (
                      <button
                        key={`${flight.flightNo}-${flight.departureIso}`}
                        onClick={() => {
                          localStorage.setItem("aeroguide_active_flight", JSON.stringify(flight));
                          navigate("/journey");
                        }}
                        className={`group relative z-10 text-left transition-all duration-300 w-full rounded-2xl p-4 my-1 flex justify-between items-center ${
                          isNext 
                            ? isDark 
                              ? "bg-aeroguide-blue/20 hover:bg-aeroguide-blue/30 border border-aeroguide-blue/50" 
                              : "bg-blue-50 hover:bg-blue-100 border border-aeroguide-blue/40 shadow-sm"
                            : isDark
                              ? "bg-transparent hover:bg-white/5 border border-transparent hover:border-white/10"
                              : "bg-transparent hover:bg-slate-50 border border-transparent hover:border-slate-200"
                        }`}
                      >
                        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                          {/* Timeline Node */}
                          <div
                            style={{
                              width: 50,
                              height: 50,
                              borderRadius: "50%",
                              background: isNext ? "#8f76ff" : isDark ? "#0B1021" : "#ffffff",
                              border: isNext ? "none" : isDark ? "2px solid rgba(143,118,255,0.3)" : "2px solid rgba(143,118,255,0.2)",
                              color: isNext ? "#fff" : isDark ? "#8f76ff" : "#5b47d6",
                              display: "grid",
                              placeItems: "center",
                              fontWeight: 900,
                              fontSize: 20,
                              boxShadow: isNext ? "0 0 20px rgba(143,118,255,0.6)" : "none",
                              zIndex: 2,
                            }}
                          >
                            {isNext ? "✈" : index + 1}
                          </div>
                          <div>
                            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: displayFont, letterSpacing: "-0.02em", color: text }}>
                              {flight.originCode} <span className="opacity-50 mx-1 text-sm">→</span> {flight.destinationCode}
                            </div>
                            <div style={{ marginTop: 4, fontSize: 13, color: muted, fontWeight: 600 }}>
                              {flight.flightNo} • {formatDateTime(flight.departureIso)}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div
                            className={`rounded-full px-3 py-1 text-xs font-black tracking-widest uppercase transition-all duration-300 ${
                              isNext 
                                ? "bg-aeroguide-blue text-white shadow-[0_0_15px_rgba(143,118,255,0.5)]" 
                                : isDark ? "bg-white/10 text-slate-300 group-hover:bg-white/20" : "bg-slate-200 text-slate-700 group-hover:bg-slate-300"
                            }`}
                          >
                            {isNext ? "Next up" : "Open"}
                          </div>
                          <div className={`text-xs font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Gate {flight.gate}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DESTINATION GUIDE (Travel Journal) Directly Below Timeline */}
              {nextFlight && (
                <DestinationGuide 
                  city={nextFlight.destinationCity} 
                  isDark={isDark} 
                />
              )}
            </div>

              <div style={{ display: "grid", gap: 16 }}>
                <section
                  style={{
                    borderRadius: 28,
                    padding: 22,
                    background: panel,
                    border,
                    backdropFilter: "blur(14px)",
                    display: "grid",
                    gap: 14,
                  }}
                >
                  <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.18em", color: soft, fontWeight: 800 }}>
                    Traveller Details
                  </div>
                  <InfoTile label="Name" value={displayName} isDark={isDark} displayFont={displayFont} />
                  <InfoTile label="Email" value={profile?.email ?? "Not available"} isDark={isDark} displayFont={displayFont} />
                  <InfoTile label="Nationality" value={profile?.nationality ?? "Not available"} isDark={isDark} displayFont={displayFont} />
                  <InfoTile label="Passport" value={profile?.passportNo ?? "Not available"} isDark={isDark} displayFont={displayFont} />
                </section>

                  {/* AeroGuide Assistant Card */}
                  <section
                    style={{
                      borderRadius: 28,
                      padding: 22,
                      background: panel,
                      border,
                      backdropFilter: "blur(14px)",
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">✨</span>
                      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.18em", color: soft, fontWeight: 800 }}>
                        AeroGuide Assistant
                      </div>
                    </div>
                    {[
                      { icon: "🛂", title: "Security & Checks", desc: "Keep passport, booking reference, and phone ready for checks." },
                      { icon: "⏰", title: "Boarding Time", desc: "Confirm gate and boarding time before moving through security." },
                      { icon: "🗺️", title: "Live Navigation", desc: "Open the map for live gate guidance inside the terminal." },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className={`group flex gap-4 items-start rounded-2xl p-4 transition-all duration-300 ${
                          isDark ? "bg-white/5 hover:bg-white/10 border border-white/5" : "bg-white/60 hover:bg-white/80 border border-slate-100 shadow-sm hover:shadow-md"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm ${isDark ? "bg-[#0B1021]" : "bg-slate-50"}`}>
                          {item.icon}
                        </div>
                        <div className="flex-1">
                          <div className={`text-sm font-black mb-1 ${isDark ? "text-slate-200" : "text-slate-800"}`}>{item.title}</div>
                          <div className={`text-sm font-medium leading-snug ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            {item.desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </section>
                </div>
              </section>
          </>
        )}
      </div>
    </div>
  );
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function detailsFallbackSeat(flight: FlightLookupResult | null) {
  if (!flight) return "--";
  const seed = flight.pnr.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return `${10 + (seed % 18)}${["A", "B", "C", "D", "E", "F"][seed % 6]}`;
}

function detailsFallbackCabin(flight: FlightLookupResult | null) {
  if (!flight) return "Economy";
  const seed = flight.pnr.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return seed % 5 === 0 ? "Business" : "Economy";
}
