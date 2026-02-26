import React from 'react';

export default function AboutPage() {
  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <h2>About Aero Guide</h2>
          <p className="muted">AI-powered multilingual passenger navigation (prototype demo).</p>
        </div>
      </div>

      <div className="card" style={{ alignItems: 'stretch' }}>
        <div>
          <div className="cardTitle">What this demo shows</div>
          <ul className="list">
            <li>Flight search with basic status/terminal/gate info (mock data).</li>
            <li>POI discovery (amenities/services) and navigation route calculation (OSRM).</li>
            <li>Multilingual toggle (EN/SI) and accessible, high-contrast UI direction style.</li>
          </ul>
        </div>
      </div>

      <div className="callout">
        <b>Next:</b> Connect real flight data APIs, add indoor maps/floor plans, and integrate chatbot support.
      </div>
    </div>
  );
}
