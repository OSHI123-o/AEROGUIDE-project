import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import ThemeModeIcon from "../components/ThemeModeIcon";
import { lookupFlightsByPnr, type FlightLookupResult } from "../services/flightLookup";
import {
  clearPassengerSession,
  getPassengerSession,
  isValidLastName,
  isValidPnr,
  normalizeLastName,
  normalizePnr,
  savePassengerSession,
} from "../services/passengerSession";
import { isAuthenticated, setAuthenticated } from "../services/authSession";

type ThemeMode = "light" | "dark";

type WeatherState = {
  temperature: number;
  wind: number;
  code: number;
};

const DEFAULT_COORDS = { lat: 7.1808, lon: 79.8841 };

const BIA_INFO = {
  name: "Bandaranaike International Airport",
  iata: "CMB",
  location: "Katunayake, Sri Lanka",
  flightInfo: "+94 112 263 047 / +94 112 263 048",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => (localStorage.getItem("aeroguide_theme") === "dark" ? "dark" : "light"));
  const [isSignedIn, setIsSignedIn] = useState<boolean>(() => isAuthenticated());
  const [connectedPassenger, setConnectedPassenger] = useState(() => getPassengerSession());
  const [now, setNow] = useState(new Date());
  const [coords, setCoords] = useState(DEFAULT_COORDS);
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [nextFlight, setNextFlight] = useState<FlightLookupResult | null>(null);
  const [flightLoading, setFlightLoading] = useState(false);
  const [pnrInput, setPnrInput] = useState("");
  const [lastNameInput, setLastNameInput] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState("");

  useEffect(() => {
    localStorage.setItem("aeroguide_theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    const syncAuth = () => setIsSignedIn(isAuthenticated());
    window.addEventListener("focus", syncAuth);
    return () => window.removeEventListener("focus", syncAuth);
  }, []);

  useEffect(() => {
    const syncPassenger = () => setConnectedPassenger(getPassengerSession());
    window.addEventListener("focus", syncPassenger);
    return () => window.removeEventListener("focus", syncPassenger);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => setCoords({ lat: position.coords.latitude, lon: position.coords.longitude }),
      () => {}
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchWeather = async () => {
      setWeatherLoading(true);
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}` +
          `&current=temperature_2m,wind_speed_10m,weather_code&timezone=auto&forecast_days=1`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("weather");
        const data = await res.json();
        if (cancelled) return;
        setWeather({
          temperature: Math.round(data.current?.temperature_2m ?? 30),
          wind: Math.round(data.current?.wind_speed_10m ?? 14),
          code: data.current?.weather_code ?? 0,
        });
      } catch {
        if (!cancelled) {
          setWeather({ temperature: 30, wind: 14, code: 1 });
        }
      } finally {
        if (!cancelled) setWeatherLoading(false);
      }
    };
    fetchWeather();
    return () => {
      cancelled = true;
    };
  }, [coords.lat, coords.lon]);

  useEffect(() => {
    let cancelled = false;
    if (!connectedPassenger) {
      setNextFlight(null);
      return;
    }

    const loadPassengerFlight = async () => {
      setFlightLoading(true);
      try {
        const flights = await lookupFlightsByPnr(connectedPassenger.pnr, connectedPassenger.lastName);
        if (cancelled) return;
        const sorted = [...flights].sort((a, b) => new Date(a.departureIso).getTime() - new Date(b.departureIso).getTime());
        const nowTs = Date.now();
        const upcoming = sorted.find((f) => new Date(f.departureIso).getTime() >= nowTs) ?? sorted[0] ?? null;
        setNextFlight(upcoming);
        if (upcoming) {
          localStorage.setItem("aeroguide_active_flight", JSON.stringify(upcoming));
        }
      } catch {
        if (!cancelled) setNextFlight(null);
      } finally {
        if (!cancelled) setFlightLoading(false);
      }
    };

    loadPassengerFlight();
    const timer = window.setInterval(loadPassengerFlight, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [connectedPassenger]);

  async function handleConnectPassenger(e: FormEvent) {
    e.preventDefault();
    setConnectError("");

    if (!isSignedIn) {
      navigate("/login?next=%2Fdashboard");
      return;
    }

    const normalizedPnr = normalizePnr(pnrInput);
    const normalizedLastName = normalizeLastName(lastNameInput);
    if (!isValidPnr(normalizedPnr)) {
      setConnectError("PNR must be 5-8 letters or numbers (example: AG1234).");
      return;
    }
    if (!isValidLastName(normalizedLastName)) {
      setConnectError("Enter a valid last name using letters only.");
      return;
    }

    setConnectLoading(true);
    try {
      const flights = await lookupFlightsByPnr(normalizedPnr, normalizedLastName);
      const sorted = [...flights].sort((a, b) => new Date(a.departureIso).getTime() - new Date(b.departureIso).getTime());
      if (sorted[0]) {
        localStorage.setItem("aeroguide_active_flight", JSON.stringify(sorted[0]));
      }
      savePassengerSession({ pnr: normalizedPnr, lastName: normalizedLastName });
      setConnectedPassenger({ pnr: normalizedPnr, lastName: normalizedLastName });
      navigate("/my-home");
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Could not connect booking.");
    } finally {
      setConnectLoading(false);
    }
  }

  const passengerState = isSignedIn ? "Returning" : "New User";
  const dark = themeMode === "dark";
  const PRIMARY = dark ? "#3b82f6" : "#2563eb";
  const theme = dark
    ? {
        bg: "#020817",
        text: "#e2e8f0",
        muted: "#93a4bf",
        panel: "#0b172d",
        border: "#1e3355",
        borderSoft: "#2b4369",
        hoverBorder: "#3b82f6",
        sidebarShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
        cardShadow: "0 12px 28px rgba(0, 0, 0, 0.3)",
        secondaryBg: "#0f1f3a",
        secondaryText: "#dbe6f8",
        inputBg: "#071428",
        inputText: "#e2e8f0",
        timelineBg: "#0c1d36",
        statDivider: "#1f3658",
        heroOverlay: "rgba(7,18,40,0.62)",
      }
    : {
        bg: "#f4f6fb",
        text: "#0f172a",
        muted: "#64748b",
        panel: "#ffffff",
        border: "#e7ecf4",
        borderSoft: "#dbe3f0",
        hoverBorder: "#c7d6f4",
        sidebarShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
        cardShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
        secondaryBg: "#ffffff",
        secondaryText: "#1e293b",
        inputBg: "#ffffff",
        inputText: "#0f172a",
        timelineBg: "#f8fbff",
        statDivider: "#edf1f8",
        heroOverlay: "rgba(7,18,40,0.42)",
      };

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text }}>
      <style>{`
        .ag-layout {
          max-width: 1440px;
          margin: 0 auto;
          padding: 22px;
          display: grid;
          grid-template-columns: 250px 1fr;
          gap: 18px;
        }
        .ag-sidebar {
          background: ${theme.panel};
          border: 1px solid ${theme.border};
          border-radius: 24px;
          padding: 18px;
          box-shadow: ${theme.sidebarShadow};
          height: calc(100vh - 44px);
          position: sticky;
          top: 22px;
        }
        .ag-nav-btn {
          width: 100%;
          text-align: left;
          border: 1px solid ${theme.border};
          background: ${theme.panel};
          color: ${theme.text};
          border-radius: 12px;
          padding: 11px 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all .2s ease;
        }
        .ag-nav-btn:hover {
          border-color: ${theme.hoverBorder};
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(37, 99, 235, 0.12);
        }
        .ag-main {
          display: grid;
          gap: 16px;
          padding-bottom: 26px;
        }
        .ag-card {
          background: ${theme.panel};
          border: 1px solid ${theme.border};
          border-radius: 22px;
          box-shadow: ${theme.cardShadow};
        }
        .ag-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 18px;
        }
        .ag-primary {
          border: 0;
          border-radius: 12px;
          padding: 10px 14px;
          font-weight: 700;
          background: ${PRIMARY};
          color: #ffffff;
          cursor: pointer;
          box-shadow: 0 10px 18px rgba(37, 99, 235, 0.26);
          transition: transform .2s ease, filter .2s ease;
        }
        .ag-primary:hover { transform: translateY(-1px); filter: brightness(1.04); }
        .ag-secondary {
          border: 1px solid ${theme.borderSoft};
          border-radius: 12px;
          padding: 10px 14px;
          font-weight: 700;
          background: ${theme.secondaryBg};
          color: ${theme.secondaryText};
          cursor: pointer;
        }
        .ag-hero {
          position: relative;
          overflow: visible;
          border-radius: 22px;
          width: 100%;
          min-width: 0;
        }
        .ag-hero-image {
          border-radius: 22px;
          overflow: hidden;
          aspect-ratio: 1.91 / 1;
          min-height: 0;
          position: relative;
          border: 1px solid ${theme.border};
        }
        .ag-hero-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .ag-hero-image::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(7,18,40,0.10), ${theme.heroOverlay});
        }
        .ag-hero-text {
          position: absolute;
          left: 20px;
          top: 18px;
          z-index: 2;
          color: #ffffff;
          text-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .ag-overlap {
          position: absolute;
          left: 22px;
          right: 22px;
          bottom: -38px;
          z-index: 3;
          background: ${theme.panel};
          border: 1px solid ${theme.border};
          border-radius: 18px;
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.12);
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0;
          overflow: hidden;
        }
        .ag-stat {
          padding: 14px 16px;
          border-right: 1px solid ${theme.statDivider};
        }
        .ag-stat:last-child { border-right: 0; }
        .ag-grid {
          margin-top: 46px;
          display: grid;
          grid-template-columns: 1.25fr 1fr;
          gap: 14px;
        }
        .ag-subgrid {
          display: grid;
          gap: 14px;
        }
        .ag-progress-wrap {
          margin-top: 8px;
          display: grid;
          gap: 10px;
        }
        .ag-progress {
          height: 9px;
          border-radius: 999px;
          background: ${dark ? "#1d3558" : "#e8eef9"};
          overflow: hidden;
        }
        .ag-progress > span {
          display: block;
          height: 100%;
          background: ${PRIMARY};
          border-radius: 999px;
        }
        .ag-input {
          width: 100%;
          border-radius: 12px;
          border: 1px solid ${theme.borderSoft};
          padding: 10px 12px;
          outline: none;
          font-weight: 600;
          color: ${theme.inputText};
          background: ${theme.inputBg};
        }
        .ag-input:focus {
          border-color: #93b2ef;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.13);
        }
        @media (max-width: 1140px) {
          .ag-layout { grid-template-columns: 1fr; }
          .ag-sidebar { position: static; height: auto; }
          .ag-overlap { position: static; margin-top: 10px; }
          .ag-grid { margin-top: 0; grid-template-columns: 1fr; }
        }
        @media (max-width: 760px) {
          .ag-overlap { grid-template-columns: 1fr; }
          .ag-stat { border-right: 0; border-bottom: 1px solid #edf1f8; }
          .ag-stat:last-child { border-bottom: 0; }
        }
      `}</style>

      <div className="ag-layout">
        <aside className="ag-sidebar">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: PRIMARY, color: "#fff", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>A</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 0.3 }}>AEROGUIDE</div>
              <div style={{ fontSize: 12, color: theme.muted }}>Passenger Navigation</div>
            </div>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <button className="ag-nav-btn" onClick={() => navigate("/overview")}>Overview</button>
            <button className="ag-nav-btn" onClick={() => navigate("/flights")}>Flights</button>
            <button className="ag-nav-btn" onClick={() => navigate("/map")}>Map</button>
            <button className="ag-nav-btn" onClick={() => navigate("/guide")}>Assistant</button>
            <button className="ag-nav-btn" onClick={() => navigate("/settings")}>Settings</button>
          </div>
        </aside>

        <main className="ag-main">
          <header className="ag-card ag-header">
            <div>
              <h1 style={{ margin: 0, fontSize: 30, letterSpacing: 0.2 }}>AEROGUIDE Dashboard</h1>
              <div style={{ marginTop: 4, color: theme.muted, fontSize: 13 }}>
                {BIA_INFO.name} ({BIA_INFO.iata}) • {BIA_INFO.location} • {BIA_INFO.flightInfo}
              </div>
              <div style={{ marginTop: 3, color: theme.muted, fontSize: 12 }}>
                {now.toLocaleString([], { weekday: "short", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="ag-secondary"
                onClick={() => setThemeMode((p) => (p === "light" ? "dark" : "light"))}
                aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              >
                <ThemeModeIcon mode={themeMode} />
              </button>
              {isSignedIn ? (
                <button
                  className="ag-primary"
                  onClick={() => {
                    setAuthenticated(false);
                    localStorage.removeItem("aeroguide_user_email");
                    localStorage.removeItem("aeroguide_remember_me");
                    clearPassengerSession();
                    setIsSignedIn(false);
                    setConnectedPassenger(null);
                  }}
                >
                  Sign out
                </button>
              ) : (
                <button className="ag-primary" onClick={() => navigate("/login?next=%2Fdashboard")}>Sign in</button>
              )}
            </div>
          </header>

          <section className="ag-hero">
            <div className="ag-hero-image">
              <img
                src="https://images.unsplash.com/photo-1540339832862-474599807836?q=80&w=2000&auto=format&fit=crop"
                alt="Airplane wing above clouds"
                loading="lazy"
              />
              <div className="ag-hero-text">
                <div style={{ fontSize: 22, fontWeight: 900 }}>Smooth Passenger Experience</div>
                <div style={{ marginTop: 4, fontSize: 14, opacity: 0.92 }}>Navigate CMB confidently from check-in to gate.</div>
              </div>
            </div>

            <div className="ag-overlap">
              <div className="ag-stat">
                <div style={{ fontSize: 12, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Live Weather</div>
                <div style={{ marginTop: 6, fontSize: 30, fontWeight: 900 }}>{weatherLoading ? "..." : `${weather?.temperature ?? 30} C`}</div>
                <div style={{ marginTop: 2, fontSize: 12, color: theme.muted }}>Wind {weather?.wind ?? 14} km/h</div>
              </div>
              <div className="ag-stat">
                <div style={{ fontSize: 12, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Gate Navigation</div>
                <div style={{ marginTop: 6, fontSize: 30, fontWeight: 900 }}>{flightLoading ? "..." : nextFlight?.gate ?? "--"}</div>
                <button className="ag-primary" style={{ marginTop: 8 }} onClick={() => navigate(`/map?gate=${encodeURIComponent(nextFlight?.gate ?? "A12")}`)}>Open Map</button>
              </div>
              <div className="ag-stat">
                <div style={{ fontSize: 12, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Passenger State</div>
                <div style={{ marginTop: 6, fontSize: 30, fontWeight: 900 }}>{passengerState}</div>
                <div style={{ marginTop: 2, fontSize: 12, color: theme.muted }}>{isSignedIn ? "Signed in" : "Please sign in"}</div>
              </div>
            </div>
          </section>

          <section className="ag-grid">
            <div className="ag-subgrid">
              <article className="ag-card" style={{ padding: 16 }}>
                <h3 style={{ margin: 0, fontSize: 22 }}>Quick Actions</h3>
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button className="ag-primary" onClick={() => navigate("/flights")}>View Flights</button>
                  <button className="ag-primary" onClick={() => navigate("/my-home")}>Open My Homepage</button>
                  <button className="ag-secondary" onClick={() => navigate("/guide")}>Start Assistant</button>
                  <button className="ag-secondary" onClick={() => navigate(nextFlight?.gate ? `/map?gate=${encodeURIComponent(nextFlight.gate)}` : "/journey")}>
                    {nextFlight?.gate ? `Find Gate ${nextFlight.gate}` : "Open Journey Page"}
                  </button>
                </div>
              </article>

              <article className="ag-card" style={{ padding: 16 }}>
                <h3 style={{ margin: 0, fontSize: 22 }}>Passenger Flow Modes</h3>
                <div className="ag-progress-wrap">
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>Departing</span><strong>72%</strong></div>
                    <div className="ag-progress"><span style={{ width: "72%" }} /></div>
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>Arriving</span><strong>56%</strong></div>
                    <div className="ag-progress"><span style={{ width: "56%" }} /></div>
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>Transit</span><strong>38%</strong></div>
                    <div className="ag-progress"><span style={{ width: "38%" }} /></div>
                  </div>
                </div>
              </article>
            </div>

            <div className="ag-subgrid">
              <article className="ag-card" style={{ padding: 16 }}>
                <h3 style={{ margin: 0, fontSize: 22 }}>Operations Timeline</h3>
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {[
                    "Check-in counters active",
                    "Security wait time under 12 min",
                    `Gate ${nextFlight?.gate ?? "--"} boarding window stable`,
                    `Next flight ${nextFlight?.flightNo ?? "--"} ready for guidance`,
                  ].map((item) => (
                    <div key={item} style={{ border: `1px solid ${theme.border}`, borderRadius: 12, padding: "10px 12px", background: theme.timelineBg, fontSize: 14 }}>
                      {item}
                    </div>
                  ))}
                </div>
              </article>

              <article className="ag-card" style={{ padding: 16 }}>
                <h3 style={{ margin: 0, fontSize: 22 }}>My Booking Access</h3>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: theme.muted }}>Search key: PNR + last name</p>
                {!isSignedIn ? (
                  <div style={{ marginTop: 10 }}>
                    <button className="ag-primary" onClick={() => navigate("/login?next=%2Fdashboard")}>Sign in to Continue</button>
                  </div>
                ) : connectedPassenger ? (
                  <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                    <div style={{ border: `1px solid ${theme.border}`, borderRadius: 12, padding: 12, background: theme.timelineBg }}>
                      <div style={{ fontSize: 12, color: theme.muted }}>Connected booking</div>
                      <div style={{ marginTop: 2, fontWeight: 800 }}>{connectedPassenger.pnr} / {connectedPassenger.lastName}</div>
                    </div>
                    <button className="ag-primary" onClick={() => navigate("/my-home")}>Open My Homepage</button>
                    <button
                      className="ag-secondary"
                      onClick={() => {
                        clearPassengerSession();
                        setConnectedPassenger(null);
                        setNextFlight(null);
                      }}
                    >
                      Switch Passenger
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleConnectPassenger} style={{ marginTop: 10, display: "grid", gap: 8 }}>
                    <input className="ag-input" value={pnrInput} onChange={(e) => setPnrInput(e.target.value.toUpperCase())} placeholder="PNR (e.g. AG1234)" maxLength={8} />
                    <input className="ag-input" value={lastNameInput} onChange={(e) => setLastNameInput(e.target.value.toUpperCase())} placeholder="Last name (e.g. PERERA)" maxLength={30} />
                    {connectError ? <div style={{ fontSize: 12, color: "#b91c1c" }}>{connectError}</div> : null}
                    <button className="ag-primary" type="submit" disabled={connectLoading}>{connectLoading ? "Checking..." : "Open My Homepage"}</button>
                    <div style={{ fontSize: 11, color: theme.muted }}>Any valid PNR + last name is accepted.</div>
                  </form>
                )}
              </article>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}





