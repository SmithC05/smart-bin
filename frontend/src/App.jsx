import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PollingProvider } from './context/PollingContext'
import Layout        from './components/layout/Layout'
import Dashboard     from './pages/Dashboard'
import BinMap        from './pages/BinMap'
import BinManagement from './pages/BinManagement'
import Alerts        from './pages/Alerts'
import Settings      from './pages/Settings'

export default function App() {
  return (
    <PollingProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index       element={<Dashboard />} />
            <Route path="map"      element={<BinMap />} />
            <Route path="bins"     element={<BinManagement />} />
            <Route path="alerts"   element={<Alerts />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PollingProvider>
  )
}
