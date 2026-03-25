import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { ReactElement } from 'react';
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import MapPage from './pages/MapPage.jsx';
import FlightsPage from './pages/FlightsPage.jsx';
import Overview from './pages/Overview.tsx';
import GuidePage from './pages/GuidePage.tsx';
import BoardingPassPage from './pages/BoardingPassPage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import Signup from './pages/Signup.tsx';
import ForgotPassword from './pages/ForgotPassword.tsx';
import PassengerHomePage from './pages/PassengerHomePage.tsx';
import { hasPassengerSession } from './services/passengerSession';
import { isAuthenticated } from './services/authSession';
import RightSideChatbot from './components/RightSideChatbot.tsx';


function RequireAuth({ children }: { children: ReactElement }) {
  const location = useLocation();
  const isSignedIn = isAuthenticated();
  if (!isSignedIn) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return children;
}

function RequirePassenger({ children }: { children: ReactElement }) {
  if (!hasPassengerSession()) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/flights" element={<FlightsPage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route
            path="/my-home"
            element={
              <RequireAuth>
                <RequirePassenger>
                  <PassengerHomePage />
                </RequirePassenger>
              </RequireAuth>
            }
          />
          <Route
            path="/boarding-pass"
            element={
              <RequireAuth>
                <RequirePassenger>
                  <BoardingPassPage />
                </RequirePassenger>
              </RequireAuth>
            }
          />
          <Route
            path="/journey"
            element={
              <RequireAuth>
                <RequirePassenger>
                  <BoardingPassPage />
                </RequirePassenger>
              </RequireAuth>
            }
          />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <RightSideChatbot />
      </>
    </BrowserRouter>
  );
}

export default App;
