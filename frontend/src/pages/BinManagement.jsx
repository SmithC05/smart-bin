import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { 
  Activity, CheckCircle, Search, Edit2, AlertTriangle, 
  MapPin, X, RefreshCw, BarChart2, Shield, Settings,
  List, Map as MapIcon, Server
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { format, formatDistanceToNow } from 'date-fns'

import api from '../api'
import { useLiveBins } from '../hooks/useBins'
import Card from '../components/ui/Card'
import StatusBadge from '../components/ui/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import { timeAgo } from '../utils/binHelpers'

// Fix leaflet icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const getMarkerIcon = (status, isSimulated) => {
  let color = 'blue'
  if (status === 'critical') color = 'red'
  else if (status === 'warning') color = 'orange'
  else if (status === 'normal') color = 'green'
  
  if (isSimulated) {
    color = 'grey' // Distinguish simulated on map if desired, or keep status colors
  }

  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  })
}

export default function BinManagement() {
  const navigate = useNavigate()
  const reducedMotion = useReducedMotion()
  
  const { bins, loading, error, refetch } = useLiveBins()
  
  const [viewMode, setViewMode] = useState('table') // 'table' or 'map'
  
  // Filters
  const [search, setSearch] = useState('')
  const [zone, setZone] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sourceFilter, setSourceFilter] = useState('All')

  // Drawer
  const [selectedBin, setSelectedBin] = useState(null)
  const [historyData, setHistoryData] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  
  const [saving, setSaving] = useState(false)
  
  // Derived metrics
  const stats = useMemo(() => {
    let total = 0, online = 0, offline = 0
    let critical = 0, high = 0, normal = 0
    let real = 0, simulated = 0

    bins.forEach(b => {
      total++
      if (b.status === 'offline') offline++
      else online++

      const pct = b.latest_pct || 0
      if (pct >= 80) critical++
      else if (pct >= 50) high++
      else normal++

      if (b.data_source === 'SIMULATED') simulated++
      else real++
    })

    return { total, online, offline, critical, high, normal, real, simulated }
  }, [bins])

  const filteredBins = useMemo(() => {
    return bins.filter(b => {
      const pct = b.latest_pct || 0
      const stat = pct >= 80 ? 'CRITICAL' : pct >= 50 ? 'HIGH' : 'NORMAL'
      
      if (zone !== 'All' && String(b.zone) !== zone) return false
      if (statusFilter !== 'All' && stat !== statusFilter) return false
      if (sourceFilter !== 'All' && b.data_source !== sourceFilter) return false
      
      const q = search.toLowerCase()
      if (q && !(
        b.bin_id.toLowerCase().includes(q) || 
        (b.location || '').toLowerCase().includes(q) ||
        String(b.zone || '').toLowerCase().includes(q) ||
        String(b.ward || '').toLowerCase().includes(q)
      )) return false

      return true
    })
  }, [bins, zone, statusFilter, sourceFilter, search])

  // Extract unique zones for filter
  const zones = useMemo(() => ['All', ...new Set(bins.map(b => String(b.zone)).filter(Boolean))], [bins])

  const loadHistory = async (binId) => {
    setHistoryLoading(true)
    try {
      const res = await api.get(`/bins/${binId}/history/`)
      // Assuming res.data.readings = [{ fill_pct, recorded_at }]
      const data = (res.data.readings || []).map(r => ({
        ...r,
        timeLabel: format(new Date(r.recorded_at), 'HH:mm')
      }))
      setHistoryData(data)
    } catch (err) {
      console.error(err)
      setHistoryData([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleRowClick = (bin) => {
    setSelectedBin(bin)
    setEditMode(false)
    loadHistory(bin.bin_id)
  }

  const closeDrawer = () => {
    setSelectedBin(null)
    setHistoryData([])
  }

  const handleSimulate = async (binId, fill_pct) => {
    try {
      await api.post('/simulate/', { bin_id: binId, fill_pct })
      refetch()
      if (selectedBin && selectedBin.bin_id === binId) {
        // optimistically update local drawer
        setSelectedBin(prev => ({...prev, latest_pct: fill_pct}))
        loadHistory(binId)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        location: selectedBin.location,
        zone: selectedBin.zone,
        ward: selectedBin.ward,
        lat: Number(selectedBin.lat),
        lng: Number(selectedBin.lng),
        depth_cm: Number(selectedBin.depth_cm),
        alert_threshold_pct: Number(selectedBin.alert_threshold_pct),
        route_threshold_pct: Number(selectedBin.route_threshold_pct),
      }
      await api.patch(`/bins/${selectedBin.bin_id}/`, payload)
      refetch()
      setEditMode(false)
    } catch (err) {
      console.error(err)
      alert("Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  if (loading && bins.length === 0) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* HEADER */}
      <div className="bg-slate-900 text-white px-6 py-4 shadow-md sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase flex items-center">
              <Activity className="w-5 h-5 mr-2 text-primary-400" />
              SmartBin Management
            </h1>
            <p className="text-sm text-slate-400 mt-1">IoT-enabled municipal waste container monitoring and operational management.</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block text-right">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Last Updated</div>
              <div className="text-xs font-mono text-slate-300">{format(new Date(), 'HH:mm:ss')}</div>
            </div>
            <button 
              onClick={() => refetch()}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded transition-colors text-slate-300"
              title="Refresh Telemetry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {error && <ErrorBanner message={error} />}

        {/* TOP STATUS ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* OPERATIONAL STATUS STRIP */}
          <Card className="lg:col-span-2 border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">SmartBin Network</h2>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 divide-x divide-y md:divide-y-0 divide-slate-100">
              <div className="p-4 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total</div>
                <div className="text-2xl font-black text-slate-800">{stats.total}</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Online</div>
                <div className="text-2xl font-black text-emerald-600">{stats.online}</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Offline</div>
                <div className="text-2xl font-black text-slate-500">{stats.offline}</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Critical</div>
                <div className="text-2xl font-black text-red-600">{stats.critical}</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">High</div>
                <div className="text-2xl font-black text-amber-500">{stats.high}</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Normal</div>
                <div className="text-2xl font-black text-emerald-500">{stats.normal}</div>
              </div>
            </div>
          </Card>

          {/* REAL VS SIMULATED */}
          <Card className="border border-slate-200 overflow-hidden">
             <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Device Source</h2>
            </div>
            <div className="flex h-[88px]">
              <div className="flex-1 p-4 text-center border-r border-slate-100 flex flex-col justify-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Real Devices</div>
                <div className="text-2xl font-black text-indigo-700">{stats.real}</div>
              </div>
              <div className="flex-1 p-4 text-center bg-slate-50 flex flex-col justify-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Simulated</div>
                <div className="text-2xl font-black text-slate-600">{stats.simulated}</div>
              </div>
            </div>
          </Card>
        </div>

        {/* FILTER BAR & TOGGLE */}
        <Card className="border border-slate-200 p-3 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Bin ID, Zone, Ward..."
                className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-300 rounded focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <select 
              value={zone} 
              onChange={e => setZone(e.target.value)}
              className="py-1.5 px-3 text-sm border border-slate-300 rounded text-slate-700 font-medium focus:ring-primary-500"
            >
              {zones.map(z => <option key={z} value={z}>{z === 'All' ? 'ALL ZONES' : `ZONE ${z}`}</option>)}
            </select>
            
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 text-sm border border-slate-300 rounded text-slate-700 font-medium focus:ring-primary-500"
            >
              <option value="All">ALL STATUS</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="NORMAL">NORMAL</option>
            </select>
            
            <select 
              value={sourceFilter} 
              onChange={e => setSourceFilter(e.target.value)}
              className="py-1.5 px-3 text-sm border border-slate-300 rounded text-slate-700 font-medium focus:ring-primary-500"
            >
              <option value="All">ALL SOURCES</option>
              <option value="REAL DEVICE">REAL DEVICE</option>
              <option value="SIMULATED">SIMULATED</option>
            </select>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded border border-slate-200 shrink-0 self-start md:self-auto">
            <button 
              onClick={() => setViewMode('table')} 
              className={`px-3 py-1 text-xs font-bold uppercase rounded flex items-center transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <List className="w-3 h-3 mr-1" /> Table
            </button>
            <button 
              onClick={() => setViewMode('map')} 
              className={`px-3 py-1 text-xs font-bold uppercase rounded flex items-center transition-colors ${viewMode === 'map' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <MapIcon className="w-3 h-3 mr-1" /> Map
            </button>
          </div>
        </Card>

        {/* CONTENT AREA */}
        <Card className="border border-slate-200 overflow-hidden min-h-[600px] shadow-sm relative">
          
          {viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                  <tr>
                    <th className="px-4 py-3 sticky left-0 bg-slate-100 z-10">Bin ID</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Zone / Ward</th>
                    <th className="px-4 py-3">Fill Level</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Device Status</th>
                    <th className="px-4 py-3">Last Reading</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBins.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-12 text-center text-slate-500">
                        No SmartBins match the selected filters.
                        <button onClick={() => {setSearch(''); setZone('All'); setStatusFilter('All'); setSourceFilter('All')}} className="block mx-auto mt-2 text-xs font-bold text-primary-600 hover:underline">[ CLEAR FILTERS ]</button>
                      </td>
                    </tr>
                  ) : (
                    filteredBins.map((bin) => {
                      const pct = bin.latest_pct || 0
                      const isCritical = pct >= 80
                      const isHigh = pct >= 50 && pct < 80
                      const isSim = bin.data_source === 'SIMULATED'
                      
                      return (
                        <tr 
                          key={bin.id} 
                          className="hover:bg-slate-50 transition-colors group"
                        >
                          <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-slate-50 z-10 font-mono font-bold text-slate-800">
                            {bin.bin_id}
                          </td>
                          <td className="px-4 py-3">
                            {isSim ? (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase border border-slate-200">SIMULATED</span>
                            ) : (
                              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold uppercase border border-indigo-200">REAL DEVICE</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs font-bold text-slate-700">ZONE {bin.zone || '--'}</div>
                            <div className="text-[10px] text-slate-500 uppercase">WARD {bin.ward || '--'}</div>
                          </td>
                          <td className="px-4 py-3 w-48">
                            <div className="flex items-center gap-3">
                              <div className="w-24 bg-slate-100 h-2 rounded overflow-hidden shadow-inner">
                                <motion.div 
                                  className={`h-full ${isCritical ? 'bg-red-500' : isHigh ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                  initial={reducedMotion ? false : { width: 0 }}
                                  animate={{ width: `${Math.min(pct, 100)}%` }}
                                  transition={{ duration: 0.5 }}
                                />
                              </div>
                              <span className="text-xs font-bold w-8">{Math.round(pct)}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                              isCritical ? 'bg-red-100 text-red-700 border-red-200' : 
                              isHigh ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                              'bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}>
                              {isCritical ? 'CRITICAL' : isHigh ? 'HIGH' : 'NORMAL'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center text-xs font-bold text-emerald-600 uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                              ONLINE
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 font-medium">
                            {bin.last_seen ? timeAgo(bin.last_seen) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button 
                              onClick={() => handleRowClick(bin)}
                              className="px-3 py-1 bg-white border border-slate-300 rounded text-[10px] font-bold text-slate-600 uppercase hover:bg-slate-50 hover:text-primary-700 transition-colors"
                            >
                              VIEW
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-[600px] w-full z-0">
               <MapContainer 
                  center={[11.0168, 76.9558]} 
                  zoom={12} 
                  style={{ height: '100%', width: '100%' }}
               >
                 <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                 {filteredBins.map((b) => {
                   if (!b.lat || !b.lng) return null
                   
                   const pct = b.latest_pct || 0
                   let stat = 'normal'
                   if (pct >= 80) stat = 'critical'
                   else if (pct >= 50) stat = 'warning'
                   
                   const isSim = b.data_source === 'SIMULATED'
                   
                   return (
                     <Marker 
                       key={b.id} 
                       position={[b.lat, b.lng]} 
                       icon={getMarkerIcon(stat, isSim)}
                       eventHandlers={{ click: () => handleRowClick(b) }}
                     >
                       <Popup>
                         <div className="font-bold text-sm mb-1">{b.bin_id}</div>
                         <div className="text-[10px] font-bold uppercase mb-2">{isSim ? 'SIMULATED' : 'REAL DEVICE'}</div>
                         <div className="flex justify-between items-center mb-2">
                           <span className="text-xs">Fill: {Math.round(pct)}%</span>
                           <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded text-white ${
                              stat === 'critical' ? 'bg-red-500' : stat === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                           }`}>{stat}</span>
                         </div>
                         <button 
                           onClick={(e) => { e.stopPropagation(); handleRowClick(b); }}
                           className="w-full text-center py-1 bg-slate-100 text-[10px] font-bold uppercase text-slate-700 hover:bg-slate-200"
                         >
                           View Details
                         </button>
                       </Popup>
                     </Marker>
                   )
                 })}
               </MapContainer>
            </div>
          )}
          
          {/* DETAIL DRAWER OVERLAY */}
          <AnimatePresence>
            {selectedBin && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-30 transition-opacity"
                  onClick={closeDrawer}
                />
                <motion.div 
                  initial={reducedMotion ? false : { x: '100%' }}
                  animate={{ x: 0 }}
                  exit={reducedMotion ? false : { x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="absolute top-0 right-0 h-full w-full sm:w-[500px] bg-white shadow-2xl z-40 flex flex-col"
                >
                  <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
                    <div>
                      <h2 className="text-lg font-bold tracking-tight uppercase flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-indigo-400" />
                        {selectedBin.bin_id}
                      </h2>
                      <div className="flex items-center text-[10px] font-bold uppercase tracking-wider mt-1 text-slate-400">
                        <span className="mr-3">{selectedBin.data_source === 'SIMULATED' ? 'SIMULATED' : 'REAL DEVICE'}</span>
                        <span className="flex items-center text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span> ONLINE</span>
                      </div>
                    </div>
                    <button onClick={closeDrawer} className="text-slate-400 hover:text-white transition-colors">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50">
                    
                    {/* TOP TABS/ACTIONS */}
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => setEditMode(!editMode)}
                        className={`px-3 py-1.5 text-xs font-bold uppercase rounded border transition-colors ${editMode ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                      >
                        <Edit2 className="w-3.5 h-3.5 inline mr-1" /> Edit
                      </button>
                    </div>

                    {editMode ? (
                      <div className="bg-white border border-slate-200 rounded p-4 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Edit Configuration</h3>
                        <form onSubmit={handleSave} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Zone</label>
                              <input value={selectedBin.zone || ''} onChange={e => setSelectedBin({...selectedBin, zone: e.target.value})} className="w-full text-sm border-slate-300 rounded" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ward</label>
                              <input value={selectedBin.ward || ''} onChange={e => setSelectedBin({...selectedBin, ward: e.target.value})} className="w-full text-sm border-slate-300 rounded" />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Location</label>
                              <input value={selectedBin.location || ''} onChange={e => setSelectedBin({...selectedBin, location: e.target.value})} className="w-full text-sm border-slate-300 rounded" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Latitude</label>
                              <input type="number" step="any" value={selectedBin.lat || ''} onChange={e => setSelectedBin({...selectedBin, lat: e.target.value})} className="w-full text-sm border-slate-300 rounded" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Longitude</label>
                              <input type="number" step="any" value={selectedBin.lng || ''} onChange={e => setSelectedBin({...selectedBin, lng: e.target.value})} className="w-full text-sm border-slate-300 rounded" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Alert Threshold (%)</label>
                              <input type="number" value={selectedBin.alert_threshold_pct || 80} onChange={e => setSelectedBin({...selectedBin, alert_threshold_pct: e.target.value})} className="w-full text-sm border-slate-300 rounded" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Depth (cm)</label>
                              <input type="number" value={selectedBin.depth_cm || 100} onChange={e => setSelectedBin({...selectedBin, depth_cm: e.target.value})} className="w-full text-sm border-slate-300 rounded" />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                            <button type="button" onClick={() => setEditMode(false)} className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold uppercase rounded">Cancel</button>
                            <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold uppercase rounded disabled:opacity-50">Save Changes</button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <>
                        {/* CURRENT TELEMETRY */}
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Current Telemetry</div>
                          <div className="bg-white border border-slate-200 rounded p-5 shadow-sm">
                            <div className="flex justify-between items-end mb-2">
                              <span className="text-xs font-bold text-slate-500 uppercase">Fill Level</span>
                              <span className="text-3xl font-black text-slate-800">{Math.round(selectedBin.latest_pct || 0)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-4 rounded overflow-hidden shadow-inner mb-4">
                              <div 
                                className={`h-full ${(selectedBin.latest_pct||0) >= 80 ? 'bg-red-500' : (selectedBin.latest_pct||0) >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                style={{ width: `${Math.min(selectedBin.latest_pct||0, 100)}%` }}
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                              <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</div>
                                <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                                  (selectedBin.latest_pct||0) >= 80 ? 'bg-red-100 text-red-700 border-red-200' : 
                                  (selectedBin.latest_pct||0) >= 50 ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                                  'bg-emerald-100 text-emerald-700 border-emerald-200'
                                }`}>
                                  {(selectedBin.latest_pct||0) >= 80 ? 'CRITICAL' : (selectedBin.latest_pct||0) >= 50 ? 'HIGH' : 'NORMAL'}
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Last Reading</div>
                                <div className="text-sm font-bold text-slate-700">{selectedBin.last_seen ? formatDistanceToNow(new Date(selectedBin.last_seen)) + ' ago' : '—'}</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* HARDWARE / SOURCE PANEL */}
                        {selectedBin.data_source === 'SIMULATED' ? (
                          <div className="bg-slate-100 border border-slate-200 rounded p-4">
                            <div className="flex items-start">
                              <Server className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
                              <div>
                                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Device Source: Simulated</div>
                                <p className="text-xs text-slate-500 mt-1">This SmartBin is generated by the ERP demonstration simulator. Readings are mock data.</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-indigo-50 border border-indigo-100 rounded p-4">
                            <div className="flex items-start">
                              <Shield className="w-5 h-5 text-indigo-500 mr-3 shrink-0" />
                              <div>
                                <div className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Physical Device</div>
                                <div className="grid grid-cols-2 gap-4 mt-3">
                                  <div>
                                    <div className="text-[10px] font-bold text-indigo-400 uppercase">Device</div>
                                    <div className="text-xs font-bold text-indigo-800">ESP32</div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] font-bold text-indigo-400 uppercase">Sensor</div>
                                    <div className="text-xs font-bold text-indigo-800">HC-SR04</div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] font-bold text-indigo-400 uppercase">Credential</div>
                                    <div className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-100 px-1.5 py-0.5 rounded inline-block mt-0.5">Configured</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* LOCATION INFO */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white border border-slate-200 rounded p-4">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Location</div>
                            <div className="text-xs font-bold text-slate-800">{selectedBin.location || '—'}</div>
                            <div className="text-[10px] text-slate-500 uppercase mt-1">Zone {selectedBin.zone || '--'} · Ward {selectedBin.ward || '--'}</div>
                          </div>
                          <div className="bg-white border border-slate-200 rounded p-4">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Coordinates</div>
                            <div className="text-xs font-mono text-slate-600">Lat: {selectedBin.lat || '—'}</div>
                            <div className="text-xs font-mono text-slate-600 mt-1">Lng: {selectedBin.lng || '—'}</div>
                          </div>
                        </div>

                        {/* TELEMETRY HISTORY CHART */}
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Fill Level History</div>
                          <div className="bg-white border border-slate-200 rounded p-4 h-48">
                            {historyLoading ? (
                              <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading chart...</div>
                            ) : historyData.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={historyData}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                  <XAxis dataKey="timeLabel" tick={{fontSize: 10, fill: '#64748b'}} tickLine={false} axisLine={false} />
                                  <YAxis domain={[0, 100]} tick={{fontSize: 10, fill: '#64748b'}} tickLine={false} axisLine={false} width={30} />
                                  <Tooltip 
                                    contentStyle={{ borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value) => [`${Math.round(value)}%`, 'Fill']}
                                  />
                                  <Area type="monotone" dataKey="fill_pct" stroke="#4f46e5" fill="#c7d2fe" strokeWidth={2} />
                                </AreaChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="h-full flex items-center justify-center text-xs text-slate-400 text-center">
                                NO TELEMETRY HISTORY AVAILABLE<br/>
                                <span className="font-normal mt-1 block">Historical readings have not been recorded for this SmartBin.</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* COLLECTION STATUS */}
                        <div className="bg-white border border-slate-200 rounded p-4">
                           <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">Collection Status</div>
                           <div className="grid grid-cols-2 gap-4">
                             <div>
                               <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current</div>
                               <div className="text-xs font-bold text-slate-800 mt-1">
                                 {selectedBin.latest_pct >= selectedBin.route_threshold_pct ? 'DUE' : 'NOT DUE'}
                               </div>
                             </div>
                             <div>
                               <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Route Threshold</div>
                               <div className="text-xs font-bold text-slate-800 mt-1">{selectedBin.route_threshold_pct}%</div>
                             </div>
                           </div>
                        </div>

                        {/* DEMO / SIMULATION (Clear separation) */}
                        <div className="mt-8 border-t-2 border-dashed border-slate-300 pt-6">
                           <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center">
                             <Settings className="w-4 h-4 mr-2" />
                             Demo / Simulation
                           </h3>
                           <div className="grid grid-cols-2 gap-3">
                             <button 
                               onClick={() => handleSimulate(selectedBin.bin_id, 95)}
                               className="py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold uppercase rounded transition-colors"
                             >
                               Simulate Full (95%)
                             </button>
                             <button 
                               onClick={() => handleSimulate(selectedBin.bin_id, 10)}
                               className="py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold uppercase rounded transition-colors"
                             >
                               Simulate Empty (10%)
                             </button>
                           </div>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

        </Card>
      </div>
    </div>
  )
}
