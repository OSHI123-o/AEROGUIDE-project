import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage.jsx';
import FlightsPage from './pages/FlightsPage.jsx';
import Overview from './pages/Overview';
import GuidePage from './pages/GuidePage';
import BoardingPassPage from './pages/BoardingPassPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/overview" element={<Overview />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/flights" element={<FlightsPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/boarding-pass" element={<BoardingPassPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
