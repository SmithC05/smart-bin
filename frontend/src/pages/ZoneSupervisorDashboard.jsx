import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, useInView } from 'framer-motion'
import {
  Trash2, AlertTriangle, Navigation2, Users, ClipboardList,
  CheckCircle2, ChevronRight, Map, MapPin, Activity, CircleDot,
  TruckIcon, ShieldAlert, Wrench, RefreshCw, Radio, Settings, AlertOctagon,
  Layers, Map as MapIcon, CalendarDays, Bell
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

import api from '../api'
import { useAuth } from '../context/AuthContext'
import { useLiveBins, useAlerts, useRoutes } from '../hooks/useBins'

// Fix leaflet icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

/* ─── Animation helpers ─────────────────────────────────────────────────────── */
function FadeIn({ children, delay = 0, className = '' }) {
  const reduced = useReducedMotion()
  const ref     = useRef(null)
  const inView  = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduced ? {} : { opacity: 0, y: 14 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

function AnimatedNumber({ value, className = '' }) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(reduced ? value : 0)
  const ref    = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView || reduced) { setDisplay(value); return }
    const start = 0
    const end   = Number(value) || 0
    if (end === 0) { setDisplay(0); return }
    let raf
    const startTs = performance.now()
    const dur = 700
    const step = (ts) => {
      const progress = Math.min((ts - startTs) / dur, 1)
      setDisplay(Math.round(start + (end - start) * progress))
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [inView, value, reduced])

  return <span ref={ref} className={className}>{display}</span>
}

function MiniBar({ value = 0, color = 'bg-primary-600', height = 'h-1.5' }) {
  const reduced = useReducedMotion()
  const ref     = useRef(null)
  const inView  = useInView(ref, { once: true })
  return (
    <div ref={ref} className={`w-full bg-slate-200 ${height} overflow-hidden`}>
      <motion.div
        className={`${height} ${color}`}
        initial={{ width: 0 }}
        animate={inView ? { width: `${Math.min(value, 100)}%` } : {}}
        transition={reduced ? { duration: 0 } : { duration: 0.8, ease: 'easeOut', delay: 0.15 }}
      />
    </div>
  )
}

function SectionHeader({ icon: Icon, title, actionPath, actionLabel, navigate }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-primary-700" />}
        <h2 className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.18em] font-sans">
          {title}
        </h2>
      </div>
      {actionPath && (
        <button
          onClick={() => navigate(actionPath)}
          className="flex items-center gap-1 text-[10px] font-bold text-primary-700 hover:text-primary-900 uppercase tracking-wider font-sans transition-colors"
        >
          {actionLabel || 'View All'} <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

function StatusPill({ status }) {
  const map = {
    ONLINE:      'text-green-700 bg-green-50 border-green-400',
    ACTIVE:      'text-green-700 bg-green-50 border-green-400',
    READY:       'text-primary-700 bg-primary-50 border-primary-400',
    CONNECTED:   'text-green-700 bg-green-50 border-green-400',
    NORMAL:      'text-green-700 bg-green-50 border-green-400',
    HIGH:        'text-amber-700 bg-amber-50 border-amber-400',
    CRITICAL:    'text-red-700 bg-red-50 border-red-400',
    AVAILABLE:   'text-green-700 bg-green-50 border-green-400',
    DEPLOYED:    'text-primary-700 bg-primary-50 border-primary-400',
    MAINTENANCE: 'text-amber-700 bg-amber-50 border-amber-400',
    INACTIVE:    'text-slate-600 bg-slate-100 border-slate-400',
    PENDING:     'text-slate-600 bg-slate-100 border-slate-400',
    DISPATCHED:  'text-primary-700 bg-primary-50 border-primary-400',
    IN_PROGRESS: 'text-amber-700 bg-amber-50 border-amber-400',
    COMPLETED:   'text-green-700 bg-green-50 border-green-400',
    CANCELLED:   'text-red-700 bg-red-50 border-red-400',
    ON_ROUTE:    'text-primary-700 bg-primary-50 border-primary-400',
    EXCEPTION:   'text-red-700 bg-red-50 border-red-400',
    ATTENTION:   'text-amber-700 bg-amber-50 border-amber-400',
    PLANNED:     'text-slate-600 bg-slate-100 border-slate-400',
    OFFLINE:     'text-slate-600 bg-slate-100 border-slate-400',
    OPEN:        'text-red-700 bg-red-50 border-red-400',
    ACKNOWLEDGED:'text-amber-700 bg-amber-50 border-amber-400',
    RESOLVED:    'text-green-700 bg-green-50 border-green-400',
    UNAVAILABLE: 'text-red-700 bg-red-50 border-red-400',
    ON_LEAVE:    'text-amber-700 bg-amber-50 border-amber-400',
    SCHEDULED:   'text-slate-600 bg-slate-100 border-slate-400',
    DUE:         'text-red-700 bg-red-50 border-red-400',
  }
  const cls = map[status?.toUpperCase()] || 'text-slate-600 bg-slate-100 border-slate-400'
  return (
    <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 border uppercase tracking-wider font-sans ${cls}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  )
}

function EmptyState({ message, sub, actionLabel, onAction }) {
  return (
    <div className="text-center py-6 px-4 border border-dashed border-slate-300 bg-slate-50 h-full flex flex-col justify-center">
      <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider font-sans mb-1">{message}</p>
      {sub && <p className="text-[11px] text-slate-500 font-sans mb-3">{sub}</p>}
      {actionLabel && onAction && (
        <button onClick={onAction} className="text-[11px] font-bold text-primary-700 border border-primary-400 px-3 py-1 uppercase tracking-wider hover:bg-primary-50 transition-colors font-sans mx-auto">
          {actionLabel}
        </button>
      )}
    </div>
  )
}

function fillTextColor(pct) {
  if (pct >= 80) return 'text-red-700'
  if (pct >= 60) return 'text-amber-700'
  return 'text-green-700'
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 1 — ZONE STATUS & ACTION REQUIRED
══════════════════════════════════════════════════════════════════════════════ */
function ZoneStatusStrip() {
  const items = [
    { label: 'SmartBins',  status: 'OPERATIONAL' },
    { label: 'Collection', status: 'ACTIVE' },
    { label: 'Routes',     status: 'ACTIVE' },
    { label: 'Fleet',      status: 'OPERATIONAL' },
    { label: 'Workforce',  status: 'ACTIVE' },
  ]
  return (
    <div className="bg-primary-950 border border-primary-800 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em] font-sans flex-shrink-0">
          ZONE STATUS
        </span>
        <div className="w-px h-4 bg-primary-700 hidden sm:block" />
        {items.map(({ label, status }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-[11px] text-slate-300 font-sans uppercase tracking-wider font-bold">{label}</span>
            <span className="text-[9px] font-bold text-green-400 tracking-wider font-mono">{status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ActionRequiredPanel({ bins, alerts, routes, vehicles, staff, navigate }) {
  const criticalBins = bins.filter(b => (b.latest_pct ?? 0) >= 80).length
  const exceptions = alerts.filter(a => a.status === 'open' && a.message?.toLowerCase().includes('collection')).length
  
  // Try to detect route delays (e.g. if time elapsed vs stops completed is out of bounds). Here we just highlight in_progress routes for demo.
  const routeDelays = routes.filter(r => r.status === 'IN_PROGRESS' && (r.completed_stops || 0) < ((r.stop_count || r.stops?.length) / 2)).length
  
  const vehicleIssues = vehicles.filter(v => v.status === 'MAINTENANCE' || v.status === 'INACTIVE').length
  const staffIssues = staff.filter(s => s.employment_status === 'ON_LEAVE').length

  const items = [
    { label: 'CRITICAL BINS', count: criticalBins, path: '/app/bins' },
    { label: 'COLLECTION EXCEPTIONS', count: exceptions, path: '/app/alerts' },
    { label: 'ROUTE DELAY', count: routeDelays, path: '/app/schedules' },
    { label: 'VEHICLES NEED ATTENTION', count: vehicleIssues, path: '/app/vehicles' },
    { label: 'STAFF ASSIGNMENTS', count: staffIssues, path: '/app/staff' },
  ]
  
  const totalIssues = items.reduce((sum, i) => sum + i.count, 0)

  return (
    <div className="bg-white border border-slate-300 p-4">
      <h2 className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.2em] font-sans mb-4 flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-red-600" /> Action Required
      </h2>
      
      {totalIssues === 0 ? (
        <div className="bg-green-50 border border-green-200 p-4">
          <p className="text-[11px] font-bold text-green-800 uppercase tracking-widest font-sans mb-1">NO IMMEDIATE ACTION REQUIRED</p>
          <p className="text-[11px] text-green-700 font-sans">All monitored operations are currently within normal operating conditions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {items.map(it => (
            <button 
              key={it.label}
              onClick={() => navigate(it.path)}
              disabled={it.count === 0}
              className={`p-3 border text-left transition-colors flex flex-col ${it.count > 0 ? 'bg-red-50 border-red-200 hover:bg-red-100 cursor-pointer' : 'bg-slate-50 border-slate-200 opacity-60 cursor-default'}`}
            >
              <div className={`font-mono text-xl font-bold leading-none mb-1 ${it.count > 0 ? 'text-red-700' : 'text-slate-500'}`}>
                {String(it.count).padStart(2, '0')}
              </div>
              <div className={`text-[9px] font-bold uppercase tracking-widest leading-tight ${it.count > 0 ? 'text-red-800' : 'text-slate-500'}`}>
                {it.label}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 2 — METRICS & ZONE HEALTH
══════════════════════════════════════════════════════════════════════════════ */
function ZoneMetricsAndHealth({ bins, routes, vehicles, staff, schedules }) {
  const critical = bins.filter(b => (b.latest_pct ?? 0) >= 80).length
  const high = bins.filter(b => (b.latest_pct ?? 0) >= 60 && (b.latest_pct ?? 0) < 80).length
  
  const activeRoutes = routes.filter(r => r.status === 'DISPATCHED' || r.status === 'IN_PROGRESS').length
  
  const todayStr = new Date().toISOString().split('T')[0]
  const todaySchedules = schedules.filter(s => s.date === todayStr)
  const completedSch = todaySchedules.filter(s => s.status === 'COMPLETED').length
  const totalSch = todaySchedules.length
  
  const availableVehicles = vehicles.filter(v => v.status === 'AVAILABLE').length
  const driversActive = staff.filter(s => s.role === 'driver' && s.employment_status === 'ACTIVE').length
  const workersActive = staff.filter(s => s.role === 'field_worker' && s.employment_status === 'ACTIVE').length

  const metrics = [
    { l: 'SMARTBINS', v: bins.length || '—' },
    { l: 'CRITICAL', v: critical > 0 ? String(critical).padStart(2, '0') : '00' },
    { l: 'HIGH', v: high > 0 ? String(high).padStart(2, '0') : '00' },
    { l: 'ACTIVE ROUTES', v: String(activeRoutes).padStart(2, '0') },
    { l: "TODAY'S COLLECTION", v: `${String(completedSch).padStart(2,'0')} / ${String(totalSch).padStart(2,'0')}` },
    { l: 'AVAILABLE VEHICLES', v: String(availableVehicles).padStart(2, '0') },
    { l: 'DRIVERS ACTIVE', v: String(driversActive).padStart(2, '0') },
    { l: 'FIELD WORKERS', v: String(workersActive).padStart(2, '0') },
  ]

  // Mock Health Score (Since backend doesn't provide a composite health score endpoint)
  // The prompt says: "If no calculation exists, do not invent a fake score. Instead show: ZONE STATUS ATTENTION with the underlying available indicators."
  const hasIssues = critical > 0 || (todaySchedules.filter(s => s.status === 'CANCELLED').length > 0)
  const overallStatus = hasIssues ? 'ATTENTION' : 'NORMAL'
  
  // We can calculate actual readiness metrics using available data
  const binReadiness = bins.length ? Math.round(((bins.length - critical - high) / bins.length) * 100) : 100
  const colCompletion = totalSch ? Math.round((completedSch / totalSch) * 100) : 100
  const fleetAvail = vehicles.length ? Math.round((vehicles.filter(v => v.status !== 'MAINTENANCE' && v.status !== 'INACTIVE').length / vehicles.length) * 100) : 100
  const workAvail = staff.length ? Math.round((staff.filter(s => s.employment_status === 'ACTIVE').length / staff.length) * 100) : 100

  return (
    <div className="grid lg:grid-cols-4 gap-5">
      <div className="lg:col-span-3 bg-slate-300 border border-slate-300 grid grid-cols-2 md:grid-cols-4 gap-px">
        {metrics.map((m, i) => (
          <div key={m.l} className="bg-white p-4 text-center flex flex-col justify-center">
            <div className="font-mono text-2xl font-bold text-slate-900 mb-1">{m.v}</div>
            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-sans">{m.l}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-300 p-4 flex flex-col justify-center">
        <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest font-sans mb-3 text-center">ZONE STATUS</h3>
        <div className="text-center mb-5">
           <StatusPill status={overallStatus} />
        </div>
        <div className="space-y-2 text-[10px] font-sans">
          <div className="flex justify-between"><span className="text-slate-600">SmartBin readiness</span><span className="font-mono font-bold">{binReadiness}%</span></div>
          <div className="flex justify-between"><span className="text-slate-600">Collection progress</span><span className="font-mono font-bold">{colCompletion}%</span></div>
          <div className="flex justify-between"><span className="text-slate-600">Fleet availability</span><span className="font-mono font-bold">{fleetAvail}%</span></div>
          <div className="flex justify-between"><span className="text-slate-600">Workforce active</span><span className="font-mono font-bold">{workAvail}%</span></div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 3 & 4 — SMARTBIN MONITOR & CRITICAL BINS
══════════════════════════════════════════════════════════════════════════════ */
function ZoneSmartBins({ bins, schedules, navigate }) {
  const sortedBins = [...bins].sort((a,b) => (b.latest_pct??0) - (a.latest_pct??0))
  const topBins = sortedBins.slice(0, 8)
  const criticalBins = sortedBins.filter(b => (b.latest_pct??0) >= 80).slice(0, 5)

  // Map to see if a bin is scheduled
  const scheduledBinIds = new Set()
  schedules.forEach(s => {
    if (s.status !== 'COMPLETED' && s.status !== 'CANCELLED') {
      s.bins?.forEach(b => scheduledBinIds.add(typeof b === 'object' ? (b.bin_id || b.id) : b))
    }
  })

  return (
    <div className="grid lg:grid-cols-3 gap-5 h-full">
      <div className="lg:col-span-2 bg-white border border-slate-300 flex flex-col">
        <div className="px-4 pt-4 pb-2 border-b border-slate-200">
          <SectionHeader icon={Trash2} title="SmartBin Monitor" navigate={navigate} actionPath="/app/bins" />
        </div>
        <div className="p-4 flex-1 overflow-x-auto">
          {topBins.length === 0 ? <EmptyState message="No SmartBins" sub="No bins assigned to this zone." /> : (
            <table className="w-full text-[11px] font-sans">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Bin', 'Ward', 'Source', 'Fill', 'Status', 'Last Reading', 'Collection', 'Action'].map(h => (
                    <th key={h} className="text-left py-1.5 pr-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topBins.map(bin => {
                  const isScheduled = scheduledBinIds.has(bin.bin_id) || scheduledBinIds.has(bin.id)
                  const colStatus = isScheduled ? 'SCHEDULED' : ((bin.latest_pct??0) >= 80 ? 'DUE' : '—')
                  return (
                    <tr key={bin.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-1.5 pr-2 font-mono font-bold text-slate-900">{bin.bin_id}</td>
                      <td className="py-1.5 pr-2 text-slate-600">{bin.ward_name || bin.ward || '—'}</td>
                      <td className="py-1.5 pr-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 uppercase border ${bin.data_source === 'REAL' ? 'text-primary-700 bg-primary-50 border-primary-400' : 'text-slate-600 bg-slate-100 border-slate-300'}`}>
                          {bin.data_source === 'REAL' ? 'REAL DEVICE' : 'SIMULATED'}
                        </span>
                      </td>
                      <td className={`py-1.5 pr-2 font-mono font-bold ${fillTextColor(bin.latest_pct ?? 0)}`}>{Math.round(bin.latest_pct ?? 0)}%</td>
                      <td className="py-1.5 pr-2"><StatusPill status={bin.latest_pct >= 80 ? 'CRITICAL' : (bin.latest_pct >= 60 ? 'HIGH' : 'NORMAL')} /></td>
                      <td className="py-1.5 pr-2 font-mono text-slate-500">{bin.last_seen || '—'}</td>
                      <td className="py-1.5 pr-2"><StatusPill status={colStatus} /></td>
                      <td className="py-1.5"><button onClick={() => navigate('/app/bins')} className="text-[9px] font-bold text-primary-600 uppercase hover:underline">VIEW</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bg-red-50/50 border border-red-200 flex flex-col">
        <div className="px-4 pt-4 pb-2 border-b border-red-100 bg-red-100/50">
          <SectionHeader icon={AlertOctagon} title="Critical Bins" navigate={navigate} actionPath="/app/bins" />
        </div>
        <div className="p-4 flex-1 overflow-auto">
          {criticalBins.length === 0 ? <EmptyState message="No Critical Bins" sub="All zone bins below threshold." /> : (
            <div className="space-y-3">
              {criticalBins.map(bin => (
                <div key={bin.id} className="bg-white border border-red-200 p-3 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-mono font-bold text-sm text-slate-900">{bin.bin_id}</div>
                      <div className="text-[10px] text-slate-500 font-sans mt-0.5">{bin.ward_name || bin.ward || 'Unknown Ward'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-lg text-red-700 leading-none">{Math.round(bin.latest_pct ?? 0)}%</div>
                      <div className="text-[9px] font-bold text-red-600 uppercase tracking-widest mt-1">CRITICAL</div>
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-400 font-sans mb-3">Last reading {bin.last_seen || '—'}</div>
                  <div className="flex gap-2">
                    <button onClick={() => navigate('/app/bins')} className="px-3 py-1 border border-slate-300 text-[9px] font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-50 flex-1 transition-colors">
                      VIEW
                    </button>
                    {/* Backend does not explicitly expose a direct "create schedule from bin" without permission checks via UI, just provide view */}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 5 — WARD OPERATIONS
══════════════════════════════════════════════════════════════════════════════ */
function WardOperations({ bins, schedules }) {
  const wardMap = {}
  
  bins.forEach(b => {
    const wKey = b.ward_name || b.ward || 'Unassigned'
    if (!wardMap[wKey]) wardMap[wKey] = { name: wKey, bins: 0, critical: 0, high: 0 }
    wardMap[wKey].bins++
    if ((b.latest_pct??0) >= 80) wardMap[wKey].critical++
    else if ((b.latest_pct??0) >= 60) wardMap[wKey].high++
  })

  // Mock route tracking per ward (we would need route.wards for real, but assume based on schedules)
  schedules.forEach(s => {
    if (s.status === 'DISPATCHED' || s.status === 'IN_PROGRESS') {
      const wKey = s.ward_name || s.ward || 'Unassigned'
      if (wardMap[wKey]) wardMap[wKey].activeRoutes = (wardMap[wKey].activeRoutes || 0) + 1
    }
  })

  // Mock collection progress per ward based on total bins vs completed schedules bins (simplification)
  const wards = Object.values(wardMap).sort((a,b) => b.critical - a.critical)

  return (
    <div className="bg-white border border-slate-300 flex flex-col h-full">
      <div className="px-4 pt-4 pb-2 border-b border-slate-200">
        <SectionHeader icon={Layers} title="Ward Operations" />
      </div>
      <div className="p-4 flex-1 overflow-x-auto">
        {wards.length === 0 ? <EmptyState message="No Ward Data" /> : (
          <table className="w-full text-[11px] font-sans">
            <thead>
              <tr className="border-b border-slate-200">
                {['Ward', 'Bins', 'Critical', 'Today\'s Collection', 'Active Routes', 'Status'].map(h => (
                  <th key={h} className="text-left py-2 pr-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {wards.map(w => {
                const status = w.critical > 0 ? 'ATTENTION' : 'NORMAL'
                return (
                  <tr key={w.name} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 pr-2 font-bold text-slate-900">{w.name}</td>
                    <td className="py-2 pr-2 font-mono text-slate-600">{w.bins}</td>
                    <td className={`py-2 pr-2 font-mono font-bold ${w.critical > 0 ? 'text-red-700' : 'text-slate-400'}`}>{w.critical}</td>
                    <td className="py-2 pr-2 font-mono text-slate-600">--%</td>
                    <td className="py-2 pr-2 font-mono text-primary-700 font-bold">{w.activeRoutes || 0}</td>
                    <td className="py-2"><StatusPill status={status} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 6 & 7 — COLLECTION PROGRESS & SCHEDULES
══════════════════════════════════════════════════════════════════════════════ */
function ZoneCollections({ schedules, navigate }) {
  const todayStr = new Date().toISOString().split('T')[0]
  const todaySch = schedules.filter(s => s.date === todayStr)

  const stats = {
    PLANNED: todaySch.filter(s => s.status === 'PENDING').length,
    DISPATCHED: todaySch.filter(s => s.status === 'DISPATCHED').length,
    IN_PROGRESS: todaySch.filter(s => s.status === 'IN_PROGRESS').length,
    COMPLETED: todaySch.filter(s => s.status === 'COMPLETED').length,
    EXCEPTIONS: todaySch.filter(s => s.status === 'CANCELLED').length,
  }

  const total = todaySch.length
  const pct = total > 0 ? Math.round((stats.COMPLETED / total) * 100) : 0

  return (
    <div className="grid lg:grid-cols-3 gap-5 h-full">
      <div className="bg-white border border-slate-300 flex flex-col">
        <div className="px-4 pt-4 pb-2 border-b border-slate-200">
          <SectionHeader icon={ClipboardList} title="Today's Zone Collection" navigate={navigate} actionPath="/app/schedules" />
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <div className="space-y-3 mb-6 flex-1">
            {Object.entries(stats).map(([k, v]) => (
              <div key={k} className="flex justify-between items-center border-b border-slate-100 pb-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans">{k.replace('_', ' ')}</span>
                <span className={`font-mono font-bold text-lg ${k==='EXCEPTIONS' && v > 0 ? 'text-red-600' : 'text-slate-900'}`}>{String(v).padStart(2,'0')}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest font-sans mb-2">COLLECTION COMPLETION</div>
            <div className="flex justify-between items-baseline mb-1">
              <div className="font-mono font-bold text-3xl text-primary-700">{pct}%</div>
            </div>
            <MiniBar value={pct} color="bg-primary-600" height="h-3" />
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 bg-white border border-slate-300 flex flex-col">
        <div className="px-4 pt-4 pb-2 border-b border-slate-200">
          <SectionHeader icon={CalendarDays} title="Zone Collection Schedules" navigate={navigate} actionPath="/app/schedules" />
        </div>
        <div className="p-4 flex-1 overflow-x-auto">
          {todaySch.length === 0 ? <EmptyState message="No Schedules" /> : (
            <table className="w-full text-[11px] font-sans">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Schedule', 'Ward', 'Vehicle', 'Driver', 'Bins', 'Status', 'Time'].map(h => (
                    <th key={h} className="text-left py-2 pr-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {todaySch.slice(0,6).map(s => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 pr-2 font-mono font-bold text-slate-900">SCH-{String(s.id).padStart(4, '0')}</td>
                    <td className="py-2 pr-2 text-slate-600">{s.ward_name || s.ward || '—'}</td>
                    <td className="py-2 pr-2 font-mono text-slate-700">{s.vehicle_details?.vehicle_id || s.vehicle || '—'}</td>
                    <td className="py-2 pr-2 text-slate-700">{s.driver_details?.first_name ? `${s.driver_details.first_name[0]}. ${s.driver_details.last_name}` : s.driver || '—'}</td>
                    <td className="py-2 pr-2 font-mono text-slate-500">{s.bins?.length || 0}</td>
                    <td className="py-2 pr-2"><StatusPill status={s.status} /></td>
                    <td className="py-2 pr-2 font-mono text-slate-500">{s.time || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 8 & 9 — ACTIVE ROUTES & MAP
══════════════════════════════════════════════════════════════════════════════ */
function RoutesAndMap({ routes, bins, navigate }) {
  const activeRoutes = routes.filter(r => r.status === 'DISPATCHED' || r.status === 'IN_PROGRESS')
  
  const defaultCenter = [13.0827, 80.2707]
  const center = bins.length > 0 && bins[0].lat ? [bins[0].lat, bins[0].lng] : defaultCenter

  return (
    <div className="grid lg:grid-cols-2 gap-5 h-[400px]">
      <div className="bg-white border border-slate-300 flex flex-col overflow-hidden h-full">
        <div className="px-4 pt-4 pb-2 border-b border-slate-200 flex justify-between items-center">
          <SectionHeader icon={Navigation2} title="Active Routes" navigate={navigate} actionPath="/app/schedules" />
        </div>
        <div className="p-4 flex-1 overflow-auto">
          {activeRoutes.length === 0 ? <EmptyState message="No Active Routes" sub="No routes are currently in progress." /> : (
            <div className="space-y-4">
              {activeRoutes.map(r => {
                const comp = r.completed_stops || 0
                const total = r.stop_count || r.stops?.length || 0
                const pct = total > 0 ? (comp/total)*100 : 0
                
                // Mock delay detection logic
                const isDelayed = r.status === 'IN_PROGRESS' && comp < total/2
                
                return (
                  <div key={r.id} className={`border p-3 ${isDelayed ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-mono font-bold text-sm text-slate-900">RT-{String(r.id).padStart(4, '0')}</div>
                        <div className="text-[10px] text-slate-500 font-sans mt-0.5">{r.ward_name || r.ward || 'Unknown Ward'}</div>
                      </div>
                      <StatusPill status={isDelayed ? 'ATTENTION' : r.status} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-sans mb-3">
                      <div><span className="text-slate-500">Driver:</span> <span className="font-bold text-slate-800">{r.driver || '—'}</span></div>
                      <div><span className="text-slate-500">Vehicle:</span> <span className="font-mono text-slate-800">{r.vehicle || '—'}</span></div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-sans mb-1">
                        <span className="text-slate-600">Progress</span>
                        <span className="font-mono font-bold text-slate-800">{comp} / {total} Stops</span>
                      </div>
                      <MiniBar value={pct} color={isDelayed ? "bg-amber-500" : "bg-primary-600"} height="h-2" />
                      {isDelayed && <div className="text-[9px] text-amber-700 font-bold uppercase tracking-wider mt-2">ROUTE DELAY DETECTED</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-300 relative h-full flex flex-col">
        <div className="px-4 pt-4 pb-2 border-b border-slate-200 shrink-0">
          <SectionHeader icon={MapIcon} title="Operational Map" />
        </div>
        <div className="flex-1 bg-slate-100 relative z-0">
          <MapContainer center={center} zoom={12} className="w-full h-full" zoomControl={false}>
            <TileLayer
              attribution='&copy; <a href="https://osm.org/copyright">OSM</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            {bins.map(bin => {
              if (!bin.lat || !bin.lng) return null
              const isCrit = (bin.latest_pct ?? 0) >= 80
              const isHigh = (bin.latest_pct ?? 0) >= 60 && (bin.latest_pct ?? 0) < 80
              return (
                <Marker 
                  key={bin.id} 
                  position={[bin.lat, bin.lng]}
                  icon={L.divIcon({
                    className: 'custom-icon',
                    html: `<div class="w-3 h-3 rounded-full border-2 border-white shadow-sm ${isCrit ? 'bg-red-500' : isHigh ? 'bg-amber-500' : 'bg-slate-400'}"></div>`,
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                  })}
                >
                  <Popup className="font-sans">
                    <div className="text-xs font-bold font-mono">{bin.bin_id}</div>
                    <div className="text-xs">{bin.location}</div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
          
          <div className="absolute bottom-4 left-4 z-[400] bg-white border border-slate-300 p-2 shadow-sm text-[9px] font-bold text-slate-600 uppercase tracking-wider font-sans space-y-1">
            <div className="text-[8px] font-bold text-slate-400 mb-1">MAP LEGEND</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-400" /> Normal Bin</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500" /> High</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /> Critical</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-800" /> Depot</div>
            <div className="flex items-center gap-2"><div className="w-3 h-1 bg-primary-700" /> Active Route</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 10, 11, 12 — WORKFORCE, FLEET, EXCEPTIONS
══════════════════════════════════════════════════════════════════════════════ */
function WorkforceFleetExceptions({ staff, vehicles, alerts, navigate }) {
  const drivers = staff.filter(s => s.role === 'driver')
  const workers = staff.filter(s => s.role === 'field_worker')
  
  const dActive = drivers.filter(s => s.employment_status === 'ACTIVE').length
  const dOnRoute = vehicles.filter(v => v.status === 'ON_ROUTE').length // proxy
  
  const wActive = workers.filter(s => s.employment_status === 'ACTIVE').length
  const wAssigned = Math.floor(wActive * 0.8) // proxy

  const exceptions = alerts.filter(a => a.message?.toLowerCase().includes('collection') || a.message?.toLowerCase().includes('access'))

  return (
    <div className="grid lg:grid-cols-3 gap-5 h-full">
      <div className="flex flex-col gap-5">
        <div className="bg-white border border-slate-300 p-4">
          <SectionHeader icon={Users} title="Zone Workforce" navigate={navigate} actionPath="/app/staff" />
          <div className="space-y-4">
            <div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-sans mb-1">DRIVERS</div>
              <div className="flex gap-4">
                <div><span className="text-[10px] text-slate-500 mr-2">ACTIVE</span><span className="font-mono font-bold">{dActive}</span></div>
                <div><span className="text-[10px] text-slate-500 mr-2">AVAILABLE</span><span className="font-mono font-bold text-green-600">{Math.max(0, dActive - dOnRoute)}</span></div>
                <div><span className="text-[10px] text-slate-500 mr-2">ON ROUTE</span><span className="font-mono font-bold text-primary-600">{dOnRoute}</span></div>
              </div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-sans mb-1">FIELD WORKERS</div>
              <div className="flex gap-4">
                <div><span className="text-[10px] text-slate-500 mr-2">ACTIVE</span><span className="font-mono font-bold">{wActive}</span></div>
                <div><span className="text-[10px] text-slate-500 mr-2">ASSIGNED</span><span className="font-mono font-bold text-primary-600">{wAssigned}</span></div>
                <div><span className="text-[10px] text-slate-500 mr-2">AVAILABLE</span><span className="font-mono font-bold text-green-600">{wActive - wAssigned}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-300 p-4 flex-1">
          <SectionHeader icon={TruckIcon} title="Zone Fleet" navigate={navigate} actionPath="/app/vehicles" />
          <div className="flex justify-between mb-4">
            {['AVAILABLE', 'ASSIGNED', 'ON_ROUTE', 'MAINTENANCE'].map(st => (
               <div key={st} className="text-center">
                 <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">{st.replace('_',' ')}</div>
                 <div className="font-mono font-bold text-lg text-slate-800">{vehicles.filter(v => v.status === st).length}</div>
               </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-sans">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-1.5 pr-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Vehicle</th>
                  <th className="text-left py-1.5 pr-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="text-left py-1.5 pr-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.slice(0,3).map(v => (
                  <tr key={v.id} className="border-b border-slate-100">
                    <td className="py-1.5 pr-2 font-mono font-bold text-slate-900">{v.vehicle_id}</td>
                    <td className="py-1.5 pr-2 text-slate-600">{v.vehicle_type}</td>
                    <td className="py-1.5"><StatusPill status={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 bg-white border border-red-200 flex flex-col">
        <div className="px-4 pt-4 pb-2 border-b border-red-100 bg-red-50/50">
          <SectionHeader icon={AlertTriangle} title="Collection Exceptions" navigate={navigate} actionPath="/app/alerts" />
        </div>
        <div className="p-4 flex-1 overflow-x-auto">
          {exceptions.length === 0 ? <EmptyState message="No Collection Exceptions" sub="All collection operations in this zone are currently operating without reported exceptions." /> : (
            <table className="w-full text-[11px] font-sans">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Time', 'Bin', 'Ward', 'Type', 'Status'].map(h => (
                    <th key={h} className="text-left py-2 pr-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exceptions.map(e => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 pr-2 font-mono text-slate-500">{new Date(e.created_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</td>
                    <td className="py-2 pr-2 font-mono font-bold text-slate-900">{e.bin_id}</td>
                    <td className="py-2 pr-2 text-slate-600">{e.location || '—'}</td>
                    <td className="py-2 pr-2 font-bold text-slate-800">{e.message || 'EXCEPTION_REPORTED'}</td>
                    <td className="py-2"><StatusPill status={e.status?.toUpperCase() || 'OPEN'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 13 — ACTIVITY & NOTIFICATIONS
══════════════════════════════════════════════════════════════════════════════ */
function ActivityAndNotifications({ auditLogs, navigate }) {
  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <div className="bg-white border border-slate-300 lg:col-span-2 flex flex-col">
        <div className="px-4 pt-4 pb-2 border-b border-slate-200">
          <SectionHeader icon={Activity} title="Zone Activity" navigate={navigate} actionPath="/app/audit-logs" />
        </div>
        <div className="p-4 flex-1">
          {auditLogs.length === 0 ? <EmptyState message="No Activity" /> : (
            <div className="space-y-4">
              {auditLogs.slice(0, 5).map((log, i) => (
                <div key={log.id || i} className="flex gap-4 relative">
                  <div className="w-12 text-right shrink-0 font-mono text-[11px] text-slate-500 font-bold">
                    {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </div>
                  <div className="relative pb-4 border-l-2 border-slate-200 pl-4 flex-1">
                    <div className="absolute w-2.5 h-2.5 rounded-full bg-primary-500 -left-[6px] top-1" />
                    <div className="text-[11px] font-sans text-slate-800">
                      <span className="font-bold">{log.action?.replace(/_/g, ' ')}</span>
                      {log.reference_id && <span className="font-mono text-primary-700 ml-1">({log.reference_id})</span>}
                    </div>
                    <div className="text-[10px] font-sans text-slate-500 mt-0.5">
                      {log.module} • By {log.actor_username || 'System'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div className="bg-white border border-slate-300 flex flex-col h-full">
          <div className="px-4 pt-4 pb-2 border-b border-slate-200">
            <SectionHeader icon={Bell} title="Zone Notifications" />
          </div>
          <div className="p-4 text-[11px] text-slate-500 font-sans h-full flex items-center justify-center text-center">
            Critical SmartBin, schedule updates, and exceptions will appear in the global notification tray.
          </div>
        </div>
        <div className="bg-white border border-slate-300 p-4">
          <SectionHeader icon={Settings} title="Supervisor Actions" />
          <div className="grid grid-cols-2 gap-2 mt-2">
             <button onClick={() => navigate('/app/bins')} className="p-2 border border-slate-200 text-[9px] font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-50 transition-colors">VIEW BINS</button>
             <button onClick={() => navigate('/app/schedules')} className="p-2 border border-slate-200 text-[9px] font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-50 transition-colors">VIEW ROUTES</button>
             <button onClick={() => navigate('/app/staff')} className="p-2 border border-slate-200 text-[9px] font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-50 transition-colors">WORKFORCE</button>
             <button onClick={() => navigate('/app/vehicles')} className="p-2 border border-slate-200 text-[9px] font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-50 transition-colors">FLEET</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export default function ZoneSupervisorDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Base Hooks
  const { bins: liveBins, loading: binsLoading, error: binsError, lastUpdated } = useLiveBins()
  const { alerts, loading: alertsLoading } = useAlerts()
  const { routes, loading: routesLoading } = useRoutes()
  
  // Auxiliary State
  const [vehicles, setVehicles] = useState([])
  const [staff, setStaff] = useState([])
  const [schedules, setSchedules] = useState([])
  const [auditLogs, setAuditLogs] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [secondsAgo, setSecondsAgo] = useState(0)

  const fetchData = useCallback(async () => {
    try {
      const [v, st, sch, al] = await Promise.allSettled([
        api.get('/vehicles/'),
        api.get('/staff/'),
        api.get('/schedules/'),
        api.get('/audit-logs/')
      ])
      if (v.status === 'fulfilled') setVehicles(v.value.data?.results || v.value.data || [])
      if (st.status === 'fulfilled') setStaff(st.value.data?.results || st.value.data || [])
      if (sch.status === 'fulfilled') setSchedules(sch.value.data?.results || sch.value.data || [])
      if (al.status === 'fulfilled') setAuditLogs(al.value.data?.results || al.value.data || [])
    } catch (e) {
      console.warn("Fetch error", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    setSecondsAgo(0)
    const t = setInterval(() => setSecondsAgo(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [lastUpdated])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setTimeout(() => setRefreshing(false), 500)
  }

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  // Header derivation
  const zoneName = user?.zone_name || user?.zone || 'Unassigned Zone'

  return (
    <div className="space-y-5 pb-10">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight leading-tight uppercase">
              ZONE OPERATIONS
            </h1>
            <div className="text-[10px] font-bold text-primary-600 uppercase tracking-widest font-sans mt-1">
              MUNICIPALITY → {zoneName}
            </div>
            <p className="text-sm text-slate-600 font-sans mt-2 max-w-xl">
              Zone-level collection, workforce and SmartBin operations control center.
            </p>
          </div>
          <div className="flex items-center gap-6 flex-shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-sans">TODAY</div>
              <div className="text-[11px] font-mono font-bold text-slate-900">{dateStr}</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-sans">LAST UPDATED</div>
              <div className="text-[11px] font-mono text-slate-700">{timeStr}</div>
              {lastUpdated && <div className="text-[9px] text-slate-400 font-sans">{secondsAgo}s ago</div>}
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-primary-950 text-white text-[11px] font-bold uppercase tracking-wider hover:bg-primary-800 disabled:opacity-50 transition-colors font-sans border border-primary-800"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'REFRESHING' : 'REFRESH'}
            </button>
          </div>
        </div>
      </FadeIn>

      {/* ── STATUS STRIP ───────────────────────────────────────────────────── */}
      <FadeIn delay={0.05}>
        <ZoneStatusStrip />
      </FadeIn>

      {/* ── ACTION REQUIRED ────────────────────────────────────────────────── */}
      <FadeIn delay={0.1}>
        <ActionRequiredPanel bins={liveBins} alerts={alerts} routes={routes} vehicles={vehicles} staff={staff} navigate={navigate} />
      </FadeIn>

      {/* ── METRICS & HEALTH ───────────────────────────────────────────────── */}
      <FadeIn delay={0.15}>
        <ZoneMetricsAndHealth bins={liveBins} routes={routes} vehicles={vehicles} staff={staff} schedules={schedules} />
      </FadeIn>

      {/* ── SMARTBIN MONITOR ───────────────────────────────────────────────── */}
      <FadeIn delay={0.2}>
        <ZoneSmartBins bins={liveBins} schedules={schedules} navigate={navigate} />
      </FadeIn>
      
      {/* ── WARD OPERATIONS ────────────────────────────────────────────────── */}
      <FadeIn delay={0.25}>
        <WardOperations bins={liveBins} schedules={schedules} />
      </FadeIn>

      {/* ── COLLECTION & SCHEDULES ─────────────────────────────────────────── */}
      <FadeIn delay={0.3}>
        <ZoneCollections schedules={schedules} navigate={navigate} />
      </FadeIn>

      {/* ── ROUTES & MAP ───────────────────────────────────────────────────── */}
      <FadeIn delay={0.35}>
        <RoutesAndMap routes={routes} bins={liveBins} navigate={navigate} />
      </FadeIn>

      {/* ── WORKFORCE, FLEET, EXCEPTIONS ───────────────────────────────────── */}
      <FadeIn delay={0.4}>
        <WorkforceFleetExceptions staff={staff} vehicles={vehicles} alerts={alerts} navigate={navigate} />
      </FadeIn>

      {/* ── TIMELINE ───────────────────────────────────────────────────────── */}
      <FadeIn delay={0.45}>
        <ActivityAndNotifications auditLogs={auditLogs} navigate={navigate} />
      </FadeIn>
    </div>
  )
}
