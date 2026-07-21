import { Trash2, Plus, Search, Filter } from 'lucide-react'

const SAMPLE_BINS = [
  { id: 'BIN-001', zone: 'Zone A', fill: 92, status: 'Full',    lastCollected: '2 days ago' },
  { id: 'BIN-042', zone: 'Zone A', fill: 67, status: 'Active',  lastCollected: '1 day ago' },
  { id: 'BIN-101', zone: 'Zone C', fill: 10, status: 'Offline', lastCollected: '5 days ago' },
  { id: 'BIN-318', zone: 'Zone B', fill: 81, status: 'Full',    lastCollected: '3 days ago' },
  { id: 'BIN-205', zone: 'Zone D', fill: 45, status: 'Active',  lastCollected: 'Today' },
]

const statusBadge = (status) => {
  const styles = {
    Active:  'bg-green-100 text-green-700',
    Full:    'bg-red-100 text-red-700',
    Offline: 'bg-gray-100 text-gray-500',
  }
  return `inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status] ?? 'bg-gray-100 text-gray-600'}`
}

const fillColor = (fill) => {
  if (fill >= 80) return 'bg-red-500'
  if (fill >= 50) return 'bg-amber-400'
  return 'bg-green-500'
}

export default function BinManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="page-title">Bin Management</h2>
          <p className="page-subtitle">Add, edit, and monitor all registered bins.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition shadow-sm">
          <Plus className="w-4 h-4" />
          Add Bin
        </button>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ID or zone…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Bin ID', 'Zone', 'Fill Level', 'Status', 'Last Collected', 'Actions'].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {SAMPLE_BINS.map((bin) => (
                <tr key={bin.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4 font-mono font-semibold text-gray-800">{bin.id}</td>
                  <td className="px-5 py-4 text-gray-600">{bin.zone}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${fillColor(bin.fill)}`}
                          style={{ width: `${bin.fill}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600">{bin.fill}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={statusBadge(bin.status)}>{bin.status}</span>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{bin.lastCollected}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button className="text-xs px-3 py-1 rounded-md bg-primary-50 text-primary-700 hover:bg-primary-100 transition font-medium">Edit</button>
                      <button className="text-xs px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition font-medium">Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
