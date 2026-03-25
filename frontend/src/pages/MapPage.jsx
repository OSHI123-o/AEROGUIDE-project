import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ThemeModeIcon from "../components/ThemeModeIcon";
import Sidebar from "../components/Sidebar";
import MapComponent from "../components/MapComponent";
import { flights, pois as ALL_POIS } from "../mockData";
import { getCategoryMeta } from "../poiCatalog";
import { getStoredLang, setStoredLang } from "../services/i18n";

const DEFAULT_LOCATION = [7.1795, 79.8835];

function haversineMeters([lat1, lon1], [lat2, lon2]) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export default function MapPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [themeMode, setThemeMode] = useState(() => (localStorage.getItem("aeroguide_theme") === "dark" ? "dark" : "light"));
  const [language, setLanguage] = useState(() => getStoredLang().toLowerCase());
  const [flightData, setFlightData] = useState(null);
  const [selectedPoI, setSelectedPoI] = useState(null);
  const [userLocation, setUserLocation] = useState(DEFAULT_LOCATION);
  const [routePolyline, setRoutePolyline] = useState(null);
  const [navigationSteps, setNavigationSteps] = useState([]);
  const [disableMapWheelZoom, setDisableMapWheelZoom] = useState(false);
  const [handledGateParam, setHandledGateParam] = useState(null);

  const [poiQuery, setPoiQuery] = useState("");
  const [activeCategories, setActiveCategories] = useState(() => new Set(ALL_POIS.map((p) => p.category)));

  // Sync theme with HTML root for Tailwind Dark Mode
  useEffect(() => {
    localStorage.setItem("aeroguide_theme", themeMode);
    if (themeMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [themeMode]);

  useEffect(() => {
    const normalized = String(language || "en").toUpperCase();
    if (normalized === "EN" || normalized === "SI" || normalized === "TA") {
      setStoredLang(normalized);
    }
  }, [language]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => setUserLocation([position.coords.latitude, position.coords.longitude]),
      () => {}
    );
  }, []);

  const handleSearch = useCallback((flightNo) => {
    const query = String(flightNo || "").trim().toLowerCase();
    if (!query) {
      setFlightData(null);
      return;
    }
    const flight = flights.find((f) => f.flightNo.toLowerCase() === query);
    setFlightData(flight || null);
  }, []);

  const handleNavigate = useCallback(
    async (destinationPoi) => {
      if (!destinationPoi || typeof destinationPoi.lat !== "number" || typeof destinationPoi.lon !== "number") {
        return;
      }

      setSelectedPoI({ ...destinationPoi });
      const startLoc = userLocation || DEFAULT_LOCATION;
      const start = `${startLoc[1]},${startLoc[0]}`;
      const end = `${destinationPoi.lon},${destinationPoi.lat}`;

      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/walking/${start};${end}?overview=full&geometries=geojson&steps=true`
        );
        const data = await response.json();

        if (data.code === "Ok") {
          const coordinates = data.routes[0].geometry.coordinates.map((coord) => [coord[1], coord[0]]);
          setRoutePolyline(coordinates);
          setNavigationSteps(data.routes[0].legs[0].steps);
        } else {
          setRoutePolyline(null);
          setNavigationSteps([]);
          alert("Error calculating route.");
        }
      } catch (error) {
        console.error("Routing error:", error);
        setRoutePolyline(null);
        setNavigationSteps([]);
        alert("Failed to fetch route.");
      }
    },
    [userLocation]
  );

  const handleNavigateToGate = useCallback(
    (flight) => {
      if (!flight?.gate) return;
      const gatePoi = ALL_POIS.find((p) => p.category === "gate" && p.name.includes(flight.gate));
      if (gatePoi) {
        handleNavigate(gatePoi);
      } else {
        alert("Gate location not found on map.");
      }
    },
    [handleNavigate]
  );

  useEffect(() => {
    const gateParam = searchParams.get("gate");
    if (!gateParam || handledGateParam === gateParam) return;

    const normalizeGate = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const normalizedGate = normalizeGate(gateParam);
    const gatePoi = ALL_POIS.find(
      (p) => p.category === "gate" && normalizeGate(p.name).includes(normalizedGate)
    );

    if (gatePoi) {
      setHandledGateParam(gateParam);
      handleNavigate(gatePoi);
    }
  }, [searchParams, handledGateParam, handleNavigate]);

  const toggleCategory = useCallback((cat) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const setAllCategories = useCallback(() => setActiveCategories(new Set(ALL_POIS.map((p) => p.category))), []);
  const clearAllCategories = useCallback(() => setActiveCategories(new Set()), []);

  const filteredPois = useMemo(() => {
    const q = poiQuery.trim().toLowerCase();
    const withDistance = ALL_POIS.map((p) => {
      const distanceM =
        userLocation && typeof p.lat === "number" && typeof p.lon === "number"
          ? haversineMeters(userLocation, [p.lat, p.lon])
          : null;
      return { ...p, distanceM };
    });

    return withDistance
      .filter((p) => activeCategories.has(p.category))
      .filter((p) => {
        if (!q) return true;
        const meta = getCategoryMeta(p.category);
        const hay = `${p.name} ${p.description} ${p.floor} ${p.category} ${meta.label}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        if (a.distanceM == null && b.distanceM == null) return 0;
        if (a.distanceM == null) return 1;
        if (b.distanceM == null) return -1;
        return a.distanceM - b.distanceM;
      });
  }, [poiQuery, activeCategories, userLocation]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100 dark:bg-[#0A1A2F] text-slate-900 dark:text-white font-sans relative transition-colors duration-300">
      
      {/* FLOATING ACTION BAR (Top Right)
        Contains Theme Toggle and Back Button 
      */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        <button
          onClick={() => setThemeMode((p) => (p === "light" ? "dark" : "light"))}
          aria-label="Toggle theme"
          className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 dark:border-white/20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-700 dark:text-white shadow-lg hover:bg-white dark:hover:bg-slate-800 transition-all"
        >
          <ThemeModeIcon mode={themeMode} />
        </button>

        <button
          onClick={() => navigate("/dashboard")}
          className="flex h-12 items-center justify-center rounded-xl bg-aeroguide-gold px-6 text-sm font-bold text-aeroguide-navy shadow-[0_8px_20px_rgba(253,185,19,0.3)] hover:brightness-95 dark:hover:brightness-110 transition-all"
        >
          Dashboard
        </button>
      </div>

      {/* LEFT SIDEBAR
        Given a modern panel look with a shadow to lift it off the map 
      */}
      <div className="z-40 h-full w-full sm:w-[400px] lg:w-[450px] shrink-0 border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A1A2F]/95 backdrop-blur-xl shadow-2xl flex flex-col transition-colors duration-300">
        <Sidebar
          onSearch={handleSearch}
          flightData={flightData}
          onNavigatePoi={handleNavigate}
          onSidebarHoverChange={setDisableMapWheelZoom}
          language={language}
          setLanguage={setLanguage}
          navigationSteps={navigationSteps}
          onNavigateToGate={handleNavigateToGate}
          pois={filteredPois}
          poiQuery={poiQuery}
          setPoiQuery={setPoiQuery}
          activeCategories={activeCategories}
          toggleCategory={toggleCategory}
          setAllCategories={setAllCategories}
          clearAllCategories={clearAllCategories}
        />
      </div>

      {/* MAP CONTAINER
        Takes up the remaining flexible space. 
      */}
      <div className="relative flex-1 h-full z-10 bg-slate-200 dark:bg-[#050e1a]">
        <MapComponent
          pois={filteredPois}
          selectedPoI={selectedPoI}
          userLocation={userLocation}
          routePolyline={routePolyline}
          onNavigate={handleNavigate}
          disableWheelZoom={disableMapWheelZoom}
        />
        
        {/* Subtle Map Inner Shadow for depth */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_10px_0_30px_rgba(0,0,0,0.1)] dark:shadow-[inset_10px_0_40px_rgba(0,0,0,0.4)] z-20"></div>
      </div>
    </div>
  );
}