import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin } from 'lucide-react'
import { useBins } from '../hooks/useBins'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner    from '../components/ErrorBanner'
import { fillColor, fillLabel, fillBadgeClass } from '../utils/binHelpers'

const ZONES = ['All', 'A', 'B', 'C', 'D']

// ─── SVG Circular Fill Indicator ─────────────────────────────────────────────
function CircleFill({ pct }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const color = fillColor(pct)

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      </svg>
      <span
        className="absolute text-lg font-bold"
        style={{ color }}
      >
        {Math.round(pct)}%
      </span>
    </div>
  )
}

// ─── Bins (BinManagement) Page ────────────────────────────────────────────────
export default function BinManagement() {
  const { bins, loading, error, refetch } = useBins()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [zone, setZone]     = useState('All')

  if (loading && bins.length === 0) return <LoadingSpinner />

  const filtered = bins.filter((b) => {
    const matchZone   = zone === 'All' || b.zone === zone
    const q           = search.toLowerCase()
    const matchSearch = !q || b.bin_id.toLowerCase().includes(q) || b.location.toLowerCase().includes(q)
    return matchZone && matchSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="page-title">Bin Management</h2>
        <p className="page-subtitle">Add, edit, and monitor all registered bins.</p>
      </div>

      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {/* Search + Zone filter */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID or location…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 bg-white"
          />
        </div>

        {/* Zone buttons */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 shrink-0">
          {ZONES.map((z) => (
            <button
              key={z}
              onClick={() => setZone(z)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                zone === z
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {z === 'All' ? 'All' : `Zone ${z}`}
            </button>
          ))}
        </div>
      </div>

      {/* Bin cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No bins match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((bin) => {
            const pct   = bin.latest_pct ?? 0
            const badge = fillBadgeClass(pct)
            const label = fillLabel(pct)

            return (
              <button
                key={bin.bin_id}
                onClick={() => navigate(`/map?bin=${bin.bin_id}`)}
                className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-green-200 transition-all p-5 text-left group"
              >
                {/* Top row: Bin ID + Zone badge */}
                <div className="flex items-start justify-between mb-3">
                  <span className="font-mono font-bold text-gray-800 text-lg group-hover:text-green-700 transition-colors">
                    {bin.bin_id}
                  </span>
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
                    {bin.zone}
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {bin.location}
                </div>

                {/* Circular fill indicator */}
                <div className="flex items-center justify-between">
                  <CircleFill pct={pct} />
                  <div className="flex flex-col items-end gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge}`}>
                      {label}
                    </span>
                    <span className="text-xs text-gray-400">Tap to view on map</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
