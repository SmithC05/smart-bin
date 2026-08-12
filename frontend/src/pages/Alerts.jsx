import { useState } from 'react'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { useAlerts } from '../hooks/useBins'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner    from '../components/ErrorBanner'
import { formatDate, fillColor } from '../utils/binHelpers'

// ─── Client-side date filter ──────────────────────────────────────────────────
function isToday(isoStr) {
  const d = new Date(isoStr)
  const now = new Date()
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  )
}

function isThisWeek(isoStr) {
  const d = new Date(isoStr)
  const now = new Date()
  const weekAgo = new Date(now - 7 * 24 * 3600 * 1000)
  return d >= weekAgo
}

const FILTERS = ['All', 'Today', 'This week']

export default function Alerts() {
  const { alerts, loading, error, refetch } = useAlerts()
  const [activeFilter, setActiveFilter] = useState('All')

  if (loading && alerts.length === 0) return <LoadingSpinner />

  const filtered = alerts.filter((a) => {
    if (activeFilter === 'Today')     return isToday(a.recorded_at)
    if (activeFilter === 'This week') return isThisWeek(a.recorded_at)
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="page-title">Alerts</h2>
        <p className="page-subtitle">Bins that crossed the 80% fill threshold.</p>
      </div>

      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-1.5 rounded-none text-sm font-bold uppercase tracking-wider transition-all border ${
              activeFilter === f
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">
          Auto-refreshes every 15 s
        </span>
      </div>

      {/* Alert list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-green-600">
          <CheckCircle className="w-12 h-12" />
          <p className="text-base font-semibold text-gray-600">No alerts right now</p>
          <p className="text-sm text-gray-400">All bins are within safe fill levels.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert, i) => {
            const pct   = alert.fill_pct ?? 0
            const color = fillColor(pct)
            return (
              <div
                key={i}
                className="bg-white border border-slate-300 p-4 flex items-start gap-4 shadow-none hover:bg-slate-50 transition-colors"
              >
                {/* Icon */}
                <div className="mt-0.5 flex items-center justify-center w-9 h-9 bg-red-50 border border-red-200 shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="font-mono font-bold text-gray-800 text-sm">{alert.bin_id}</span>
                    <span className="text-xs text-gray-400">{formatDate(alert.recorded_at)}</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{alert.location}</p>

                  {/* Fill bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Fill at alert</span>
                      <span className="font-bold" style={{ color }}>{Math.round(pct)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
