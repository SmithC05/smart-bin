import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit2, MapPin, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import api from '../api'
import { useLiveBins } from '../hooks/useBins'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import StatusBadge from '../components/ui/StatusBadge'
import DataTable from '../components/ui/DataTable'
import { timeAgo } from '../utils/binHelpers'

const ZONES = ['All', 'A', 'B', 'C', 'D']
const EMPTY_FORM = {
  bin_id: '',
  location: '',
  zone: 'A',
  lat: '',
  lng: '',
  depth_cm: 40,
  alert_threshold_pct: 80,
  route_threshold_pct: 60,
  device_api_key: '',
}

function BinForm({ value, onChange, onCancel, onSave, saving }) {
  const fields = [
    ['bin_id', 'Bin ID'],
    ['location', 'Location'],
    ['lat', 'Latitude'],
    ['lng', 'Longitude'],
    ['depth_cm', 'Depth cm'],
    ['alert_threshold_pct', 'Alert %'],
    ['route_threshold_pct', 'Route %'],
    ['device_api_key', 'Device API key'],
  ]

  return (
    <div className="bg-white border border-slate-300 p-5 space-y-4 shadow-sm mb-6">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4">Bin Configuration</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {fields.map(([key, label]) => (
          <label key={key} className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            {label}
            <input
              value={value[key] ?? ''}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
              disabled={key === 'bin_id' && value.id}
              className="mt-1.5 w-full px-3 py-2 text-sm border border-slate-300 rounded-none focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:bg-slate-100"
            />
          </label>
        ))}
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
          Zone
          <select
            value={value.zone}
            onChange={(e) => onChange({ ...value, zone: e.target.value })}
            className="mt-1.5 w-full px-3 py-2 text-sm border border-slate-300 rounded-none focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white"
          >
            {ZONES.filter((z) => z !== 'All').map((z) => <option key={z}>{z}</option>)}
          </select>
        </label>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onCancel} className="px-4 py-2 border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50 uppercase tracking-wider">Cancel</button>
        <button onClick={onSave} disabled={saving} className="px-4 py-2 bg-primary-700 text-white text-sm font-bold disabled:opacity-50 hover:bg-primary-800 uppercase tracking-wider">
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  )
}

export default function BinManagement() {
  const { bins, loading, error, flashId, refetch } = useLiveBins()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [zone, setZone] = useState('All')
  const [dataSource, setDataSource] = useState('All')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  async function saveBin() {
    setSaving(true)
    const payload = {
      ...form,
      lat: Number(form.lat),
      lng: Number(form.lng),
      depth_cm: Number(form.depth_cm),
      alert_threshold_pct: Number(form.alert_threshold_pct),
      route_threshold_pct: Number(form.route_threshold_pct),
    }
    try {
      if (form.id) await api.patch(`/bins/${form.bin_id}/`, payload)
      else await api.post('/bins/', payload)
      setForm(null)
      refetch()
    } finally {
      setSaving(false)
    }
  }

  async function deactivateBin(bin) {
    if(!window.confirm(`Are you sure you want to deactivate ${bin.bin_id}?`)) return;
    await api.delete(`/bins/${bin.bin_id}/`)
    refetch()
  }

  async function simulateBin(bin, fill_pct) {
    await api.post('/simulate/', { bin_id: bin.bin_id, fill_pct })
    refetch()
  }

  if (loading && bins.length === 0) return <LoadingSpinner />

  const filtered = bins.filter((b) => {
    const matchZone = zone === 'All' || b.zone === zone
    const matchData = dataSource === 'All' || b.data_source === dataSource
    const q = search.toLowerCase()
    const matchSearch = !q || b.bin_id.toLowerCase().includes(q) || b.location.toLowerCase().includes(q)
    return matchZone && matchData && matchSearch
  })

  const columns = [
    { header: 'Bin ID', accessor: 'bin_id', className: 'w-32', cellClassName: 'font-mono font-bold', render: (row) => (
      <div className="flex flex-col items-start">
        <button onClick={() => navigate(`/map?bin=${row.bin_id}`)} className="text-primary-700 hover:underline">{row.bin_id}</button>
        {row.data_source === 'SIMULATED' ? (
          <span className="text-[10px] bg-purple-100 text-purple-700 px-1 py-0.5 mt-0.5 border border-purple-200">SIMULATED</span>
        ) : (
          <span className="text-[10px] bg-blue-100 text-blue-700 px-1 py-0.5 mt-0.5 border border-blue-200">REAL DEVICE</span>
        )}
      </div>
    )},
    { header: 'Zone', accessor: 'zone', className: 'w-20' },
    { header: 'Location', accessor: 'location', render: (row) => (
      <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" />{row.location}</div>
    )},
    { header: 'Fill Level', accessor: 'latest_pct', className: 'w-48', render: (row) => {
      const pct = row.latest_pct ?? 0;
      return (
        <div className="flex items-center gap-3">
          <div className="w-24 bg-slate-200 h-2 border border-slate-300">
            <div className={`h-full ${pct >= 80 ? 'bg-red-600' : pct >= 50 ? 'bg-amber-500' : 'bg-green-600'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <span className="text-xs font-bold w-8">{Math.round(pct)}%</span>
        </div>
      )
    }},
    { header: 'Status', accessor: 'status', className: 'w-32', render: (row) => {
        let status = 'normal';
        if (row.latest_pct >= 80) status = 'critical';
        else if (row.latest_pct >= 50) status = 'warning';
        return <StatusBadge status={status} type="bin" />
    }},
    { header: 'Last Reading', accessor: 'last_seen', className: 'w-32', render: (row) => (
      <span className="text-xs text-slate-500">{timeAgo(row.last_seen)}</span>
    )},
    { header: 'Actions', accessor: 'actions', className: 'w-48 text-right', cellClassName: 'text-right', render: (row) => (
      <div className="flex items-center justify-end gap-2">
        <button onClick={() => setForm(row)} className="p-1.5 text-slate-600 hover:text-primary-700 hover:bg-slate-100 border border-transparent hover:border-slate-300 transition-colors" title="Edit Configuration">
          <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={() => simulateBin(row, 92)} className="p-1.5 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors" title="Simulate Full">
          <RefreshCw className="w-4 h-4" />
        </button>
        <button onClick={() => simulateBin(row, 25)} className="p-1.5 text-green-700 hover:bg-green-50 border border-transparent hover:border-green-200 transition-colors" title="Simulate Empty">
          <RefreshCw className="w-4 h-4" />
        </button>
        <button onClick={() => deactivateBin(row)} className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors" title="Deactivate">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )}
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 border-b border-slate-300 pb-4">
        <div>
          <h2 className="page-title">Bin Management</h2>
          <p className="page-subtitle">Register hardware nodes, tune thresholds, and monitor fleet status.</p>
        </div>
        <button onClick={() => setForm(EMPTY_FORM)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-bold uppercase tracking-wider hover:bg-primary-800 transition-colors">
          <Plus className="w-4 h-4" />
          Add Node
        </button>
      </div>

      {error && <ErrorBanner message={error} />}
      {form && <BinForm value={form} onChange={setForm} onCancel={() => setForm(null)} onSave={saveBin} saving={saving} />}

      <div className="bg-white border border-slate-300 p-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID or location..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-none focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white"
          />
        </div>
        <div className="flex items-center gap-1 border border-slate-300 bg-slate-50 p-1">
          {ZONES.map((z) => (
            <button
              key={z}
              onClick={() => setZone(z)}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider ${zone === z ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              {z === 'All' ? 'ALL ZONES' : `ZONE ${z}`}
            </button>
          ))}
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={filtered} 
        keyField="bin_id"
        emptyMessage="No nodes match the current filters." 
      />
    </div>
  )
}
