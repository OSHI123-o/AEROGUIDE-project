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

// Significantly upgraded realistic fallback data for CMB
const REALISTIC_FALLBACK_FLIGHTS = [
  { id: "UL225", callsign: "UL225", operator: "SriLankan Airlines", status: "Approaching", speedKmh: 420, altitudeM: 1200, heading: "185°", routeHint: "DXB -> CMB", isLive: false },
  { id: "EK648", callsign: "EK648", operator: "Emirates", status: "Airborne", speedKmh: 850, altitudeM: 10500, heading: "110°", routeHint: "DXB -> CMB", isLive: false },
  { id: "QR664", callsign: "QR664", operator: "Qatar Airways", status: "On Ground", speedKmh: 0, altitudeM: 9, heading: "-", routeHint: "DOH -> CMB", isLive: false },
  { id: "SQ468", callsign: "SQ468", operator: "Singapore Airlines", status: "Departing", speedKmh: 310, altitudeM: 850, heading: "270°", routeHint: "CMB -> SIN", isLive: false },
  { id: "UL303", callsign: "UL303", operator: "SriLankan Airlines", status: "Airborne", speedKmh: 780, altitudeM: 9200, heading: "295°", routeHint: "SIN -> CMB", isLive: false },
  { id: "FZ555", callsign: "FZ555", operator: "flydubai", status: "On Ground", speedKmh: 0, altitudeM: 9, heading: "-", routeHint: "DXB -> CMB", isLive: false },
];

function toKmh(ms: number | unknown) {
  if (typeof ms !== "number") return 0;
  return Math.round(ms * 3.6);
}

function toMeters(v: number | unknown) {
  if (typeof v !== "number") return 0;
  return Math.max(0, Math.round(v));
}

function toHeading(track: number | unknown) {
  if (typeof track !== "number") return "-";
  return `${Math.round(track)}°`;
}

function toStatus(onGround: boolean, altitudeM: number) {
  if (onGround) return "On Ground";
  if (altitudeM > 0 && altitudeM < 3000) return "Approaching / Departing";
  return "Airborne";
}

function normalizeCallsign(value: string | unknown) {
  const raw = (typeof value === "string" ? value : "").trim();
  return raw || "UNKNOWN";
}

export default function FlightsPage() {
  const navigate = useNavigate();
  const [themeMode, setThemeMode] = useState(() => (localStorage.getItem("aeroguide_theme") === "dark" ? "dark" : "light"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [flights, setFlights] = useState<typeof REALISTIC_FALLBACK_FLIGHTS>([]);
  const [isUsingLive, setIsUsingLive] = useState(false);

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

    async function fetchLiveFlights() {
      setLoading(true);
      setError("");

      try {
        const url = `https://opensky-network.org/api/states/all?lamin=${CMB_BBOX.lamin}&lamax=${CMB_BBOX.lamax}&lomin=${CMB_BBOX.lomin}&lomax=${CMB_BBOX.lomax}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Live source unavailable");
        const data = await res.json();
        if (cancelled) return;

        const mapped = (data?.states || []).map((s: any[], idx: number) => {
          const callsign = normalizeCallsign(s[1]);
          const operator = s[2] || "Unknown";
          const onGround = Boolean(s[8]);
          const speedKmh = toKmh(s[9]);
          const altitudeM = toMeters(s[7]);
          const heading = toHeading(s[10]);

          return {
            id: `${callsign}-${idx}`,
            callsign,
            operator,
            status: toStatus(onGround, altitudeM),
            speedKmh,
            altitudeM,
            heading,
            routeHint: "Live Radar Data",
            isLive: true,
          };
        });

        if (!mapped.length) {
          setError("No live aircraft detected in CMB airspace. Showing simulated data.");
          setFlights(REALISTIC_FALLBACK_FLIGHTS);
          setIsUsingLive(false);
        } else {
          setFlights(mapped);
          setIsUsingLive(true);
        }
        setLastUpdated(Date.now());
      } catch {
        if (cancelled) return;
        setError("Live radar feed temporarily unavailable. Showing simulated data.");
        setFlights(REALISTIC_FALLBACK_FLIGHTS);
        setIsUsingLive(false);
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

  // Helper to determine status color
  const getStatusColor = (status: string) => {
    if (status === "On Ground") return "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300 border-slate-300 dark:border-white/20";
    if (status.includes("Approaching") || status.includes("Departing")) return "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 border-orange-200 dark:border-orange-500/30";
    return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 border-green-200 dark:border-green-500/30";
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-aeroguide-navy text-slate-900 dark:text-white font-sans selection:bg-aeroguide-gold selection:text-aeroguide-navy relative overflow-x-hidden transition-colors duration-300">
      
      {/* Abstract Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 fixed">
        <div className="absolute -top-[10%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-aeroguide-blue opacity-10 dark:opacity-20 blur-[120px]"></div>
        <div className="absolute top-[40%] -left-[10%] w-[40vw] h-[40vw] rounded-full bg-aeroguide-gold opacity-10 dark:opacity-10 blur-[100px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10 p-4 sm:p-8 lg:p-10 space-y-6">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-[24px] border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 p-6 backdrop-blur-md shadow-xl transition-colors duration-300">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Live Flights</h1>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 px-3 py-1 shadow-sm">
                <div className={`h-2.5 w-2.5 rounded-full ${isUsingLive ? 'bg-green-500 animate-pulse' : 'bg-aeroguide-gold'}`}></div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  {isUsingLive ? 'Live Radar' : 'Simulated'}
                </span>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className="text-aeroguide-blue dark:text-aeroguide-gold font-bold">Bandaranaike (CMB) Airspace</span>
              <span className="hidden sm:inline">•</span>
              <span>Last update: {new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
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
            <button 
              className="rounded-xl bg-aeroguide-gold px-6 py-3 text-sm font-bold text-aeroguide-navy shadow-[0_4px_14px_rgba(253,185,19,0.3)] hover:brightness-95 dark:hover:brightness-110 transition-all"
              onClick={() => navigate("/dashboard")}
            >
              Dashboard
            </button>
          </div>
        </header>

        {/* SEARCH & MAP BAR */}
        <section className="flex flex-col sm:flex-row gap-4 rounded-[24px] border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 p-4 backdrop-blur-md shadow-lg transition-colors duration-300">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by callsign, airline, or status..."
              className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 pl-12 pr-4 py-3.5 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-aeroguide-blue dark:focus:border-aeroguide-gold focus:ring-2 focus:ring-aeroguide-blue/10 dark:focus:ring-0 transition-colors shadow-sm dark:shadow-none"
            />
          </div>
          <button
            onClick={() => navigate("/map")}
            className="flex items-center justify-center gap-2 rounded-xl bg-aeroguide-blue px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-aeroguide-blue/20 hover:brightness-110 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Open Radar Map
          </button>
        </section>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="rounded-xl border border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/10 px-6 py-4 text-sm font-bold text-orange-700 dark:text-orange-400 backdrop-blur-md shadow-sm">
            {error}
          </div>
        )}

        {/* FLIGHTS GRID */}
        <section className="space-y-4">
          {loading ? (
            <div className="rounded-[24px] border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 p-12 text-center backdrop-blur-md shadow-lg">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-aeroguide-blue dark:border-aeroguide-gold border-r-transparent"></div>
              <p className="mt-4 font-bold text-slate-600 dark:text-slate-300">Scanning CMB Airspace...</p>
            </div>
          ) : filteredFlights.length === 0 ? (
            <div className="rounded-[24px] border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 p-12 text-center backdrop-blur-md shadow-lg">
              <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-4 font-bold text-slate-600 dark:text-slate-300">No flights matched your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredFlights.map((flight) => (
                <article
                  key={flight.id}
                  className="group rounded-[20px] border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 p-5 backdrop-blur-md shadow-sm hover:shadow-xl dark:hover:bg-white/10 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  
                  {/* Airline & Callsign */}
                  <div className="flex items-center gap-4 md:w-1/4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-aeroguide-blue/10 dark:bg-aeroguide-gold/10 text-aeroguide-blue dark:text-aeroguide-gold">
                      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21,16V14L13,9V3.5A1.5,1.5 0 0,0 11.5,2A1.5,1.5 0 0,0 10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xl font-black text-slate-900 dark:text-white tracking-wide">{flight.callsign}</div>
                      <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">{flight.operator}</div>
                    </div>
                  </div>

                  {/* Status Pill */}
                  <div className="md:w-1/6">
                    <span className={`inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${getStatusColor(flight.status)}`}>
                      {flight.status}
                    </span>
                  </div>

                  {/* Telemetry Grid */}
                  <div className="grid grid-cols-3 gap-4 md:w-5/12">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Speed</div>
                      <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{flight.speedKmh} <span className="text-xs font-normal text-slate-500">km/h</span></div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Altitude</div>
                      <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{flight.altitudeM} <span className="text-xs font-normal text-slate-500">m</span></div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Heading</div>
                      <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{flight.heading}</div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="md:w-1/6 flex justify-end">
                    <button
                      onClick={() => navigate("/map")}
                      className="w-full md:w-auto rounded-xl border border-slate-300 dark:border-white/20 bg-transparent px-6 py-2.5 text-sm font-bold text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    >
                      Track
                    </button>
                  </div>

                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}