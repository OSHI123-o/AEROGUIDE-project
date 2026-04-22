import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ThemeModeIcon from "../components/ThemeModeIcon";
import Sidebar from "../components/Sidebar";
import { flights, pois as ALL_POIS } from "../mockData";
import { getCategoryMeta } from "../poiCatalog";
import { getStoredLang, setStoredLang } from "../services/i18n";

const DEFAULT_LOCATION = [7.1795, 79.8835];
const DEFAULT_GATE_LOCATION = [7.1802, 79.8848];
const GOOGLE_MAPS_SCRIPT_ID = "aeroguide-google-maps-sdk";

let googleMapsLoaderPromise = null;

function loadGoogleMaps(apiKey) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("window_unavailable"));
  }
  if (window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }
  if (googleMapsLoaderPromise) {
    return googleMapsLoaderPromise;
  }

  googleMapsLoaderPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google.maps));
      existing.addEventListener("error", () => reject(new Error("google_maps_load_failed")));
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.onload = () => {
      if (window.google && window.google.maps) resolve(window.google.maps);
      else reject(new Error("google_maps_unavailable"));
    };
    script.onerror = () => reject(new Error("google_maps_load_failed"));
    document.head.appendChild(script);
  });

  return googleMapsLoaderPromise;
}

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
  const [navigationSteps, setNavigationSteps] = useState([]);
  const [routePath, setRoutePath] = useState([]);
  const [handledGateParam, setHandledGateParam] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");

  const [poiQuery, setPoiQuery] = useState("");
  const [activeCategories, setActiveCategories] = useState(() => new Set(ALL_POIS.map((p) => p.category)));

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const lastRoutedOriginRef = useRef(null);
  const lastRoutedDestinationRef = useRef(null);

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();

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

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const next = [position.coords.latitude, position.coords.longitude];
        setUserLocation((prev) => {
          if (!prev) return next;
          return haversineMeters(prev, next) >= 5 ? next : prev;
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!googleMapsApiKey) {
      setMapError("Missing VITE_GOOGLE_MAPS_API_KEY");
      return;
    }

    let active = true;
    loadGoogleMaps(googleMapsApiKey)
      .then(() => {
        if (!active) return;
        setMapReady(true);
      })
      .catch(() => {
        if (!active) return;
        setMapError("Failed to load Google Maps");
      });

    return () => {
      active = false;
    };
  }, [googleMapsApiKey]);

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
          setNavigationSteps(data.routes[0].legs[0].steps);
        } else {
          setNavigationSteps([]);
          alert("Error calculating route.");
        }
      } catch (error) {
        console.error("Routing error:", error);
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
    const gatePoi = ALL_POIS.find((p) => p.category === "gate" && normalizeGate(p.name).includes(normalizedGate));

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

  const destinationCoords = useMemo(() => {
    if (selectedPoI?.lat && selectedPoI?.lon) {
      return [selectedPoI.lat, selectedPoI.lon];
    }

    const gateParam = searchParams.get("gate");
    if (gateParam) {
      const normalizedGate = String(gateParam).toLowerCase().replace(/[^a-z0-9]/g, "");
      const gatePoi = ALL_POIS.find(
        (p) => p.category === "gate" && String(p.name).toLowerCase().replace(/[^a-z0-9]/g, "").includes(normalizedGate)
      );
      if (gatePoi?.lat && gatePoi?.lon) {
        return [gatePoi.lat, gatePoi.lon];
      }
    }

    return DEFAULT_GATE_LOCATION;
  }, [selectedPoI, searchParams]);

  useEffect(() => {
    if (!userLocation || !destinationCoords) return;

    const origin = { lat: userLocation[0], lng: userLocation[1] };
    const destination = { lat: destinationCoords[0], lng: destinationCoords[1] };

    const originMoved =
      !lastRoutedOriginRef.current ||
      haversineMeters(
        [lastRoutedOriginRef.current.lat, lastRoutedOriginRef.current.lng],
        [origin.lat, origin.lng]
      ) >= 10;

    const destinationMoved =
      !lastRoutedDestinationRef.current ||
      haversineMeters(
        [lastRoutedDestinationRef.current.lat, lastRoutedDestinationRef.current.lng],
        [destination.lat, destination.lng]
      ) >= 3;

    if (!originMoved && !destinationMoved && routePath.length > 1) return;

    lastRoutedOriginRef.current = origin;
    lastRoutedDestinationRef.current = destination;

    let active = true;
    const controller = new AbortController();

    const fetchRoute = async () => {
      try {
        const start = `${origin.lng},${origin.lat}`;
        const end = `${destination.lng},${destination.lat}`;
        const url = `https://router.project-osrm.org/route/v1/walking/${start};${end}?overview=full&geometries=geojson&steps=true`;
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();
        if (!active) return;

        if (data.code === "Ok" && data.routes?.[0]?.geometry?.coordinates?.length > 1) {
          const path = data.routes[0].geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
          setRoutePath(path);
          setNavigationSteps(data.routes[0].legs?.[0]?.steps ?? []);
          return;
        }
      } catch {}

      if (active) {
        setRoutePath([origin, destination]);
      }
    };

    fetchRoute();
    return () => {
      active = false;
      controller.abort();
    };
  }, [userLocation, destinationCoords, routePath.length]);

  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || !(window.google && window.google.maps)) return;

    const maps = window.google.maps;

    if (!mapRef.current) {
      mapRef.current = new maps.Map(mapContainerRef.current, {
        center: { lat: userLocation[0], lng: userLocation[1] },
        zoom: 18,
        mapTypeId: "roadmap",
        streetViewControl: false,
        fullscreenControl: false,
      });
    }

    const map = mapRef.current;
    const userPos = { lat: userLocation[0], lng: userLocation[1] };
    const destPos = { lat: destinationCoords[0], lng: destinationCoords[1] };

    if (!userMarkerRef.current) {
      userMarkerRef.current = new maps.Marker({
        map,
        position: userPos,
        title: "Your Location",
        label: { text: "U", color: "#ffffff", fontWeight: "700" },
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#0ea5e9",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
    } else {
      userMarkerRef.current.setPosition(userPos);
    }

    if (!destinationMarkerRef.current) {
      destinationMarkerRef.current = new maps.Marker({
        map,
        position: destPos,
        title: "Destination",
        label: { text: "D", color: "#ffffff", fontWeight: "700" },
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#f59e0b",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
    } else {
      destinationMarkerRef.current.setPosition(destPos);
    }

    const dottedLineSymbol = { path: "M 0,-1 0,1", strokeOpacity: 1, strokeWeight: 4, scale: 4, strokeColor: "#ff2d55" };

    if (!routeLineRef.current) {
      routeLineRef.current = new maps.Polyline({
        map,
        path: [userPos, destPos],
        strokeOpacity: 0,
        icons: [{ icon: dottedLineSymbol, offset: "0", repeat: "16px" }],
      });
    } else {
      routeLineRef.current.setMap(map);
    }

    const path = routePath.length > 1 ? routePath : [userPos, destPos];
    routeLineRef.current.setPath(path);

    const bounds = new maps.LatLngBounds();
    path.forEach((point) => bounds.extend(point));
    map.fitBounds(bounds, 90);
  }, [mapReady, userLocation, destinationCoords, routePath]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100 dark:bg-[#0A1A2F] text-slate-900 dark:text-white font-sans relative transition-colors duration-300">
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

      <div className="z-40 h-full w-full sm:w-[400px] lg:w-[450px] shrink-0 border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A1A2F]/95 backdrop-blur-xl shadow-2xl flex flex-col transition-colors duration-300">
        <Sidebar
          onSearch={handleSearch}
          flightData={flightData}
          onNavigatePoi={handleNavigate}
          onSidebarHoverChange={() => {}}
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

      <div className="relative flex-1 h-full z-10 bg-slate-200 dark:bg-[#050e1a]">
        {mapError ? (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
            Google Maps could not load. Set `VITE_GOOGLE_MAPS_API_KEY` in `frontend/.env`.
          </div>
        ) : (
          <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />
        )}

        <div className="absolute bottom-6 left-6 pointer-events-none z-[10]">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/60 backdrop-blur-md px-4 py-2 shadow-lg">
            <div className={`h-2 w-2 rounded-full animate-pulse ${mapReady ? "bg-green-500" : "bg-orange-500"}`}></div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-white">
              {mapReady ? "Google Maps Live" : "Loading Map..."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
