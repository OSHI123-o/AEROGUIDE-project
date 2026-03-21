import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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

  useEffect(() => {
    localStorage.setItem("aeroguide_theme", themeMode);
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
    <div style={{ display: "flex", minHeight: "100vh", width: "100%", overflow: "hidden", position: "relative" }}>
      <button
        onClick={() => setThemeMode((p) => (p === "light" ? "dark" : "light"))}
        aria-label={themeMode === "light" ? "Switch to dark mode" : "Switch to light mode"}
        title={themeMode === "light" ? "Switch to dark mode" : "Switch to light mode"}
        style={{
          position: "absolute",
          top: 20,
          right: 22,
          zIndex: 1300,
          border: "1px solid rgba(255,255,255,0.35)",
          borderRadius: 10,
          width: 40,
          height: 40,
          background: "rgba(15,23,42,0.68)",
          color: "#fff",
          fontSize: 18,
          cursor: "pointer",
          backdropFilter: "blur(8px)",
        }}
      >
        <ThemeModeIcon mode={themeMode} />
      </button>

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

      <MapComponent
        pois={filteredPois}
        selectedPoI={selectedPoI}
        userLocation={userLocation}
        routePolyline={routePolyline}
        onNavigate={handleNavigate}
        disableWheelZoom={disableMapWheelZoom}
      />
    </div>
  );
}





