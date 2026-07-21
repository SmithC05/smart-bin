import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react'

const ALERTS = [
  { id: 1, type: 'critical', bin: 'BIN-001', message: 'Fill level reached 92% — immediate collection required.', time: '5 min ago' },
  { id: 2, type: 'warning',  bin: 'BIN-318', message: 'Overdue for collection by 3 days.',                     time: '1 hr ago' },
  { id: 3, type: 'info',     bin: 'BIN-101', message: 'Sensor went offline — last seen 5 days ago.',            time: '2 hr ago' },
  { id: 4, type: 'resolved', bin: 'BIN-205', message: 'Fill level back to normal after collection.',            time: '3 hr ago' },
  { id: 5, type: 'critical', bin: 'BIN-088', message: 'Lid obstruction detected.',                             time: 'Yesterday' },
]

const alertStyles = {
  critical: { bg: 'bg-red-50',    border: 'border-red-200',   icon: <XCircle className="w-5 h-5 text-red-500 shrink-0" />,       badge: 'bg-red-100 text-red-700' },
  warning:  { bg: 'bg-amber-50',  border: 'border-amber-200', icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />, badge: 'bg-amber-100 text-amber-700' },
  info:     { bg: 'bg-blue-50',   border: 'border-blue-200',  icon: <Info className="w-5 h-5 text-blue-500 shrink-0" />,           badge: 'bg-blue-100 text-blue-700' },
  resolved: { bg: 'bg-green-50',  border: 'border-green-200', icon: <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />,   badge: 'bg-green-100 text-green-700' },
}

export default function Alerts() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="page-title">Alerts</h2>
        <p className="page-subtitle">System-wide alerts and notifications for your bin network.</p>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Critical', count: 2, color: 'text-red-600',   bg: 'bg-red-50' },
          { label: 'Warnings', count: 1, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Info',     count: 1, color: 'text-blue-600',  bg: 'bg-blue-50' },
          { label: 'Resolved', count: 1, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`card flex items-center gap-3 ${bg} border-0`}>
            <span className={`text-2xl font-bold ${color}`}>{count}</span>
            <span className="text-sm font-medium text-gray-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {ALERTS.map((alert) => {
          const style = alertStyles[alert.type]
          return (
            <div
              key={alert.id}
              className={`flex items-start gap-4 p-4 rounded-xl border ${style.bg} ${style.border}`}
            >
              {style.icon}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-800 text-sm">{alert.bin}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge} capitalize`}>
                    {alert.type}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-0.5">{alert.message}</p>
              </div>
              <span className="text-xs text-gray-400 shrink-0 mt-0.5">{alert.time}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
