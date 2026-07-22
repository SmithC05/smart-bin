import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Trash2, AlertTriangle, Route, BarChart2,
  CheckCircle, AlertCircle, Clock,
} from 'lucide-react'
import api from '../api'
import { useLiveBins, useAlerts } from '../hooks/useBins'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner    from '../components/ErrorBanner'
import { fillColor, fillLabel, fillBadgeClass, timeAgo } from '../utils/binHelpers'

// ─── Hourly trend from BIN-01 history ─────────────────────────────────────────
// ─── Helpers ─────────────────────────────────────────────────────────────────
function alertStyle(level) {
  if (level === 'danger')
    return {
      bg: 'bg-red-50', border: 'border-red-100',
      icon: <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />,
      text: 'text-red-800',
    }
  return {
    bg: 'bg-green-50', border: 'border-green-100',
    icon: <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />,
    text: 'text-green-800',
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function MetricCard({ label, value, icon: Icon, iconBg, valueColor }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
      <div className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${iconBg}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className={`text-2xl font-bold ${valueColor ?? 'text-gray-900'}`}>{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-sm">
      <p className="font-semibold text-gray-700">{label}</p>
      <p style={{ color: '#16a34a' }} className="font-bold">{payload[0].value}% avg fill</p>
    </div>
  )
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { bins: liveBins, loading, error, lastUpdated, flashId } = useLiveBins()
  const { alerts, loading: alertsLoading } = useAlerts()
  const [trendData, setTrendData] = useState([])

  // "Last updated X seconds ago" ticker
  const [secondsAgo, setSecondsAgo] = useState(0)
  useEffect(() => {
    setSecondsAgo(0)
    const t = setInterval(() => setSecondsAgo((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [liveBins])

  useEffect(() => {
    api.get('/bins/BIN-01/history/').then((res) => {
      setTrendData(res.data.readings.map((r) => ({
        hour: new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        avg: Math.round(r.fill_pct),
      })))
    })
  }, [])

  if (loading && liveBins.length === 0) return <LoadingSpinner />

  const totalBins      = liveBins.length
  const needCollection = liveBins.filter((b) => (b.latest_pct ?? 0) >= 80).length
  const avgFill        = liveBins.length
    ? (liveBins.reduce((s, b) => s + (b.latest_pct ?? 0), 0) / liveBins.length).toFixed(1)
    : 0
  const routesToday    = 2
  const bins           = [...liveBins].sort((a, b) => b.latest_pct - a.latest_pct)

  return (
    <div className="space-y-6">
      {/* Page header + last-updated ticker */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="page-title">Overview</h2>
          <p className="page-subtitle">Real-time status of your smart waste management network.</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-gray-400 self-end pb-0.5">
          <Clock className="w-3.5 h-3.5" />
          Last updated {secondsAgo}s ago
        </span>
      </div>

      <p className="text-xs text-gray-400 px-5 py-1">
        {lastUpdated
          ? `Last updated: ${lastUpdated.toLocaleTimeString()}`
          : 'Waiting for data...'}
      </p>

      {error && <ErrorBanner message={error} />}

      {/* ── 1. METRIC CARDS ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Total Bins"
          value={totalBins}
          icon={Trash2}
          iconBg="bg-green-50 text-green-700"
        />
        <MetricCard
          label="Need Collection (≥80%)"
          value={needCollection}
          icon={AlertTriangle}
          iconBg="bg-red-50 text-red-600"
          valueColor="text-red-600"
        />
        <MetricCard
          label="Optimized Routes Today"
          value={routesToday}
          icon={Route}
          iconBg="bg-blue-50 text-blue-600"
        />
        <MetricCard
          label="Avg Fill Level"
          value={`${avgFill}%`}
          icon={BarChart2}
          iconBg="bg-green-50 text-green-700"
          valueColor="text-green-700"
        />
      </div>

      {/* ── 2. BIN FILL LEVELS TABLE ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-4 text-base">Bin Fill Levels</h3>
        {bins.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No bin data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="pb-3 pr-4">Bin ID</th>
                  <th className="pb-3 pr-4">Location</th>
                  <th className="pb-3 pr-4">Zone</th>
                  <th className="pb-3 pr-4 w-48">Fill Level</th>
                  <th className="pb-3 pr-4 text-right">%</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bins.map((bin) => {
                  const pct   = bin.latest_pct ?? 0
                  const color = fillColor(pct)
                  const badge = fillBadgeClass(pct)
                  const label = fillLabel(pct)
                  return (
                    <tr
                      key={bin.bin_id}
                      className={`hover:bg-gray-50 transition-colors ${
                        flashId === bin.bin_id ? 'bg-green-50 duration-700' : ''
                      }`}
                    >
                      <td className="py-3 pr-4 font-mono font-semibold text-gray-700">{bin.bin_id}</td>
                      <td className="py-3 pr-4 text-gray-600">{bin.location}</td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
                          {bin.zone}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right font-semibold text-gray-700">{Math.round(pct)}%</td>
                      <td className="py-3 text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge}`}>
                          {label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 3. HOURLY TREND CHART + 4. ALERTS ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Hourly Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-1 text-base">Average fill level today</h3>
          <p className="text-xs text-gray-400 mb-4">Hourly average across all bins (%)</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone" dataKey="avg"
                stroke="#16a34a" strokeWidth={2.5}
                fill="url(#fillGrad)"
                dot={{ r: 4, fill: '#16a34a', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#16a34a', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Live Alerts Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col">
          <h3 className="font-semibold text-gray-800 mb-4 text-base">Recent Alerts</h3>
          {alertsLoading && alerts.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Loading…</p>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-2 text-green-600 py-6">
              <CheckCircle className="w-8 h-8" />
              <p className="text-sm font-medium text-gray-500">All bins are OK</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto">
              {alerts.slice(0, 6).map((a, i) => {
                const { bg, border, icon, text } = alertStyle(a.level)
                return (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${bg} ${border}`}>
                    <div className="mt-0.5">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-snug ${text}`}>
                        {a.bin_id} at {Math.round(a.fill_pct)}% — collection needed
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{timeAgo(a.recorded_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
