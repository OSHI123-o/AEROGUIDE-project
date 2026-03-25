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
  
  // Dashboard Session Connection States
  const [pnrInput, setPnrInput] = useState("");
  const [lastNameInput, setLastNameInput] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState("");

  // Interactive Passenger Details Search States
  const [searchPnr, setSearchPnr] = useState("");
  const [searchLastName, setSearchLastName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    localStorage.setItem("aeroguide_theme", themeMode);
    if (themeMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
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
      setConnectError("PNR must be 5-8 letters or numbers.");
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

  // UPDATED: Now redirects to the Boarding Pass (/journey) page
  async function handlePassengerSearch(e: FormEvent) {
    e.preventDefault();
    setSearchError("");

    const normalizedPnr = normalizePnr(searchPnr);
    const normalizedLastName = normalizeLastName(searchLastName);

    if (!isValidPnr(normalizedPnr)) {
      setSearchError("Please enter a valid PNR (5-8 characters).");
      return;
    }
    if (!isValidLastName(normalizedLastName)) {
      setSearchError("Please enter a valid last name.");
      return;
    }

    setIsSearching(true);
    try {
      const flights = await lookupFlightsByPnr(normalizedPnr, normalizedLastName);
      const sorted = [...flights].sort((a, b) => new Date(a.departureIso).getTime() - new Date(b.departureIso).getTime());
      
      if (sorted.length > 0) {
        // Save the flight to local storage so the boarding pass page can read it
        localStorage.setItem("aeroguide_active_flight", JSON.stringify(sorted[0]));
        // Navigate to your boarding pass page
        navigate("/journey"); 
      } else {
        setSearchError("No active flights found for this passenger.");
      }
    } catch (err) {
      setSearchError("Could not retrieve passenger details. Check your PNR.");
    } finally {
      setIsSearching(false);
    }
  }

  const passengerState = isSignedIn ? "Returning" : "New User";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-aeroguide-navy text-slate-900 dark:text-white font-sans selection:bg-aeroguide-gold selection:text-aeroguide-navy relative overflow-hidden flex flex-col lg:flex-row transition-colors duration-300">
      
      {/* Abstract Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-aeroguide-blue opacity-10 dark:opacity-30 blur-[120px]"></div>
        <div className="absolute top-[60%] -right-[10%] w-[40vw] h-[40vw] rounded-full bg-aeroguide-gold opacity-10 dark:opacity-20 blur-[100px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      </div>

      {/* SIDEBAR */}
      <aside className="relative z-10 w-full lg:w-72 lg:h-screen lg:sticky top-0 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl p-6 transition-colors duration-300">
        <div className="flex items-center gap-3 mb-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-aeroguide-gold shadow-lg shadow-aeroguide-gold/20">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-aeroguide-navy" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </div>
          <div>
            <div className="text-xl font-black tracking-widest text-slate-900 dark:text-white">AEROGUIDE</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Passenger Nav</div>
          </div>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          {['Overview', 'Flights', 'Map', 'Assistant', 'Settings'].map((item) => (
            <button
              key={item}
              onClick={() => navigate(`/${item.toLowerCase()}`)}
              className={`w-full text-left rounded-xl px-4 py-3 font-semibold text-sm transition-all border ${
                item === 'Overview' 
                  ? 'bg-aeroguide-blue/10 dark:bg-aeroguide-blue/30 border-aeroguide-blue/30 dark:border-aeroguide-blue/50 text-aeroguide-blue dark:text-white' 
                  : 'border-transparent text-slate-600 dark:text-slate-300 hover:border-slate-300 hover:bg-white/50 dark:hover:border-white/10 dark:hover:bg-white/10'
              }`}
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="relative z-10 flex-1 p-4 sm:p-8 lg:p-10 h-full lg:h-screen overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* HEADER */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-[24px] border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 p-6 backdrop-blur-md shadow-xl transition-colors duration-300">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span className="text-aeroguide-blue dark:text-aeroguide-gold font-bold">{BIA_INFO.iata}</span>
                <span>•</span>
                <span>{BIA_INFO.name}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {now.toLocaleString([], { weekday: "short", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors shadow-sm dark:shadow-none"
                onClick={() => setThemeMode((p) => (p === "light" ? "dark" : "light"))}
                aria-label="Toggle theme"
              >
                <ThemeModeIcon mode={themeMode} />
              </button>
              
              {isSignedIn ? (
                <button
                  className="rounded-xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 px-5 py-3 text-sm font-bold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/20 transition-all shadow-sm dark:shadow-none"
                  onClick={() => {
                    setAuthenticated(false);
                    localStorage.removeItem("aeroguide_user_email");
                    localStorage.removeItem("aeroguide_remember_me");
                    clearPassengerSession();
                    setIsSignedIn(false);
                    setConnectedPassenger(null);
                  }}
                >
                  Sign Out
                </button>
              ) : (
                <button 
                  className="rounded-xl bg-aeroguide-gold px-6 py-3 text-sm font-bold text-aeroguide-navy shadow-[0_4px_14px_rgba(253,185,19,0.3)] hover:brightness-95 dark:hover:brightness-110 transition-all"
                  onClick={() => navigate("/login?next=%2Fdashboard")}
                >
                  Sign In
                </button>
              )}
            </div>
          </header>

          {/* HERO SECTION */}
          <section className="relative w-full rounded-[32px] overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-900 shadow-xl transition-colors duration-300">
            <div className="absolute inset-0">
              <img
                src="https://images.unsplash.com/photo-1540339832862-474599807836?q=80&w=2000&auto=format&fit=crop"
                alt="Airplane wing"
                className="w-full h-full object-cover opacity-90 dark:opacity-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-aeroguide-navy via-aeroguide-navy/60 to-transparent"></div>
            </div>

            <div className="relative z-10 pt-32 pb-8 px-8 lg:px-12 flex flex-col lg:flex-row justify-between items-end gap-8">
              <div className="w-full lg:w-auto">
                <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                  Smooth Passenger <br/> <span className="text-aeroguide-gold">Experience.</span>
                </h2>
                <p className="mt-2 text-sm text-slate-200">Navigate CMB confidently from check-in to gate.</p>
              </div>

              {/* OVERLAPPING STATS */}
              <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-4">
                <div className="flex-1 min-w-[140px] rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-aeroguide-gold">Live Weather</div>
                  <div className="mt-1 text-2xl font-black text-white">{weatherLoading ? "..." : `${weather?.temperature ?? 30}°C`}</div>
                  <div className="text-xs text-slate-300">Wind {weather?.wind ?? 14} km/h</div>
                </div>

                <div className="flex-1 min-w-[140px] rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-aeroguide-gold">Gate Nav</div>
                  <div className="mt-1 text-2xl font-black text-white">{flightLoading ? "..." : nextFlight?.gate ?? "--"}</div>
                  <button onClick={() => navigate(`/map?gate=${encodeURIComponent(nextFlight?.gate ?? "A12")}`)} className="mt-1 text-xs font-bold text-blue-300 hover:text-white transition-colors">Open Map →</button>
                </div>

                <div className="flex-1 min-w-[140px] rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-aeroguide-gold">Status</div>
                  <div className="mt-1 text-2xl font-black text-white">{passengerState}</div>
                  <div className="text-xs text-slate-300">{isSignedIn ? "Signed in" : "Please sign in"}</div>
                </div>
              </div>
            </div>
          </section>

          {/* MAIN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* LEFT COLUMN */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Quick Actions */}
              <article className="rounded-[24px] border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 p-6 backdrop-blur-md shadow-lg dark:shadow-none transition-colors duration-300">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-5">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button onClick={() => navigate("/flights")} className="rounded-xl bg-aeroguide-blue px-4 py-3 text-sm font-bold text-white hover:brightness-110 shadow-md transition-all">
                    View Flights
                  </button>
                  <button onClick={() => navigate("/my-home")} className="rounded-xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 px-4 py-3 text-sm font-bold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/20 shadow-sm dark:shadow-none transition-colors">
                    Open My Homepage
                  </button>
                  <button onClick={() => navigate("/guide")} className="rounded-xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 px-4 py-3 text-sm font-bold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/20 shadow-sm dark:shadow-none transition-colors">
                    Start Assistant
                  </button>
                  <button onClick={() => navigate(nextFlight?.gate ? `/map?gate=${encodeURIComponent(nextFlight.gate)}` : "/journey")} className="rounded-xl bg-aeroguide-gold px-4 py-3 text-sm font-bold text-aeroguide-navy hover:brightness-95 dark:hover:brightness-110 shadow-md shadow-aeroguide-gold/20 transition-all">
                    {nextFlight?.gate ? `Find Gate ${nextFlight.gate}` : "Open Journey Page"}
                  </button>
                </div>
              </article>

              {/* NEW FEATURE: Passenger Details Lookup */}
              <article className="rounded-[24px] border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 p-6 backdrop-blur-md shadow-lg dark:shadow-none transition-colors duration-300 overflow-hidden relative">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Track Passenger Details</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Search any valid PNR to view your digital boarding pass and live navigation.</p>
                
                <form onSubmit={handlePassengerSearch} className="flex flex-col sm:flex-row gap-3">
                  <input
                    className="flex-1 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-aeroguide-blue dark:focus:border-aeroguide-gold focus:ring-2 focus:ring-aeroguide-blue/10 dark:focus:ring-0 transition-colors"
                    value={searchPnr}
                    onChange={(e) => setSearchPnr(e.target.value.toUpperCase())}
                    placeholder="PNR (e.g. AG1234)"
                    maxLength={8}
                  />
                  <input
                    className="flex-1 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-aeroguide-blue dark:focus:border-aeroguide-gold focus:ring-2 focus:ring-aeroguide-blue/10 dark:focus:ring-0 transition-colors"
                    value={searchLastName}
                    onChange={(e) => setSearchLastName(e.target.value.toUpperCase())}
                    placeholder="Last name"
                    maxLength={30}
                  />
                  <button 
                    className="rounded-xl bg-slate-900 dark:bg-white px-6 py-3 text-sm font-bold text-white dark:text-slate-900 hover:opacity-90 transition-opacity whitespace-nowrap" 
                    type="submit" 
                    disabled={isSearching}
                  >
                    {isSearching ? "Searching..." : "Track Flight"}
                  </button>
                </form>
                {searchError && <div className="mt-3 text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/10 p-2 rounded-lg">{searchError}</div>}
              </article>
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Timeline */}
              <article className="rounded-[24px] border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 p-6 backdrop-blur-md shadow-lg dark:shadow-none transition-colors duration-300">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-5">Operations</h3>
                <div className="space-y-3">
                  {[
                    "Check-in counters active",
                    "Security wait time under 12 min",
                    `Gate ${nextFlight?.gate ?? "--"} boarding window stable`,
                    `Next flight ${nextFlight?.flightNo ?? "--"} ready for guidance`,
                  ].map((item, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 dark:border-white/5 bg-white/80 dark:bg-white/5 p-3 text-sm text-slate-700 dark:text-slate-300 font-medium shadow-sm dark:shadow-none">
                      <span className="text-aeroguide-blue dark:text-aeroguide-gold mr-2">•</span> {item}
                    </div>
                  ))}
                </div>
              </article>

              {/* Booking Access */}
              <article className="rounded-[24px] border border-blue-200 dark:border-aeroguide-gold/20 bg-gradient-to-br from-blue-50 to-white dark:from-white/5 dark:to-aeroguide-blue/10 p-6 backdrop-blur-md shadow-lg dark:shadow-none transition-colors duration-300">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">My Booking Access</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 mb-5">Connect a session to enable global tracking.</p>
                
                {!isSignedIn ? (
                  <button className="w-full rounded-xl bg-aeroguide-gold px-4 py-3 text-sm font-bold text-aeroguide-navy hover:brightness-95 dark:hover:brightness-110 shadow-md shadow-aeroguide-gold/20 transition-all" onClick={() => navigate("/login?next=%2Fdashboard")}>
                    Sign in to Continue
                  </button>
                ) : connectedPassenger ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-blue-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 shadow-sm dark:shadow-none">
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Connected</div>
                      <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">{connectedPassenger.pnr} / {connectedPassenger.lastName}</div>
                    </div>
                    <button className="w-full rounded-xl bg-aeroguide-blue px-4 py-3 text-sm font-bold text-white hover:brightness-110 shadow-md transition-all" onClick={() => navigate("/my-home")}>
                      Open My Homepage
                    </button>
                    <button
                      className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-transparent px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
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
                  <form onSubmit={handleConnectPassenger} className="space-y-3">
                    <input
                      className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-aeroguide-blue dark:focus:border-aeroguide-gold focus:ring-2 focus:ring-aeroguide-blue/10 dark:focus:ring-0 transition-colors"
                      value={pnrInput}
                      onChange={(e) => setPnrInput(e.target.value.toUpperCase())}
                      placeholder="PNR (e.g. AG1234)"
                      maxLength={8}
                    />
                    <input
                      className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-aeroguide-blue dark:focus:border-aeroguide-gold focus:ring-2 focus:ring-aeroguide-blue/10 dark:focus:ring-0 transition-colors"
                      value={lastNameInput}
                      onChange={(e) => setLastNameInput(e.target.value.toUpperCase())}
                      placeholder="Last name"
                      maxLength={30}
                    />
                    {connectError && <div className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/10 p-2 rounded-lg">{connectError}</div>}
                    <button className="w-full rounded-xl bg-aeroguide-gold px-4 py-3 text-sm font-bold text-aeroguide-navy hover:brightness-95 dark:hover:brightness-110 shadow-md shadow-aeroguide-gold/20 transition-all" type="submit" disabled={connectLoading}>
                      {connectLoading ? "Connecting..." : "Connect Passenger Session"}
                    </button>
                  </form>
                )}
              </article>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}