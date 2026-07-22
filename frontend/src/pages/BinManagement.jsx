import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit2, MapPin, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import api from '../api'
import { useLiveBins } from '../hooks/useBins'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import SparklineChart from '../components/SparklineChart'
import { fillBadgeClass, fillColor, fillLabel } from '../utils/binHelpers'

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
      <span className="absolute text-lg font-bold" style={{ color }}>{Math.round(pct)}%</span>
    </div>
  )
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
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map(([key, label]) => (
          <label key={key} className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {label}
            <input
              value={value[key] ?? ''}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
              disabled={key === 'bin_id' && value.id}
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 disabled:bg-gray-50"
            />
          </label>
        ))}
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Zone
          <select
            value={value.zone}
            onChange={(e) => onChange({ ...value, zone: e.target.value })}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 bg-white"
          >
            {ZONES.filter((z) => z !== 'All').map((z) => <option key={z}>{z}</option>)}
          </select>
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
        <button onClick={onSave} disabled={saving} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Bin'}
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
  const [binHistory, setBinHistory] = useState({})
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (bins.length === 0) return
    Promise.all(
      bins.map((b) => api.get(`/bins/${b.bin_id}/history/`).then((res) => ({ id: b.bin_id, readings: res.data.readings }))),
    ).then((results) => {
      const map = {}
      results.forEach((r) => { map[r.id] = r.readings })
      setBinHistory(map)
    })
  }, [bins])

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
    const q = search.toLowerCase()
    const matchSearch = !q || b.bin_id.toLowerCase().includes(q) || b.location.toLowerCase().includes(q)
    return matchZone && matchSearch
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="page-title">Bin Management</h2>
          <p className="page-subtitle">Register hardware nodes, tune thresholds, and test live readings.</p>
        </div>
        <button onClick={() => setForm(EMPTY_FORM)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold">
          <Plus className="w-4 h-4" />
          Add Bin
        </button>
      </div>

      {error && <ErrorBanner message={error} />}
      {form && <BinForm value={form} onChange={setForm} onCancel={() => setForm(null)} onSave={saveBin} saving={saving} />}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID or location..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 bg-white"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 shrink-0">
          {ZONES.map((z) => (
            <button
              key={z}
              onClick={() => setZone(z)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold ${zone === z ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {z === 'All' ? 'All' : `Zone ${z}`}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No bins match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((bin) => {
            const pct = bin.latest_pct ?? 0
            return (
              <div
                key={bin.bin_id}
                className={`bg-white rounded-xl shadow-sm transition-all p-5 border ${flashId === bin.bin_id ? 'border-green-400' : 'border-gray-200'}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <button onClick={() => navigate(`/map?bin=${bin.bin_id}`)} className="text-left">
                    <span className="font-mono font-bold text-gray-800 text-lg hover:text-green-700">{bin.bin_id}</span>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      {bin.location}
                    </div>
                  </button>
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">{bin.zone}</span>
                </div>

                <div className="flex items-center justify-between">
                  <CircleFill pct={pct} />
                  <div className="flex flex-col items-end gap-2 text-xs text-gray-500">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-semibold ${fillBadgeClass(pct)}`}>{fillLabel(pct)}</span>
                    <span>Depth {bin.depth_cm} cm</span>
                    <span>Alert at {bin.alert_threshold_pct}%</span>
                    <span>Route at {bin.route_threshold_pct}%</span>
                    <span>Status: {bin.status}</span>
                  </div>
                </div>

                <div className="mt-4 h-10">
                  <SparklineChart readings={binHistory[bin.bin_id] || []} pct={pct} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => setForm(bin)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600">
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button onClick={() => simulateBin(bin, 92)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-xs font-semibold text-red-600">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Sim Full
                  </button>
                  <button onClick={() => simulateBin(bin, 25)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-green-200 text-xs font-semibold text-green-700">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Sim Empty
                  </button>
                  <button onClick={() => deactivateBin(bin)} className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-500">
                    <Trash2 className="w-3.5 h-3.5" />
                    Deactivate
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
