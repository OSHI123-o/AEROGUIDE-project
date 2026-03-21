import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeModeIcon from "../components/ThemeModeIcon";

const CMB_BBOX = {
  // Tight bounding box around Bandaranaike International Airport area.
  lamin: 6.95,
  lamax: 7.45,
  lomin: 79.72,
  lomax: 80.1,
};

const FALLBACK_FLIGHTS = [
  { id: "UL225", callsign: "UL225", operator: "Sri Lanka", status: "Fallback", speedKmh: 0, altitudeM: 0, heading: "-", routeHint: "CMB area", updatedAt: Date.now() },
  { id: "EK649", callsign: "EK649", operator: "United Arab Emirates", status: "Fallback", speedKmh: 0, altitudeM: 0, heading: "-", routeHint: "CMB area", updatedAt: Date.now() },
];

function toKmh(ms) {
  if (typeof ms !== "number") return 0;
  return Math.round(ms * 3.6);
}

function toMeters(v) {
  if (typeof v !== "number") return 0;
  return Math.max(0, Math.round(v));
}

function toHeading(track) {
  if (typeof track !== "number") return "-";
  return `${Math.round(track)}Â°`;
}

function toStatus(onGround) {
  return onGround ? "On Ground" : "Airborne";
}

function normalizeCallsign(value) {
  const raw = (value || "").trim();
  return raw || "UNKNOWN";
}

export default function FlightsPage() {
  const navigate = useNavigate();
  const [themeMode, setThemeMode] = useState(() => (localStorage.getItem("aeroguide_theme") === "dark" ? "dark" : "light"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [flights, setFlights] = useState([]);

  useEffect(() => {
    localStorage.setItem("aeroguide_theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    let cancelled = false;

    async function fetchLiveFlights() {
      setLoading(true);
      setError("");

      try {
        const url = `https://opensky-network.org/api/states/all?lamin=${CMB_BBOX.lamin}&lamax=${CMB_BBOX.lamax}&lomin=${CMB_BBOX.lomin}&lomax=${CMB_BBOX.lomax}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Live source unavailable");
        const data = await res.json();
        if (cancelled) return;

        const mapped = (data?.states || []).map((s, idx) => {
          // OpenSky state vector indexes:
          // 1 callsign, 2 origin_country, 5 lon, 6 lat, 7 baro_altitude, 9 velocity, 10 true_track, 8 on_ground
          const callsign = normalizeCallsign(s[1]);
          const operator = s[2] || "Unknown";
          const onGround = Boolean(s[8]);
          const speedKmh = toKmh(s[9]);
          const altitudeM = toMeters(s[7]);
          const heading = toHeading(s[10]);
          const lon = typeof s[5] === "number" ? s[5].toFixed(3) : "-";
          const lat = typeof s[6] === "number" ? s[6].toFixed(3) : "-";
          const routeHint = `${lat}, ${lon}`;

          return {
            id: `${callsign}-${idx}`,
            callsign,
            operator,
            status: toStatus(onGround),
            speedKmh,
            altitudeM,
            heading,
            routeHint,
            updatedAt: Date.now(),
          };
        });

        if (!mapped.length) {
          setError("No live aircraft currently detected in the CMB terminal area.");
          setFlights(FALLBACK_FLIGHTS);
        } else {
          setFlights(mapped);
        }
        setLastUpdated(Date.now());
      } catch {
        if (cancelled) return;
        setError("Could not load live feed right now. Showing fallback entries.");
        setFlights(FALLBACK_FLIGHTS);
        setLastUpdated(Date.now());
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLiveFlights();
    const timer = window.setInterval(fetchLiveFlights, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const filteredFlights = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return flights;
    return flights.filter((f) =>
      f.callsign.toLowerCase().includes(q) ||
      f.operator.toLowerCase().includes(q) ||
      f.status.toLowerCase().includes(q)
    );
  }, [flights, query]);

  const dark = themeMode === "dark";
  const colors = dark
    ? {
        bg: "#040b1a",
        panel: "#0c1b33",
        border: "#1d3558",
        text: "#e2e8f0",
        muted: "#9cb0cc",
        card: "#0f223f",
      }
    : {
        bg: "#f4f7fc",
        panel: "#ffffff",
        border: "#dce6f4",
        text: "#0f172a",
        muted: "#64748b",
        card: "#f9fbff",
      };

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, padding: 20 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 14 }}>
        <header
          style={{
            background: colors.panel,
            border: `1px solid ${colors.border}`,
            borderRadius: 18,
            padding: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 30 }}>Live Flights - Bandaranaike (CMB)</h1>
            <div style={{ marginTop: 6, fontSize: 13, color: colors.muted }}>
              Real-time aircraft feed around CMB airspace. Source: OpenSky live states.
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: colors.muted }}>
              Last update: {new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setThemeMode((p) => (p === "light" ? "dark" : "light"))}
              style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 12px", background: colors.panel, color: colors.text, fontWeight: 700, cursor: "pointer" }}
            >
              <ThemeModeIcon mode={themeMode} />
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              style={{ border: 0, borderRadius: 10, padding: "10px 14px", background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer" }}
            >
              Back to Dashboard
            </button>
          </div>
        </header>

        <section
          style={{
            background: colors.panel,
            border: `1px solid ${colors.border}`,
            borderRadius: 18,
            padding: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by callsign, operator, or status"
            style={{
              flex: 1,
              minWidth: 260,
              borderRadius: 10,
              border: `1px solid ${colors.border}`,
              padding: "10px 12px",
              background: dark ? "#09162b" : "#fff",
              color: colors.text,
              outline: "none",
              fontWeight: 600,
            }}
          />
          <button
            onClick={() => navigate("/map")}
            style={{ border: 0, borderRadius: 10, padding: "10px 14px", background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer" }}
          >
            Open Map
          </button>
        </section>

        {error ? (
          <section style={{ background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 12, color: "#b91c1c", fontWeight: 700 }}>
            {error}
          </section>
        ) : null}

        <section style={{ display: "grid", gap: 10 }}>
          {loading ? (
            <div style={{ background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 16 }}>
              Loading live flights...
            </div>
          ) : filteredFlights.length === 0 ? (
            <div style={{ background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 16 }}>
              No flights found for your search.
            </div>
          ) : (
            filteredFlights.map((flight) => (
              <article
                key={flight.id}
                style={{
                  background: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 14,
                  padding: 14,
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1fr 1fr 1fr auto",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>{flight.callsign}</div>
                  <div style={{ marginTop: 2, fontSize: 13, color: colors.muted }}>{flight.operator}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: colors.muted }}>Status</div>
                  <div style={{ fontWeight: 700 }}>{flight.status}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: colors.muted }}>Speed</div>
                  <div style={{ fontWeight: 700 }}>{flight.speedKmh} km/h</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: colors.muted }}>Altitude</div>
                  <div style={{ fontWeight: 700 }}>{flight.altitudeM} m</div>
                </div>
                <button
                  onClick={() => navigate("/map")}
                  style={{ border: 0, borderRadius: 10, padding: "9px 12px", background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer" }}
                >
                  Track
                </button>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  );
}





