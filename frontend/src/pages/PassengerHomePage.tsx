import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeModeIcon from "../components/ThemeModeIcon";
import { lookupFlightsByPnr, type FlightLookupResult } from "../services/flightLookup";
import { lookupPassengerProfile, type PassengerProfile } from "../services/passengerProfile";
import { getPassengerSession } from "../services/passengerSession";

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
      <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, fontFamily: displayFont, letterSpacing: "-0.03em", color: isDark ? "#f8fafc" : "#0f172a" }}>{value}</div>
      {caption ? (
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

  const panel = isDark ? "rgba(15,23,42,0.62)" : "rgba(255,255,255,0.72)";
  const border = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.72)";
  const text = isDark ? "#f8fafc" : "#0f172a";
  const muted = isDark ? "rgba(226,232,240,0.68)" : "rgba(15,23,42,0.58)";
  const soft = isDark ? "rgba(226,232,240,0.52)" : "rgba(15,23,42,0.44)";
  const displayFont = '"Bahnschrift", "Aptos Display", "Segoe UI", sans-serif';
  const bodyFont = '"Aptos", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

  const displayName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName || session?.lastName || ""}`.trim()
    : session?.lastName
      ? titleCase(session.lastName)
      : "Passenger";

  return (
    <div className={`min-h-[100vh] ${isDark ? "bg-[#081120] text-slate-100" : "bg-[#f3ecff] text-slate-900"}`} style={{ position: "relative", overflow: "hidden", fontFamily: bodyFont }}>
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

      <div className={`absolute inset-0 z-0 pointer-events-none ${isDark ? "bg-[radial-gradient(circle_at_top,#1d2f57_0%,#0b1630_38%,#091120_80%)]" : "bg-[radial-gradient(circle_at_top,#d5c2ff_0%,#efe6ff_38%,#f8f5ff_80%)]"}`} />
      <div
        className={`absolute inset-0 z-0 pointer-events-none ${isDark ? "opacity-[0.08]" : "opacity-[0.12]"}`}
        style={{
          backgroundImage: "url('https://i.pinimg.com/1200x/aa/e4/54/aae454df5a468ca876f6912d496b1b61.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
      />
      <div className={`absolute inset-0 z-0 pointer-events-none ${isDark ? "bg-[linear-gradient(180deg,rgba(4,10,22,0.48),rgba(4,10,22,0.72))]" : "bg-[linear-gradient(180deg,rgba(255,255,255,0.5),rgba(255,255,255,0.72))]"}`} />
      <div className={`absolute -left-20 top-20 h-64 w-64 rounded-full blur-3xl z-0 pointer-events-none ${isDark ? "bg-[#243b67]/35" : "bg-white/35"}`} />
      <div className={`absolute right-0 top-0 h-80 w-80 rounded-full blur-3xl z-0 pointer-events-none ${isDark ? "bg-[#3c2d66]/35" : "bg-[#d7c2ff]/45"}`} />

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
                  gridTemplateColumns: "minmax(0, 1.45fr) minmax(280px, 0.8fr)",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    borderRadius: 30,
                    padding: "22px 22px 20px",
                    background: panel,
                    border,
                    backdropFilter: "blur(14px)",
                    boxShadow: isDark ? "0 24px 50px rgba(2,6,23,0.34)" : "0 24px 50px rgba(158,185,227,0.16)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "start" }}>
                    <div>
                      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.18em", color: soft, fontWeight: 800 }}>
                        Upcoming Flight
                      </div>
                      <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 40, fontWeight: 800, fontFamily: displayFont, letterSpacing: "-0.04em" }}>{nextFlight.originCode}</div>
                        <div style={{ color: soft, fontWeight: 700 }}>to</div>
                        <div style={{ fontSize: 40, fontWeight: 800, fontFamily: displayFont, letterSpacing: "-0.04em" }}>{nextFlight.destinationCode}</div>
                      </div>
                      <div style={{ marginTop: 8, color: muted, fontSize: 15 }}>
                        {nextFlight.flightNo} • {nextFlight.originCity} to {nextFlight.destinationCity}
                      </div>
                    </div>

                    <div
                      style={{
                        borderRadius: 18,
                        padding: "12px 14px",
                        background: isDark ? "rgba(143,118,255,0.18)" : "rgba(143,118,255,0.12)",
                        color: isDark ? "#e9e5ff" : "#5f46d8",
                        fontWeight: 800,
                      }}
                    >
                      {nextFlight.status}
                    </div>
                  </div>

                  <div className="passenger-summary" style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
                    <InfoTile label="Departure" value={formatTime(nextFlight.departureIso)} caption={formatDate(nextFlight.departureIso)} isDark={isDark} displayFont={displayFont} />
                    <InfoTile label="Boarding" value={formatClock(deriveBoardingTime(nextFlight.departureIso))} caption="Estimated boarding" isDark={isDark} displayFont={displayFont} />
                    <InfoTile label="Gate" value={nextFlight.gate} caption={`Terminal ${nextFlight.terminal}`} isDark={isDark} displayFont={displayFont} />
                    <InfoTile label="Duration" value={formatDurationFromFlightNo(nextFlight.flightNo)} caption="Estimated travel time" isDark={isDark} displayFont={displayFont} />
                  </div>

                  <div className="passenger-quick" style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                    <button
                      onClick={() => {
                        localStorage.setItem("aeroguide_active_flight", JSON.stringify(nextFlight));
                        navigate("/journey");
                      }}
                      style={{
                        border: 0,
                        borderRadius: 18,
                        padding: "14px 16px",
                        background: "#8f76ff",
                        color: "#fff",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Open Journey
                    </button>
                    <button
                      onClick={() => navigate(`/map?gate=${encodeURIComponent(nextFlight.gate)}`)}
                      style={{
                        borderRadius: 18,
                        padding: "14px 16px",
                        background: isDark ? "rgba(15,23,42,0.64)" : "rgba(255,255,255,0.72)",
                        border,
                        color: text,
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Find Gate
                    </button>
                    <button
                      onClick={() => navigate("/boarding-pass")}
                      style={{
                        borderRadius: 18,
                        padding: "14px 16px",
                        background: isDark ? "rgba(15,23,42,0.64)" : "rgba(255,255,255,0.72)",
                        border,
                        color: text,
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Show Boarding Pass
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 30,
                    padding: "22px",
                    background: panel,
                    border,
                    backdropFilter: "blur(14px)",
                    display: "grid",
                    gap: 14,
                    alignContent: "start",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: "50%",
                        background: isDark ? "rgba(143,118,255,0.22)" : "rgba(143,118,255,0.14)",
                        color: isDark ? "#f8fafc" : "#5b47d6",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 900,
                        fontSize: 22,
                      }}
                    >
                      {initialsFromProfile(profile, session?.lastName)}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.18em", color: soft, fontWeight: 800 }}>
                        Traveller
                      </div>
                       <div style={{ marginTop: 4, fontSize: 22, fontWeight: 800, fontFamily: displayFont, letterSpacing: "-0.03em" }}>{displayName}</div>
                    </div>
                  </div>

                  <InfoTile label="Booking Ref" value={session?.pnr ?? "--"} isDark={isDark} displayFont={displayFont} />
                  <InfoTile label="Cabin" value={profile?.cabin ?? detailsFallbackCabin(nextFlight)} isDark={isDark} displayFont={displayFont} />
                  <InfoTile label="Seat" value={profile?.seat ?? detailsFallbackSeat(nextFlight)} isDark={isDark} displayFont={displayFont} />
                </div>
              </section>
            ) : null}

            <section className="passenger-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)", gap: 16 }}>
              <div
                style={{
                  borderRadius: 28,
                  padding: 22,
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

                <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
                  {flights.map((flight, index) => {
                    const isNext = nextFlight?.flightNo === flight.flightNo && nextFlight?.departureIso === flight.departureIso;
                    return (
                      <button
                        key={`${flight.flightNo}-${flight.departureIso}`}
                        onClick={() => {
                          localStorage.setItem("aeroguide_active_flight", JSON.stringify(flight));
                          navigate("/journey");
                        }}
                        style={{
                          textAlign: "left",
                          borderRadius: 22,
                          border,
                          padding: "16px 18px",
                          background: isNext
                            ? isDark
                              ? "linear-gradient(135deg, rgba(143,118,255,0.24), rgba(15,23,42,0.5))"
                              : "linear-gradient(135deg, rgba(143,118,255,0.14), rgba(255,255,255,0.82))"
                            : isDark
                              ? "rgba(15,23,42,0.46)"
                              : "rgba(255,255,255,0.62)",
                          color: text,
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: "50%",
                                background: isNext ? "#8f76ff" : isDark ? "rgba(255,255,255,0.08)" : "rgba(143,118,255,0.14)",
                                color: isNext ? "#fff" : isDark ? "#f8fafc" : "#5b47d6",
                                display: "grid",
                                placeItems: "center",
                                fontWeight: 900,
                                fontSize: 14,
                              }}
                            >
                              {index + 1}
                            </div>
                            <div>
                              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: displayFont, letterSpacing: "-0.02em" }}>
                                {flight.flightNo} • {flight.originCode} to {flight.destinationCode}
                              </div>
                              <div style={{ marginTop: 4, fontSize: 13, color: muted }}>
                                {formatDateTime(flight.departureIso)} • Gate {flight.gate} • {flight.status}
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              borderRadius: 999,
                              padding: "6px 10px",
                              background: isNext ? "#8f76ff" : isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.72)",
                              color: isNext ? "#fff" : text,
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            {isNext ? "Next up" : "Open"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
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
                  <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.18em", color: soft, fontWeight: 800 }}>
                    Airport Actions
                  </div>
                  {[
                    "Confirm gate and boarding time before moving through security.",
                    "Keep passport, booking reference, and phone ready for checks.",
                    "Open the map for live gate guidance inside the terminal.",
                  ].map((item) => (
                    <div
                      key={item}
                      style={{
                        borderRadius: 18,
                        padding: "12px 14px",
                        background: isDark ? "rgba(15,23,42,0.45)" : "rgba(255,255,255,0.62)",
                        color: muted,
                        fontSize: 14,
                        lineHeight: 1.5,
                      }}
                    >
                      {item}
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
