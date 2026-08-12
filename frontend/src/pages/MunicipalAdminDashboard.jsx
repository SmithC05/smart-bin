import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, useInView } from 'framer-motion'
import {
  Trash2, AlertTriangle, Building2, Truck, Users, Bell, Shield,
  Settings, Navigation2, Activity, Zap, ChevronRight,
  ClipboardList, FileText, MapPin, Search, AlertOctagon,
  Layers, Map, CircleDot, TruckIcon, UserCircle, RefreshCw
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

import api from '../api'
import { useAuth } from '../context/AuthContext'
import { useLiveBins, useAlerts, useRoutes } from '../hooks/useBins'
import { timeAgo, fillColor, fillLabel, fillBadgeClass } from '../utils/binHelpers'

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
  }
  const cls = map[status] || 'text-slate-600 bg-slate-100 border-slate-400'
  return (
    <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 border uppercase tracking-wider font-sans ${cls}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  )
}

function Skeleton({ rows = 3 }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-8 bg-slate-100 border border-slate-200" />
      ))}
    </div>
  )
}

function EmptyState({ message, sub, actionLabel, onAction }) {
  return (
    <div className="text-center py-6 px-4 border border-dashed border-slate-300 bg-slate-50">
      <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider font-sans mb-1">{message}</p>
      {sub && <p className="text-[11px] text-slate-500 font-sans mb-3">{sub}</p>}
      {actionLabel && onAction && (
        <button onClick={onAction} className="text-[11px] font-bold text-primary-700 border border-primary-400 px-3 py-1 uppercase tracking-wider hover:bg-primary-50 transition-colors font-sans">
          {actionLabel}
        </button>
      )}
    </div>
  )
}

function fillBarColor(pct) {
  if (pct >= 80) return 'bg-red-500'
  if (pct >= 60) return 'bg-amber-500'
  return 'bg-green-500'
}
function fillTextColor(pct) {
  if (pct >= 80) return 'text-red-700'
  if (pct >= 60) return 'text-amber-700'
  return 'text-green-700'
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 1 — MUNICIPAL STATUS STRIP
══════════════════════════════════════════════════════════════════════════════ */
function MunicipalStatusStrip() {
  const items = [
    { label: 'SmartBin Network', status: 'OPERATIONAL', dot: 'bg-green-500' },
    { label: 'Collection',       status: 'ACTIVE',      dot: 'bg-green-500' },
    { label: 'Fleet',            status: 'OPERATIONAL', dot: 'bg-green-500' },
    { label: 'Workforce',        status: 'ACTIVE',      dot: 'bg-green-500' },
    { label: 'Routing',          status: 'READY',       dot: 'bg-primary-500' },
  ]
  return (
    <div className="bg-primary-950 border border-primary-800 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em] font-sans flex-shrink-0 flex items-center gap-1.5">
          <Building2 className="w-3 h-3" /> Municipal Status
        </span>
        <div className="w-px h-4 bg-primary-700 hidden sm:block" />
        {items.map(({ label, status, dot }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
            <span className="text-[11px] text-slate-300 font-sans uppercase tracking-wider font-bold">{label}</span>
            <span className="text-[9px] font-bold text-white tracking-wider font-mono bg-primary-900 px-1 py-0.5">{status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 2 — PRIMARY MUNICIPAL METRICS
══════════════════════════════════════════════════════════════════════════════ */
function MunicipalMetricsRow({ bins, alerts, routes, schedules, vehicles, staff }) {
  const criticalBins = bins.filter(b => (b.latest_pct ?? 0) >= 80).length
  const todaySchedules = schedules.filter(s => s.date === new Date().toISOString().split('T')[0]).length
  const activeRoutes = routes.filter(r => r.status === 'DISPATCHED' || r.status === 'IN_PROGRESS').length
  const availableVehicles = vehicles.filter(v => v.status === 'AVAILABLE').length
  const activeDrivers = staff.filter(s => s.role === 'driver' && s.employment_status === 'ACTIVE').length
  const activeWorkers = staff.filter(s => s.role === 'field_worker' && s.employment_status === 'ACTIVE').length
  const openIncidents = alerts.filter(a => a.status === 'open').length

  const metrics = [
    { label: 'SmartBins',          value: bins.length,        icon: Trash2 },
    { label: 'Critical Bins',      value: criticalBins,       icon: AlertOctagon, urgent: criticalBins > 0 },
    { label: "Today's Collection", value: todaySchedules,     icon: ClipboardList },
    { label: 'Active Routes',      value: activeRoutes,       icon: Navigation2 },
    { label: 'Available Vehicles', value: availableVehicles,  icon: Truck },
    { label: 'Active Drivers',     value: activeDrivers,      icon: UserCircle },
    { label: 'Field Workers',      value: activeWorkers,      icon: Users },
    { label: 'Open Incidents',     value: openIncidents,      icon: AlertTriangle, urgent: openIncidents > 0 },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-px bg-slate-300 border border-slate-300">
      {metrics.map(({ label, value, icon: Icon, urgent }, i) => (
        <FadeIn key={label} delay={i * 0.04}>
          <div className="bg-white px-3 py-4 text-center h-full flex flex-col items-center justify-center border-b-[3px] border-transparent hover:border-primary-500 transition-colors">
            <Icon className={`w-4 h-4 mb-2 ${urgent ? 'text-red-500' : 'text-slate-400'}`} />
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans leading-tight mb-1">
              {label}
            </div>
            <div className={`font-mono text-2xl font-bold leading-none ${urgent ? 'text-red-700' : 'text-slate-900'}`}>
              <AnimatedNumber value={value} />
            </div>
          </div>
        </FadeIn>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 3 & 4 — SMARTBIN OVERVIEW & REAL DEVICE VISIBILITY
══════════════════════════════════════════════════════════════════════════════ */
function SmartBinOverview({ bins, loading, navigate }) {
  const critical = bins.filter(b => (b.latest_pct ?? 0) >= 80)
  const high     = bins.filter(b => (b.latest_pct ?? 0) >= 60 && (b.latest_pct ?? 0) < 80)
  const normal   = bins.filter(b => (b.latest_pct ?? 0) < 60)
  const realBins = bins.filter(b => b.data_source === 'REAL')

  const topBins = [...bins].filter(b => (b.latest_pct ?? 0) >= 60).sort((a, b) => (b.latest_pct ?? 0) - (a.latest_pct ?? 0)).slice(0, 6)
  
  if (loading && bins.length === 0) return (
    <div className="bg-white border border-slate-300 p-4">
      <SectionHeader icon={Trash2} title="SmartBin Network" navigate={navigate} />
      <Skeleton rows={4} />
    </div>
  )

  return (
    <div className="bg-white border border-slate-300 h-full flex flex-col">
      <div className="px-4 pt-4 pb-2 border-b border-slate-200">
        <SectionHeader icon={Trash2} title="SmartBin Network" navigate={navigate} actionPath="/app/bins" actionLabel="Bin Directory" />
      </div>

      <div className="p-4 flex-1 flex flex-col">
        {/* Fill Distribution */}
        <div className="space-y-3 mb-6">
          {[
            { label: 'NORMAL',   count: normal.length,   color: 'bg-green-500', pct: (normal.length/bins.length*100)||0 },
            { label: 'HIGH',     count: high.length,     color: 'bg-amber-500', pct: (high.length/bins.length*100)||0 },
            { label: 'CRITICAL', count: critical.length, color: 'bg-red-500',   pct: (critical.length/bins.length*100)||0 },
          ].map(({ label, color, pct }) => (
            <div key={label}>
              <div className="flex justify-between text-[11px] mb-1 font-mono font-bold">
                <span className="text-slate-700">{label}</span>
                <span className="text-slate-500">{Math.round(pct)}%</span>
              </div>
              <MiniBar value={pct} color={color} height="h-2" />
            </div>
          ))}
        </div>

        {/* Priority Bins Table */}
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 font-sans border-b border-slate-200 pb-1">
          Critical / High Priority Bins
        </div>
        {topBins.length === 0 ? (
          <EmptyState message="All bins normal" sub="No bins above threshold" />
        ) : (
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-[11px] font-sans">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Bin', 'Zone', 'Ward', 'Fill', 'Status', 'Action'].map(h => (
                    <th key={h} className="text-left py-1.5 pr-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topBins.map(bin => (
                  <tr key={bin.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-1.5 pr-2 font-mono font-bold text-slate-900">{bin.bin_id}</td>
                    <td className="py-1.5 pr-2 text-slate-600">{bin.zone_name || bin.zone || '—'}</td>
                    <td className="py-1.5 pr-2 text-slate-600">{bin.ward_name || bin.ward || '—'}</td>
                    <td className={`py-1.5 pr-2 font-mono font-bold ${fillTextColor(bin.latest_pct ?? 0)}`}>{Math.round(bin.latest_pct ?? 0)}%</td>
                    <td className="py-1.5 pr-2"><StatusPill status={bin.latest_pct >= 80 ? 'CRITICAL' : 'HIGH'} /></td>
                    <td className="py-1.5"><button onClick={() => navigate('/app/bins')} className="text-primary-600 hover:underline font-bold text-[9px] uppercase tracking-wider">View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Physical Device Callout */}
        {realBins.length > 0 && (
          <div className="mt-auto border border-primary-400 bg-primary-50/50">
            <div className="px-3 py-2 bg-primary-950 flex items-center justify-between">
              <span className="text-[10px] font-bold text-primary-200 uppercase tracking-widest font-sans flex items-center gap-1.5">
                <CircleDot className="w-3 h-3 text-primary-400" /> Physical SmartBin
              </span>
            </div>
            <div className="p-3">
              {realBins.slice(0, 1).map(realDevice => (
                <div key={realDevice.id} className="grid grid-cols-2 gap-y-2 gap-x-4">
                  <div className="col-span-2 flex justify-between items-start mb-1">
                    <div>
                      <div className="font-mono font-bold text-sm text-slate-900">{realDevice.bin_id}</div>
                      <div className="text-[9px] font-bold text-green-700 border border-green-400 bg-green-50 px-1.5 py-0.5 inline-block uppercase tracking-wider mt-1">Real Device • {realDevice.status?.toUpperCase() || 'ONLINE'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] text-slate-500 font-sans uppercase tracking-wider">Fill Level</div>
                      <div className={`font-mono font-bold text-xl ${fillTextColor(realDevice.latest_pct ?? 0)}`}>{Math.round(realDevice.latest_pct ?? 0)}%</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 font-sans uppercase tracking-wider">Last Reading</div>
                    <div className="font-mono text-[11px] text-slate-700">{realDevice.last_seen || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 font-sans uppercase tracking-wider">Zone</div>
                    <div className="font-sans font-medium text-[11px] text-slate-700">{realDevice.zone_name || realDevice.zone || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 font-sans uppercase tracking-wider">Ward</div>
                    <div className="font-sans font-medium text-[11px] text-slate-700">{realDevice.ward_name || realDevice.ward || '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 5 & 6 — ZONE & WARD PERFORMANCE
══════════════════════════════════════════════════════════════════════════════ */
function ZoneWardPerformance({ bins, schedules }) {
  // Aggregate Zone Data
  const zoneMap = {}
  const wardMap = {}

  bins.forEach(b => {
    const zKey = b.zone_name || b.zone || 'Unassigned'
    const wKey = b.ward_name || b.ward || 'Unassigned'
    
    // Zone aggregation
    if (!zoneMap[zKey]) zoneMap[zKey] = { name: zKey, bins: 0, critical: 0, high: 0 }
    zoneMap[zKey].bins++
    if ((b.latest_pct ?? 0) >= 80) zoneMap[zKey].critical++
    else if ((b.latest_pct ?? 0) >= 60) zoneMap[zKey].high++

    // Ward aggregation
    if (!wardMap[wKey]) wardMap[wKey] = { name: wKey, bins: 0, critical: 0, high: 0 }
    wardMap[wKey].bins++
    if ((b.latest_pct ?? 0) >= 80) wardMap[wKey].critical++
    else if ((b.latest_pct ?? 0) >= 60) wardMap[wKey].high++
  })

  // Count active schedules per zone
  schedules.forEach(s => {
    const zKey = s.zone_name || s.zone || 'Unassigned'
    if (zoneMap[zKey] && (s.status === 'DISPATCHED' || s.status === 'IN_PROGRESS')) {
      zoneMap[zKey].activeRoutes = (zoneMap[zKey].activeRoutes || 0) + 1
    }
  })

  const zones = Object.values(zoneMap).sort((a, b) => b.critical - a.critical)
  const wards = Object.values(wardMap).sort((a, b) => b.critical - a.critical).slice(0, 8) // Limit wards for density

  return (
    <div className="grid lg:grid-cols-2 gap-5 h-full">
      {/* Zone Performance */}
      <div className="bg-white border border-slate-300 flex flex-col">
        <div className="px-4 pt-4 pb-2 border-b border-slate-200">
          <SectionHeader icon={Layers} title="Zone Performance" />
        </div>
        <div className="p-4 flex-1 overflow-x-auto">
          {zones.length === 0 ? <EmptyState message="No Zones" sub="No zone data available." /> : (
            <table className="w-full text-[11px] font-sans">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Zone', 'SmartBins', 'Critical', 'Active Routes', 'Status'].map(h => (
                    <th key={h} className="text-left py-2 pr-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {zones.map(z => {
                  const status = z.critical > 0 ? 'ATTENTION' : 'NORMAL'
                  return (
                    <tr key={z.name} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                      <td className="py-2 pr-3 font-bold text-slate-900">{z.name}</td>
                      <td className="py-2 pr-3 font-mono text-slate-600">{z.bins}</td>
                      <td className={`py-2 pr-3 font-mono font-bold ${z.critical > 0 ? 'text-red-700' : 'text-slate-400'}`}>{z.critical}</td>
                      <td className="py-2 pr-3 font-mono text-primary-700 font-bold">{z.activeRoutes || 0}</td>
                      <td className="py-2"><StatusPill status={status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Ward Performance */}
      <div className="bg-white border border-slate-300 flex flex-col">
        <div className="px-4 pt-4 pb-2 border-b border-slate-200">
          <SectionHeader icon={Map} title="Ward Collection Status" />
        </div>
        <div className="p-4 flex-1 overflow-x-auto">
          {wards.length === 0 ? <EmptyState message="No Wards" sub="No ward data available." /> : (
            <table className="w-full text-[11px] font-sans">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Ward', 'Bins', 'High/Critical', 'Status'].map(h => (
                    <th key={h} className="text-left py-2 pr-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {wards.map(w => {
                  const urgent = w.critical + w.high
                  const status = w.critical > 0 ? 'CRITICAL' : w.high > 0 ? 'ATTENTION' : 'NORMAL'
                  return (
                    <tr key={w.name} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 pr-3 font-bold text-slate-900">{w.name}</td>
                      <td className="py-2 pr-3 font-mono text-slate-600">{w.bins}</td>
                      <td className={`py-2 pr-3 font-mono font-bold ${urgent > 0 ? 'text-amber-700' : 'text-slate-400'}`}>{urgent}</td>
                      <td className="py-2"><StatusPill status={status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 7 & 8 — TODAY'S COLLECTION & SCHEDULES
══════════════════════════════════════════════════════════════════════════════ */
function CollectionOperations({ schedules, navigate }) {
  const todayStr = new Date().toISOString().split('T')[0]
  const todaySchedules = schedules.filter(s => s.date === todayStr)

  const byStatus = {
    PLANNED:     todaySchedules.filter(s => s.status === 'PENDING').length,
    DISPATCHED:  todaySchedules.filter(s => s.status === 'DISPATCHED').length,
    IN_PROGRESS: todaySchedules.filter(s => s.status === 'IN_PROGRESS').length,
    COMPLETED:   todaySchedules.filter(s => s.status === 'COMPLETED').length,
    EXCEPTIONS:  todaySchedules.filter(s => s.status === 'CANCELLED').length,
  }

  const total = todaySchedules.length
  const completedPct = total > 0 ? Math.round((byStatus.COMPLETED / total) * 100) : 0

  return (
    <div className="bg-white border border-slate-300">
      <div className="px-4 pt-4 pb-2 border-b border-slate-200">
        <SectionHeader icon={ClipboardList} title="Today's Collection Operations" navigate={navigate} actionPath="/app/schedules" actionLabel="Manage Schedules" />
      </div>
      
      <div className="p-4 grid lg:grid-cols-3 gap-6 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* Progress & Summary */}
        <div className="lg:pr-4">
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { label: 'PLANNED',     count: byStatus.PLANNED,     cls: 'text-slate-600' },
              { label: 'DISPATCHED',  count: byStatus.DISPATCHED,  cls: 'text-primary-600' },
              { label: 'IN PROGRESS', count: byStatus.IN_PROGRESS, cls: 'text-amber-600' },
              { label: 'COMPLETED',   count: byStatus.COMPLETED,   cls: 'text-green-600' },
              { label: 'EXCEPTIONS',  count: byStatus.EXCEPTIONS,  cls: byStatus.EXCEPTIONS > 0 ? 'text-red-600' : 'text-slate-400' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-sans mb-0.5">{s.label}</div>
                <div className={`font-mono font-bold text-xl ${s.cls}`}>{s.count}</div>
              </div>
            ))}
          </div>

          <div className="border border-slate-200 p-3 bg-slate-50">
            <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest font-sans mb-2">Collection Progress</div>
            <div className="flex justify-between items-baseline mb-1">
              <div className="font-mono font-bold text-2xl text-slate-900">{completedPct}%</div>
              <div className="text-[11px] font-sans text-slate-500">{byStatus.COMPLETED} / {total} completed</div>
            </div>
            <MiniBar value={completedPct} color="bg-green-500" height="h-2" />
          </div>
        </div>

        {/* Schedule Table */}
        <div className="lg:pl-6 lg:col-span-2 pt-4 lg:pt-0">
          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-3 font-sans">Active Collection Schedules</div>
          {todaySchedules.length === 0 ? <EmptyState message="No Schedules" sub="No collection schedules planned for today." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-sans">
                <thead>
                  <tr className="border-b border-slate-200">
                    {['Schedule', 'Zone', 'Vehicle', 'Driver', 'Bins', 'Status', 'Dispatch'].map(h => (
                      <th key={h} className="text-left py-2 pr-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {todaySchedules.slice(0, 6).map(s => (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 pr-3 font-mono font-bold text-primary-700">SCH-{String(s.id).padStart(4, '0')}</td>
                      <td className="py-2 pr-3 text-slate-700">{s.zone_name || s.zone || '—'}</td>
                      <td className="py-2 pr-3 font-mono text-slate-700">{s.vehicle_details?.vehicle_id || s.vehicle || '—'}</td>
                      <td className="py-2 pr-3 text-slate-700">{s.driver_details?.first_name ? `${s.driver_details.first_name} ${s.driver_details.last_name}` : s.driver || '—'}</td>
                      <td className="py-2 pr-3 font-mono text-slate-500">{s.bins?.length || 0}</td>
                      <td className="py-2 pr-3"><StatusPill status={s.status} /></td>
                      <td className="py-2"><button onClick={() => navigate('/app/schedules')} className="text-[9px] font-bold uppercase tracking-wider text-primary-600 hover:underline">View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 9 & 10 — ACTIVE ROUTES & MAP
══════════════════════════════════════════════════════════════════════════════ */
function RouteOperationsAndMap({ routes, bins, navigate }) {
  const activeRoutes = routes.filter(r => r.status === 'DISPATCHED' || r.status === 'IN_PROGRESS')
  
  // Center map on the first bin or default
  const defaultCenter = [13.0827, 80.2707] // Chennai
  const center = bins.length > 0 && bins[0].lat ? [bins[0].lat, bins[0].lng] : defaultCenter

  return (
    <div className="grid lg:grid-cols-2 gap-5 h-[400px]">
      {/* Active Routes Table */}
      <div className="bg-white border border-slate-300 flex flex-col overflow-hidden h-full">
        <div className="px-4 pt-4 pb-2 border-b border-slate-200">
          <SectionHeader icon={Navigation2} title="Active Routes" navigate={navigate} actionPath="/app/schedules" actionLabel="View All" />
        </div>
        <div className="p-4 flex-1 overflow-auto">
          {activeRoutes.length === 0 ? <EmptyState message="No Active Routes" sub="No routes are currently dispatched." /> : (
            <table className="w-full text-[11px] font-sans">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Route ID', 'Zone', 'Vehicle', 'Completed', 'Status'].map(h => (
                    <th key={h} className="text-left py-2 pr-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeRoutes.map(r => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 pr-2 font-mono font-bold text-slate-900">RT-{String(r.id).padStart(4, '0')}</td>
                    <td className="py-2 pr-2 text-slate-600">{r.zone_name || r.zone || '—'}</td>
                    <td className="py-2 pr-2 font-mono text-slate-700">{r.vehicle || '—'}</td>
                    <td className="py-2 pr-2 font-mono text-slate-500">{r.completed_stops ?? 0} / {r.stop_count ?? r.stops?.length ?? 0}</td>
                    <td className="py-2"><StatusPill status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="bg-white border border-slate-300 relative h-full flex flex-col">
        <div className="px-4 pt-4 pb-2 border-b border-slate-200 shrink-0">
          <SectionHeader icon={MapPin} title="Operational Map" />
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
              return (
                <Marker 
                  key={bin.id} 
                  position={[bin.lat, bin.lng]}
                  icon={L.divIcon({
                    className: 'custom-icon',
                    html: `<div class="w-3 h-3 rounded-full border-2 border-white shadow-sm ${isCrit ? 'bg-red-500' : 'bg-primary-600'}"></div>`,
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
          
          {/* Legend Overlay */}
          <div className="absolute bottom-4 left-4 z-[400] bg-white border border-slate-300 p-2 shadow-sm text-[9px] font-bold text-slate-600 uppercase tracking-wider font-sans space-y-1">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary-600" /> SmartBin</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /> Critical Fill</div>
            <div className="flex items-center gap-2"><div className="w-3 h-1 bg-primary-700" /> Active Route</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 11 — ALERT / INCIDENT CENTER
══════════════════════════════════════════════════════════════════════════════ */
function AlertCenter({ alerts, navigate }) {
  const open = alerts.filter(a => a.status === 'open').sort((a, b) => {
    // Sort by level (danger first) then fill_pct
    if (a.level === 'danger' && b.level !== 'danger') return -1;
    if (a.level !== 'danger' && b.level === 'danger') return 1;
    return (b.fill_pct ?? 0) - (a.fill_pct ?? 0);
  })

  return (
    <div className="bg-white border border-slate-300 h-full flex flex-col">
      <div className="px-4 pt-4 pb-2 border-b border-slate-200">
        <SectionHeader icon={AlertTriangle} title="Incidents Requiring Attention" navigate={navigate} actionPath="/app/alerts" />
      </div>
      <div className="p-4 flex-1 overflow-auto">
        {open.length === 0 ? <EmptyState message="No Open Incidents" sub="Operations are running smoothly." /> : (
          <div className="space-y-3">
            {open.slice(0, 5).map((a, i) => {
              const isCrit = a.level === 'danger' || (a.fill_pct ?? 0) >= 80
              return (
                <div key={a.id || i} className={`p-3 border-l-4 border-y border-r flex items-start justify-between gap-4 transition-colors ${isCrit ? 'border-l-red-500 border-y-red-100 border-r-red-100 bg-red-50/30' : 'border-l-amber-400 border-y-slate-200 border-r-slate-200'}`}>
                  <div>
                    <div className={`text-[9px] font-bold uppercase tracking-widest font-sans mb-1 ${isCrit ? 'text-red-600' : 'text-amber-600'}`}>
                      {isCrit ? 'CRITICAL' : 'WARNING'}
                    </div>
                    <div className="font-mono font-bold text-slate-900 text-sm">{a.bin_id || 'System Event'}</div>
                    <div className="text-xs text-slate-600 font-sans mt-0.5">{a.message}</div>
                    <div className="text-[10px] text-slate-400 font-sans mt-1">{a.location || 'Unknown Location'}</div>
                  </div>
                  <button onClick={() => navigate('/app/alerts')} className="px-3 py-1 border border-slate-300 text-[9px] font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-50 transition-colors">
                    VIEW
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 12 & 13 — FLEET & WORKFORCE OVERVIEW
══════════════════════════════════════════════════════════════════════════════ */
function FleetAndWorkforce({ vehicles, staff, navigate }) {
  // Fleet stats
  const totalVehicles = vehicles.length
  const availableV = vehicles.filter(v => v.status === 'AVAILABLE').length
  const onRouteV = vehicles.filter(v => v.status === 'ON_ROUTE').length
  const maintenanceV = vehicles.filter(v => v.status === 'MAINTENANCE').length
  const inactiveV = vehicles.filter(v => v.status === 'INACTIVE').length

  // Workforce stats
  const activeStaff = staff.filter(s => s.employment_status === 'ACTIVE')
  const drivers = activeStaff.filter(s => s.role === 'driver').length
  const workers = activeStaff.filter(s => s.role === 'field_worker').length
  const supervisors = activeStaff.filter(s => s.role === 'zone_supervisor').length
  const officers = activeStaff.filter(s => s.role === 'municipal_officer').length
  const onLeave = staff.filter(s => s.employment_status === 'ON_LEAVE').length

  // Zone Staff Assignment
  const zoneStaffMap = {}
  activeStaff.forEach(s => {
    const zKey = s.zone_name || s.zone || 'Unassigned'
    zoneStaffMap[zKey] = (zoneStaffMap[zKey] || 0) + 1
  })
  const zoneStaff = Object.entries(zoneStaffMap).map(([k, v]) => ({ zone: k, count: v }))

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {/* Fleet Overview */}
      <div className="bg-white border border-slate-300 flex flex-col">
        <div className="px-4 pt-4 pb-2 border-b border-slate-200">
          <SectionHeader icon={TruckIcon} title="Municipal Fleet" navigate={navigate} actionPath="/app/vehicles" />
        </div>
        <div className="p-4 flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
            {[
              { l: 'TOTAL', v: totalVehicles, c: 'text-slate-900' },
              { l: 'AVAILABLE', v: availableV, c: 'text-green-600' },
              { l: 'ON ROUTE', v: onRouteV, c: 'text-primary-600' },
              { l: 'MAINTENANCE', v: maintenanceV, c: 'text-amber-600' },
              { l: 'INACTIVE', v: inactiveV, c: 'text-slate-400' },
            ].map(m => (
              <div key={m.l} className="bg-slate-50 border border-slate-200 p-2 text-center">
                <div className={`font-mono font-bold text-lg ${m.c}`}>{m.v}</div>
                <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{m.l}</div>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-sans">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Vehicle', 'Type', 'Driver', 'Zone', 'Status'].map(h => (
                    <th key={h} className="text-left py-1.5 pr-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicles.slice(0, 4).map(v => (
                  <tr key={v.id} className="border-b border-slate-100">
                    <td className="py-1.5 pr-2 font-mono font-bold text-slate-900">{v.vehicle_id}</td>
                    <td className="py-1.5 pr-2 text-slate-600">{v.vehicle_type}</td>
                    <td className="py-1.5 pr-2 text-slate-700">{v.driver_details?.first_name || '—'}</td>
                    <td className="py-1.5 pr-2 text-slate-700">{v.zone_name || v.zone || '—'}</td>
                    <td className="py-1.5"><StatusPill status={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Workforce Overview */}
      <div className="bg-white border border-slate-300 flex flex-col">
        <div className="px-4 pt-4 pb-2 border-b border-slate-200">
          <SectionHeader icon={Users} title="Municipal Workforce" navigate={navigate} actionPath="/app/staff" />
        </div>
        <div className="p-4 flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
            {[
              { l: 'ACTIVE', v: activeStaff.length, c: 'text-slate-900' },
              { l: 'DRIVERS', v: drivers, c: 'text-primary-600' },
              { l: 'WORKERS', v: workers, c: 'text-slate-700' },
              { l: 'SUPERVISORS', v: supervisors, c: 'text-slate-700' },
              { l: 'OFFICERS', v: officers, c: 'text-slate-700' },
              { l: 'ON LEAVE', v: onLeave, c: 'text-amber-600' },
            ].map(m => (
              <div key={m.l} className="bg-slate-50 border border-slate-200 p-2 text-center">
                <div className={`font-mono font-bold text-lg ${m.c}`}>{m.v}</div>
                <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{m.l}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-3">
            <div>
              <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest font-sans mb-2">Driver Availability</div>
              <div className="space-y-1 text-[11px] font-sans">
                <div className="flex justify-between"><span className="text-slate-600">Available</span><span className="font-mono font-bold text-green-600">{drivers - onRouteV}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">On Route</span><span className="font-mono font-bold text-primary-600">{onRouteV}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">On Leave</span><span className="font-mono font-bold text-amber-600">{staff.filter(s=>s.role==='driver' && s.employment_status==='ON_LEAVE').length}</span></div>
              </div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest font-sans mb-2">Workforce Assignment</div>
              <div className="space-y-1 text-[11px] font-sans">
                {zoneStaff.slice(0,3).map(z => (
                  <div key={z.zone} className="flex justify-between"><span className="text-slate-600 truncate mr-2">{z.zone}</span><span className="font-mono font-bold text-slate-900">{z.count} STAFF</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 14 & 15 — ACTIVITY & QUICK ACTIONS
══════════════════════════════════════════════════════════════════════════════ */
function TimelineAndActions({ auditLogs, navigate }) {
  const actions = [
    { label: 'Create Schedule', path: '/app/schedules', icon: ClipboardList },
    { label: 'View SmartBins',  path: '/app/bins',      icon: Trash2 },
    { label: 'View Fleet',      path: '/app/vehicles',  icon: Truck },
    { label: 'View Staff',      path: '/app/staff',     icon: Users },
    { label: 'View Alerts',     path: '/app/alerts',    icon: AlertTriangle },
    { label: 'View Reports',    path: '/app/reports',   icon: FileText },
  ]

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      {/* Timeline */}
      <div className="bg-white border border-slate-300 lg:col-span-2 flex flex-col">
        <div className="px-4 pt-4 pb-2 border-b border-slate-200">
          <SectionHeader icon={Activity} title="Today's Operations Timeline" navigate={navigate} actionPath="/app/audit-logs" />
        </div>
        <div className="p-4 flex-1">
          {auditLogs.length === 0 ? <EmptyState message="No Operations Today" sub="No significant events recorded yet." /> : (
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

      {/* Quick Actions */}
      <div className="bg-white border border-slate-300 flex flex-col">
        <div className="px-4 pt-4 pb-2 border-b border-slate-200">
          <SectionHeader icon={Zap} title="Quick Actions" />
        </div>
        <div className="p-4 grid grid-cols-2 gap-2">
          {actions.map(({ label, path, icon: Icon }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-2 px-3 py-4 border border-slate-200 hover:border-primary-500 hover:bg-primary-50 transition-all group text-center"
            >
              <Icon className="w-4 h-4 text-slate-500 group-hover:text-primary-700 transition-colors" />
              <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider font-sans leading-tight group-hover:text-primary-700 transition-colors">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export default function MunicipalAdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Hooks
  const { bins: liveBins, loading: binsLoading, error: binsError, lastUpdated } = useLiveBins()
  const { alerts, loading: alertsLoading } = useAlerts()
  const { routes, loading: routesLoading } = useRoutes()
  
  // State
  const [vehicles, setVehicles] = useState([])
  const [staff, setStaff] = useState([])
  const [schedules, setSchedules] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [municipalities, setMunicipalities] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [secondsAgo, setSecondsAgo] = useState(0)

  // Fetch Secondary Data
  const fetchData = useCallback(async () => {
    try {
      const [v, st, sch, al, mun] = await Promise.allSettled([
        api.get('/vehicles/'),
        api.get('/staff/'),
        api.get('/schedules/'),
        api.get('/audit-logs/'),
        api.get('/municipalities/')
      ])
      if (v.status === 'fulfilled') setVehicles(v.value.data?.results || v.value.data || [])
      if (st.status === 'fulfilled') setStaff(st.value.data?.results || st.value.data || [])
      if (sch.status === 'fulfilled') setSchedules(sch.value.data?.results || sch.value.data || [])
      if (al.status === 'fulfilled') setAuditLogs(al.value.data?.results || al.value.data || [])
      if (mun.status === 'fulfilled') setMunicipalities(mun.value.data?.results || mun.value.data || [])
    } catch (e) {
      console.warn("Fetch error", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Timer
  useEffect(() => {
    setSecondsAgo(0)
    const t = setInterval(() => setSecondsAgo(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [lastUpdated])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    // Other hooks self-refresh based on polling, but we wait for manual fetches
    setTimeout(() => setRefreshing(false), 500)
  }

  // Derive Municipality Name
  // If the user's scope is strictly their municipality, we can infer it from the first bin, route, or the profile
  let municipalityName = 'Municipal Operations'
  if (liveBins.length > 0 && liveBins[0].municipality) {
    const matched = municipalities.find(m => m.id === liveBins[0].municipality)
    if (matched) municipalityName = matched.name
  } else if (municipalities.length === 1) {
    municipalityName = municipalities[0].name
  }

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-5 pb-10">
      {/* ── PAGE HEADER ────────────────────────────────────────────────────── */}
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight leading-tight uppercase">
              {municipalityName}
            </h1>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans mt-1">
              MUNICIPALITY → ALL ASSIGNED ZONES
            </div>
            <p className="text-sm text-slate-600 font-sans mt-2 max-w-xl">
              Operational overview across zones, wards, SmartBins, fleet and workforce.
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
        <MunicipalStatusStrip />
      </FadeIn>

      {/* ── METRICS GRID ───────────────────────────────────────────────────── */}
      <FadeIn delay={0.1}>
        <MunicipalMetricsRow bins={liveBins} alerts={alerts} routes={routes} schedules={schedules} vehicles={vehicles} staff={staff} />
      </FadeIn>

      {/* ── BINS AND ALERT CENTER ──────────────────────────────────────────── */}
      <FadeIn delay={0.15}>
        <div className="grid lg:grid-cols-2 gap-5 h-full">
          <SmartBinOverview bins={liveBins} loading={binsLoading} navigate={navigate} />
          <AlertCenter alerts={alerts} navigate={navigate} />
        </div>
      </FadeIn>

      {/* ── ZONE & WARD PERFORMANCE ────────────────────────────────────────── */}
      <FadeIn delay={0.2}>
        <ZoneWardPerformance bins={liveBins} schedules={schedules} />
      </FadeIn>

      {/* ── COLLECTION OPS ─────────────────────────────────────────────────── */}
      <FadeIn delay={0.25}>
        <CollectionOperations schedules={schedules} navigate={navigate} />
      </FadeIn>

      {/* ── ROUTES & MAP ───────────────────────────────────────────────────── */}
      <FadeIn delay={0.3}>
        <RouteOperationsAndMap routes={routes} bins={liveBins} navigate={navigate} />
      </FadeIn>

      {/* ── FLEET & WORKFORCE ──────────────────────────────────────────────── */}
      <FadeIn delay={0.35}>
        <FleetAndWorkforce vehicles={vehicles} staff={staff} navigate={navigate} />
      </FadeIn>

      {/* ── TIMELINE & QUICK ACTIONS ───────────────────────────────────────── */}
      <FadeIn delay={0.4}>
        <TimelineAndActions auditLogs={auditLogs} navigate={navigate} />
      </FadeIn>

    </div>
  )
}
