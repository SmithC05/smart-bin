import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PollingProvider } from './context/PollingContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout          from './components/layout/Layout'
import LandingPage     from './pages/LandingPage'
import Dashboard       from './pages/Dashboard'
import BinMap          from './pages/BinMap'
import BinManagement   from './pages/BinManagement'
import Vehicles        from './pages/Vehicles'
import Alerts          from './pages/Alerts'
import Staff           from './pages/Staff'
import Settings        from './pages/Settings'
import Login           from './pages/Login'
import Schedules       from './pages/Schedules'
import Notifications   from './pages/Notifications'
import DriverDashboard from './pages/DriverDashboard'
import FieldWorkerDashboard from './pages/FieldWorkerDashboard'
import AuditLogs       from './pages/AuditLogs'
import Reports         from './pages/Reports'
import DemoSimulation  from './pages/DemoSimulation'

const PrivateRoute = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <AuthProvider>
      <PollingProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/"      element={<LandingPage />} />
            <Route path="/login" element={<Login />} />

            {/* Authenticated ERP — all under /app */}
            <Route path="/app" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index         element={<Dashboard />} />
              <Route path="map"      element={<BinMap />} />
              <Route path="bins"     element={<BinManagement />} />
              <Route path="vehicles" element={<Vehicles />} />
              <Route path="alerts"   element={<Alerts />} />
              <Route path="staff"    element={<Staff />} />
              <Route path="schedules" element={<Schedules />} />
              <Route path="audit-logs" element={<AuditLogs />} />
              <Route path="reports"  element={<Reports />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="settings" element={<Settings />} />
              <Route path="demo"     element={<DemoSimulation />} />
            </Route>

            {/* Driver Mobile Interface */}
            <Route path="/driver" element={<PrivateRoute><DriverDashboard /></PrivateRoute>} />

            {/* Field Worker Mobile Interface */}
            <Route path="/field-worker" element={<PrivateRoute><FieldWorkerDashboard /></PrivateRoute>} />
          </Routes>
        </BrowserRouter>
      </PollingProvider>
    </AuthProvider>
  )
}
