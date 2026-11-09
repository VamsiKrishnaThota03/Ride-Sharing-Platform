import React, { useCallback, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Signup from './components/Signup';
import TravelerDashboard from './components/TravelerDashboard';
import CompanionDashboard from './components/CompanionDashboard';
import AdminDashboard from './components/AdminDashboard';
import TravelerMap from './components/TravelerMap';
import Profile from './components/Profile';
import { clearSession, dashboardPath, getSession } from './utils/auth';

// Renders children for a logged-in user with one of the allowed roles.
const RequireAuth = ({ session, roles, children }) => {
  const location = useLocation();
  if (!session) return <Navigate to="/" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(session.role)) return <Navigate to={dashboardPath(session.role)} replace />;
  return children;
};

function App() {
  const [session, setSession] = useState(() => getSession());

  const handleLogin = useCallback(() => setSession(getSession()), []);
  const handleLogout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  return (
    <Router>
      <Navbar session={session} onLogout={handleLogout} />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Login session={session} onLogin={handleLogin} />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/signup" element={<Signup session={session} />} />
          <Route
            path="/traveler-dashboard"
            element={<RequireAuth session={session}><TravelerDashboard session={session} /></RequireAuth>}
          />
          <Route
            path="/companion-dashboard"
            element={<RequireAuth session={session} roles={['traveler_companion']}><CompanionDashboard /></RequireAuth>}
          />
          <Route
            path="/admin-dashboard"
            element={<RequireAuth session={session} roles={['admin']}><AdminDashboard /></RequireAuth>}
          />
          <Route path="/map" element={<RequireAuth session={session}><div className="container py-4"><TravelerMap /></div></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth session={session}><Profile onLogout={handleLogout} /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
