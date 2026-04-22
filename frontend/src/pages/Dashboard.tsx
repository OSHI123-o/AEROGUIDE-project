import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import ThemeModeIcon from "../components/ThemeModeIcon";
import { lookupFlightsByPnr, suggestPassengers, type FlightLookupResult } from "../services/flightLookup";
import { fetchLiveWeather, type WeatherSnapshot } from "../services/weather";
import {
  clearPassengerSession,
  getPassengerSession,
  isValidLastName,
  isValidPnr,
  normalizeLastName,
  normalizePnr,
  savePassengerSession,
} from "../services/passengerSession";
import { isAuthenticated, signOut, syncAuthenticatedState } from "../services/authSession";

type ThemeMode = "light" | "dark";

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
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
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
  
  // Autocomplete States
  const [suggestions, setSuggestions] = useState<{pnr: string; lastName: string}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    localStorage.setItem("aeroguide_theme", themeMode);
    if (themeMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [themeMode]);

  useEffect(() => {
    let active = true;

    const syncAuth = async () => {
      const signedIn = await syncAuthenticatedState();
      if (!active) return;
      setIsSignedIn(signedIn);
    };

    const handleFocus = () => {
      void syncAuth();
    };

    void syncAuth();
    window.addEventListener("focus", handleFocus);

    return () => {
      active = false;
      window.removeEventListener("focus", handleFocus);
    };
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
    const controller = new AbortController();
    let active = true;
    const fetchWeather = async () => {
      setWeatherLoading(true);
      try {
        const data = await fetchLiveWeather(coords, controller.signal);
        if (!active) return;
        setWeather(data);
      } catch {
        if (!active) return;
        setWeather({ temperature: 30, wind: 14, code: 1, source: "open-meteo" });
      } finally {
        if (active) setWeatherLoading(false);
      }
    };
    fetchWeather();
    return () => {
      active = false;
      controller.abort();
    };
  }, [coords.lat, coords.lon]);

  useEffect(() => {
    const query = searchPnr || searchLastName;
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await suggestPassengers(query);
        setSuggestions(res);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchPnr, searchLastName]);

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
  async function executeSearch(pnr: string, lastName: string) {
    setSearchError("");

    const normalizedPnr = normalizePnr(pnr);
    const normalizedLastName = normalizeLastName(lastName);

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
        // Save the passenger session so /journey access works
        savePassengerSession({ pnr: normalizedPnr, lastName: normalizedLastName });
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

  function handlePassengerSearch(e: FormEvent) {
    e.preventDefault();
    executeSearch(searchPnr, searchLastName);
  }

  function handleSelectSuggestion(pnr: string, lastName: string) {
    setSearchPnr(pnr);
    setSearchLastName(lastName);
    setShowSuggestions(false);
    executeSearch(pnr, lastName);
  }

  const passengerState = isSignedIn ? "Returning" : "New User";
  const isDark = themeMode === "dark";

  return (
    <div 
      className={`min-h-screen font-sans selection:bg-aeroguide-gold selection:text-aeroguide-navy relative overflow-hidden flex flex-col lg:flex-row transition-colors duration-300 ${isDark ? "bg-[#091530] text-slate-100" : "bg-slate-50 text-slate-900"}`}
      style={isDark ? {
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px'
      } : {}}
    >
      {/* SIDEBAR */}
      <aside className={`relative z-10 w-full lg:w-72 lg:h-screen lg:sticky top-0 flex flex-col p-6 transition-colors duration-300 ${isDark ? "bg-[#091530]/80 backdrop-blur-xl border-r border-[#1a2e5c]" : "bg-white border-r border-slate-200"}`}>
        <div className="flex items-center gap-3 mb-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-aeroguide-gold shadow-lg shadow-aeroguide-gold/20">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-aeroguide-navy" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </div>
          <div>
            <div className={`text-xl font-black tracking-widest ${isDark ? "text-white" : "text-slate-900"}`}>AEROGUIDE</div>
            <div className={`text-[10px] uppercase tracking-widest ${isDark ? "text-slate-400" : "text-slate-500"}`}>Passenger Nav</div>
          </div>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          {[
            { label: "Overview", path: "/overview" },
            { label: "Flights", path: "/flights" },
            { label: "Map", path: "/map" },
            { label: "Assistant", path: "/guide" },
            { label: "Settings", path: "/settings" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`w-full text-left rounded-xl px-4 py-3 font-semibold text-sm transition-all border ${
                item.label === 'Overview' 
                  ? (isDark ? 'bg-[#1a2e5c] border-[#25407a] text-white' : 'bg-aeroguide-blue/10 border-aeroguide-blue/30 text-aeroguide-blue')
                  : (isDark ? 'border-transparent text-slate-300 hover:bg-[#132242]' : 'border-transparent text-slate-600 hover:bg-slate-100')
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="relative z-10 flex-1 p-4 sm:p-8 lg:p-10 h-full lg:h-screen overflow-y-auto">
        <div className="w-full max-w-6xl mx-auto space-y-6">
          
          {/* HEADER */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-2">
            <div>
              <h1 className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Dashboard</h1>
              <div className={`mt-2 flex items-center gap-2 text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <span className="text-aeroguide-gold font-bold">{BIA_INFO.iata}</span>
                <span>•</span>
                <span>{BIA_INFO.name}</span>
              </div>
              <div className={`mt-1 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {now.toLocaleString([], { weekday: "short", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                className={`p-3 rounded-xl border transition-colors shadow-sm ${isDark ? 'border-[#1a2e5c] bg-[#112143] hover:bg-[#1a2e5c] text-white' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'}`}
                onClick={() => setThemeMode((p) => (p === "light" ? "dark" : "light"))}
                aria-label="Toggle theme"
              >
                <ThemeModeIcon mode={themeMode} />
              </button>
              
              {isSignedIn ? (
                <button
                  className={`px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${isDark ? 'bg-[#112143] hover:bg-[#1a2e5c] text-white border border-[#1a2b4c]' : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'}`}
                  onClick={async () => {
                    await signOut();
                    clearPassengerSession();
                    setIsSignedIn(false);
                    setConnectedPassenger(null);
                    setNextFlight(null);
                    navigate("/dashboard");
                  }}
                >
                  Sign Out
                </button>
              ) : (
                <button 
                  className="rounded-xl bg-aeroguide-gold px-6 py-3 text-sm font-bold text-aeroguide-navy shadow-sm hover:brightness-95 transition-all"
                  onClick={() => navigate("/login?next=%2Fdashboard")}
                >
                  Sign In
                </button>
              )}
            </div>
          </header>

          {/* HERO SECTION */}
          <section className={`relative w-full h-auto sm:h-[280px] rounded-[24px] overflow-hidden shadow-2xl flex items-center transition-all ${isDark ? 'bg-[#112143] border border-[#1a2e5c]' : 'bg-slate-900 border border-slate-800'}`}>
            {/* Background Image */}
            <div className="absolute inset-0">
              <img
                src="https://images.unsplash.com/photo-1540339832862-474599807836?q=80&w=2000&auto=format&fit=crop"
                alt="Airplane cabin"
                className="w-full h-full object-cover opacity-90 dark:opacity-75"
              />
              <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-r from-[#091530] via-[#091530]/80 to-transparent' : 'bg-gradient-to-r from-slate-900 via-slate-900/60 to-transparent'}`}></div>
            </div>

            <div className="relative z-10 w-full px-8 py-8 lg:px-12 flex flex-col lg:flex-row justify-between items-center gap-8">
              {/* Title Left */}
              <div className="w-full lg:w-auto">
                <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                  Smooth Passenger <br/> <span className="text-aeroguide-gold">Experience.</span>
                </h2>
                <p className="mt-2 text-sm text-slate-300">Navigate CMB confidently from check-in to gate.</p>
              </div>

              {/* Stats Right */}
              <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-4">
                <div className={`flex-1 min-w-[130px] rounded-[20px] border p-4 backdrop-blur-md shadow-xl ${isDark ? 'bg-[#15274d]/80 border-[#2b4478] text-white' : 'bg-white/20 border-white/40 text-white'}`}>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#f5b622]">Live Weather</div>
                  <div className="mt-1 text-2xl font-black">{weatherLoading ? "..." : `${weather?.temperature ?? 30}°C`}</div>
                  <div className="text-[11px] text-slate-300">Wind {weather?.wind ?? 14} km/h</div>
                </div>

                <div className={`flex-1 min-w-[130px] rounded-[20px] border p-4 backdrop-blur-md shadow-xl ${isDark ? 'bg-[#15274d]/80 border-[#2b4478] text-white' : 'bg-white/20 border-white/40 text-white'}`}>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#f5b622]">Gate Nav</div>
                  <div className="mt-1 text-2xl font-black">{flightLoading ? "..." : nextFlight?.gate ?? "--"}</div>
                  <button onClick={() => navigate(`/map?gate=${encodeURIComponent(nextFlight?.gate ?? "A12")}`)} className="mt-1 text-[11px] font-bold text-blue-300 hover:text-white transition-colors">Open Map →</button>
                </div>

                <div className={`flex-1 min-w-[130px] rounded-[20px] border p-4 backdrop-blur-md shadow-xl ${isDark ? 'bg-[#15274d]/80 border-[#2b4478] text-white' : 'bg-white/20 border-white/40 text-white'}`}>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#f5b622]">Status</div>
                  <div className="mt-1 text-2xl font-black">{passengerState}</div>
                  <div className="text-[11px] text-slate-300">{isSignedIn ? "Signed in" : "Please sign in"}</div>
                </div>
              </div>
            </div>
          </section>

          {/* MAIN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* LEFT COLUMN */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Quick Actions */}
              <article className={`rounded-[24px] border p-6 shadow-sm transition-colors duration-300 ${isDark ? 'bg-[#112143] border-[#1a2e5c]' : 'bg-white border-slate-200'}`}>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button onClick={() => navigate("/flights")} className={`rounded-xl px-4 py-3 text-sm font-bold shadow-sm transition-all ${isDark ? 'bg-[#294c9f] text-white hover:brightness-110' : 'bg-aeroguide-blue text-white hover:brightness-110'}`}>
                    View Flights
                  </button>
                  <button onClick={() => navigate("/my-home")} className={`rounded-xl px-4 py-3 text-sm font-bold shadow-sm transition-colors ${isDark ? 'bg-[#182c5a] text-white hover:bg-[#1f376f]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                    Open My Homepage
                  </button>
                  <button onClick={() => navigate("/guide")} className={`rounded-xl px-4 py-3 text-sm font-bold shadow-sm transition-colors ${isDark ? 'bg-[#182c5a] text-white hover:bg-[#1f376f]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                    Start Assistant
                  </button>
                  <button onClick={() => navigate(nextFlight?.gate ? `/map?gate=${encodeURIComponent(nextFlight.gate)}` : "/journey")} className={`rounded-xl px-4 py-3 text-sm font-bold shadow-sm transition-all ${isDark ? 'bg-[#f5b622] text-[#0a1530] hover:brightness-95' : 'bg-aeroguide-gold text-aeroguide-navy hover:brightness-95'}`}>
                    {nextFlight?.gate ? `Find Gate ${nextFlight.gate}` : "Open Journey Page"}
                  </button>
                </div>
              </article>

              {/* Passenger Details Lookup */}
              <article className={`rounded-[24px] border p-6 shadow-sm overflow-hidden relative transition-colors duration-300 ${isDark ? 'bg-[#112143] border-[#1a2e5c]' : 'bg-white border-slate-200'}`}>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Track Passenger Details</h3>
                <p className={`text-xs mb-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Search any valid PNR to view your digital boarding pass and live navigation.</p>
                
                <div className="relative">
                  <form onSubmit={handlePassengerSearch} className="flex flex-col sm:flex-row gap-3">
                    <input
                      className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium outline-none transition-colors ${isDark ? 'bg-[#0f1d3a] border-[#1a2e5c] text-white placeholder-slate-500 focus:border-[#294c9f]' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-aeroguide-blue'}`}
                      value={searchPnr}
                      onChange={(e) => setSearchPnr(e.target.value.toUpperCase())}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      placeholder="PNR (e.g. AG1234)"
                      maxLength={8}
                    />
                    <input
                      className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium outline-none transition-colors ${isDark ? 'bg-[#0f1d3a] border-[#1a2e5c] text-white placeholder-slate-500 focus:border-[#294c9f]' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-aeroguide-blue'}`}
                      value={searchLastName}
                      onChange={(e) => setSearchLastName(e.target.value.toUpperCase())}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      placeholder="Last name"
                      maxLength={30}
                    />
                    <button 
                      className={`rounded-xl px-6 py-3 text-sm font-bold transition-opacity whitespace-nowrap shadow-sm ${isDark ? 'bg-white text-slate-900 hover:opacity-90' : 'bg-slate-900 text-white hover:opacity-90'}`} 
                      type="submit" 
                      disabled={isSearching}
                    >
                      {isSearching ? "Searching..." : "Track Flight"}
                    </button>
                  </form>
                  {showSuggestions && suggestions.length > 0 && (
                    <div className={`absolute top-[100%] mt-2 w-full left-0 rounded-[20px] border shadow-xl overflow-hidden z-20 ${isDark ? 'bg-[#182c5a] border-[#1a2e5c]' : 'bg-white border-slate-200'}`}>
                      {suggestions.map((s) => (
                        <button
                          key={`${s.pnr}-${s.lastName}`}
                          className={`w-full text-left px-4 py-3 text-sm font-medium flex justify-between items-center transition-colors border-b last:border-0 ${isDark ? 'hover:bg-[#1f376f] border-[#25407a] text-white' : 'hover:bg-slate-50 border-slate-100 text-slate-900'}`}
                          onClick={() => handleSelectSuggestion(s.pnr, s.lastName)}
                          type="button"
                        >
                          <span className="font-bold">{s.pnr}</span>
                          <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{s.lastName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {searchError && <div className="mt-3 text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/10 p-2 rounded-lg">{searchError}</div>}
              </article>
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Operations */}
              <article className={`rounded-[24px] border p-6 shadow-sm transition-colors duration-300 ${isDark ? 'bg-[#112143] border-[#1a2e5c]' : 'bg-white border-slate-200'}`}>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Operations</h3>
                <div className="space-y-2">
                  {[
                    "Check-in counters active",
                    "Security wait time under 12 min",
                    `Gate ${nextFlight?.gate ?? "--"} boarding window stable`,
                    `Next flight ${nextFlight?.flightNo ?? "--"} ready for guidance`,
                  ].map((item, i) => (
                    <div key={i} className={`rounded-xl border p-3 text-xs font-medium flex items-center ${isDark ? 'bg-[#182c5a]/50 border-[#1f376f] text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                      <span className="text-[#f5b622] mr-3 text-lg leading-none">•</span> {item}
                    </div>
                  ))}
                </div>
              </article>

              {/* Booking Access */}
              <article className={`rounded-[24px] border p-6 shadow-sm transition-colors duration-300 ${isDark ? 'bg-[#112143] border-[#1a2e5c]' : 'bg-white border-slate-200'}`}>
                <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>My Booking Access</h3>
                <p className={`text-xs mb-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Connect a session to enable global tracking.</p>
                
                {!isSignedIn ? (
                  <button className={`w-full rounded-xl px-4 py-3 text-sm font-bold transition-all shadow-sm ${isDark ? 'bg-[#f5b622] text-[#0a1530] hover:brightness-95' : 'bg-aeroguide-gold text-aeroguide-navy hover:brightness-95'}`} onClick={() => navigate("/login?next=%2Fdashboard")}>
                    Sign in to Continue
                  </button>
                ) : connectedPassenger ? (
                  <div className="space-y-3">
                    <div className={`rounded-xl border p-4 shadow-sm ${isDark ? 'bg-[#182c5a] border-[#1a2e5c]' : 'bg-white border-slate-200'}`}>
                      <div className={`text-[10px] uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Connected</div>
                      <div className={`mt-1 text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{connectedPassenger.pnr} / {connectedPassenger.lastName}</div>
                    </div>
                    <button className={`w-full rounded-xl px-4 py-3 text-sm font-bold shadow-sm transition-all ${isDark ? 'bg-[#294c9f] text-white hover:brightness-110' : 'bg-aeroguide-blue text-white hover:brightness-110'}`} onClick={() => navigate("/my-home")}>
                      Open My Homepage
                    </button>
                    <button
                      className={`w-full rounded-xl border px-4 py-3 text-sm font-bold transition-colors ${isDark ? 'border-[#1a2e5c] bg-transparent text-slate-300 hover:bg-[#132242]' : 'border-slate-300 bg-transparent text-slate-600 hover:bg-slate-50'}`}
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
                      className={`w-full rounded-xl border px-4 py-3 text-sm font-medium outline-none transition-colors ${isDark ? 'bg-[#0f1d3a] border-[#1a2e5c] text-white placeholder-slate-500 focus:border-[#294c9f]' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-aeroguide-blue'}`}
                      value={pnrInput}
                      onChange={(e) => setPnrInput(e.target.value.toUpperCase())}
                      placeholder="PNR (e.g. AG1234)"
                      maxLength={8}
                    />
                    <input
                      className={`w-full rounded-xl border px-4 py-3 text-sm font-medium outline-none transition-colors ${isDark ? 'bg-[#0f1d3a] border-[#1a2e5c] text-white placeholder-slate-500 focus:border-[#294c9f]' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-aeroguide-blue'}`}
                      value={lastNameInput}
                      onChange={(e) => setLastNameInput(e.target.value.toUpperCase())}
                      placeholder="Last name"
                      maxLength={30}
                    />
                    {connectError && <div className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/10 p-2 rounded-lg">{connectError}</div>}
                    <button className={`w-full rounded-xl px-4 py-3 text-sm font-bold shadow-sm transition-all ${isDark ? 'bg-[#f5b622] text-[#0a1530] hover:brightness-95' : 'bg-aeroguide-gold text-aeroguide-navy hover:brightness-95'}`} type="submit" disabled={connectLoading}>
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
