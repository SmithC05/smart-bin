import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Trash2,
  AlertTriangle,
  Route,
  BarChart2,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react'

// ─── Mock Data ──────────────────────────────────────────────────────────────
const bins = [
  { id: 'BIN-01', location: 'Main Gate',     zone: 'A', pct: 91 },
  { id: 'BIN-02', location: 'Canteen Block', zone: 'A', pct: 83 },
  { id: 'BIN-03', location: 'Library',       zone: 'B', pct: 47 },
  { id: 'BIN-04', location: 'Sports Ground', zone: 'B', pct: 22 },
  { id: 'BIN-05', location: 'Admin Block',   zone: 'C', pct: 78 },
  { id: 'BIN-06', location: 'Hostel Block',  zone: 'C', pct: 65 },
  { id: 'BIN-07', location: 'Parking Lot',   zone: 'D', pct: 11 },
  { id: 'BIN-08', location: 'Lab Complex',   zone: 'D', pct: 54 },
]

const hourlyTrend = [
  { hour: '8am',  avg: 18 },
  { hour: '10am', avg: 24 },
  { hour: '12pm', avg: 38 },
  { hour: '2pm',  avg: 45 },
  { hour: '4pm',  avg: 52 },
  { hour: '6pm',  avg: 61 },
  { hour: 'Now',  avg: 68 },
]

const ALERTS = [
  {
    id: 1,
    message: 'BIN-01 at 91% — collection needed',
    time: '2 min ago',
    type: 'error',
  },
  {
    id: 2,
    message: 'BIN-02 reached 80% threshold',
    time: '18 min ago',
    type: 'warning',
  },
  {
    id: 3,
    message: 'Route A completed — 3 bins emptied',
    time: '1 hr ago',
    type: 'success',
  },
  {
    id: 4,
    message: 'BIN-07 reconnected after signal drop',
    time: '2 hr ago',
    type: 'success',
  },
]

// ─── Derived Stats ───────────────────────────────────────────────────────────
const totalBins      = bins.length
const needCollection = bins.filter((b) => b.pct >= 80).length
const optimizedRoutes = 2
const avgFill        = Math.round(bins.reduce((sum, b) => sum + b.pct, 0) / bins.length)

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fillColor(pct) {
  if (pct >= 80) return { bar: '#dc2626', badge: 'bg-red-100 text-red-700',   label: 'Full'  }
  if (pct >= 60) return { bar: '#d97706', badge: 'bg-amber-100 text-amber-700', label: 'High' }
  return               { bar: '#16a34a', badge: 'bg-green-100 text-green-700', label: 'OK'   }
}

function alertStyle(type) {
  switch (type) {
    case 'error':   return { bg: 'bg-red-50',   border: 'border-red-100',   icon: <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />,   text: 'text-red-800'   }
    case 'warning': return { bg: 'bg-amber-50', border: 'border-amber-100', icon: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />, text: 'text-amber-800' }
    default:        return { bg: 'bg-green-50', border: 'border-green-100', icon: <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />,   text: 'text-green-800' }
  }
}

// ─── Metric Card ─────────────────────────────────────────────────────────────
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

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
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
  const sortedBins = [...bins].sort((a, b) => b.pct - a.pct)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="page-title">Overview</h2>
        <p className="page-subtitle">Real-time status of your smart waste management network.</p>
      </div>

      {/* ── 1. METRIC CARDS ────────────────────────────────────────────── */}
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
          value={optimizedRoutes}
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

      {/* ── 2. BIN FILL LEVELS TABLE ───────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-4 text-base">Bin Fill Levels</h3>
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
              {sortedBins.map(({ id, location, zone, pct }) => {
                const { bar, badge, label } = fillColor(pct)
                return (
                  <tr key={id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4 font-mono font-semibold text-gray-700">{id}</td>
                    <td className="py-3 pr-4 text-gray-600">{location}</td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
                        {zone}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: bar }}
                        />
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold text-gray-700">{pct}%</td>
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
      </div>

      {/* ── 3. HOURLY TREND CHART + 4. ALERTS — side by side on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Hourly Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-1 text-base">Average fill level today</h3>
          <p className="text-xs text-gray-400 mb-4">Hourly average across all bins (%)</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={hourlyTrend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="avg"
                stroke="#16a34a"
                strokeWidth={2.5}
                fill="url(#fillGrad)"
                dot={{ r: 4, fill: '#16a34a', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#16a34a', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Alerts Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col">
          <h3 className="font-semibold text-gray-800 mb-4 text-base">Recent Alerts</h3>
          <div className="space-y-3 flex-1">
            {ALERTS.map(({ id, message, time, type }) => {
              const { bg, border, icon, text } = alertStyle(type)
              return (
                <div
                  key={id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${bg} ${border}`}
                >
                  <div className="mt-0.5">{icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-snug ${text}`}>{message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{time}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
