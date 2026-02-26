import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { flights, pois } from "../mockData";
import { getCategoryMeta } from "../poiCatalog";
import ScanBoardingPass from "../components/ScanBoardingPass";


const heroImages = [
  "https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=1400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1524492412937-b33874b7a497?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&auto=format&fit=crop&q=80",
];

const zoneCards = [
  {
    title: "Departure Intelligence",
    tag: "Flow Control",
    desc: "Live gate readiness, queue pressure, and direction prompts from one view.",
    image: "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=1400&auto=format&fit=crop&q=80",
  },
  {
    title: "Retail and Dining View",
    tag: "Passenger Comfort",
    desc: "Discover nearby coffee, food, pharmacies, and service points in seconds.",
    image: "https://images.unsplash.com/photo-1504940892017-d23b9053d5d4?w=1400&auto=format&fit=crop&q=80",
  },
  {
    title: "Assistance at Hand",
    tag: "Safety Layer",
    desc: "Emergency actions and support routing designed for crowded terminal moments.",
    image: "https://images.unsplash.com/photo-1531065208531-4036c0dba3ca?w=1400&auto=format&fit=crop&q=80",
  },
];

const journeySteps = [
  {
    title: "Check Flight",
    detail: "Passenger searches flight and sees gate plus terminal context instantly.",
  },
  {
    title: "Pick Amenity",
    detail: "A quick tap on Toilets, Help Desk, Lounge, or ATM sets the destination.",
  },
  {
    title: "Get Live Route",
    detail: "Map zooms to target and draws walking route with turn instructions.",
  },
  {
    title: "Arrive Faster",
    detail: "Passenger follows step-by-step guidance with fewer wrong turns.",
  },
];

const quickLinks = [
  { to: "/map", title: "Open Live Map", detail: "Navigate terminal points and routes." },
  { to: "/flights", title: "Track Flights", detail: "Search by number, city, or gate." },
  { to: "/help", title: "Emergency and Help", detail: "Open support workflows quickly." },
  { to: "/about", title: "Project Scope", detail: "See what this demo includes next." },
];

export default function HomePage() {
  const stats = useMemo(() => {
    const delayedCount = flights.filter((f) => f.status === "Delayed").length;
    const gateCount = new Set(flights.map((f) => f.gate)).size;

    return [
      { label: "Active flights", value: String(flights.length).padStart(2, "0") },
      { label: "Tracked gates", value: String(gateCount).padStart(2, "0") },
      { label: "Amenities mapped", value: String(pois.length).padStart(2, "0") },
      { label: "Delayed now", value: String(delayedCount).padStart(2, "0") },
    ];
  }, []);

  const spotlight = useMemo(() => pois.slice(0, 8), []);

  return (
    <div className="page homePage">
      <section className="homeHero animate-fade-in">
        <div className="homeAmbient homeAmbientA" />
        <div className="homeAmbient homeAmbientB" />

        <div className="homeHeroCopy">
          <div className="homeEyebrow">Airport Experience Layer</div>
          <h1 className="homeTitle">A cinematic command center for airport movement.</h1>
          <p className="homeLead">
            Aero Guide combines flights, amenities, and real-time walking guidance so passengers move with confidence
            from curb to gate.
          </p>
          <div className="homeActions">
            <Link to="/map" className="homeBtn homeBtnPrimary">
              Start Navigation
            </Link>
            <Link to="/flights" className="homeBtn">
              Browse Flights
            </Link>
            <ScanBoardingPass />
          </div>
        </div>

        <div className="homeMosaic">
          {heroImages.map((image, index) => (
            <div key={image} className={`homeMosaicTile homeMosaicTile${index + 1}`} style={{ backgroundImage: `url(${image})` }} />
          ))}
          <div className="homeMosaicBadge">
            <span>Live indoor wayfinding</span>
            <strong>Zoom + Route + Instructions</strong>
          </div>
        </div>
      </section>

      <section className="homeMetricStrip animate-fade-in" style={{ animationDelay: "0.06s" }}>
        {stats.map((item) => (
          <article key={item.label} className="homeMetricCard">
            <div className="homeMetricValue">{item.value}</div>
            <div className="homeMetricLabel">{item.label}</div>
          </article>
        ))}
      </section>

      <section className="homeSection animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div className="homeSectionHead">
          <h2>Visual Ops Panels</h2>
          <p className="muted">Image-rich modules that make terminal decisions faster under pressure.</p>
        </div>
        <div className="homeVisualGrid">
          {zoneCards.map((card, index) => (
            <article key={card.title} className="homeVisualCard" style={{ animationDelay: `${0.12 + index * 0.05}s` }}>
              <div className="homeVisualImage" style={{ backgroundImage: `url(${card.image})` }} />
              <div className="homeVisualShade" />
              <div className="homeVisualBody">
                <div className="homeVisualTag">{card.tag}</div>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="homeSection animate-fade-in" style={{ animationDelay: "0.16s" }}>
        <div className="homeSectionHead">
          <h2>Passenger Journey</h2>
          <p className="muted">From search to arrival in four simple moments.</p>
        </div>

        <div className="homeJourneyWrap">
          <div className="homeJourney">
            {journeySteps.map((step, index) => (
              <div key={step.title} className="homeJourneyStep">
                <div className="homeJourneyIndex">{index + 1}</div>
                <div>
                  <div className="homeJourneyTitle">{step.title}</div>
                  <div className="homeJourneyDetail">{step.detail}</div>
                </div>
              </div>
            ))}
          </div>

          <aside className="homeFlightBoard">
            <h3>Demo Flight Board</h3>
            {flights.map((flight) => (
              <div key={flight.flightNo} className="homeFlightRow">
                <div>
                  <div className="homeFlightNo">{flight.flightNo}</div>
                  <div className="homeFlightTo">{flight.to}</div>
                </div>
                <div className={`homeFlightState ${flight.status === "Delayed" ? "delay" : "ontime"}`}>{flight.status}</div>
              </div>
            ))}
            <Link to="/flights" className="homeBoardLink">
              Open full flights view
            </Link>
          </aside>
        </div>
      </section>

      <section className="homeSection animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <div className="homeSectionHead">
          <h2>Amenities Spotlight</h2>
          <p className="muted">Tap any destination in the map and get route guidance instantly.</p>
        </div>
        <div className="homeSpotlightGrid">
          {spotlight.map((poi) => {
            const meta = getCategoryMeta(poi.category);
            return (
              <article key={poi.id} className="homeSpotCard">
                <div className="homeSpotImage" style={{ backgroundImage: `url(${poi.image})` }} />
                <div className="homeSpotMeta">
                  <div>
                    <div className="homeSpotName">{poi.name}</div>
                    <div className="homeSpotFloor">{poi.floor}</div>
                  </div>
                  <div className="homeSpotTag">{meta.emoji} {meta.label}</div>
                </div>
                <Link to="/map" className="homeSpotAction">
                  Navigate
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="homeBand animate-fade-in" style={{ animationDelay: "0.25s" }}>
        <div>
          <h2>Ready to move through the terminal faster?</h2>
          <p className="muted">Choose a module below and jump into the live experience.</p>
        </div>
        <div className="homeBandLinks">
          {quickLinks.map((item) => (
            <Link key={item.to} to={item.to} className="homeBandLink">
              <div className="homeBandLinkTitle">{item.title}</div>
              <div className="homeBandLinkDetail">{item.detail}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
