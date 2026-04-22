import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ThemeModeIcon from "../components/ThemeModeIcon";

// Approximate CMB Terminal 1 Entrance & Gates
const TERMINAL_ENTRANCE: [number, number] = [7.1781, 79.8842];
const DEFAULT_GATE: [number, number] = [7.1802, 79.8848];

const TARGETS: Record<string, [number, number]> = {
  "Check-in Counters": [7.1794, 79.8853],
  "Security Screening": [7.1798, 79.8857],
  "Immigration": [7.1807, 79.8846],
  "Gate A12": [7.1802, 79.8848],
  "Help Desk (Arrivals)": [7.1781, 79.8842],
};

export default function MapPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [liveCoords, setLiveCoords] = useState<[number, number] | null>(null);
  const [themeMode, setThemeMode] = useState<"light" | "dark">(
    () => (localStorage.getItem("aeroguide_theme") === "dark" ? "dark" : "light")
  );

  useEffect(() => {
    localStorage.setItem("aeroguide_theme", themeMode);
    if (themeMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [themeMode]);

  // Live Geolocation Tracking
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLiveCoords([position.coords.latitude, position.coords.longitude]);
      },
      (error) => {
        console.warn("Geolocation error:", error.message);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

    const destLat = parseFloat(searchParams.get("destLat") || "");
    const destLon = parseFloat(searchParams.get("destLon") || "");
    const userLat = parseFloat(searchParams.get("userLat") || "");
    const userLon = parseFloat(searchParams.get("userLon") || "");
    const search = searchParams.get("search");
    const gate = searchParams.get("gate");

  const startCoord = useMemo(() => {
    if (liveCoords) return liveCoords;
    if (!isNaN(userLat) && !isNaN(userLon)) return [userLat, userLon] as [number, number];
    return TERMINAL_ENTRANCE;
  }, [liveCoords, userLat, userLon]);

  const endCoord = useMemo(() => {
    if (!isNaN(destLat) && !isNaN(destLon)) return [destLat, destLon] as [number, number];
    if (search && TARGETS[search]) return TARGETS[search];
    if (gate && TARGETS[`Gate ${gate}`]) return TARGETS[`Gate ${gate}`];
    return DEFAULT_GATE;
  }, [destLat, destLon, search, gate]);

  const mapEmbedUrl = useMemo(() => {
    // dirflg=w enforces walking directions on Google Maps
    return `https://maps.google.com/maps?saddr=${startCoord[0]},${startCoord[1]}&daddr=${endCoord[0]},${endCoord[1]}&dirflg=w&z=18&output=embed`;
  }, [startCoord, endCoord]);

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-aeroguide-navy text-slate-900 dark:text-white font-sans transition-colors duration-300">
      <header className="flex-none p-4 sm:p-6 lg:px-10 z-10 bg-white/80 dark:bg-aeroguide-navy/80 backdrop-blur-md shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Interactive Map</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Powered by Google Maps</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors shadow-sm dark:shadow-none" onClick={() => setThemeMode((p) => (p === "light" ? "dark" : "light"))}>
            <ThemeModeIcon mode={themeMode} />
          </button>
          <button className="rounded-xl border border-slate-300 dark:border-white/20 bg-transparent px-6 py-3 text-sm font-bold text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors" onClick={() => navigate("/dashboard")}>Dashboard</button>
          <button className="rounded-xl bg-aeroguide-gold px-6 py-3 text-sm font-bold text-aeroguide-navy shadow-[0_4px_14px_rgba(253,185,19,0.3)] hover:brightness-95 transition-all" onClick={() => navigate(-1)}>Back</button>
        </div>
      </header>

      <div className="flex-1 relative z-0">
        <iframe 
          title="Google Maps Navigation"
          src={mapEmbedUrl} 
          className="absolute inset-0 h-full w-full border-0" 
          loading="lazy" 
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="absolute bottom-6 left-6 pointer-events-none z-[10]">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/60 backdrop-blur-md px-4 py-2 shadow-lg">
            <div className={`h-2 w-2 rounded-full animate-pulse ${liveCoords ? 'bg-green-500' : 'bg-orange-500'}`}></div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-white">
              {liveCoords ? 'Live GPS Active' : 'Acquiring GPS...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}