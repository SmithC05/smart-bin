import { useEffect, useState } from 'react'
import { Plus, Search, Trash2, Edit2 } from 'lucide-react'
import api from '../api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import DataTable from '../components/ui/DataTable'
import StatusBadge from '../components/ui/StatusBadge'
import { useAuth } from '../context/AuthContext'

const EMPTY_FORM = {
  vehicle_id: '',
  registration_number: '',
  vehicle_type: 'COMPACTOR',
  capacity: '',
  capacity_unit: 'm3',
  municipality: '',
  zone: '',
  depot: '',
  driver: '',
  status: 'AVAILABLE'
}

function VehicleForm({ value, onChange, onCancel, onSave, saving, dependencies }) {
  const { municipalities, zones, depots } = dependencies;

  // Filter dependencies based on selections
  const availableZones = zones.filter(z => !value.municipality || z.municipality === Number(value.municipality));
  const availableDepots = depots.filter(d => 
    (!value.municipality || d.municipality === Number(value.municipality)) &&
    (!value.zone || !d.zone || d.zone === Number(value.zone))
  );

  return (
    <div className="bg-white border border-slate-300 p-5 space-y-6 shadow-sm mb-6">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2">Vehicle Configuration</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Vehicle ID
          <input
            value={value.vehicle_id}
            onChange={(e) => onChange({ ...value, vehicle_id: e.target.value })}
            disabled={!!value.id}
            className="mt-1.5 w-full px-3 py-2 text-sm border border-slate-300 rounded-none focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white disabled:bg-slate-100"
          />
        </label>
        
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Registration Number
          <input
            value={value.registration_number}
            onChange={(e) => onChange({ ...value, registration_number: e.target.value })}
            className="mt-1.5 w-full px-3 py-2 text-sm border border-slate-300 rounded-none focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
          />
        </label>
        
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Vehicle Type
          <select
            value={value.vehicle_type}
            onChange={(e) => onChange({ ...value, vehicle_type: e.target.value })}
            className="mt-1.5 w-full px-3 py-2 text-sm border border-slate-300 rounded-none focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
          >
            <option value="COMPACTOR">Compactor</option>
            <option value="TIPPER">Tipper</option>
            <option value="MINI_TRUCK">Mini Truck</option>
            <option value="TRACTOR">Tractor</option>
            <option value="OTHER">Other</option>
          </select>
        </label>

        <div className="flex gap-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex-1">
            Capacity
            <input
              type="number"
              min="0"
              step="0.1"
              value={value.capacity}
              onChange={(e) => onChange({ ...value, capacity: e.target.value })}
              className="mt-1.5 w-full px-3 py-2 text-sm border border-slate-300 rounded-none focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
            />
          </label>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider w-20">
            Unit
            <select
              value={value.capacity_unit}
              onChange={(e) => onChange({ ...value, capacity_unit: e.target.value })}
              className="mt-1.5 w-full px-3 py-2 text-sm border border-slate-300 rounded-none focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
            >
              <option value="m3">m³</option>
              <option value="kg">kg</option>
              <option value="tons">Tons</option>
            </select>
          </label>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200 pt-4">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Municipality
          <select
            value={value.municipality}
            onChange={(e) => onChange({ ...value, municipality: e.target.value, zone: '', depot: '' })}
            className="mt-1.5 w-full px-3 py-2 text-sm border border-slate-300 rounded-none focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
          >
            <option value="">-- Select Municipality --</option>
            {municipalities.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Zone (Optional)
          <select
            value={value.zone}
            onChange={(e) => onChange({ ...value, zone: e.target.value, depot: '' })}
            className="mt-1.5 w-full px-3 py-2 text-sm border border-slate-300 rounded-none focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
          >
            <option value="">-- No Zone --</option>
            {availableZones.map(z => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Depot (Optional)
          <select
            value={value.depot}
            onChange={(e) => onChange({ ...value, depot: e.target.value })}
            className="mt-1.5 w-full px-3 py-2 text-sm border border-slate-300 rounded-none focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
          >
            <option value="">-- No Depot --</option>
            {availableDepots.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-4">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Status
          <select
            value={value.status}
            onChange={(e) => onChange({ ...value, status: e.target.value })}
            className="mt-1.5 w-full px-3 py-2 text-sm border border-slate-300 rounded-none focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
          >
            <option value="AVAILABLE">Available</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="ON_ROUTE">On Route</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button onClick={onCancel} className="px-4 py-2 border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50 uppercase tracking-wider">Cancel</button>
        <button onClick={onSave} disabled={saving} className="px-4 py-2 bg-primary-700 text-white text-sm font-bold disabled:opacity-50 hover:bg-primary-800 uppercase tracking-wider">
          {saving ? 'Saving...' : (value.id ? 'Save Changes' : 'Create Vehicle')}
        </button>
      </div>
    </div>
  )
}

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  
  const [deps, setDeps] = useState({ municipalities: [], zones: [], depots: [] })
  
  const { user } = useAuth()
  const canManage = user?.role === 'system_admin' || user?.role === 'municipal_admin' || user?.role === 'zone_supervisor'

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/vehicles/')
      setVehicles(res.data)
      setError(null)
    } catch (err) {
      setError('Failed to load vehicles.')
    } finally {
      setLoading(false)
    }
  }

  const fetchDependencies = async () => {
    try {
      const [m, z, d] = await Promise.all([
        api.get('/municipalities/'),
        api.get('/zones/'),
        api.get('/depots/')
      ]);
      setDeps({ municipalities: m.data, zones: z.data, depots: d.data });
    } catch(err) {
      console.error("Failed to load dependencies");
    }
  }

  useEffect(() => {
    fetchVehicles()
    fetchDependencies()
  }, [])

  const saveVehicle = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        municipality: form.municipality ? Number(form.municipality) : null,
        zone: form.zone ? Number(form.zone) : null,
        depot: form.depot ? Number(form.depot) : null,
        capacity: Number(form.capacity)
      }
      
      if (form.id) {
        await api.patch(`/vehicles/${form.id}/`, payload)
      } else {
        await api.post('/vehicles/', payload)
      }
      setForm(null)
      fetchVehicles()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save vehicle. Check your fields.')
    } finally {
      setSaving(false)
    }
  }

  const deactivateVehicle = async (v) => {
    if (!window.confirm(`Are you sure you want to remove ${v.vehicle_id}?`)) return
    try {
      await api.delete(`/vehicles/${v.id}/`)
      fetchVehicles()
    } catch (err) {
      setError('Failed to remove vehicle.')
    }
  }

  const filtered = vehicles.filter((v) => {
    const q = search.toLowerCase()
    return !q || 
      v.vehicle_id.toLowerCase().includes(q) || 
      v.registration_number.toLowerCase().includes(q)
  })

  const columns = [
    { header: 'Vehicle ID', accessor: 'vehicle_id', className: 'w-24', cellClassName: 'font-mono font-bold text-primary-700' },
    { header: 'Registration', accessor: 'registration_number', className: 'w-32', cellClassName: 'font-mono' },
    { header: 'Type', accessor: 'vehicle_type', className: 'w-32', render: (row) => row.vehicle_type.replace('_', ' ') },
    { header: 'Capacity', accessor: 'capacity', className: 'w-24', render: (row) => `${row.capacity} ${row.capacity_unit}` },
    { header: 'Municipality', accessor: 'municipality_name', className: 'w-32' },
    { header: 'Zone', accessor: 'zone_name', className: 'w-24', render: (row) => row.zone_name || '-' },
    { header: 'Depot', accessor: 'depot_name', className: 'w-32', render: (row) => row.depot_name || '-' },
    { header: 'Driver', accessor: 'driver_name', className: 'w-32', render: (row) => row.driver_name || 'Unassigned' },
    { header: 'Status', accessor: 'status', className: 'w-32', render: (row) => (
        <StatusBadge 
          status={row.status === 'AVAILABLE' ? 'normal' : row.status === 'MAINTENANCE' || row.status === 'INACTIVE' ? 'critical' : 'warning'}
          label={row.status} 
        />
    )},
  ];

  if (canManage) {
    columns.push({
      header: 'Actions', accessor: 'actions', className: 'w-24 text-right', cellClassName: 'text-right', render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => setForm(row)} className="p-1.5 text-slate-600 hover:text-primary-700 hover:bg-slate-100 border border-transparent hover:border-slate-300 transition-colors" title="Edit Vehicle">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => deactivateVehicle(row)} className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors" title="Remove">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    })
  }

  if (loading && vehicles.length === 0) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 border-b border-slate-300 pb-4">
        <div>
          <h2 className="page-title">Fleet Management</h2>
          <p className="page-subtitle">Manage municipal waste collection vehicles and their assignments.</p>
        </div>
        {canManage && (
          <button onClick={() => setForm(EMPTY_FORM)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-bold uppercase tracking-wider hover:bg-primary-800 transition-colors">
            <Plus className="w-4 h-4" />
            Add Vehicle
          </button>
        )}
      </div>

      {error && <ErrorBanner message={error} />}
      {form && <VehicleForm value={form} onChange={setForm} onCancel={() => setForm(null)} onSave={saveVehicle} saving={saving} dependencies={deps} />}

      <div className="bg-white border border-slate-300 p-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID or Registration..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-none focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
          />
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={filtered} 
        keyField="id"
        emptyMessage="No vehicles match the current filters." 
      />
    </div>
  )
}
