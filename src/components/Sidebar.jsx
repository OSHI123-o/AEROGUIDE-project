import React, { useEffect, useMemo, useState } from "react";
import { CATEGORY_ORDER, getCategoryMeta } from "../poiCatalog";

export default function Sidebar({
  onSearch,
  flightData,
  onNavigatePoi,
  onSidebarHoverChange,
  language,
  setLanguage,
  navigationSteps,
  onNavigateToGate,
  pois,
  poiQuery,
  setPoiQuery,
  activeCategories,
  toggleCategory,
  setAllCategories,
  clearAllCategories,
}) {
  const [flightInput, setFlightInput] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const query = flightInput.trim();
    if (!query) return;
    setHasSearched(true);
    onSearch?.(query);
  };

  const calculateRemainingTime = (targetDateStr) => {
    if (!targetDateStr) return "Unknown";
    const target = new Date(targetDateStr);
    if (Number.isNaN(target.getTime())) return "Unknown";

    const diffMs = target.getTime() - currentTime.getTime();
    if (diffMs <= 0) return "Departed";

    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    return `${diffHrs}h ${diffMins}m`;
  };

  const t = {
    en: {
      title: "Aero Guide",
      searchPlaceholder: "Flight No (e.g. UL403)",
      searchBtn: "Search",
      flightDetails: "Flight Details",
      terminal: "Terminal",
      gate: "Gate",
      remaining: "Departs in",
      pois: "Amenities and Services",
      notFound: "Flight not found",
      navToGate: "Go to Gate",
      instructions: "Live Navigation",
      arrive: "Arrive at destination",
      quickFilters: "Quick filters",
      searchAmenities: "Search amenities (e.g. Wi-Fi, ATM, toilets)",
      showAll: "Show all",
      hideAll: "Hide all",
      results: "Results",
      navigate: "Navigate",
      floors: "Floors",
    },
    si: {
      title: "Aero Guide",
      searchPlaceholder: "Flight No (e.g. UL403)",
      searchBtn: "Search",
      flightDetails: "Flight Details",
      terminal: "Terminal",
      gate: "Gate",
      remaining: "Departs in",
      pois: "Amenities and Services",
      notFound: "Flight not found",
      navToGate: "Go to Gate",
      instructions: "Live Navigation",
      arrive: "Arrive at destination",
      quickFilters: "Quick filters",
      searchAmenities: "Search amenities (e.g. Wi-Fi, ATM, toilets)",
      showAll: "Show all",
      hideAll: "Hide all",
      results: "Results",
      navigate: "Navigate",
      floors: "Floors",
    },
    ta: {
      title: "Aero Guide",
      searchPlaceholder: "விமான எண் (உதா: UL403)",
      searchBtn: "தேடு",
      flightDetails: "விமான விவரங்கள்",
      terminal: "டெர்மினல்",
      gate: "கேட்",
      remaining: "புறப்படும் நேரம்",
      pois: "சேவைகள் மற்றும் வசதிகள்",
      notFound: "விமானம் கிடைக்கவில்லை",
      navToGate: "கேட் செல்லவும்",
      instructions: "நேரடி வழிசெலுத்தல்",
      arrive: "இலக்கை அடைந்துவிட்டீர்கள்",
      quickFilters: "விரைவு வடிகட்டிகள்",
      searchAmenities: "வசதிகள் தேடு (Wi-Fi, ATM, கழிப்பறை)",
      showAll: "அனைத்தும்",
      hideAll: "மறை",
      results: "முடிவுகள்",
      navigate: "வழிசெல்",
      floors: "அடுக்கு",
    },
  };

  const strings = t[language] || t.en;

  const formatInstruction = (step) => {
    const m = step?.maneuver || {};
    let text = m.type || "Continue";
    if (m.modifier) text += ` ${m.modifier}`;
    if (step?.name) text += ` on ${step.name}`;
    if (m.type === "arrive") text = strings.arrive;
    return text;
  };

  const availableCategories = useMemo(() => {
    const set = new Set((pois || []).map((p) => p.category));
    return CATEGORY_ORDER.filter((c) => set.has(c));
  }, [pois]);

  return (
    <div
      className="glass-panel"
      onMouseEnter={() => onSidebarHoverChange?.(true)}
      onMouseLeave={() => onSidebarHoverChange?.(false)}
      onTouchStart={() => onSidebarHoverChange?.(true)}
      onTouchEnd={() => onSidebarHoverChange?.(false)}
      style={{
        width: "var(--panel-width)",
        height: "100%",
        padding: "1.25rem",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        position: "relative",
        zIndex: 1000,
        overflowY: "auto",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.5rem",
              fontWeight: 900,
              background: "linear-gradient(to right, #14b8a6, #f59e0b)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.5px",
            }}
          >
            {strings.title}
          </h1>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Airport amenities - live map</div>
        </div>

        <button
          type="button"
          onClick={() => setLanguage?.((l) => (l === "en" ? "si" : l === "si" ? "ta" : "en"))}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "white",
            padding: "0.35rem 0.7rem",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: 800,
            fontSize: "0.75rem",
          }}
        >
          {(language || "en").toUpperCase()}
        </button>
      </header>

      <section className="animate-fade-in" style={{ animationDelay: "0.05s" }}>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.6rem", marginBottom: "0.75rem" }}>
          <input
            type="text"
            value={flightInput}
            onChange={(e) => setFlightInput(e.target.value)}
            placeholder={strings.searchPlaceholder}
            className="searchInput"
          />
          <button type="submit" className="btn-primary">
            {strings.searchBtn}
          </button>
        </form>

        {flightData && (
          <div className="glass-card" style={{ padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h3 style={{ margin: 0, color: "#14b8a6" }}>{strings.flightDetails}</h3>
              <span
                style={{
                  background: flightData.status === "Delayed" ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)",
                  color: flightData.status === "Delayed" ? "#ef4444" : "#22c55e",
                  padding: "0.2rem 0.55rem",
                  borderRadius: "20px",
                  fontSize: "0.75rem",
                  fontWeight: 900,
                }}
              >
                {flightData.status}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.9rem" }}>
              <div>
                <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>Flight</div>
                <div style={{ fontWeight: 900, fontSize: "1.05rem" }}>{flightData.flightNo}</div>
              </div>
              <div>
                <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>To</div>
                <div style={{ fontWeight: 900, fontSize: "1.05rem" }}>{flightData.to.split(" ")[0]}</div>
              </div>

              <div>
                <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>{strings.terminal}</div>
                <div style={{ fontWeight: 800 }}>{flightData.terminal}</div>
              </div>
              <div>
                <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>{strings.gate}</div>
                <div style={{ fontWeight: 900, color: "#f59e0b" }}>{flightData.gate}</div>
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>{strings.remaining}</div>
                <div style={{ fontWeight: 900, fontSize: "1.1rem" }}>{calculateRemainingTime(flightData.schedDeparture)}</div>
              </div>
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{
                width: "100%",
                marginTop: "0.8rem",
                background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
              }}
              onClick={() => onNavigateToGate?.(flightData)}
            >
              {strings.navToGate}
            </button>
          </div>
        )}

        {flightData === null && hasSearched && (
          <div style={{ color: "#ef4444", marginTop: "0.5rem", textAlign: "center", fontWeight: 800 }}>
            {strings.notFound}
          </div>
        )}
      </section>

      {navigationSteps.length > 0 && (
        <section className="animate-fade-in">
          <h3 style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.75rem", color: "#14b8a6", marginTop: 0 }}>
            {strings.instructions}
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
            {navigationSteps.map((step, idx) => (
              <div
                key={idx}
                style={{
                  padding: "0.85rem",
                  background: idx === 0 ? "rgba(20, 184, 166, 0.16)" : "rgba(255,255,255,0.03)",
                  borderLeft: idx === 0 ? "3px solid #14b8a6" : "3px solid transparent",
                  borderRadius: "0 8px 8px 0",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.85rem",
                }}
              >
                <div style={{ fontSize: "1.2rem", fontWeight: 900, color: idx === 0 ? "#14b8a6" : "rgba(255,255,255,0.3)" }}>{idx + 1}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "0.9rem", marginBottom: "0.2rem" }}>{formatInstruction(step)}</div>
                  <div style={{ fontSize: "0.78rem", color: "#94a3b8", display: "flex", gap: "0.8rem" }}>
                    <span>Distance: {Math.round(step.distance)}m</span>
                    <span>ETA: {Math.round(step.duration)}s</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!navigationSteps.length && (
        <section className="animate-fade-in" style={{ animationDelay: "0.12s", flex: 1 }}>
          <h3
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              paddingBottom: "0.75rem",
              color: "#94a3b8",
              fontSize: "0.85rem",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginTop: 0,
            }}
          >
            {strings.pois}
          </h3>

          <input
            className="searchInput"
            value={poiQuery}
            onChange={(e) => setPoiQuery(e.target.value)}
            placeholder={strings.searchAmenities}
            style={{ marginTop: 10, marginBottom: 12 }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 900 }}>{strings.quickFilters}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="secondaryBtn" onClick={setAllCategories}>
                {strings.showAll}
              </button>
              <button type="button" className="secondaryBtn" onClick={clearAllCategories}>
                {strings.hideAll}
              </button>
            </div>
          </div>

          <div className="chipRow" style={{ marginBottom: 12 }}>
            {availableCategories.map((cat) => {
              const meta = getCategoryMeta(cat);
              const isActive = activeCategories.has(cat);
              return (
                <button
                  type="button"
                  key={cat}
                  className={"chip" + (isActive ? " active" : "")}
                  onClick={() => toggleCategory(cat)}
                  title={meta.label}
                >
                  <span>{meta.emoji}</span>
                  <span style={{ whiteSpace: "nowrap" }}>{meta.label}</span>
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 900 }}>
              {strings.results}: <span style={{ color: "#14b8a6" }}>{pois.length}</span>
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{strings.floors}</div>
          </div>

          <div className="poiList">
            {pois.map((poi) => {
              const meta = getCategoryMeta(poi.category);
              return (
                <div key={poi.id} className="poiRow" onClick={() => onNavigatePoi?.(poi)}>
                  <div className="poiThumb" style={{ backgroundImage: `url(${poi.image})` }}>
                    <div className="poiBadge">{meta.emoji}</div>
                  </div>

                  <div className="poiMeta">
                    <div className="poiName">{poi.name}</div>
                    <div className="poiDesc">{poi.description}</div>
                    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span className="pill">{meta.label}</span>
                      <span className="pill">{poi.floor}</span>
                    </div>
                  </div>

                  <div className="poiRight">
                    <div className="smallTag">{poi.distanceM != null ? `${poi.distanceM}m` : ""}</div>
                    <button
                      type="button"
                      className="secondaryBtn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigatePoi?.(poi);
                      }}
                    >
                      {strings.navigate}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div style={{ fontSize: "0.75rem", color: "#475569", textAlign: "center", marginTop: "auto" }}>
        Aero Guide Live - Amenities Layer
      </div>
    </div>
  );
}
