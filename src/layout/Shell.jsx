import React from "react";
import { NavLink, Outlet } from "react-router-dom";

function TopNav() {
  const linkClass = ({ isActive }) => "navLink" + (isActive ? " active" : "");

  return (
    <div className="topNav">
      <div className="brand">
        <span className="dot" />
        <div>
          <div className="brandTitle">Aero Guide</div>
          <div className="brandSub">Airport navigation demo</div>
        </div>
      </div>

      <nav className="nav">
        <NavLink to="/" className={linkClass} end>
          Home
        </NavLink>
        <NavLink to="/map" className={linkClass}>
          Map
        </NavLink>
        <NavLink to="/flights" className={linkClass}>
          Flights
        </NavLink>
        <NavLink to="/help" className={linkClass}>
          Help
        </NavLink>
        <NavLink to="/about" className={linkClass}>
          About
        </NavLink>
      </nav>
    </div>
  );
}

function Footer() {
  return (
    <div className="footer">
      <span className="muted">Prototype UI | React + Vite | Leaflet</span>
      <span className="muted">(c) {new Date().getFullYear()} Aero Guide</span>
    </div>
  );
}

export default function Shell() {
  return (
    <div className="appFrame">
      <TopNav />
      <div className="content">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
