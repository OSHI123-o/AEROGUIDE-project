import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { lookupFlightsByPnr, type FlightLookupResult } from "../services/flightLookup";
import { getPassengerSession } from "../services/passengerSession";
import ThemeModeIcon from "../components/ThemeModeIcon";

function toTimeLabel(iso: string) {
  return new Date(iso).toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PassengerHomePage() {
  const navigate = useNavigate();
  const [themeMode, setThemeMode] = useState<"light" | "dark">(() => (localStorage.getItem("aeroguide_theme") === "dark" ? "dark" : "light"));
  const [flights, setFlights] = useState<FlightLookupResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const session = getPassengerSession();

  useEffect(() => {
    localStorage.setItem("aeroguide_theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!session) {
        setError("Passenger session not found. Please connect booking from dashboard.");
        setLoading(false);
        return;
      }
      try {
        const data = await lookupFlightsByPnr(session.pnr, session.lastName);
        if (cancelled) return;
        const sorted = [...data].sort((a, b) => new Date(a.departureIso).getTime() - new Date(b.departureIso).getTime());
        setFlights(sorted);
        if (sorted[0]) {
          localStorage.setItem("aeroguide_active_flight", JSON.stringify(sorted[0]));
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load journey details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const nextFlight = useMemo(() => {
    if (!flights.length) return null;
    const now = Date.now();
    return flights.find((f) => new Date(f.departureIso).getTime() >= now) ?? flights[0];
  }, [flights]);

  const light = themeMode === "light";
  const colors = light
    ? {
        bg: "#f3f7fc",
        panel: "#ffffff",
        border: "rgba(0,43,91,0.18)",
        text: "#0b1d3a",
        muted: "#4f5f77",
      }
    : {
        bg: "#061227",
        panel: "#0a1f3d",
        border: "rgba(253,185,19,0.24)",
        text: "#e2e8f0",
        muted: "#b3c1d8",
      };

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, padding: 20, color: colors.text }}>
      <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 14 }}>
        <header
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: 16,
            background: colors.panel,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 30 }}>My Journey Home</h1>
            <p style={{ margin: "6px 0 0", color: colors.muted }}>
              Passenger: {session ? `${session.lastName} (${session.pnr})` : "Not linked"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setThemeMode((p) => (p === "light" ? "dark" : "light"))}
              style={{ border: `1px solid ${colors.border}`, borderRadius: 10, width: 40, background: "transparent", color: colors.text, cursor: "pointer" }}
              aria-label={themeMode === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              <ThemeModeIcon mode={themeMode} />
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              style={{ border: 0, borderRadius: 10, padding: "10px 14px", background: "#FDB913", color: "#002B5B", fontWeight: 700, cursor: "pointer" }}
            >
              Back to Dashboard
            </button>
          </div>
        </header>

        {loading ? (
          <section style={{ border: `1px solid ${colors.border}`, borderRadius: 16, padding: 18, background: colors.panel }}>
            Loading passenger flights...
          </section>
        ) : error ? (
          <section style={{ border: `1px solid ${colors.border}`, borderRadius: 16, padding: 18, background: colors.panel }}>
            <div style={{ color: "#b91c1c", fontWeight: 700 }}>{error}</div>
            <button
              onClick={() => navigate("/dashboard")}
              style={{ marginTop: 10, border: 0, borderRadius: 10, padding: "10px 14px", background: "#FDB913", color: "#002B5B", fontWeight: 700, cursor: "pointer" }}
            >
              Connect Booking
            </button>
          </section>
        ) : (
          <>
            {nextFlight ? (
              <section style={{ border: `1px solid ${colors.border}`, borderRadius: 16, padding: 18, background: colors.panel }}>
                <div style={{ fontSize: 13, color: colors.muted }}>Next flight</div>
                <div style={{ marginTop: 4, fontSize: 30, fontWeight: 800 }}>
                  {nextFlight.flightNo} - {nextFlight.originCode} to {nextFlight.destinationCode}
                </div>
                <div style={{ marginTop: 4, color: colors.muted }}>
                  Departure: {toTimeLabel(nextFlight.departureIso)} | Terminal {nextFlight.terminal} | Gate {nextFlight.gate}
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() => {
                      localStorage.setItem("aeroguide_active_flight", JSON.stringify(nextFlight));
                      navigate("/journey");
                    }}
                    style={{ border: 0, borderRadius: 10, padding: "10px 14px", background: "#FDB913", color: "#002B5B", fontWeight: 700, cursor: "pointer" }}
                  >
                    Open Journey
                  </button>
                  <button
                    onClick={() => navigate(`/map?gate=${encodeURIComponent(nextFlight.gate)}`)}
                    style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 14px", background: "transparent", color: colors.text, fontWeight: 700, cursor: "pointer" }}
                  >
                    Find Gate
                  </button>
                </div>
              </section>
            ) : null}

            <section style={{ border: `1px solid ${colors.border}`, borderRadius: 16, padding: 18, background: colors.panel }}>
              <h2 style={{ margin: "0 0 10px", fontSize: 22 }}>All flights in your booking</h2>
              <div style={{ display: "grid", gap: 8 }}>
                {flights.map((flight) => (
                  <button
                    key={`${flight.flightNo}-${flight.departureIso}`}
                    onClick={() => {
                      localStorage.setItem("aeroguide_active_flight", JSON.stringify(flight));
                      navigate("/journey");
                    }}
                    style={{
                      textAlign: "left",
                      borderRadius: 12,
                      border: `1px solid ${colors.border}`,
                      padding: 12,
                      background: light ? "#f8fbff" : "#0e2a50",
                      color: colors.text,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>{flight.flightNo} - {flight.originCode} to {flight.destinationCode}</div>
                    <div style={{ marginTop: 4, fontSize: 13, color: colors.muted }}>
                      {toTimeLabel(flight.departureIso)} | Gate {flight.gate} | {flight.status}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

