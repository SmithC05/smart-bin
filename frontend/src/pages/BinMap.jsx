import { useState, useRef } from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { Navigation, Truck } from 'lucide-react'

// ─── Fix Leaflet default marker icon bug ─────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// ─── Mock Data ────────────────────────────────────────────────────────────────
const bins = [
  { id: 'BIN-01', location: 'Main Gate',     zone: 'A', pct: 91, lat: 12.8230, lng: 80.0444 },
  { id: 'BIN-02', location: 'Canteen Block', zone: 'A', pct: 83, lat: 12.8225, lng: 80.0452 },
  { id: 'BIN-03', location: 'Library',       zone: 'B', pct: 47, lat: 12.8218, lng: 80.0438 },
  { id: 'BIN-04', location: 'Sports Ground', zone: 'B', pct: 22, lat: 12.8210, lng: 80.0460 },
  { id: 'BIN-05', location: 'Admin Block',   zone: 'C', pct: 78, lat: 12.8235, lng: 80.0430 },
  { id: 'BIN-06', location: 'Hostel Block',  zone: 'C', pct: 65, lat: 12.8205, lng: 80.0445 },
  { id: 'BIN-07', location: 'Parking Lot',   zone: 'D', pct: 11, lat: 12.8215, lng: 80.0468 },
  { id: 'BIN-08', location: 'Lab Complex',   zone: 'D', pct: 54, lat: 12.8228, lng: 80.0455 },
]

const route = [
  [12.8230, 80.0444], // BIN-01
  [12.8225, 80.0452], // BIN-02
  [12.8235, 80.0430], // BIN-05
  [12.8205, 80.0445], // BIN-06
  [12.8230, 80.0444], // back to depot
]

const routeBins = bins.filter((b) => b.pct >= 60)

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fillMeta(pct) {
  if (pct >= 80) return { color: '#dc2626', bar: 'bg-red-500',   badge: 'bg-red-100 text-red-700',   label: 'Full'  }
  if (pct >= 60) return { color: '#d97706', bar: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700', label: 'High' }
  return               { color: '#16a34a', bar: 'bg-green-500', badge: 'bg-green-100 text-green-700', label: 'OK'   }
}

// ─── Fly-to controller (must be child of MapContainer) ───────────────────────
function FlyTo({ target }) {
  const map = useMap()
  if (target) {
    map.flyTo([target.lat, target.lng], 18, { duration: 0.8 })
  }
  return null
}

// ─── BinMap Page ──────────────────────────────────────────────────────────────
const FILTERS = ['All bins', 'Needs collection', 'Route only']

export default function BinMap() {
  const [filter, setFilter]   = useState('All bins')
  const [flyTarget, setFlyTarget] = useState(null)
  const markersRef = useRef({})

  function visibleBins() {
    if (filter === 'Needs collection') return bins.filter((b) => b.pct >= 80)
    if (filter === 'Route only')       return bins.filter((b) => b.pct >= 60)
    return bins
  }

  const showRoute = filter === 'All bins' || filter === 'Route only'

  function handleBinClick(bin) {
    setFlyTarget(bin)
    // open popup after fly completes
    setTimeout(() => {
      const marker = markersRef.current[bin.id]
      if (marker) marker.openPopup()
    }, 900)
  }

  return (
    // Pull out of the parent's p-6 by using -m-6 so the map reaches the edges
    <div className="flex -m-6 h-[calc(100vh-64px)] overflow-hidden">

      {/* ── LEFT PANEL ──────────────────────────────────────────────────── */}
      <aside className="w-72 shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden">

        {/* Bin Status list */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 text-sm">Bin Status</h3>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
              {bins.length}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {[...bins].sort((a, b) => b.pct - a.pct).map((bin) => {
            const { color, bar } = fillMeta(bin.pct)
            return (
              <button
                key={bin.id}
                onClick={() => handleBinClick(bin)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="font-mono text-xs font-semibold text-gray-700 group-hover:text-green-700 transition-colors">
                      {bin.id}
                    </span>
                    <p className="text-xs text-gray-500 leading-tight">{bin.location}</p>
                  </div>
                  <span className="text-sm font-bold" style={{ color }}>{bin.pct}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full ${bar} transition-all`}
                    style={{ width: `${bin.pct}%` }}
                  />
                </div>
              </button>
            )
          })}
        </div>

        {/* Collection Route section */}
        <div className="border-t border-gray-100 p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-green-600" />
            <h3 className="font-semibold text-gray-800 text-sm">Collection Route</h3>
          </div>
          <ol className="space-y-1.5">
            {routeBins
              .sort((a, b) => b.pct - a.pct)
              .map((bin, i) => (
                <li key={bin.id} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 font-bold shrink-0 text-[10px]">
                    {i + 1}
                  </span>
                  <span className="font-mono font-semibold text-gray-700">{bin.id}</span>
                  <span className="text-gray-400">·</span>
                  <span className="truncate">{bin.location}</span>
                </li>
              ))}
          </ol>
          <button
            onClick={() => console.log('Dispatch route:', routeBins.map((b) => b.id))}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-all active:scale-95"
            style={{ backgroundColor: '#16a34a' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#15803d')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#16a34a')}
          >
            <Truck className="w-4 h-4" />
            Dispatch
          </button>
        </div>
      </aside>

      {/* ── RIGHT SIDE ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 text-base leading-tight">Bin Map</h2>
            <p className="text-xs text-gray-400">CVRP optimized route · {routeBins.length} bins scheduled</p>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  filter === f
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={[12.8220, 80.0448]}
            zoom={17}
            className="w-full h-full"
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FlyTo target={flyTarget} />

            {/* CVRP Route Polyline */}
            {showRoute && (
              <Polyline
                positions={route}
                pathOptions={{ color: '#16a34a', weight: 3, dashArray: '6 4' }}
              />
            )}

            {/* Bin Markers */}
            {visibleBins().map((bin) => {
              const { color, badge, label } = fillMeta(bin.pct)
              return (
                <CircleMarker
                  key={bin.id}
                  center={[bin.lat, bin.lng]}
                  radius={14}
                  pathOptions={{
                    fillColor: color,
                    color: '#ffffff',
                    weight: 2,
                    fillOpacity: 0.9,
                  }}
                  ref={(el) => { if (el) markersRef.current[bin.id] = el }}
                >
                  {/* Percentage label inside circle via Tooltip as permanent label */}
                  <Popup>
                    <div className="min-w-[160px] text-sm font-sans">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-gray-800 text-base">{bin.id}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge}`}>
                          {label}
                        </span>
                      </div>
                      <p className="text-gray-600 text-xs mb-1">{bin.location}</p>
                      <p className="text-gray-500 text-xs mb-2">Zone {bin.zone}</p>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Fill level</span>
                        <span className="text-xs font-bold" style={{ color }}>{bin.pct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-2">
                        <div
                          className="h-2 rounded-full"
                          style={{ width: `${bin.pct}%`, backgroundColor: color }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400">Last updated · 2 min ago</p>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}
          </MapContainer>

          {/* Legend overlay */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-gray-100 px-4 py-3 flex items-center gap-4 text-xs text-gray-600">
            {[
              { color: '#16a34a', label: 'OK (<60%)' },
              { color: '#d97706', label: 'High (60–79%)' },
              { color: '#dc2626', label: 'Full (≥80%)' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: color }} />
                {label}
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-6 border-t-2 border-dashed" style={{ borderColor: '#16a34a' }} />
              Route
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
