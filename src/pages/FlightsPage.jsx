import React, { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";

// Enhanced Mock Data for CMB (Bandaranaike International Airport)
const FLIGHT_DATA = [
  { id: "UL403", pnr: "AG1234", airline: "SriLankan Airlines", code: "UL", flightNo: "UL403", city: "Singapore (SIN)", time: "12:30", est: "12:30", status: "Boarding", gate: "A12", terminal: "T1", type: "departure", checkin: "12-15", baggage: "-" },
  { id: "EK654", pnr: "AG5678", airline: "Emirates", code: "EK", flightNo: "EK654", city: "Dubai (DXB)", time: "13:20", est: "14:10", status: "Delayed", gate: "B04", terminal: "T1", type: "departure", checkin: "20-22", baggage: "-" },
  { id: "QR662", pnr: "AG9012", airline: "Qatar Airways", code: "QR", flightNo: "QR662", city: "Doha (DOH)", time: "14:15", est: "14:15", status: "Check-in Open", gate: "C05", terminal: "T1", type: "departure", checkin: "08-10", baggage: "-" },
  { id: "6E1172", pnr: "AG9012", airline: "IndiGo", code: "6E", flightNo: "6E1172", city: "Chennai (MAA)", time: "15:00", est: "15:00", status: "Scheduled", gate: "A09", terminal: "T1", type: "departure", checkin: "05-07", baggage: "-" },
  { id: "UL121", pnr: "AG3456", airline: "SriLankan Airlines", code: "UL", flightNo: "UL121", city: "Chennai (MAA)", time: "16:45", est: "16:45", status: "Scheduled", gate: "A14", terminal: "T1", type: "departure", checkin: "16-18", baggage: "-" },
  { id: "FZ558", pnr: "AG5678", airline: "flydubai", code: "FZ", flightNo: "FZ558", city: "Dubai (DXB)", time: "01:10", est: "01:10", status: "Scheduled", gate: "B02", terminal: "T1", type: "departure", checkin: "30-32", baggage: "-" },
  { id: "UL504", pnr: "AG1234", airline: "SriLankan Airlines", code: "UL", flightNo: "UL504", city: "London (LHR)", time: "12:45", est: "12:38", status: "Landed", gate: "A06", terminal: "T1", type: "arrival", checkin: "-", baggage: "Belt 04" },
  { id: "SQ468", pnr: "AG9012", airline: "Singapore Airlines", code: "SQ", flightNo: "SQ468", city: "Singapore (SIN)", time: "14:00", est: "14:00", status: "On Approach", gate: "C12", terminal: "T1", type: "arrival", checkin: "-", baggage: "Belt 02" },
  { id: "AI273", pnr: "AG3456", airline: "Air India", code: "AI", flightNo: "AI273", city: "Delhi (DEL)", time: "15:30", est: "15:45", status: "Delayed", gate: "B01", terminal: "T1", type: "arrival", checkin: "-", baggage: "Belt 05" },
  { id: "UL102", pnr: "AG5678", airline: "SriLankan Airlines", code: "UL", flightNo: "UL102", city: "Male (MLE)", time: "16:15", est: "16:15", status: "Scheduled", gate: "A04", terminal: "T1", type: "arrival", checkin: "-", baggage: "Belt 01" },
];

const STATUS_STYLES = {
  "Boarding": "status-boarding",
  "Delayed": "status-delayed",
  "Check-in Open": "status-active",
  "Scheduled": "status-neutral",
  "Landed": "status-success",
  "On Approach": "status-info",
  "Departed": "status-neutral",
  "Gate Closed": "status-warning",
};

export default function FlightsPage() {
  const [searchParams] = useSearchParams();
  const pnrParam = (searchParams.get("pnr") || "").trim().toUpperCase();
  const [themeMode, setThemeMode] = useState(() => (localStorage.getItem("aeroguide_theme") === "dark" ? "dark" : "light"));
  const [activeTab, setActiveTab] = useState("departure");
  const [search, setSearch] = useState(searchParams.get("search") || pnrParam);
  const [flights, setFlights] = useState(FLIGHT_DATA);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time simulation effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      
      setFlights(prev => prev.map(flight => {
        // Randomly update status for demo effect
        if (Math.random() > 0.95) {
          if (flight.status === "Scheduled" && flight.type === "departure") return { ...flight, status: "Check-in Open" };
          if (flight.status === "Check-in Open") return { ...flight, status: "Boarding" };
          if (flight.status === "Boarding") return { ...flight, status: "Gate Closed" };
          if (flight.status === "On Approach") return { ...flight, status: "Landed" };
        }
        return flight;
      }));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Sync search with URL params if they change
  useEffect(() => {
    localStorage.setItem("aeroguide_theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    const query = searchParams.get("search");
    const pnrQ = searchParams.get("pnr");
    if (query !== null) {
      setSearch(query);
    } else if (pnrQ !== null) {
      setSearch(pnrQ);
    }
  }, [searchParams]);

  const filteredFlights = useMemo(() => {
    const q = search.toLowerCase();
    const isPnrMode = pnrParam.length > 0;
    return flights.filter(f => 
      (isPnrMode ? f.pnr.toUpperCase() === pnrParam : f.type === activeTab) &&
      (
        f.flightNo.toLowerCase().includes(q) ||
        f.city.toLowerCase().includes(q) ||
        f.airline.toLowerCase().includes(q) ||
        f.pnr.toLowerCase().includes(q)
      )
    );
  }, [flights, activeTab, search, pnrParam]);

  return (
    <div className={`page flightsPage ${themeMode}`}>
      <div className="flightsBackground">
        <div className="flightsOverlay"></div>
      </div>

      <div className="flightsContainer animate-fade-in">
        <div className="searchHero">
          <div className="heroContent">
            <h1>Track your flight</h1>
            <p>Real-time updates for arrivals and departures at CMB</p>
            
            <div className="bigSearchBox">
              <span className="searchIcon">✈️</span>
              <input 
                type="text" 
                placeholder="Search by Flight No, PNR, or City..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            {pnrParam ? (
              <p style={{ marginTop: 8, fontSize: "0.9rem", color: "#475569" }}>
                Showing all flights for PNR: <strong>{pnrParam}</strong>
              </p>
            ) : null}
          </div>
        </div>

        <div className="glassBox controlsBar">
          <div className="tabGroup">
            <button 
              className={`tabBtn ${activeTab === 'departure' ? 'active' : ''}`}
              onClick={() => setActiveTab('departure')}
              disabled={pnrParam.length > 0}
            >
              Departures
            </button>
            <button 
              className={`tabBtn ${activeTab === 'arrival' ? 'active' : ''}`}
              onClick={() => setActiveTab('arrival')}
              disabled={pnrParam.length > 0}
            >
              Arrivals
            </button>
          </div>
          
          <div className="liveIndicator">
            <span className="pulseDot"></span> Live Updates • {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </div>
          <button
            onClick={() => setThemeMode((p) => (p === "light" ? "dark" : "light"))}
            aria-label={themeMode === "light" ? "Switch to dark mode" : "Switch to light mode"}
            title={themeMode === "light" ? "Switch to dark mode" : "Switch to light mode"}
            style={{
              border: "1px solid rgba(148,163,184,0.4)",
              borderRadius: 10,
              width: 40,
              height: 40,
              background: themeMode === "dark" ? "rgba(15,23,42,0.9)" : "rgba(255,255,255,0.9)",
              color: themeMode === "dark" ? "#e2e8f0" : "#0f172a",
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            {themeMode === "light" ? "🌙" : "☀️"}
          </button>
        </div>

        <div className="flightsGrid">
          {filteredFlights.map(flight => (
            <div key={flight.id} className="glassBox flightCard">
              <div className="cardLeft">
                <div className="airlineLogo">{flight.code}</div>
                <div className="flightInfo">
                  <div className="flightNo">{flight.flightNo}</div>
                  <div className="airlineName">{flight.airline}</div>
                </div>
              </div>
              
              <div className="cardCenter">
                <div className="routeInfo">
                  <div className="city">{flight.city}</div>
                  <div className="timeGroup">
                    <span className="schedTime">{flight.time}</span>
                    {flight.est !== flight.time && <span className="estTime">Est {flight.est}</span>}
                  </div>
                </div>
              </div>

              <div className="cardRight">
                <div className={`statusBadge ${STATUS_STYLES[flight.status] || 'status-neutral'}`}>
                  {flight.status}
                </div>
                <div className="detailsGroup">
                  <div className="detailItem">
                    <span className="detailLabel">Gate</span>
                    <span className="detailValue">{flight.gate}</span>
                  </div>
                  {flight.type === 'arrival' ? (
                    <div className="detailItem">
                      <span className="detailLabel">Baggage</span>
                      <span className="detailValue">{flight.baggage}</span>
                    </div>
                  ) : (
                    <div className="detailItem">
                      <span className="detailLabel">Check-in</span>
                      <span className="detailValue">{flight.checkin}</span>
                    </div>
                  )}
                </div>
                <Link to={`/map?gate=${flight.gate}`} className="trackBtn">Find Gate</Link>
              </div>
            </div>
          ))}
          
          {filteredFlights.length === 0 && (
            <div className="emptyState">
              No flights found matching "{search}"
            </div>
          )}
        </div>
      </div>

      <style>{`
        .flightsPage {
          position: relative;
          min-height: 100vh;
          color: #1e293b;
          padding-bottom: 4rem;
        }
        .flightsPage.dark {
          color: #e2e8f0;
        }
        .flightsBackground {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: url('https://images.unsplash.com/photo-1570710891163-6d3b5c47248b?q=80&w=2070&auto=format&fit=crop');
          background-size: cover;
          background-position: center;
          z-index: -1;
        }
        .flightsOverlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(241, 245, 249, 0.85), rgba(248, 250, 252, 0.95));
          backdrop-filter: blur(4px);
        }
        .flightsPage.dark .flightsOverlay {
          background: linear-gradient(to bottom, rgba(2, 6, 23, 0.82), rgba(15, 23, 42, 0.92));
        }
        .flightsContainer {
          position: relative;
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem;
          z-index: 1;
        }
        
        .searchHero {
          text-align: center;
          margin-bottom: 3rem;
          padding: 2rem 0;
        }
        .heroContent h1 {
          font-size: 3rem;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }
        .flightsPage.dark .heroContent h1 { color: #e2e8f0; }
        .heroContent p {
          color: #64748b;
          font-size: 1.1rem;
          margin-bottom: 2rem;
        }
        .flightsPage.dark .heroContent p { color: #94a3b8; }
        .bigSearchBox {
          max-width: 600px;
          margin: 0 auto;
          position: relative;
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          padding: 8px 16px;
          border: 1px solid rgba(0,0,0,0.05);
        }
        .flightsPage.dark .bigSearchBox {
          background: rgba(15, 23, 42, 0.9);
          border-color: rgba(148, 163, 184, 0.2);
        }
        .bigSearchBox input {
          width: 100%;
          border: none;
          padding: 16px;
          font-size: 1.2rem;
          outline: none;
          color: #1e293b;
        }
        .flightsPage.dark .bigSearchBox input {
          background: transparent;
          color: #e2e8f0;
        }
        .searchIcon {
          font-size: 1.5rem;
          margin-right: 8px;
        }

        .glassBox {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 24px;
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.1);
        }
        .flightsPage.dark .glassBox {
          background: rgba(15, 23, 42, 0.62);
          border-color: rgba(148, 163, 184, 0.2);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
        }
        
        .controlsBar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
          padding: 1rem;
        }
        .tabGroup {
          display: flex;
          background: rgba(226, 232, 240, 0.6);
          padding: 4px;
          border-radius: 12px;
        }
        .flightsPage.dark .tabGroup { background: rgba(30, 41, 59, 0.9); }
        .tabBtn {
          padding: 10px 24px;
          border: none;
          background: transparent;
          color: #64748b;
          font-weight: 600;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .flightsPage.dark .tabBtn { color: #94a3b8; }
        .tabBtn.active {
          background: #fff;
          color: #0f172a;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .flightsPage.dark .tabBtn.active {
          background: #1e293b;
          color: #e2e8f0;
        }
        
        .liveIndicator {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #ef4444;
          font-size: 0.85rem;
          font-weight: 700;
        }
        .pulseDot {
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        .flightsGrid {
          display: grid;
          gap: 1rem;
        }
        .flightCard {
          display: grid;
          grid-template-columns: 1.5fr 2fr 1.5fr;
          align-items: center;
          padding: 1.5rem;
          transition: all 0.2s;
          background: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.5);
        }
        .flightsPage.dark .flightCard {
          background: rgba(15, 23, 42, 0.58);
          border-color: rgba(148, 163, 184, 0.2);
        }
        .flightCard:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.9);
          border-color: rgba(255, 255, 255, 0.8);
        }
        .flightsPage.dark .flightCard:hover { background: rgba(30, 41, 59, 0.82); }
        
        .cardLeft {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .airlineLogo {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.2rem;
          color: white;
          box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
        }
        .flightInfo {
          display: flex;
          flex-direction: column;
        }
        .flightNo {
          font-size: 1.2rem;
          font-weight: 800;
          color: #0f172a;
        }
        .flightsPage.dark .flightNo { color: #e2e8f0; }
        .airlineName {
          font-size: 0.85rem;
          color: #64748b;
        }
        .flightsPage.dark .airlineName { color: #94a3b8; }

        .cardCenter {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .city {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 4px;
          color: #1e293b;
        }
        .flightsPage.dark .city { color: #cbd5e1; }
        .timeGroup {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .schedTime {
          font-size: 1.5rem;
          font-weight: 300;
          letter-spacing: -0.5px;
          color: #334155;
        }
        .flightsPage.dark .schedTime { color: #e2e8f0; }
        .estTime {
          font-size: 0.85rem;
          color: #d97706;
          font-weight: 600;
        }

        .cardRight {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 1.5rem;
        }
        .statusBadge {
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .status-boarding { background: rgba(249, 115, 22, 0.15); color: #c2410c; }
        .status-delayed { background: rgba(239, 68, 68, 0.15); color: #b91c1c; }
        .status-active { background: rgba(59, 130, 246, 0.15); color: #1d4ed8; }
        .status-success { background: rgba(34, 197, 94, 0.15); color: #15803d; }
        .status-neutral { background: rgba(148, 163, 184, 0.15); color: #475569; }
        .status-warning { background: rgba(234, 179, 8, 0.15); color: #a16207; }
        
        .detailsGroup {
          display: flex;
          gap: 1.5rem;
          text-align: center;
        }
        .detailLabel {
          display: block;
          font-size: 0.7rem;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 700;
        }
        .flightsPage.dark .detailLabel { color: #94a3b8; }
        .detailValue {
          font-size: 1.2rem;
          font-weight: 800;
          color: #0f172a;
        }
        .flightsPage.dark .detailValue { color: #e2e8f0; }
        
        .trackBtn {
          padding: 8px 16px;
          background: #0f172a;
          border-radius: 8px;
          color: white;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.2s;
        }
        .flightsPage.dark .trackBtn { background: #2563eb; }
        .trackBtn:hover {
          background: #334155;
          color: white;
        }

        .emptyState {
          text-align: center;
          padding: 4rem;
          color: #64748b;
          font-size: 1.1rem;
          background: rgba(255, 255, 255, 0.4);
          border-radius: 16px;
        }
        .flightsPage.dark .emptyState {
          background: rgba(15, 23, 42, 0.65);
          color: #94a3b8;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }

        @media (max-width: 768px) {
          .flightCard {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          .cardRight {
            justify-content: space-between;
            border-top: 1px solid rgba(203, 213, 225, 0.3);
            padding-top: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
