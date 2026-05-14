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
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);

  const [poiQuery, setPoiQuery] = useState("");
  const [activeCategories, setActiveCategories] = useState(() => new Set(ALL_POIS.map((p) => p.category)));

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const lastRoutedOriginRef = useRef(null);
  const lastRoutedDestinationRef = useRef(null);
  const poiMarkersRef = useRef([]);
  const poiInfoWindowRef = useRef(null);

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
          // Only update if moved significantly to reduce jitter
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
    (destinationPoi) => {
      if (!destinationPoi || typeof destinationPoi.lat !== "number" || typeof destinationPoi.lon !== "number") {
        return;
      }
      setSelectedPoI({ ...destinationPoi });
      setIsNavigating(true);
    },
    []
  );

  const handleNavigateToGate = useCallback(
    (flight) => {
      if (!flight?.gate) return;
      const normalize = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const target = normalize(flight.gate);
      const gatePoi = ALL_POIS.find((p) => p.category === "gate" && normalize(p.name).includes(target));
      
      if (gatePoi) {
        handleNavigate(gatePoi);
      } else {
        alert("Gate location not found on map.");
      }
    },
    [handleNavigate]
  );

  const [handledParams, setHandledParams] = useState(null);

  useEffect(() => {
    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");
    const nameParam = searchParams.get("name");

    if (latParam && lonParam) {
      const paramKey = `latlon:${latParam},${lonParam}`;
      if (handledParams === paramKey) return;
      
      const lat = parseFloat(latParam);
      const lon = parseFloat(lonParam);
      if (!isNaN(lat) && !isNaN(lon)) {
        setHandledParams(paramKey);
        setSelectedPoI({ lat, lon, name: nameParam || "Location", category: "detour" });
      }
      return;
    }

    const gateParam = searchParams.get("gate");
    if (gateParam) {
      const target = String(gateParam).toLowerCase().replace(/[^a-z0-9]/g, "");
      const gatePoi = ALL_POIS.find(p => 
        p.category === "gate" && 
        String(p.name || "").toLowerCase().replace(/[^a-z0-9]/g, "").includes(target)
      );

      if (gatePoi && handledParams !== gateParam) {
        setHandledParams(gateParam);
        setSelectedPoI(gatePoi);
        setIsNavigating(true);
      } else if (!gatePoi && handledParams !== gateParam) {
        // Fallback for demo if exact POI not found
        setHandledParams(gateParam);
        setSelectedPoI({ lat: 7.1805, lon: 79.8849, name: `Gate ${gateParam}`, category: "gate" });
        setIsNavigating(true);
      }
    }
  }, [searchParams, handledParams]);

  const toggleCategory = useCallback((cat) => {
    setActiveCategories((prev) => {
      const allCats = new Set(ALL_POIS.map((p) => p.category));
      
      if (prev.size === allCats.size) {
        return new Set([cat]);
      }
      
      if (prev.size === 1 && prev.has(cat)) {
        return allCats;
      }
      
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      
      if (next.size === 0) return allCats;
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
      const target = String(gateParam).toLowerCase().replace(/[^a-z0-9]/g, "");
      const gatePoi = ALL_POIS.find(p => 
        p.category === "gate" && 
        String(p.name || "").toLowerCase().replace(/[^a-z0-9]/g, "").includes(target)
      );
      if (gatePoi?.lat && gatePoi?.lon) {
        return [gatePoi.lat, gatePoi.lon];
      }
      // Demo fallback coordinates if POI lookup fails
      return [7.1805, 79.8849];
    }

    return null;
  }, [selectedPoI, searchParams]);

  useEffect(() => {
    if (!isNavigating || !userLocation || !destinationCoords) return;

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
        
        // Use driving profile for long distances (like Malabe to BIA), 
        // walking for short terminal distances.
        const distance = haversineMeters([origin.lat, origin.lng], [destination.lat, destination.lng]);
        const profile = distance > 2000 ? "driving" : "walking";
        
        const url = `https://router.project-osrm.org/route/v1/${profile}/${start};${end}?overview=full&geometries=geojson&steps=true`;
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();
        if (!active) return;

        if (data.code === "Ok" && data.routes?.[0]?.geometry?.coordinates?.length > 1) {
          const osrmPath = data.routes[0].geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));

          // OSRM snaps start/end to the nearest road — extend the
          // path so it always begins at the real origin and ends at
          // the exact destination POI coordinate.
          const first = osrmPath[0];
          const last  = osrmPath[osrmPath.length - 1];

          const path = [];

          // Prepend real origin if OSRM snapped it away (> 3 m)
          if (haversineMeters([origin.lat, origin.lng], [first.lat, first.lng]) > 3) {
            path.push(origin);
          }

          path.push(...osrmPath);

          // Append real destination if OSRM snapped it away (> 3 m)
          if (haversineMeters([destination.lat, destination.lng], [last.lat, last.lng]) > 3) {
            path.push(destination);
          }

          setRoutePath(path);
          setNavigationSteps(data.routes[0].legs?.[0]?.steps ?? []);
          return;
        }
      } catch {}

      if (active) {
        setRoutePath([origin, destination]);
        // Provide a fallback instruction so the sidebar shows navigation mode
        setNavigationSteps([{
          maneuver: { type: "continue", modifier: "straight" },
          name: "the airport route",
          distance: distance,
          duration: Math.round(distance / 13.8) // ~50km/h
        }, {
          maneuver: { type: "arrive", modifier: "" },
          name: "Gate A13",
          distance: 0,
          duration: 0
        }]);
      }
    };

    fetchRoute();
    return () => {
      active = false;
      controller.abort();
    };
  }, [userLocation, destinationCoords, isNavigating]);

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

    if (destinationCoords) {
      const destPos = { lat: destinationCoords[0], lng: destinationCoords[1] };
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
        destinationMarkerRef.current.setMap(map);
      }

      // Create a prominent animated dotted line with a glow effect
      const dottedLineSymbol = {
        path: maps.SymbolPath.CIRCLE,
        fillOpacity: 1,
        scale: 5.5, // Even bigger for better visibility
        fillColor: "#00f2ff", // Neon Cyan
        strokeColor: "#00f2ff",
        strokeWeight: 2,
        strokeOpacity: 0.4,
      };

      const path = routePath.length > 1 ? routePath : [userPos, destPos];

      if (!routeLineRef.current) {
        routeLineRef.current = new maps.Polyline({
          map: isNavigating ? map : null,
          path: path,
          strokeOpacity: 0,
          zIndex: 1000,
          icons: [{
            icon: dottedLineSymbol,
            offset: "0",
            repeat: "25px"
          }],
        });
      } else {
        routeLineRef.current.setMap(isNavigating ? map : null);
        routeLineRef.current.setPath(path);
        routeLineRef.current.setOptions({
          strokeOpacity: 0,
          icons: [{
            icon: dottedLineSymbol,
            offset: "0",
            repeat: "25px"
          }]
        });
      }

      // Simple animation: Shift the icons over time
      let intervalId = null;
      if (isNavigating) {
        let count = 0;
        intervalId = setInterval(() => {
          count = (count + 1) % 200;
          const icons = routeLineRef.current.get("icons");
          if (icons && icons[0]) {
            icons[0].offset = (count / 2) + "px";
            routeLineRef.current.set("icons", icons);
          }
        }, 50);
      }
      
      const bounds = new maps.LatLngBounds();
      bounds.extend(userPos);
      bounds.extend(destPos);
      map.fitBounds(bounds, 90);

      return () => {
        if (intervalId) clearInterval(intervalId);
      };
    } else {
      if (destinationMarkerRef.current) destinationMarkerRef.current.setMap(null);
      if (routeLineRef.current) routeLineRef.current.setMap(null);
      map.setCenter(userPos);
      map.setZoom(18);
    }
  }, [mapReady, userLocation, destinationCoords, routePath, isNavigating]);

  // --- POI amenity markers with images + hover tooltip ---
  useEffect(() => {
    if (!mapReady || !mapRef.current || !(window.google && window.google.maps)) return;
    const maps = window.google.maps;
    const map = mapRef.current;

    // Clean up previous markers
    poiMarkersRef.current.forEach((m) => {
      maps.event.clearInstanceListeners(m);
      m.setMap(null);
    });
    poiMarkersRef.current = [];

    // Shared InfoWindow for hover
    if (!poiInfoWindowRef.current) {
      poiInfoWindowRef.current = new maps.InfoWindow({
        disableAutoPan: true,
        pixelOffset: new maps.Size(0, -6),
      });
    }
    const infoWindow = poiInfoWindowRef.current;

    filteredPois.forEach((poi) => {
      if (typeof poi.lat !== "number" || typeof poi.lon !== "number") return;

      const meta = getCategoryMeta(poi.category);
      const markerColor = meta.color || "#94a3b8";

      // Create a custom marker icon using the POI image
      const marker = new maps.Marker({
        map,
        position: { lat: poi.lat, lng: poi.lon },
        title: poi.name,
        icon: {
          url: poi.image
            ? poi.image
            : `data:image/svg+xml,${encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36"><circle cx="18" cy="18" r="16" fill="${markerColor}" stroke="#fff" stroke-width="2"/><text x="18" y="22" text-anchor="middle" fill="#fff" font-size="13" font-weight="700">${meta.emoji}</text></svg>`
              )}`,
          scaledSize: new maps.Size(40, 40),
          anchor: new maps.Point(20, 20),
        },
        optimized: false,
        zIndex: 100,
      });

      // Hover listeners
      marker.addListener("mouseover", () => {
        const content = `
          <div style="
            display:flex; flex-direction:column; align-items:center;
            min-width:160px; max-width:200px; padding:0;
            font-family:'Inter','Segoe UI',sans-serif;
          ">
            <div style="
              width:100%; height:110px; overflow:hidden;
              border-radius:10px 10px 0 0;
            ">
              <img src="${poi.image || ''}" alt="${poi.name}"
                style="width:100%; height:100%; object-fit:cover;" />
            </div>
            <div style="
              padding:8px 12px; text-align:center; width:100%;
              background:linear-gradient(135deg,#0f172a,#1e293b);
              border-radius:0 0 10px 10px;
            ">
              <div style="
                font-size:12px; font-weight:700; color:#fff;
                letter-spacing:0.3px; margin-bottom:2px;
              ">${poi.name}</div>
              <div style="
                font-size:10px; color:${markerColor};
                font-weight:600; text-transform:uppercase;
                letter-spacing:0.6px;
              ">${meta.label}</div>
            </div>
          </div>
        `;
        infoWindow.setContent(content);
        infoWindow.open(map, marker);
      });

      marker.addListener("mouseout", () => {
        infoWindow.close();
      });

      // Click to select for navigation
      marker.addListener("click", () => {
        handleNavigate(poi);
      });

      poiMarkersRef.current.push(marker);
    });

    return () => {
      infoWindow.close();
    };
  }, [mapReady, filteredPois, handleNavigate]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-r from-[#2C6CBC] via-[#71C3F7] to-[#F5F5F5] dark:from-[#0B1021] dark:via-[#1B2845] dark:to-[#5A77A2] text-slate-900 dark:text-white font-sans relative transition-colors duration-300">
      <div className="absolute top-4 z-50 flex items-center gap-3" style={{ right: '180px' }}>
        <button
          onClick={() => setThemeMode((p) => (p === "light" ? "dark" : "light"))}
          aria-label="Toggle theme"
          className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 dark:border-white/20 bg-white/80 dark:bg-black/20 backdrop-blur-md text-slate-700 dark:text-white shadow-lg hover:bg-white dark:hover:bg-white/10 transition-all"
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

      <div className="z-40 h-full w-full sm:w-[400px] lg:w-[450px] shrink-0 bg-transparent dark:bg-transparent backdrop-blur-xl shadow-2xl flex flex-col transition-colors duration-300">
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

      <div className="relative flex-1 h-full z-10 bg-slate-200 dark:bg-black/20">
        {mapError ? (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
            Google Maps could not load. Set `VITE_GOOGLE_MAPS_API_KEY` in `frontend/.env`.
          </div>
        ) : (
          <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />
        )}

        {isNavigating && selectedPoI && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[60] animate-fade-in">
            <div className="bg-aeroguide-blue/90 backdrop-blur-md border border-white/20 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-white font-bold uppercase tracking-widest text-xs">
                Navigating to {selectedPoI.name}
              </span>
            </div>
          </div>
        )}

        <div className="absolute bottom-6 left-6 pointer-events-none z-[10]">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/60 backdrop-blur-md px-4 py-2 shadow-lg">
            <div className={`h-2 w-2 rounded-full animate-pulse ${mapReady ? "bg-green-500" : "bg-[#589efc]"}`}></div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-white">
              {mapReady ? "Google Maps Live" : "Loading Map..."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
