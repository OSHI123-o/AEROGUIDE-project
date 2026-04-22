import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeModeIcon from "../components/ThemeModeIcon";

const CMB_BBOX = {
  lamin: 6.95,
  lamax: 7.45,
  lomin: 79.72,
  lomax: 80.1,
};

const REALISTIC_FALLBACK_FLIGHTS = [
  { id: "UL225", callsign: "UL225", operator: "SriLankan Airlines", status: "Approaching", speedKmh: 420, altitudeM: 1200, heading: "185°", routeHint: "DXB -> CMB", isLive: false },
  { id: "EK648", callsign: "EK648", operator: "Emirates", status: "Airborne", speedKmh: 850, altitudeM: 10500, heading: "110°", routeHint: "DXB -> CMB", isLive: false },
  { id: "QR664", callsign: "QR664", operator: "Qatar Airways", status: "On Ground", speedKmh: 0, altitudeM: 9, heading: "-", routeHint: "DOH -> CMB", isLive: false },
  { id: "SQ468", callsign: "SQ468", operator: "Singapore Airlines", status: "Departing", speedKmh: 310, altitudeM: 850, heading: "270°", routeHint: "CMB -> SIN", isLive: false },
  { id: "UL303", callsign: "UL303", operator: "SriLankan Airlines", status: "Airborne", speedKmh: 780, altitudeM: 9200, heading: "295°", routeHint: "SIN -> CMB", isLive: false },
  { id: "FZ555", callsign: "FZ555", operator: "flydubai", status: "On Ground", speedKmh: 0, altitudeM: 9, heading: "-", routeHint: "DXB -> CMB", isLive: false },
];

type FlightCardModel = {
  id: string;
  callsign: string;
  operator: string;
  status: string;
  speedKmh: number;
  altitudeM: number;
  heading: string;
  routeHint: string;
  isLive: boolean;
};

const AIRLINE_STYLE: Record<string, { code: string; logoBg: string; logoText: string; stripe: string }> = {
  "Singapore Airlines": { code: "SQ", logoBg: "#0b3a82", logoText: "#f6d47a", stripe: "linear-gradient(135deg, #ffe0a8, #fff8eb)" },
  Emirates: { code: "EK", logoBg: "#c41f2d", logoText: "#ffffff", stripe: "linear-gradient(135deg, #ffd7dc, #fff3f4)" },
  "Qatar Airways": { code: "QR", logoBg: "#7a163d", logoText: "#ffffff", stripe: "linear-gradient(135deg, #f4dce7, #fff5f8)" },
  "SriLankan Airlines": { code: "UL", logoBg: "#0b4a8f", logoText: "#fdb913", stripe: "linear-gradient(135deg, #d7e8ff, #fff4d8)" },
  flydubai: { code: "FZ", logoBg: "#0f766e", logoText: "#ffffff", stripe: "linear-gradient(135deg, #d7f6f2, #fff0df)" },
  Unknown: { code: "FL", logoBg: "#334155", logoText: "#ffffff", stripe: "linear-gradient(135deg, #e8ecf4, #ffffff)" },
};

const AIRPORT_META: Record<string, { city: string; country: string; badgeBg: string; badgeAccent: string }> = {
  CMB: { city: "Colombo", country: "Sri Lanka", badgeBg: "#e0ecff", badgeAccent: "#0b4a8f" },
  DXB: { city: "Dubai", country: "UAE", badgeBg: "#ffe7e7", badgeAccent: "#c41f2d" },
  DOH: { city: "Doha", country: "Qatar", badgeBg: "#f8dce8", badgeAccent: "#7a163d" },
  SIN: { city: "Singapore", country: "Singapore", badgeBg: "#fff1d9", badgeAccent: "#9a6700" },
  Unknown: { city: "Airport", country: "Route", badgeBg: "#eef2f7", badgeAccent: "#475569" },
};

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

function parseRoute(routeHint: string) {
  const [from = "CMB", to = "CMB"] = routeHint.split("->").map((part) => part.trim());
  return { from, to };
}

function estimateDurationMinutes(speedKmh: number, altitudeM: number) {
  if (speedKmh <= 0) return 160;
  const base = 130 + Math.round((10000 - Math.min(10000, altitudeM)) / 220) + Math.round((520 / speedKmh) * 40);
  return Math.max(55, Math.min(320, base));
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours} Hr ${String(remainder).padStart(2, "0")} Min`;
}

function formatClock(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function plusMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000);
}

function getAirlineStyle(operator: string) {
  return AIRLINE_STYLE[operator] ?? AIRLINE_STYLE.Unknown;
}

function getAirportMeta(code: string) {
  return AIRPORT_META[code] ?? AIRPORT_META.Unknown;
}

function getStatusPill(status: string) {
  if (status === "On Ground") return "bg-slate-100 text-slate-600";
  if (status.includes("Approaching") || status.includes("Departing")) return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

export default function FlightsPage() {
  const navigate = useNavigate();
  const [themeMode, setThemeMode] = useState<"light" | "dark">(() => (localStorage.getItem("aeroguide_theme") === "dark" ? "dark" : "light"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [flights, setFlights] = useState<FlightCardModel[]>([]);
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

        const mapped: FlightCardModel[] = (data?.states || []).map((s: any[], idx: number) => {
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
    return flights.filter((flight) =>
      flight.callsign.toLowerCase().includes(q) ||
      flight.operator.toLowerCase().includes(q) ||
      flight.status.toLowerCase().includes(q)
    );
  }, [flights, query]);

  const isDark = themeMode === "dark";

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#081120] text-slate-100" : "bg-[#f3ecff] text-slate-900"}`}>
      <div className="relative overflow-hidden">
        <div className={`absolute inset-0 ${isDark ? "bg-[radial-gradient(circle_at_top,#1d2f57_0%,#0b1630_38%,#091120_80%)]" : "bg-[radial-gradient(circle_at_top,#d5c2ff_0%,#efe6ff_38%,#f8f5ff_80%)]"}`} />
        <div
          className={`absolute inset-0 ${isDark ? "opacity-[0.08]" : "opacity-[0.12]"}`}
          style={{
            backgroundImage: "url('https://i.pinimg.com/1200x/aa/e4/54/aae454df5a468ca876f6912d496b1b61.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center top",
          }}
        />
        <div className={`absolute inset-0 ${isDark ? "bg-[linear-gradient(180deg,rgba(4,10,22,0.48),rgba(4,10,22,0.72))]" : "bg-[linear-gradient(180deg,rgba(255,255,255,0.5),rgba(255,255,255,0.72))]"}`} />
        <div className={`absolute -left-20 top-20 h-64 w-64 rounded-full blur-3xl ${isDark ? "bg-[#243b67]/35" : "bg-white/35"}`} />
        <div className={`absolute right-0 top-0 h-80 w-80 rounded-full blur-3xl ${isDark ? "bg-[#3c2d66]/35" : "bg-[#d7c2ff]/45"}`} />

        <div className="relative z-10 w-full px-4 py-8 sm:px-8 lg:px-10">
          <section className={`rounded-[34px] p-6 backdrop-blur-md ${isDark ? "border border-white/10 bg-white/5 shadow-[0_24px_60px_rgba(2,6,23,0.45)]" : "border border-white/75 bg-white/45 shadow-[0_24px_60px_rgba(183,167,228,0.18)]"}`}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className={`inline-flex rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] ${isDark ? "bg-white/10 text-slate-300" : "bg-white/80 text-slate-500"}`}>
                  AeroGuide Live Board
                </div>
                <h1 className={`mt-4 text-4xl font-black tracking-tight sm:text-5xl ${isDark ? "text-white" : "text-slate-900"}`}>
                  Flights in a cleaner,
                  <br />
                  premium ticket view
                </h1>
                <p className={`mt-4 max-w-xl text-base leading-7 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  Live flights near Bandaranaike Airport presented as compact pastel boarding cards instead of dense radar rows.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] shadow-sm ${isDark ? "bg-white/10 text-slate-200" : "bg-white/85 text-slate-600"}`}>
                  {isUsingLive ? "Live Radar" : "Simulated Feed"}
                </div>
                <button
                  className={`rounded-2xl p-3 shadow-sm ${isDark ? "border border-white/10 bg-white/10 text-slate-200" : "border border-white/80 bg-white/85 text-slate-600"}`}
                  onClick={() => setThemeMode((prev) => (prev === "light" ? "dark" : "light"))}
                  aria-label="Toggle theme"
                >
                  <ThemeModeIcon mode={themeMode} />
                </button>
                <button
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(15,23,42,0.14)]"
                  onClick={() => navigate("/dashboard")}
                >
                  Dashboard
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto_auto]">
              <div className="relative">
                <div className={`pointer-events-none absolute inset-y-0 left-4 flex items-center ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search airline, callsign, or status"
                  className={`w-full rounded-2xl py-4 pl-12 pr-4 text-sm font-medium outline-none shadow-sm ${isDark ? "border border-white/10 bg-white/10 text-white placeholder:text-slate-500" : "border border-white/80 bg-white/88 text-slate-900 placeholder:text-slate-400"}`}
                />
              </div>

              <div className={`rounded-2xl px-5 py-4 text-sm font-semibold shadow-sm ${isDark ? "border border-white/10 bg-white/10 text-slate-300" : "border border-white/80 bg-white/78 text-slate-600"}`}>
                Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>

              <button
                onClick={() => navigate("/map")}
                className="rounded-2xl bg-[#8f76ff] px-6 py-4 text-sm font-bold text-white shadow-[0_16px_32px_rgba(143,118,255,0.28)]"
              >
                Open Radar Map
              </button>
            </div>
          </section>

          {error && (
            <div className={`mt-5 rounded-2xl px-5 py-4 text-sm font-semibold shadow-sm ${isDark ? "border border-orange-500/20 bg-orange-500/10 text-orange-300" : "border border-orange-200 bg-white/80 text-orange-700"}`}>
              {error}
            </div>
          )}

          {loading ? (
            <section className="mt-6">
              <div className={`rounded-[28px] p-12 text-center backdrop-blur-md ${isDark ? "border border-white/10 bg-white/5 shadow-[0_20px_50px_rgba(2,6,23,0.4)]" : "border border-white/80 bg-white/60 shadow-[0_20px_50px_rgba(183,167,228,0.14)]"}`}>
                <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#8f76ff] border-r-transparent" />
                <p className={`mt-4 font-bold ${isDark ? "text-slate-300" : "text-slate-600"}`}>Scanning CMB airspace...</p>
              </div>
            </section>
          ) : filteredFlights.length === 0 ? (
            <section className="mt-6">
              <div className={`rounded-[28px] p-12 text-center backdrop-blur-md ${isDark ? "border border-white/10 bg-white/5 shadow-[0_20px_50px_rgba(2,6,23,0.4)]" : "border border-white/80 bg-white/60 shadow-[0_20px_50px_rgba(183,167,228,0.14)]"}`}>
                <p className={`font-bold ${isDark ? "text-slate-300" : "text-slate-600"}`}>No flights matched your search.</p>
              </div>
            </section>
          ) : (
            <section className="mt-8 grid gap-5 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
              {filteredFlights.map((flight, index) => (
                <FlightTicketCard key={flight.id} flight={flight} index={index} onTrack={() => navigate("/map")} isDark={isDark} />
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function FlightTicketCard({
  flight,
  index,
  onTrack,
  isDark,
}: {
  flight: FlightCardModel;
  index: number;
  onTrack: () => void;
  isDark: boolean;
}) {
  const route = parseRoute(flight.routeHint);
  const duration = estimateDurationMinutes(flight.speedKmh, flight.altitudeM);
  const departure = useMemo(() => {
    const base = new Date();
    const minuteSeed = (flight.callsign.charCodeAt(0) + flight.callsign.length * 11 + index * 9) % 90;
    base.setMinutes(base.getMinutes() - 25 + minuteSeed, 0, 0);
    return base;
  }, [flight.callsign, index]);
  const arrival = useMemo(() => plusMinutes(departure, duration), [departure, duration]);
  const airline = getAirlineStyle(flight.operator);
  const statusTone = getStatusPill(flight.status);

  return (
    <article
      className={`overflow-hidden rounded-[24px] backdrop-blur-xl ${isDark ? "border border-white/10 bg-white/5 shadow-[0_18px_40px_rgba(2,6,23,0.38)]" : "border border-white/70 bg-white/38 shadow-[0_18px_40px_rgba(162,146,214,0.18)]"}`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className={`relative px-4 py-3.5 sm:px-5 ${isDark ? "bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(15,23,42,0.64))]" : "bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(255,255,255,0.42))]"}`}>
        <div className={`absolute inset-0 ${isDark ? "bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.1),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(139,116,247,0.16),transparent_34%)]" : "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.75),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(143,118,255,0.14),transparent_34%)]"}`} />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={`text-[11px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {getAirportMeta(route.from).city} International
              </div>
              <div className={`mt-0.5 text-[1.7rem] font-black leading-none tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>{route.from}</div>
              <div className={`mt-1 text-[11px] font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                {new Intl.DateTimeFormat([], { month: "short", day: "numeric" }).format(departure)} · {formatClock(departure)}
              </div>
            </div>

            <div className="pt-1 text-center">
              <div className={`flex items-center justify-center gap-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                <div className={`h-px w-8 ${isDark ? "bg-slate-600" : "bg-slate-300"}`} />
                <svg className={`h-3.5 w-3.5 ${isDark ? "text-white" : "text-slate-900"}`} viewBox="0 0 24 24" fill="none">
                  <path d="M21 3 3 11l7 2 2 7 9-17Zm-9 17-2-7-7-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className={`h-px w-8 ${isDark ? "bg-slate-600" : "bg-slate-300"}`} />
              </div>
              <div className={`mt-1.5 text-[11px] font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>-{formatDuration(duration)}</div>
            </div>

            <div className="text-right">
              <div className={`text-[11px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {getAirportMeta(route.to).city} Intl.
              </div>
              <div className={`mt-0.5 text-[1.7rem] font-black leading-none tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>{route.to}</div>
              <div className={`mt-1 text-[11px] font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                {new Intl.DateTimeFormat([], { month: "short", day: "numeric" }).format(arrival)} · {formatClock(arrival)}
              </div>
            </div>
          </div>

          <div className={`mt-4 flex items-center justify-between gap-3 pt-3 ${isDark ? "border-t border-white/10" : "border-t border-white/70"}`}>
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-black tracking-wide shadow-sm"
                style={{ backgroundColor: airline.logoBg, color: airline.logoText }}
              >
                {airline.code}
              </div>
              <div className="min-w-0">
                <div className={`truncate text-[0.95rem] font-black ${isDark ? "text-white" : "text-slate-900"}`}>{flight.operator.toUpperCase()}</div>
                <div className={`mt-0.5 flex items-center gap-2 text-[11px] ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  <span className="text-[#f59e0b]">★</span>
                  <span>{flight.isLive ? "Live radar" : "Simulated"}</span>
                  <span className={`rounded-full px-2 py-0.5 font-bold ${statusTone}`}>{flight.status}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <div className={`text-[10px] font-bold uppercase tracking-[0.14em] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Speed</div>
                <div className={`mt-0.5 text-sm font-black ${isDark ? "text-white" : "text-slate-900"}`}>{flight.speedKmh}</div>
              </div>
              <button
                onClick={onTrack}
                className="rounded-full bg-slate-900 px-3.5 py-1.5 text-[11px] font-bold text-white"
              >
                Track
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
