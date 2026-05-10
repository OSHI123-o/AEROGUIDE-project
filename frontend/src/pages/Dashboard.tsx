import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import ThemeModeIcon from "../components/ThemeModeIcon";
import GlobeComponent from "../components/GlobeComponent";
import FlightTicker from "../components/FlightTicker";
import JourneyTimeline from "../components/JourneyTimeline";
import TerminalSlider from "../components/TerminalSlider";
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
  const [userProfile, setUserProfile] = useState<{ firstName: string; lastName: string } | null>(() => {
    const saved = localStorage.getItem('aeroguide_user_profile');
    return saved ? JSON.parse(saved) : null;
  });
  
  // Dashboard Session Connection States
  // (Removed unused connection states)

  // Interactive Passenger Details Search States
  const [searchPnr, setSearchPnr] = useState("");
  const [searchLastName, setSearchLastName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  
  // Autocomplete States
  const [suggestions, setSuggestions] = useState<{pnr: string; lastName: string}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [checklistItems, setChecklistItems] = useState([
    { id: 1, text: "Passport & Visa", checked: true },
    { id: 2, text: "Digital Boarding Pass", checked: false },
    { id: 3, text: "Power Bank & Charger", checked: false },
    { id: 4, text: "Currency / Travel Cards", checked: false },
  ]);

  const toggleChecklistItem = (id: number) => {
    setChecklistItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

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

  const handleProtectedNavigation = (path: string) => {
    if (!isSignedIn) {
      navigate(`/login?next=${encodeURIComponent(path)}`);
      return;
    }
    if (!connectedPassenger) {
      const pnrInput = document.getElementById("connect-pnr-input");
      if (pnrInput) {
        pnrInput.focus();
      }
      alert("Please connect a passenger session first to access this page.");
      return;
    }
    navigate(path);
  };

  const passengerState = isSignedIn ? "Returning" : "New User";
  const isDark = themeMode === "dark";

  return (
    <div 
      className={`min-h-screen font-sans selection:bg-aeroguide-gold selection:text-aeroguide-navy relative overflow-hidden flex flex-col lg:flex-row transition-colors duration-300 ${isDark ? "bg-gradient-to-br from-[#0B1021] via-[#1B2845] to-[#5A77A2] text-slate-100" : "bg-gradient-to-r from-[#2C6CBC] via-[#71C3F7] to-[#F5F5F5] text-slate-900"}`}
    >
      {/* Dynamic Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Animated Blobs */}
        <div className={`absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-blob ${isDark ? 'bg-aeroguide-blue/40' : 'bg-blue-300/50'}`}></div>
        <div className={`absolute top-[20%] right-[-10%] w-[600px] h-[600px] rounded-full mix-blend-multiply filter blur-[120px] opacity-60 animate-blob [animation-delay:2s] ${isDark ? 'bg-[#5A77A2]/40' : 'bg-aeroguide-pale/60'}`}></div>
        <div className={`absolute bottom-[-20%] left-[20%] w-[550px] h-[550px] rounded-full mix-blend-multiply filter blur-[110px] opacity-60 animate-blob [animation-delay:4s] ${isDark ? 'bg-[#1B2845]/50' : 'bg-indigo-300/40'}`}></div>

        {/* Universal Grid Pattern Overlay */}
        <div 
          className={`absolute inset-0 ${isDark ? 'opacity-100' : 'opacity-60'}`}
          style={{
            backgroundImage: `
              linear-gradient(${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'} 1px, transparent 1px),
              linear-gradient(90deg, ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'} 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px'
          }}
        />
      </div>
      {/* SIDEBAR */}
      <aside className={`relative z-10 w-full lg:w-72 lg:h-screen lg:sticky top-0 flex flex-col p-6 transition-colors duration-300 ${isDark ? "bg-black/20 backdrop-blur-xl border-r border-white/10" : "bg-white/20 backdrop-blur-xl border-r border-white/30"}`}>
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
                  ? (isDark ? 'bg-white/15 border-white/30 text-white' : 'bg-white/40 border-white/50 text-slate-900 shadow-sm')
                  : (isDark ? 'border-transparent text-slate-200 hover:bg-white/10' : 'border-transparent text-slate-800 hover:bg-white/30')
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
            <div className="flex items-center gap-5">
              {/* AI Avatar / User Profile Image */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-aeroguide-blue to-aeroguide-gold rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className={`relative w-16 h-16 rounded-full overflow-hidden border-2 ${isDark ? 'border-white/10' : 'border-white'} shadow-2xl`}>
                  <img 
                    src={userProfile ? `https://ui-avatars.com/api/?name=${userProfile.firstName}+${userProfile.lastName}&background=2C6CBC&color=fff&bold=true` : "https://cdn-icons-png.flaticon.com/512/4712/4712035.png"} 
                    alt="AI Assistant"
                    className="w-full h-full object-cover"
                  />
                  {/* Status Indicator */}
                  <div className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {userProfile ? `Ayubowan, ${userProfile.firstName}!` : 'Ayubowan!'}
                  </h1>
                  <span className="animate-bounce text-2xl">👋</span>
                </div>
                <div className={`mt-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${isDark ? 'text-aeroguide-blue' : 'text-[#2C6CBC]'}`}>
                  <span>{BIA_INFO.iata} Terminal 1</span>
                  <span className="opacity-30">•</span>
                  <span>Smart Assistant Active</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                className={`p-3 rounded-xl border transition-colors shadow-sm ${isDark ? 'border-white/10 bg-black/20 hover:bg-white/10 text-white' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'}`}
                onClick={() => setThemeMode((p) => (p === "light" ? "dark" : "light"))}
                aria-label="Toggle theme"
              >
                <ThemeModeIcon mode={themeMode} />
              </button>
              
              {isSignedIn ? (
                <button
                  className={`px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${isDark ? 'bg-gradient-to-r from-[#1B2845] to-[#5A77A2] hover:brightness-110 text-white border border-white/10' : 'bg-gradient-to-r from-[#2C6CBC] via-[#71C3F7] to-[#F5F5F5] text-slate-900 hover:brightness-95'}`}
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
                  className={`rounded-xl px-6 py-3 text-sm font-bold shadow-sm transition-all ${isDark ? 'bg-gradient-to-r from-[#1B2845] to-[#5A77A2] text-white hover:brightness-110' : 'bg-gradient-to-r from-[#2C6CBC] via-[#71C3F7] to-[#F5F5F5] text-slate-900 hover:brightness-95'}`}
                  onClick={() => navigate("/login?next=%2Fdashboard")}
                >
                  Sign In
                </button>
              )}
            </div>
          </header>

          {/* FLIGHT STATUS TICKER */}
          <FlightTicker isDark={isDark} />

          {/* HERO SECTION */}
          <section className={`relative w-full h-auto sm:h-[280px] rounded-[24px] overflow-hidden shadow-2xl flex items-center transition-all ${isDark ? 'bg-[#0B1021] backdrop-blur-md border border-white/10' : 'bg-[#0f172a] border border-slate-800'}`}>
            {/* Interactive 3D Globe Background */}
            <div className="absolute inset-y-0 right-0 w-[800px] h-full flex items-center justify-center opacity-80 mix-blend-screen pointer-events-auto" style={{ transform: 'translate(25%, 0)' }}>
               <div className="w-[800px] h-[800px] flex items-center justify-center scale-150 sm:scale-100">
                 <GlobeComponent />
               </div>
            </div>
            
            {/* Gradient Overlay to ensure text readability */}
            <div className={`absolute inset-0 pointer-events-none ${isDark ? 'bg-gradient-to-r from-[#0B1021] via-[#0B1021]/90 to-transparent' : 'bg-gradient-to-r from-[#0f172a] via-[#0f172a]/90 to-transparent'}`}></div>

            <div className="relative z-10 w-full px-8 py-8 lg:px-12 flex flex-col lg:flex-row justify-between items-center gap-8">
              {/* Title Left */}
              <div className="w-full lg:w-auto">
                <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                  Smooth Passenger <br/> <span className="text-aeroguide-gold">Experience.</span>
                </h2>
                <p className="mt-2 text-sm text-slate-300">Navigate CMB confidently from check-in to gate.</p>
              </div>

              {/* Stats Right */}
              <div className="w-full lg:w-auto flex flex-wrap sm:flex-nowrap gap-3">
                {/* Weather Card */}
                <div className={`group flex-1 min-w-[120px] rounded-[24px] border p-4 backdrop-blur-xl shadow-2xl transition-all duration-500 hover:scale-105 hover:bg-white/10 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white/10 border-white/20 text-white'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">☀️</span>
                    <div className="text-[10px] font-black uppercase tracking-widest text-aeroguide-blue group-hover:text-white transition-colors">Weather</div>
                  </div>
                  <div className="text-3xl font-black">{weatherLoading ? "..." : `${weather?.temperature ?? 30}°`}</div>
                  <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">CMB · {weather?.wind ?? 14}km/h</div>
                </div>

                {/* Time Card */}
                <div className={`group flex-1 min-w-[120px] rounded-[24px] border p-4 backdrop-blur-xl shadow-2xl transition-all duration-500 hover:scale-105 hover:bg-white/10 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white/10 border-white/20 text-white'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🕒</span>
                    <div className="text-[10px] font-black uppercase tracking-widest text-aeroguide-blue group-hover:text-white transition-colors">Local Time</div>
                  </div>
                  <div className="text-3xl font-black">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{now.toLocaleDateString([], { weekday: 'short', day: 'numeric' })}</div>
                </div>

                {/* Gate Card (Visible if flight connected) */}
                {nextFlight && (
                  <div className={`group flex-1 min-w-[120px] rounded-[24px] border p-4 backdrop-blur-xl shadow-2xl transition-all duration-500 hover:scale-105 hover:bg-white/10 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white/10 border-white/20 text-white'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">✈️</span>
                      <div className="text-[10px] font-black uppercase tracking-widest text-aeroguide-blue group-hover:text-white transition-colors">My Gate</div>
                    </div>
                    <div className="text-3xl font-black">{nextFlight.gate}</div>
                    <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">TERMINAL {nextFlight.terminal}</div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* MAIN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* LEFT COLUMN */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Quick Actions */}
              <article className={`rounded-[24px] border p-6 shadow-sm transition-colors duration-300 ${isDark ? 'bg-black/20 backdrop-blur-xl border-white/10' : 'bg-white border-slate-200'}`}>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button onClick={() => navigate("/flights")} className={`rounded-xl px-4 py-3 text-sm font-bold shadow-sm transition-all ${isDark ? 'bg-gradient-to-r from-[#1B2845] to-[#5A77A2] text-white hover:brightness-110' : 'bg-gradient-to-r from-[#2C6CBC] via-[#71C3F7] to-[#F5F5F5] text-slate-900 hover:brightness-95'}`}>
                    View Flights
                  </button>
                  <button onClick={() => handleProtectedNavigation("/my-home")} className={`rounded-xl px-4 py-3 text-sm font-bold shadow-sm transition-all ${isDark ? 'bg-gradient-to-r from-[#1B2845] to-[#5A77A2] text-white hover:brightness-110' : 'bg-gradient-to-r from-[#2C6CBC] via-[#71C3F7] to-[#F5F5F5] text-slate-900 hover:brightness-95'}`}>
                    Open My Homepage
                  </button>
                  <button onClick={() => navigate("/guide")} className={`rounded-xl px-4 py-3 text-sm font-bold shadow-sm transition-all ${isDark ? 'bg-gradient-to-r from-[#1B2845] to-[#5A77A2] text-white hover:brightness-110' : 'bg-gradient-to-r from-[#2C6CBC] via-[#71C3F7] to-[#F5F5F5] text-slate-900 hover:brightness-95'}`}>
                    Start Assistant
                  </button>
                  <button onClick={() => nextFlight?.gate ? navigate(`/map?gate=${encodeURIComponent(nextFlight.gate)}`) : handleProtectedNavigation("/journey")} className={`rounded-xl px-4 py-3 text-sm font-bold shadow-sm transition-all ${isDark ? 'bg-gradient-to-r from-[#1B2845] to-[#5A77A2] text-white hover:brightness-110' : 'bg-gradient-to-r from-[#2C6CBC] via-[#71C3F7] to-[#F5F5F5] text-slate-900 hover:brightness-95'}`}>
                    {nextFlight?.gate ? `Find Gate ${nextFlight.gate}` : "Open Journey Page"}
                  </button>
                </div>
              </article>

              {/* BIA Map Preview Card */}
              <article className={`group relative rounded-[24px] border overflow-hidden shadow-sm transition-all duration-500 cursor-pointer ${isDark ? 'bg-black/20 border-white/10 hover:border-white/30' : 'bg-white border-slate-200 hover:border-aeroguide-blue'}`} onClick={() => navigate("/map")}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 opacity-60 group-hover:opacity-40 transition-opacity"></div>
                <img 
                  src="https://www.airport.lk/Assets/images/map/arrival_map.jpg" 
                  alt="Airport Map Preview" 
                  className="w-full h-48 object-cover transition-all duration-700 group-hover:scale-110 opacity-90 brightness-110 contrast-125 saturate-150"
                />
                <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black text-white tracking-tight uppercase">Interactive Terminal Map</h3>
                      <p className="text-slate-300 text-xs font-bold mt-1 uppercase tracking-widest">Explore Gates, Duty-Free & Lounges</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-aeroguide-blue flex items-center justify-center shadow-lg group-hover:translate-x-2 transition-transform">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </article>

              {/* Passenger Details Lookup */}
              <article className={`rounded-[24px] border p-6 shadow-sm overflow-hidden relative transition-colors duration-300 ${isDark ? 'bg-black/20 backdrop-blur-xl border-white/10' : 'bg-white border-slate-200'}`}>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Track Passenger Details</h3>
                <p className={`text-xs mb-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Search any valid PNR to view your digital boarding pass and live navigation.</p>
                
                <div className="relative">
                  <form onSubmit={handlePassengerSearch} className="flex flex-col sm:flex-row gap-3">
                    <input
                      className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium outline-none transition-colors ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-slate-400 focus:border-[#589efc]' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-aeroguide-blue'}`}
                      value={searchPnr}
                      onChange={(e) => setSearchPnr(e.target.value.toUpperCase())}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      placeholder="PNR (e.g. AG1234)"
                      maxLength={8}
                    />
                    <input
                      className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium outline-none transition-colors ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-slate-400 focus:border-[#589efc]' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-aeroguide-blue'}`}
                      value={searchLastName}
                      onChange={(e) => setSearchLastName(e.target.value.toUpperCase())}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      placeholder="Last name"
                      maxLength={30}
                    />
                    <button 
                      className={`rounded-xl px-6 py-3 text-sm font-bold transition-all whitespace-nowrap shadow-sm ${isDark ? 'bg-gradient-to-r from-[#1B2845] to-[#5A77A2] text-white hover:brightness-110' : 'bg-gradient-to-r from-[#2C6CBC] via-[#71C3F7] to-[#F5F5F5] text-slate-900 hover:brightness-95'}`} 
                      type="submit" 
                      disabled={isSearching}
                    >
                      {isSearching ? "Searching..." : "Track Details"}
                    </button>
                  </form>
                  {showSuggestions && suggestions.length > 0 && (
                    <div className={`absolute top-[100%] mt-2 w-full left-0 rounded-[20px] border shadow-xl overflow-hidden z-20 ${isDark ? 'bg-black/40 backdrop-blur-md border-white/10' : 'bg-white border-slate-200'}`}>
                      {suggestions.map((s) => (
                        <button
                          key={`${s.pnr}-${s.lastName}`}
                          className={`w-full text-left px-4 py-3 text-sm font-medium flex justify-between items-center transition-colors border-b last:border-0 ${isDark ? 'hover:bg-white/10 border-white/10 text-white' : 'hover:bg-slate-50 border-slate-100 text-slate-900'}`}
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
              <article className={`rounded-[24px] border p-6 shadow-sm transition-colors duration-300 ${isDark ? 'bg-black/20 backdrop-blur-xl border-white/10' : 'bg-white border-slate-200'}`}>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Operations</h3>
                <div className="space-y-2">
                  {[
                    "Check-in counters active",
                    "Security wait time under 12 min",
                    `Gate ${nextFlight?.gate ?? "--"} boarding window stable`,
                    `Next flight ${nextFlight?.flightNo ?? "--"} ready for guidance`,
                  ].map((item, i) => (
                    <div key={i} className={`rounded-xl border p-3 text-xs font-medium flex items-center ${isDark ? 'bg-black/20 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                      <span className="text-[#589efc] mr-3 text-lg leading-none">•</span> {item}
                    </div>
                  ))}
                </div>
              </article>

              {/* Smart Travel Checklist */}
              <article className={`rounded-[24px] border p-6 shadow-sm transition-colors duration-300 ${isDark ? 'bg-black/20 backdrop-blur-xl border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Travel Checklist</h3>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${isDark ? 'bg-aeroguide-blue/20 text-aeroguide-blue' : 'bg-aeroguide-blue text-white'}`}>
                    {checklistItems.filter(i => i.checked).length}/{checklistItems.length} Done
                  </span>
                </div>
                <div className="space-y-3">
                  {checklistItems.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => toggleChecklistItem(item.id)}
                      className={`group flex items-center p-3 rounded-xl border cursor-pointer transition-all ${
                        item.checked 
                          ? (isDark ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200') 
                          : (isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50 border-slate-100 hover:bg-slate-100')
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        item.checked 
                          ? 'bg-green-500 border-green-500 text-white' 
                          : (isDark ? 'border-white/20' : 'border-slate-300')
                      }`}>
                        {item.checked && (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={`ml-3 text-sm font-semibold transition-all ${
                        item.checked 
                          ? (isDark ? 'text-slate-400 line-through' : 'text-slate-400 line-through') 
                          : (isDark ? 'text-slate-200' : 'text-slate-700')
                      }`}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
                <p className={`mt-4 text-[10px] font-bold text-center uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Don't forget your travel essentials!
                </p>
              </article>

          
            </div>

          </div>

          {/* BIA TERMINAL HIGHLIGHTS SLIDER */}
          <TerminalSlider isDark={isDark} />

          {/* PASSENGER JOURNEY ANIMATION */}
          <JourneyTimeline isDark={isDark} />
        </div>
      </main>
    </div>
  );
}
