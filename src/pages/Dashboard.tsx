import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { lookupFlightsByPnr, type FlightLookupResult } from "../services/flightLookup";
import { getPassengerProfileFromUserId, type PassengerProfile } from "../services/passengerProfile";
import { getStoredLang, type AppLang } from "../services/i18n";

const menu = ["Overview", "Flights", "Map", "Assistant", "Settings"] as const;

const destinations = [
  { city: "Dubai, UAE", price: "$420", code: "AE" },
  { city: "Singapore, SG", price: "$310", code: "SG" },
  { city: "Doha, QA", price: "$280", code: "QA" },
];

const checklistItems = [
  "Passport and visa",
  "Boarding pass",
  "Baggage tagged",
  "Power bank packed",
  "Currency exchanged",
];

const companions = [
  { name: "Nimal", location: "Coffee Zone", status: "Waiting" },
  { name: "Ayesha", location: "Security Lane B", status: "In Queue" },
  { name: "Kavindu", location: "Gate A12", status: "Arrived" },
];

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

type ThemeMode = "light" | "dark";

const THEMES = {
  light: {
    bg: "#f1f5f9",
    surface: "#ffffff",
    surfaceAlt: "#f8fafc",
    border: "#e2e8f0",
    text: "#0f172a",
    muted: "#64748b",
    subtle: "#475569",
    primary: "#0f172a",
    primaryText: "#ffffff",
    chipBg: "#ffffff",
    chipText: "#475569",
    successBg: "#dcfce7",
    successText: "#166534",
  },
  dark: {
    bg: "#020617",
    surface: "#0f172a",
    surfaceAlt: "#111827",
    border: "#1f2937",
    text: "#e2e8f0",
    muted: "#94a3b8",
    subtle: "#cbd5e1",
    primary: "#2563eb",
    primaryText: "#ffffff",
    chipBg: "#111827",
    chipText: "#cbd5e1",
    successBg: "#052e16",
    successText: "#86efac",
  },
} as const;

type WeatherState = {
  temperature: number;
  wind: number;
  code: number;
  daily: Array<{ date: string; max: number; min: number; code: number }>;
};

const DEFAULT_COORDS = { lat: 7.1808, lon: 79.8841 };

function weatherLabel(code: number) {
  if (code === 0) return "Clear";
  if (code >= 1 && code <= 3) return "Partly Cloudy";
  if (code >= 45 && code <= 48) return "Fog";
  if (code >= 51 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain Showers";
  if (code >= 95) return "Thunderstorm";
  return "Moderate";
}

function getNextDeparture(now: Date) {
  const departure = new Date(now);
  departure.setHours(12, 30, 0, 0);
  if (departure.getTime() <= now.getTime()) departure.setDate(departure.getDate() + 1);
  return departure;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("aeroguide_theme");
    return saved === "dark" ? "dark" : "light";
  });
  const [lang, setLang] = useState<AppLang>(() => getStoredLang());
  const theme = THEMES[themeMode];
  const [now, setNow] = useState(new Date());
  const [coords, setCoords] = useState(DEFAULT_COORDS);
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState("");
  const [checks, setChecks] = useState<boolean[]>(() => checklistItems.map((_, i) => i < 2));
  const [pnr, setPnr] = useState(DEFAULT_FLIGHT.pnr);
  const [lastName, setLastName] = useState(DEFAULT_FLIGHT.lastName);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [flight, setFlight] = useState<FlightLookupResult>(DEFAULT_FLIGHT);
  const [flightResults, setFlightResults] = useState<FlightLookupResult[]>([DEFAULT_FLIGHT]);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileBootstrapped, setProfileBootstrapped] = useState(false);

  useEffect(() => {
    localStorage.setItem("aeroguide_theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    const syncLang = () => setLang(getStoredLang());
    window.addEventListener("focus", syncLang);
    return () => window.removeEventListener("focus", syncLang);
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("aeroguide_active_flight");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as FlightLookupResult;
      if (parsed?.flightNo && parsed?.gate) {
        setFlight(parsed);
        setFlightResults([parsed]);
        setPnr(parsed.pnr);
        setLastName(parsed.lastName);
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("aeroguide_passenger_profile");
    if (!raw) {
      const userId = localStorage.getItem("aeroguide_user_id");
      if (userId) {
        const profile = getPassengerProfileFromUserId(userId);
        setPnr(profile.pnr);
        setLastName(profile.lastName);
      }
      setProfileLoaded(true);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as PassengerProfile;
      if (parsed?.pnr && parsed?.lastName) {
        setPnr(parsed.pnr);
        setLastName(parsed.lastName);
      }
    } catch {
      // ignore malformed storage
    } finally {
      setProfileLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!profileLoaded || profileBootstrapped || !pnr || !lastName) return;
    let cancelled = false;
    const bootstrapPassengerFlight = async () => {
      setLookupLoading(true);
      setLookupError("");
      try {
        const results = await lookupFlightsByPnr(pnr, lastName);
        if (cancelled) return;
        setFlightResults(results);
        setFlight(results[0]);
        localStorage.setItem("aeroguide_active_flight", JSON.stringify(results[0]));
      } catch (err) {
        if (!cancelled) {
          setLookupError(err instanceof Error ? err.message : "Lookup failed");
          setFlightResults([]);
        }
      } finally {
        if (!cancelled) {
          setLookupLoading(false);
          setProfileBootstrapped(true);
        }
      }
    };
    bootstrapPassengerFlight();
    return () => {
      cancelled = true;
    };
  }, [profileLoaded, profileBootstrapped, pnr, lastName]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      () => {}
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchWeather = async () => {
      setWeatherLoading(true);
      setWeatherError("");
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}` +
          `&current=temperature_2m,wind_speed_10m,weather_code` +
          `&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=4`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("weather");
        const data = await res.json();
        if (cancelled) return;

        setWeather({
          temperature: Math.round(data.current?.temperature_2m ?? 0),
          wind: Math.round(data.current?.wind_speed_10m ?? 0),
          code: data.current?.weather_code ?? 0,
          daily: (data.daily?.time ?? []).map((d: string, i: number) => ({
            date: d,
            max: Math.round(data.daily.temperature_2m_max[i]),
            min: Math.round(data.daily.temperature_2m_min[i]),
            code: data.daily.weather_code[i],
          })),
        });
      } catch {
        if (!cancelled) setWeatherError("Live weather unavailable");
      } finally {
        if (!cancelled) setWeatherLoading(false);
      }
    };

    fetchWeather();
    const refresh = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(refresh);
    };
  }, [coords.lat, coords.lon]);

  const departure = useMemo(() => {
    const parsed = new Date(flight.departureIso);
    return Number.isNaN(parsed.getTime()) ? getNextDeparture(now) : parsed;
  }, [now, flight.departureIso]);
  const minutesToDeparture = Math.max(0, Math.round((departure.getTime() - now.getTime()) / 60000));
  const status = minutesToDeparture <= 30 ? "Boarding Soon" : flight.status;
  const securityWait = 12 + ((now.getMinutes() + now.getSeconds()) % 14);
  const gateChangeRisk = minutesToDeparture <= 45 ? "High" : minutesToDeparture <= 90 ? "Medium" : "Low";
  const gateRiskColor = gateChangeRisk === "High" ? "#b91c1c" : gateChangeRisk === "Medium" ? "#b45309" : "#166534";

  const timeline = useMemo(() => {
    const makeTime = (mins: number) => {
      const d = new Date(now.getTime() + mins * 60000);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };
    return [
      { step: "Check-in", eta: makeTime(-120), done: true },
      { step: "Security", eta: makeTime(-40), done: minutesToDeparture < 70 },
      { step: "Immigration", eta: makeTime(-25), done: minutesToDeparture < 45 },
      { step: "Boarding", eta: makeTime(-10), done: minutesToDeparture < 10 },
      { step: "Takeoff", eta: departure.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), done: false },
    ];
  }, [now, departure, minutesToDeparture]);

  const alerts = useMemo(
    () => [
      `Gate change risk is ${gateChangeRisk} for flight ${flight.originCode}-${flight.destinationCode}.`,
      `Security wait time is approximately ${securityWait} minutes.`,
      `Weather: ${weatherLabel(weather?.code ?? 0)} with wind ${weather?.wind ?? 0} km/h.`,
      `Current local time ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}.`,
    ],
    [gateChangeRisk, securityWait, weather, now, flight.originCode, flight.destinationCode]
  );

  const cardStyle: CSSProperties = {
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: 16,
    padding: 20,
    boxShadow: themeMode === "dark" ? "0 10px 30px rgba(0, 0, 0, 0.35)" : "0 4px 20px rgba(15, 23, 42, 0.06)",
  };

  const copy = {
    EN: {
      signOut: "Sign out",
      pnr: "PNR",
      lastName: "Last Name",
      searching: "Searching...",
      findFlight: "Find Flight",
      current: "Current",
      openMapToGate: "Open Map to Gate",
      openAllFlights: "Open All PNR Flights",
      openBoardingPass: "Open Boarding Pass",
      myTicket: "My Ticket",
      departure: "Departure",
      gate: "Gate",
      menu: { Overview: "Overview", Flights: "Flights", Map: "Map", Assistant: "Assistant", Settings: "Settings" },
    },
    SI: {
      signOut: "ඉවත් වන්න",
      pnr: "PNR",
      lastName: "අවසන් නම",
      searching: "සොයමින්...",
      findFlight: "ගුවන් ගමන සොයන්න",
      current: "වත්මන්",
      openMapToGate: "ගේට් වෙත සිතියම විවෘත කරන්න",
      openAllFlights: "PNR ගුවන් ගමන් සියල්ල",
      openBoardingPass: "බෝඩින් පාස් විවෘත කරන්න",
      myTicket: "මගේ ටිකට්පත",
      departure: "පිටත් වීම",
      gate: "ගේට්",
      menu: { Overview: "දළ දර්ශනය", Flights: "ගුවන් ගමන්", Map: "සිතියම", Assistant: "සහායක", Settings: "සැකසුම්" },
    },
    TA: {
      signOut: "வெளியேறு",
      pnr: "PNR",
      lastName: "குடும்பப்பெயர்",
      searching: "தேடுகிறது...",
      findFlight: "விமானத்தை தேடு",
      current: "தற்போது",
      openMapToGate: "கேட் வரை வரைபடம் திறக்க",
      openAllFlights: "PNR விமானங்கள் அனைத்தும்",
      openBoardingPass: "போர்டிங் பாஸ் திற",
      myTicket: "என் டிக்கெட்",
      departure: "புறப்பு",
      gate: "கேட்",
      menu: { Overview: "மேலோட்டம்", Flights: "விமானங்கள்", Map: "வரைபடம்", Assistant: "உதவியாளர்", Settings: "அமைப்புகள்" },
    },
  }[lang];

  const handleLookup = async () => {
    setLookupLoading(true);
    setLookupError("");
    try {
      const results = await lookupFlightsByPnr(pnr, lastName);
      setFlightResults(results);
      setFlight(results[0]);
      localStorage.setItem("aeroguide_active_flight", JSON.stringify(results[0]));
      localStorage.setItem(
        "aeroguide_passenger_profile",
        JSON.stringify({ pnr: pnr.trim().toUpperCase(), lastName: lastName.trim().toUpperCase() })
      );
      navigate("/boarding-pass");
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Lookup failed");
      setFlightResults([]);
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, padding: 20 }}>
      <div style={{ maxWidth: 1320, margin: "0 auto", display: "grid", gap: 16 }}>
        <header style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30, color: theme.text }}>AEROGUIDE</h1>
            <p style={{ margin: "6px 0 0", color: theme.muted, fontSize: 14 }}>
              {now.toLocaleString([], { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setThemeMode((p) => (p === "light" ? "dark" : "light"))} style={{ border: `1px solid ${theme.border}`, borderRadius: 10, width: 42, height: 42, background: theme.surfaceAlt, color: theme.text, fontSize: 18, cursor: "pointer" }}>
              {themeMode === "light" ? "🌙" : "☀️"}
            </button>
            <button onClick={() => navigate("/login")} style={{ border: 0, borderRadius: 10, padding: "10px 16px", background: theme.primary, color: theme.primaryText, fontWeight: 600, cursor: "pointer" }}>
              {copy.signOut}
            </button>
          </div>
        </header>

        <section style={cardStyle}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <Field label={copy.pnr} value={pnr} onChange={setPnr} theme={theme} />
            <Field label={copy.lastName} value={lastName} onChange={setLastName} theme={theme} />
            <button onClick={handleLookup} disabled={lookupLoading} style={{ border: 0, borderRadius: 10, padding: "10px 14px", background: lookupLoading ? theme.muted : theme.primary, color: theme.primaryText, fontWeight: 600, cursor: lookupLoading ? "default" : "pointer" }}>
              {lookupLoading ? copy.searching : copy.findFlight}
            </button>
            <div style={{ marginLeft: "auto", color: theme.subtle, fontSize: 13 }}>{copy.current}: {flight.flightNo} | {flight.terminal}</div>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => navigate(`/map?gate=${encodeURIComponent(flight.gate)}`)} style={{ border: 0, borderRadius: 10, padding: "8px 12px", background: theme.primary, color: theme.primaryText, fontWeight: 600, cursor: "pointer" }}>
              {copy.openMapToGate}
            </button>
            <button onClick={() => navigate(`/flights?pnr=${encodeURIComponent(flight.pnr)}`)} style={{ border: `1px solid ${theme.border}`, borderRadius: 10, padding: "8px 12px", background: theme.surfaceAlt, color: theme.text, fontWeight: 600, cursor: "pointer" }}>
              {copy.openAllFlights}
            </button>
            <button onClick={() => navigate("/boarding-pass")} style={{ border: `1px solid ${theme.border}`, borderRadius: 10, padding: "8px 12px", background: theme.surfaceAlt, color: theme.text, fontWeight: 600, cursor: "pointer" }}>
              {copy.openBoardingPass}
            </button>
          </div>
          {lookupError ? <div style={{ marginTop: 8, color: "#b91c1c", fontSize: 13 }}>{lookupError}</div> : null}
          {!lookupError && flightResults.length > 0 ? (
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {flightResults.map((f) => (
                <button
                  key={`${f.pnr}-${f.flightNo}-${f.departureIso}`}
                  onClick={() => {
                    setFlight(f);
                    localStorage.setItem("aeroguide_active_flight", JSON.stringify(f));
                  }}
                  style={{ border: `1px solid ${flight.flightNo === f.flightNo ? theme.primary : theme.border}`, borderRadius: 10, padding: "10px 12px", background: theme.surfaceAlt, textAlign: "left", cursor: "pointer" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 700, color: theme.text }}>{f.flightNo} | {f.originCode} to {f.destinationCode}</div>
                    <div style={{ fontSize: 12, color: theme.muted }}>{f.status}</div>
                  </div>
                  <div style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>
                    {new Date(f.departureIso).toLocaleString([], { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} | {f.terminal} | Gate {f.gate}
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 340px", gap: 16 }}>
          <aside style={cardStyle}>
            <div style={{ display: "grid", gap: 10 }}>
               {menu.map((item) => (
                 <button
                  key={item}
                  onClick={() => {
                    if (item === "Overview") navigate("/overview");
                    if (item === "Flights") navigate("/flights");
                    if (item === "Map") navigate("/map");
                    if (item === "Assistant") navigate("/guide");
                    if (item === "Settings") navigate("/settings");
                  }}
                  style={{ border: `1px solid ${theme.border}`, borderRadius: 10, padding: "10px 12px", textAlign: "left", background: theme.surfaceAlt, color: theme.subtle, fontWeight: 600, cursor: "pointer" }}
                >
                  {copy.menu[item]}
                </button>
              ))}
            </div>
          </aside>

          <main style={{ display: "grid", gap: 16 }}>
            <section style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 22, color: theme.text }}>{copy.myTicket}</h2>
                <span style={{ fontSize: 12, background: theme.successBg, color: theme.successText, padding: "4px 10px", borderRadius: 999 }}>{status}</span>
              </div>
              <div style={{ borderRadius: 14, padding: 18, background: "linear-gradient(135deg,#0f172a,#1e293b)", color: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div>
                    <div style={{ fontSize: 44, fontWeight: 300 }}>{flight.originCode}</div>
                    <div style={{ opacity: 0.8 }}>{flight.originCity}</div>
                  </div>
                  <div style={{ opacity: 0.7, fontSize: 14, paddingBottom: 8 }}>to</div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 44, fontWeight: 300 }}>{flight.destinationCode}</div>
                    <div style={{ opacity: 0.8 }}>{flight.destinationCity}</div>
                  </div>
                </div>
                <div style={{ marginTop: 14, height: 38, borderRadius: 8, background: "repeating-linear-gradient(90deg,#fff 0,#fff 3px,transparent 3px,transparent 7px)", opacity: 0.8 }} />
                <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <TicketMini label={copy.departure} value={departure.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} />
                  <TicketMini label={copy.gate} value={flight.gate} right />
                </div>
              </div>
            </section>

            <section style={cardStyle}>
              <h2 style={{ margin: "0 0 12px", fontSize: 22, color: theme.text }}>Airport View</h2>
              <img src="https://images.unsplash.com/photo-1517479149777-5f3b1511d5ad?auto=format&fit=crop&w=1600&q=80" alt="Airport view" style={{ width: "100%", height: 330, objectFit: "cover", borderRadius: 14 }} />
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <MiniStat label="Walk Distance" value="840m" theme={theme} />
                <MiniStat label="Route Progress" value="74%" theme={theme} />
                <MiniStat label="Live Time" value={now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} theme={theme} />
              </div>
            </section>

            <section style={cardStyle}>
              <h2 style={{ margin: "0 0 12px", fontSize: 22, color: theme.text }}>Today Timeline</h2>
              <div style={{ display: "grid", gap: 8 }}>
                {timeline.map((t) => (
                  <div key={t.step} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 10, padding: "10px 12px", background: theme.surfaceAlt, border: `1px solid ${theme.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 999, background: t.done ? "#16a34a" : "#cbd5e1", display: "inline-block" }} />
                      <span style={{ fontWeight: 600, color: theme.text }}>{t.step}</span>
                    </div>
                    <span style={{ color: theme.muted, fontSize: 13 }}>{t.eta}</span>
                  </div>
                ))}
              </div>
            </section>

            <section style={cardStyle}>
              <h2 style={{ margin: "0 0 12px", fontSize: 22, color: theme.text }}>Gate Risk & Navigation Snapshot</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ borderRadius: 12, background: theme.surfaceAlt, padding: 14, border: `1px solid ${theme.border}` }}>
                  <div style={{ color: theme.muted, fontSize: 13 }}>Gate Change Probability</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: gateRiskColor }}>{gateChangeRisk}</div>
                  <div style={{ marginTop: 8, color: theme.subtle }}>Security wait: {securityWait} min</div>
                  <div style={{ marginTop: 8, color: theme.subtle }}>
                    Recommendation: {minutesToDeparture <= 45 ? "Proceed to gate now" : "Visit services, then head to gate"}
                  </div>
                </div>
                <div style={{ borderRadius: 12, background: theme.surfaceAlt, padding: 14, border: `1px solid ${theme.border}` }}>
                  <img src="https://images.unsplash.com/photo-1529074963764-98f45c47344b?auto=format&fit=crop&w=1000&q=80" alt="Indoor navigation snapshot" style={{ width: "100%", height: 130, objectFit: "cover", borderRadius: 10 }} />
                  <div style={{ marginTop: 8, fontSize: 13, color: theme.muted }}>Terminal 1 Route Preview</div>
                  <div style={{ fontWeight: 700, color: theme.text }}>ETA to Gate {flight.gate}: {Math.max(6, Math.round(minutesToDeparture * 0.35))} min</div>
                </div>
              </div>
            </section>

            <section style={cardStyle}>
              <h2 style={{ margin: "0 0 12px", fontSize: 22, color: theme.text }}>Personal Checklist</h2>
              <div style={{ display: "grid", gap: 8 }}>
                {checklistItems.map((item, idx) => (
                  <label key={item} style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 10, padding: "10px 12px", background: theme.surfaceAlt, border: `1px solid ${theme.border}`, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={checks[idx]}
                      onChange={() =>
                        setChecks((prev) => {
                          const next = [...prev];
                          next[idx] = !next[idx];
                          return next;
                        })
                      }
                    />
                    <span style={{ color: checks[idx] ? theme.muted : theme.text, textDecoration: checks[idx] ? "line-through" : "none" }}>{item}</span>
                  </label>
                ))}
              </div>
            </section>

            <section style={cardStyle}>
              <h2 style={{ margin: "0 0 12px", fontSize: 22, color: theme.text }}>Live Alerts Feed</h2>
              <div style={{ display: "grid", gap: 8 }}>
                {alerts.map((a, idx) => (
                  <div key={`${a}-${idx}`} style={{ borderRadius: 10, padding: "10px 12px", background: theme.surfaceAlt, border: `1px solid ${theme.border}` }}>
                    <div style={{ color: theme.subtle, fontSize: 14 }}>{a}</div>
                  </div>
                ))}
              </div>
            </section>
          </main>

          <aside style={{ display: "grid", gap: 16 }}>
            <section style={cardStyle}>
              <h3 style={{ margin: "0 0 10px", fontSize: 20, color: theme.text }}>Weather</h3>
              <div style={{ borderRadius: 12, background: theme.surfaceAlt, padding: 14 }}>
                {weatherLoading ? (
                  <div style={{ color: theme.muted }}>Loading live weather...</div>
                ) : weatherError ? (
                  <div style={{ color: "#b91c1c" }}>{weatherError}</div>
                ) : (
                  <>
                    <div style={{ color: theme.muted, fontSize: 14 }}>Live Weather ({coords.lat.toFixed(2)}, {coords.lon.toFixed(2)})</div>
                    <div style={{ fontSize: 46, fontWeight: 700, color: theme.text, lineHeight: 1 }}>{weather?.temperature ?? 0} C</div>
                    <div style={{ marginTop: 6, color: theme.subtle }}>
                      {weatherLabel(weather?.code ?? 0)} | Wind {weather?.wind ?? 0} km/h
                    </div>
                  </>
                )}
              </div>
            </section>

            <section style={cardStyle}>
              <h3 style={{ margin: "0 0 10px", fontSize: 20, color: theme.text }}>Destinations</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {destinations.map((d) => (
                  <div key={d.city} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 10, background: theme.surfaceAlt, padding: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: theme.text }}>{d.city}</div>
                      <div style={{ fontSize: 12, color: theme.muted }}>from {d.price}</div>
                    </div>
                    <div style={{ borderRadius: 999, background: theme.chipBg, padding: "5px 10px", fontSize: 12, fontWeight: 700, color: theme.chipText, border: `1px solid ${theme.border}` }}>
                      {d.code}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section style={cardStyle}>
              <h3 style={{ margin: "0 0 8px", fontSize: 20, color: theme.text }}>AEROGUIDE AI</h3>
              <p style={{ margin: 0, color: theme.subtle }}>Need help with directions to gate {flight.gate}?</p>
              <button onClick={() => navigate("/guide")} style={{ marginTop: 12, border: 0, borderRadius: 10, padding: "10px 14px", background: theme.primary, color: theme.primaryText, fontWeight: 600, cursor: "pointer" }}>
                Start Voice Guide
              </button>
            </section>

            <section style={cardStyle}>
              <h3 style={{ margin: "0 0 10px", fontSize: 20, color: theme.text }}>Spending & Budget</h3>
              <div style={{ borderRadius: 12, background: theme.surfaceAlt, padding: 14 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <BudgetRow label="Planned Budget" value="$650" theme={theme} />
                  <BudgetRow label="Spent Today" value="$186" theme={theme} />
                  <BudgetRow label="Remaining" value="$464" theme={theme} />
                  <BudgetRow label="Lounge Upgrade" value="$49" theme={theme} />
                </div>
              </div>
            </section>

            <section style={cardStyle}>
              <h3 style={{ margin: "0 0 10px", fontSize: 20, color: theme.text }}>Companion Tracking</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {companions.map((c) => (
                  <div key={c.name} style={{ borderRadius: 10, background: theme.surfaceAlt, border: `1px solid ${theme.border}`, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ fontWeight: 700, color: theme.text }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: c.status === "Arrived" ? "#166534" : c.status === "In Queue" ? "#b45309" : "#334155" }}>{c.status}</div>
                    </div>
                    <div style={{ marginTop: 4, fontSize: 13, color: theme.muted }}>{c.location}</div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  theme,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  theme: (typeof THEMES)[ThemeMode];
}) {
  return (
    <div style={{ minWidth: 170 }}>
      <div style={{ fontSize: 12, color: theme.muted, marginBottom: 4 }}>{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", borderRadius: 10, border: `1px solid ${theme.border}`, padding: "9px 10px", fontWeight: 600, background: theme.surfaceAlt, color: theme.text }}
      />
    </div>
  );
}

function TicketMini({ label, value, right }: { label: string; value: string; right?: boolean }) {
  return (
    <div style={{ textAlign: right ? "right" : "left" }}>
      <div style={{ color: "#94a3b8", fontSize: 12 }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: (typeof THEMES)[ThemeMode];
}) {
  return (
    <div style={{ borderRadius: 10, background: theme.surfaceAlt, border: `1px solid ${theme.border}`, padding: 12 }}>
      <div style={{ color: theme.muted, fontSize: 12 }}>{label}</div>
      <div style={{ color: theme.text, fontWeight: 700, fontSize: 30 }}>{value}</div>
    </div>
  );
}

function BudgetRow({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: (typeof THEMES)[ThemeMode];
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 8, background: theme.surface, border: `1px solid ${theme.border}`, padding: "8px 10px" }}>
      <span style={{ fontSize: 13, color: theme.muted }}>{label}</span>
      <span style={{ fontWeight: 700, color: theme.text }}>{value}</span>
    </div>
  );
}
