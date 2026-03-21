import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Shell from './layout/Shell';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import FlightsPage from './pages/FlightsPage';
import EmergencyPage from './pages/EmergencyPage';
import AboutPage from './pages/AboutPage';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/flights" element={<FlightsPage />} />
        <Route path="/help" element={<EmergencyPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
