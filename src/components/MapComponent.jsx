import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { getCategoryMeta } from "../poiCatalog";

// Fix default Leaflet icons in Vite/React
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Modern emoji-based POI markers (no external icon URLs)
const emojiIcon = (emoji, bg) =>
  L.divIcon({
    className: "poi-emoji-icon",
    html: `<div class="poi-emoji" style="--poi-bg:${bg}">${emoji}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -14],
  });

function MapController({ selectedPoI, markerRefs }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedPoI) return;

    const center = [selectedPoI.lat, selectedPoI.lon];
    map.flyTo(center, 20, { duration: 1.1 });

    // Keep target visible to the right of the map, away from the left sidebar overlay.
    const panelWidthRaw = getComputedStyle(document.documentElement).getPropertyValue("--panel-width");
    const panelWidth = Number.parseFloat(panelWidthRaw) || 400;
    if (window.innerWidth > 900) {
      map.panBy([Math.round(panelWidth * 0.45), 0], { animate: true, duration: 0.6 });
    }

    const popupTimer = setTimeout(() => {
      const marker = markerRefs.current.get(selectedPoI.id);
      if (marker) marker.openPopup();
    }, 700);

    return () => clearTimeout(popupTimer);
  }, [selectedPoI, map, markerRefs]);

  return null;
}

function WheelZoomController({ enabled }) {
  const map = useMap();

  useEffect(() => {
    if (enabled) map.scrollWheelZoom.enable();
    else map.scrollWheelZoom.disable();
  }, [enabled, map]);

  return null;
}

function RouteController({ route }) {
  const map = useMap();

  useEffect(() => {
    if (route && route.length > 1) {
      const bounds = L.latLngBounds(route);
      map.fitBounds(bounds, { padding: [80, 80] });
    }
  }, [route, map]);

  return null;
}

function RecenterButton({ route }) {
  const map = useMap();

  if (!route) return null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (route && route.length > 1) {
          const bounds = L.latLngBounds(route);
          map.fitBounds(bounds, { padding: [80, 80] });
        }
      }}
      style={{
        position: "absolute",
        bottom: "30px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        background: "#ffffff",
        color: "#0f172a",
        border: "1px solid #e2e8f0",
        padding: "10px 20px",
        borderRadius: "24px",
        fontWeight: "600",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        transition: "transform 0.2s",
      }}
      onMouseOver={(e) => e.currentTarget.style.transform = "translateX(-50%) scale(1.05)"}
      onMouseOut={(e) => e.currentTarget.style.transform = "translateX(-50%) scale(1)"}
    >
      <span>🎯</span> Recenter
    </button>
  );
}

function WalkingAnimator({ route, onUpdate }) {
  const requestRef = useRef();
  const startTimeRef = useRef();

  useEffect(() => {
    if (!route || route.length < 2) return;
    
    startTimeRef.current = null;

    const animate = (time) => {
      if (!startTimeRef.current) startTimeRef.current = time;
      const duration = 8000; // 8 seconds walk duration
      const progress = Math.min((time - startTimeRef.current) / duration, 1);

      const start = route[0];
      const end = route[route.length - 1];
      
      const lat = start[0] + (end[0] - start[0]) * progress;
      const lon = start[1] + (end[1] - start[1]) * progress;

      onUpdate([lat, lon]);

      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [route, onUpdate]);

  return null;
}

export default function MapComponent({
  pois,
  selectedPoI,
  userLocation,
  routePolyline,
  onNavigate,
  disableWheelZoom,
}) {
  const defaultCenter = [7.18, 79.8845]; // CMB area
  const markerRefs = useRef(new Map());
  const [searchParams] = useSearchParams();
  const [simulatedLocation, setSimulatedLocation] = useState(null);
  const [isThreeD, setIsThreeD] = useState(false);

  // Parse URL parameters for navigation
  const urlUserLocation = useMemo(() => {
    const lat = parseFloat(searchParams.get("userLat"));
    const lon = parseFloat(searchParams.get("userLon"));
    return !isNaN(lat) && !isNaN(lon) ? [lat, lon] : null;
  }, [searchParams]);

  const urlDestLocation = useMemo(() => {
    const lat = parseFloat(searchParams.get("destLat"));
    const lon = parseFloat(searchParams.get("destLon"));
    return !isNaN(lat) && !isNaN(lon) ? [lat, lon] : null;
  }, [searchParams]);

  const activeUserLocation = userLocation || urlUserLocation;
  
  const activeRoute = useMemo(() => {
    if (routePolyline) return routePolyline;
    if (activeUserLocation && urlDestLocation) {
      return [activeUserLocation, urlDestLocation];
    }
    return null;
  }, [routePolyline, activeUserLocation, urlDestLocation]);

  // Reset simulation when route changes
  useEffect(() => {
    setSimulatedLocation(null);
  }, [activeRoute]);

  const displayUserLocation = simulatedLocation || activeUserLocation;

  const iconCache = useMemo(() => {
    const cache = {};
    for (const p of pois) {
      const meta = getCategoryMeta(p.category);
      cache[p.category] = cache[p.category] || emojiIcon(meta.emoji, meta.color);
    }
    return cache;
  }, [pois]);

  return (
    <div style={{ height: "100%", width: "100%", position: "absolute", top: 0, left: 0, zIndex: 0, overflow: "hidden" }}>
      <button
        onClick={() => setIsThreeD((v) => !v)}
        style={{
          position: "absolute",
          top: 22,
          right: 22,
          zIndex: 1200,
          border: "1px solid rgba(255,255,255,0.35)",
          background: "rgba(15,23,42,0.65)",
          color: "#fff",
          borderRadius: 999,
          padding: "8px 14px",
          fontWeight: "700",
          backdropFilter: "blur(8px)",
          cursor: "pointer",
        }}
      >
        {isThreeD ? "2D View" : "3D View"}
      </button>

      {/* Subtle dark overlay to make UI pop on satellite tiles */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: isThreeD
            ? "linear-gradient(180deg, rgba(0,0,0,0.36), rgba(0,0,0,0.18))"
            : "linear-gradient(180deg, rgba(0,0,0,0.28), rgba(0,0,0,0.10))",
          pointerEvents: "none",
          zIndex: 400,
        }}
      />

      <MapContainer
        center={defaultCenter}
        zoom={17}
        style={{
          height: "100%",
          width: "100%",
          transform: isThreeD ? "perspective(1400px) rotateX(34deg) scale(1.14)" : "none",
          transformOrigin: "center 75%",
          transition: "transform 360ms ease",
          filter: isThreeD ? "saturate(1.08) contrast(1.04)" : "none",
        }}
        zoomControl={false}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution="Tiles &copy; Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />

        <WheelZoomController enabled={!disableWheelZoom} />
        <MapController selectedPoI={selectedPoI} markerRefs={markerRefs} />
        <RouteController route={activeRoute} />
        <RecenterButton route={activeRoute} />
        
        {activeRoute && searchParams.get("navigation") === "true" && (
          <WalkingAnimator route={activeRoute} onUpdate={setSimulatedLocation} />
        )}

        {/* POIs */}
        {pois.map((poi) => (
          <Marker
            key={poi.id}
            ref={(marker) => {
              if (marker) markerRefs.current.set(poi.id, marker);
              else markerRefs.current.delete(poi.id);
            }}
            position={[poi.lat, poi.lon]}
            icon={iconCache[poi.category] || DefaultIcon}
          >
            <Popup className="glass-popup">
              <div style={{ width: 240 }}>
                <div
                  style={{
                    height: 110,
                    borderRadius: 12,
                    background: `url(${poi.image}) center/cover`,
                    border: "1px solid rgba(255,255,255,0.12)",
                    marginBottom: 10,
                  }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ fontSize: 18 }}>{getCategoryMeta(poi.category).emoji}</div>
                  <div style={{ fontWeight: 900, fontSize: 14, lineHeight: 1.2 }}>{poi.name}</div>
                </div>
                <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, marginBottom: 10 }}>
                  {poi.description}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  <span className="pill">{getCategoryMeta(poi.category).label}</span>
                  <span className="pill">{poi.floor}</span>
                </div>

                <button className="btn-primary" onClick={() => onNavigate(poi)} style={{ width: "100%" }}>
                  Navigate Here
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Destination Marker from URL */}
        {urlDestLocation && (
          <Marker position={urlDestLocation} icon={emojiIcon("🏁", "#ef4444")}>
            <Popup>{searchParams.get("search") || "Destination"}</Popup>
          </Marker>
        )}

        {/* User marker */}
        {displayUserLocation && (
          <Marker position={displayUserLocation} icon={emojiIcon("U", "#14b8a6")}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {/* Route */}
        {activeRoute && <Polyline positions={activeRoute} color="#14b8a6" weight={5} opacity={0.85} dashArray="10, 10" />}
      </MapContainer>
    </div>
  );
}
