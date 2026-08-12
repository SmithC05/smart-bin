import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, useInView } from 'framer-motion'
import {
  Trash2, AlertTriangle, Navigation2, Users, ClipboardList,
  AlertOctagon, CheckCircle2, CircleDot, ChevronRight, Map,
  Clock, MapPin, Search, FileText, TruckIcon, UserCircle, RefreshCw,
  Radio, Wrench, ShieldAlert, AlertCircle, CalendarDays, Activity
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
   SECTION 1 — ACTION REQUIRED PANEL
══════════════════════════════════════════════════════════════════════════════ */
function ActionRequiredBar({ bins, alerts, routes, vehicles, navigate }) {
  const criticalBins = bins.filter(b => (b.latest_pct ?? 0) >= 80).length
  const exceptions = alerts.filter(a => a.status === 'open' && a.message?.toLowerCase().includes('collection')).length
  const routesAttn = routes.filter(r => r.status === 'DISPATCHED' || r.status === 'IN_PROGRESS').length // simplified
  const vehicleIssues = vehicles.filter(v => v.status === 'MAINTENANCE').length

  const items = [
    { label: 'CRITICAL BINS', count: criticalBins, status: 'CRITICAL', icon: Trash2, path: '/app/bins' },
    { label: 'COLLECTION EXCEPTIONS', count: exceptions, status: 'ATTENTION', icon: AlertTriangle, path: '/app/alerts' },
    { label: 'ROUTES NEED ATTENTION', count: routesAttn, status: 'PENDING', icon: Navigation2, path: '/app/schedules' },
    { label: 'VEHICLE ISSUES', count: vehicleIssues, status: 'ATTENTION', icon: TruckIcon, path: '/app/vehicles' },
  ]

  return (
    <div className="bg-primary-950 border border-primary-800 p-4">
      <h2 className="text-[11px] font-bold text-primary-400 uppercase tracking-[0.2em] font-sans mb-4 flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" /> Action Required
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((it, i) => (
          <button 
            key={it.label}
            onClick={() => navigate(it.path)}
            className="flex items-center justify-between p-3 bg-white/5 border border-primary-800 hover:bg-white/10 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <it.icon className={`w-5 h-5 ${it.count > 0 ? 'text-red-400' : 'text-slate-400'}`} />
              <div>
                <div className="font-mono text-xl font-bold text-white leading-none mb-1">
                  {String(it.count).padStart(2, '0')}
                </div>
                <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest leading-none">
                  {it.label}
                </div>
              </div>
            </div>
            {it.count > 0 && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-wider font-sans border ${
                it.status === 'CRITICAL' ? 'text-red-300 border-red-500/50 bg-red-900/50' : 
                'text-amber-300 border-amber-500/50 bg-amber-900/50'
              }`}>
                {it.status}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 2 — TODAY'S COLLECTION SUMMARY
══════════════════════════════════════════════════════════════════════════════ */
function TodaysCollection({ schedules, navigate }) {
  const todayStr = new Date().toISOString().split('T')[0]
  const todaySchedules = schedules.filter(s => s.date === todayStr)

  const stats = {
    PLANNED: todaySchedules.filter(s => s.status === 'PENDING').length,
    DISPATCHED: todaySchedules.filter(s => s.status === 'DISPATCHED').length,
    IN_PROGRESS: todaySchedules.filter(s => s.status === 'IN_PROGRESS').length,
    COMPLETED: todaySchedules.filter(s => s.status === 'COMPLETED').length,
    EXCEPTIONS: todaySchedules.filter(s => s.status === 'CANCELLED').length,
  }

  const total = todaySchedules.length
  const completedPct = total > 0 ? Math.round((stats.COMPLETED / total) * 100) : 0

  return (
    <div className="bg-white border border-slate-300 flex flex-col h-full">
      <div className="px-4 pt-4 pb-2 border-b border-slate-200">
        <SectionHeader icon={ClipboardList} title="Today's Collection" navigate={navigate} actionPath="/app/schedules" actionLabel="Manage" />
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {Object.entries(stats).map(([k, v]) => (
            <div key={k} className="border border-slate-100 p-2 text-center bg-slate-50">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-sans mb-1">{k.replace('_', ' ')}</div>
              <div className={`font-mono font-bold text-xl ${k === 'EXCEPTIONS' && v > 0 ? 'text-red-600' : 'text-slate-900'}`}>{v}</div>
            </div>
          ))}
        </div>
        
        <div className="mt-auto">
          <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest font-sans mb-2">Collection Completion</div>
          <div className="flex justify-between items-baseline mb-1">
            <div className="font-mono font-bold text-2xl text-slate-900">{completedPct}%</div>
            <div className="text-[11px] font-sans text-slate-500 font-medium">{stats.COMPLETED} of {total} completed</div>
          </div>
          <MiniBar value={completedPct} color="bg-primary-600" height="h-3" />
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 3 & 4 — SMARTBIN PRIORITY MONITOR & REAL DEVICE PANEL
══════════════════════════════════════════════════════════════════════════════ */
function SmartBinMonitor({ bins, navigate }) {
  const topBins = [...bins].filter(b => (b.latest_pct ?? 0) >= 60).sort((a, b) => (b.latest_pct ?? 0) - (a.latest_pct ?? 0)).slice(0, 5)
  const realDevice = bins.find(b => b.data_source === 'REAL')

  return (
    <div className="grid lg:grid-cols-3 gap-5 h-full">
      <div className="lg:col-span-2 bg-white border border-slate-300 flex flex-col">
        <div className="px-4 pt-4 pb-2 border-b border-slate-200">
          <SectionHeader icon={Trash2} title="SmartBin Priority Monitor" navigate={navigate} actionPath="/app/bins" />
        </div>
        <div className="p-4 flex-1 overflow-x-auto">
          {topBins.length === 0 ? <EmptyState message="No Critical Bins" sub="All bins are operating within normal limits." /> : (
            <table className="w-full text-[11px] font-sans">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Bin', 'Source', 'Zone', 'Ward', 'Fill Level', 'Status', 'Last Reading', 'Action'].map(h => (
                    <th key={h} className="text-left py-1.5 pr-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topBins.map(bin => (
                  <tr key={bin.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-1.5 pr-2 font-mono font-bold text-slate-900">{bin.bin_id}</td>
                    <td className="py-1.5 pr-2">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 uppercase border ${bin.data_source === 'REAL' ? 'text-primary-700 bg-primary-50 border-primary-400' : 'text-slate-600 bg-slate-100 border-slate-300'}`}>
                        {bin.data_source === 'REAL' ? 'REAL DEVICE' : 'SIMULATED'}
                      </span>
                    </td>
                    <td className="py-1.5 pr-2 text-slate-600">{bin.zone_name || bin.zone || '—'}</td>
                    <td className="py-1.5 pr-2 text-slate-600">{bin.ward_name || bin.ward || '—'}</td>
                    <td className={`py-1.5 pr-2 font-mono font-bold ${fillTextColor(bin.latest_pct ?? 0)}`}>{Math.round(bin.latest_pct ?? 0)}%</td>
                    <td className="py-1.5 pr-2"><StatusPill status={bin.latest_pct >= 80 ? 'CRITICAL' : 'HIGH'} /></td>
                    <td className="py-1.5 pr-2 font-mono text-slate-500">{bin.last_seen}</td>
                    <td className="py-1.5"><button onClick={() => navigate('/app/bins')} className="text-primary-600 hover:underline font-bold text-[9px] uppercase tracking-wider">VIEW</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {realDevice ? (
        <div className="bg-white border border-primary-500 shadow-[0_0_0_1px_rgba(14,165,233,0.3)] flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary-500" />
          <div className="px-4 pt-4 pb-2 border-b border-slate-100 bg-primary-50/30">
            <h2 className="text-[11px] font-bold text-primary-800 uppercase tracking-[0.18em] font-sans flex items-center gap-2">
              <Radio className="w-4 h-4" /> Physical SmartBin
            </h2>
          </div>
          <div className="p-4 flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="font-mono font-bold text-2xl text-slate-900 leading-none mb-2">{realDevice.bin_id}</div>
                <div className="text-[9px] font-bold text-primary-700 border border-primary-400 bg-primary-50 px-2 py-0.5 inline-block uppercase tracking-wider">
                  REAL DEVICE
                </div>
              </div>
              <StatusPill status={realDevice.status === 'offline' ? 'OFFLINE' : 'ONLINE'} />
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <div className="text-[10px] text-slate-500 font-sans uppercase tracking-widest mb-1">FILL LEVEL</div>
                <div className={`font-mono font-bold text-3xl ${fillTextColor(realDevice.latest_pct ?? 0)}`}>
                  {Math.round(realDevice.latest_pct ?? 0)}%
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[9px] text-slate-500 font-sans uppercase tracking-widest mb-1">LAST READING</div>
                  <div className="font-mono text-slate-800 text-sm">{realDevice.last_seen || '—'}</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-500 font-sans uppercase tracking-widest mb-1">DEVICE STATUS</div>
                  <div className="font-sans font-bold text-slate-800 text-sm uppercase">{realDevice.status === 'offline' ? 'OFFLINE' : 'NORMAL'}</div>
                </div>
              </div>
            </div>

            <button onClick={() => navigate('/app/bins')} className="mt-auto w-full py-2 bg-slate-900 hover:bg-primary-700 text-white text-[10px] font-bold uppercase tracking-widest transition-colors flex justify-center items-center gap-2">
              VIEW DEVICE <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 flex flex-col justify-center p-4 text-center">
          <Radio className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sans mb-1">No Physical Devices</p>
          <p className="text-[11px] text-slate-400 font-sans">No real SmartBins found in your operational scope.</p>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 5 — ALERT CENTER & SUMMARY
══════════════════════════════════════════════════════════════════════════════ */
function OperationalAlerts({ alerts, navigate }) {
  const open = alerts.filter(a => a.status === 'open').sort((a, b) => {
    if (a.level === 'danger' && b.level !== 'danger') return -1
    if (a.level !== 'danger' && b.level === 'danger') return 1
    return (b.fill_pct ?? 0) - (a.fill_pct ?? 0)
  })

  const counts = {
    CRITICAL: open.filter(a => a.level === 'danger' || (a.fill_pct ?? 0) >= 80).length,
    HIGH: open.filter(a => a.level !== 'danger' && (a.fill_pct ?? 0) >= 60 && (a.fill_pct ?? 0) < 80).length,
    WARNING: open.filter(a => a.level === 'warning' && (a.fill_pct ?? 0) < 60).length,
  }

  return (
    <div className="bg-white border border-slate-300 h-full flex flex-col">
      <div className="px-4 pt-4 pb-2 border-b border-slate-200">
        <SectionHeader icon={AlertTriangle} title="Operational Alerts" navigate={navigate} actionPath="/app/alerts" />
      </div>
      <div className="p-4 flex-1 flex flex-col">
        {/* Summary Blocks */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'CRITICAL', count: counts.CRITICAL, cls: counts.CRITICAL > 0 ? 'text-red-700 bg-red-50 border-red-200' : 'text-slate-400 bg-slate-50 border-slate-200' },
            { label: 'HIGH', count: counts.HIGH, cls: counts.HIGH > 0 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-slate-400 bg-slate-50 border-slate-200' },
            { label: 'WARNING', count: counts.WARNING, cls: counts.WARNING > 0 ? 'text-primary-700 bg-primary-50 border-primary-200' : 'text-slate-400 bg-slate-50 border-slate-200' },
          ].map(c => (
            <div key={c.label} className={`border p-2 flex flex-col items-center justify-center ${c.cls}`}>
              <div className="text-[9px] font-bold uppercase tracking-widest font-sans mb-0.5">{c.label}</div>
              <div className="font-mono font-bold text-lg leading-none">{c.count}</div>
            </div>
          ))}
        </div>

        {/* Alert List */}
        <div className="flex-1 overflow-auto">
          {open.length === 0 ? <EmptyState message="All Clear" sub="No operational alerts to display." /> : (
            <div className="space-y-2">
              {open.slice(0, 6).map((a, i) => {
                const isCrit = a.level === 'danger' || (a.fill_pct ?? 0) >= 80
                const isWarn = a.level === 'warning' && (a.fill_pct ?? 0) < 60
                const levelLabel = isCrit ? 'CRITICAL' : isWarn ? 'WARNING' : 'HIGH'
                const borderCls = isCrit ? 'border-red-500' : isWarn ? 'border-primary-400' : 'border-amber-400'
                
                return (
                  <div key={a.id || i} className={`p-3 border-l-4 border-y border-r border-slate-200 bg-slate-50 flex items-start justify-between gap-2 ${borderCls}`}>
                    <div>
                      <div className={`text-[9px] font-bold uppercase tracking-widest font-sans mb-1 ${isCrit ? 'text-red-600' : isWarn ? 'text-primary-600' : 'text-amber-600'}`}>
                        {levelLabel}
                      </div>
                      <div className="font-mono font-bold text-slate-900 text-xs mb-0.5">{a.bin_id || 'System'}</div>
                      <div className="text-[11px] text-slate-700 font-sans leading-tight">{a.message || 'Needs attention'}</div>
                      <div className="text-[9px] text-slate-500 font-sans mt-1">{a.location || 'Unknown'}</div>
                    </div>
                    <button onClick={() => navigate('/app/alerts')} className="px-2 py-1 text-[9px] font-bold text-primary-700 hover:bg-primary-50 transition-colors uppercase tracking-wider border border-transparent hover:border-primary-200">
                      VIEW
                    </button>
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

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 6 — TODAY'S COLLECTION SCHEDULES
══════════════════════════════════════════════════════════════════════════════ */
function TodaySchedules({ schedules, navigate }) {
  const todayStr = new Date().toISOString().split('T')[0]
  const todaySchedules = schedules.filter(s => s.date === todayStr)

  return (
    <div className="bg-white border border-slate-300 flex flex-col h-full">
      <div className="px-4 pt-4 pb-2 border-b border-slate-200">
        <SectionHeader icon={CalendarDays} title="Today's Collection Schedules" navigate={navigate} actionPath="/app/schedules" />
      </div>
      <div className="p-4 flex-1 overflow-x-auto">
        {todaySchedules.length === 0 ? <EmptyState message="No Schedules" sub="No collections planned." /> : (
          <table className="w-full text-[11px] font-sans">
            <thead>
              <tr className="border-b border-slate-200">
                {['Schedule', 'Zone', 'Bins', 'Vehicle', 'Driver', 'Time', 'Status', 'Action'].map(h => (
                  <th key={h} className="text-left py-2 pr-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {todaySchedules.map(s => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 pr-2 font-mono font-bold text-primary-700">SCH-{String(s.id).padStart(4, '0')}</td>
                  <td className="py-2 pr-2 text-slate-700">{s.zone_name || s.zone || '—'}</td>
                  <td className="py-2 pr-2 font-mono text-slate-600">{s.bins?.length || 0}</td>
                  <td className="py-2 pr-2 font-mono text-slate-700">{s.vehicle_details?.vehicle_id || s.vehicle || '—'}</td>
                  <td className="py-2 pr-2 text-slate-700">{s.driver_details?.first_name ? `${s.driver_details.first_name[0]}. ${s.driver_details.last_name}` : s.driver || '—'}</td>
                  <td className="py-2 pr-2 font-mono text-slate-500">{s.time || '—'}</td>
                  <td className="py-2 pr-2"><StatusPill status={s.status} /></td>
                  <td className="py-2"><button onClick={() => navigate('/app/schedules')} className="text-[9px] font-bold uppercase tracking-wider text-primary-600 hover:underline">VIEW</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 7 & 8 — ACTIVE ROUTES & MAP
══════════════════════════════════════════════════════════════════════════════ */
function RoutesAndMap({ routes, bins, navigate }) {
  const activeRoutes = routes.filter(r => r.status === 'DISPATCHED' || r.status === 'IN_PROGRESS')
  
  const defaultCenter = [13.0827, 80.2707]
  const center = bins.length > 0 && bins[0].lat ? [bins[0].lat, bins[0].lng] : defaultCenter

  return (
    <div className="grid lg:grid-cols-2 gap-5 h-[400px]">
      <div className="bg-white border border-slate-300 flex flex-col overflow-hidden h-full">
        <div className="px-4 pt-4 pb-2 border-b border-slate-200">
          <SectionHeader icon={Navigation2} title="Active Routes" navigate={navigate} actionPath="/app/schedules" />
        </div>
        <div className="p-4 flex-1 overflow-auto">
          {activeRoutes.length === 0 ? <EmptyState message="No Active Routes" sub="No routes are currently in progress." /> : (
            <table className="w-full text-[11px] font-sans">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Route', 'Zone', 'Driver', 'Vehicle', 'Stops', 'Progress', 'Status'].map(h => (
                    <th key={h} className="text-left py-2 pr-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeRoutes.map(r => {
                  const comp = r.completed_stops || 0
                  const total = r.stop_count || r.stops?.length || 0
                  const pct = total > 0 ? (comp/total)*100 : 0
                  return (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 pr-2 font-mono font-bold text-slate-900">RT-{String(r.id).padStart(4, '0')}</td>
                      <td className="py-2 pr-2 text-slate-600">{r.zone_name || r.zone || '—'}</td>
                      <td className="py-2 pr-2 text-slate-700">{r.driver || '—'}</td>
                      <td className="py-2 pr-2 font-mono text-slate-700">{r.vehicle || '—'}</td>
                      <td className="py-2 pr-2 font-mono text-slate-500">{total}</td>
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2">
                          <MiniBar value={pct} height="h-1.5" color="bg-primary-500" />
                          <span className="font-mono text-[9px] whitespace-nowrap text-slate-500">{comp}/{total}</span>
                        </div>
                      </td>
                      <td className="py-2"><StatusPill status={r.status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
          
          <div className="absolute bottom-4 left-4 z-[400] bg-white border border-slate-300 p-2 shadow-sm text-[9px] font-bold text-slate-600 uppercase tracking-wider font-sans space-y-1">
            <div className="text-[8px] font-bold text-slate-400 mb-1">MAP LEGEND</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary-600" /> SmartBin</div>
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
   SECTION 9 & 10 — FIELD OPERATIONS & EXCEPTIONS
══════════════════════════════════════════════════════════════════════════════ */
function FieldOperations({ staff, alerts, navigate }) {
  const workers = staff.filter(s => s.role === 'field_worker' && s.employment_status === 'ACTIVE')
  const assigned = workers.slice(0, Math.floor(workers.length * 0.7)) // Mock assigned vs available if not in API
  
  // Use alerts as a proxy for collection exceptions
  const exceptions = alerts.filter(a => a.message?.toLowerCase().includes('collection') || a.message?.toLowerCase().includes('access'))

  return (
    <div className="grid lg:grid-cols-2 gap-5 h-full">
      <div className="bg-white border border-slate-300 flex flex-col">
        <div className="px-4 pt-4 pb-2 border-b border-slate-200">
          <SectionHeader icon={Users} title="Field Operations" navigate={navigate} actionPath="/app/staff" />
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <div className="flex justify-between border-b border-slate-100 pb-3 mb-3">
            <div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-sans mb-1">FIELD WORKERS</div>
              <div className="font-mono text-xl font-bold">{workers.length}</div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-sans mb-1">ASSIGNED</div>
              <div className="font-mono text-xl font-bold text-primary-700">{assigned.length}</div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-sans mb-1">AVAILABLE</div>
              <div className="font-mono text-xl font-bold text-green-700">{workers.length - assigned.length}</div>
            </div>
          </div>
          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2 font-sans">Current Field Activity</div>
          <div className="flex-1 overflow-x-auto">
            {assigned.length === 0 ? <EmptyState message="No Activity" /> : (
              <table className="w-full text-[11px] font-sans">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-1.5 pr-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Worker</th>
                    <th className="text-left py-1.5 pr-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Zone</th>
                    <th className="text-left py-1.5 pr-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Task</th>
                    <th className="text-left py-1.5 pr-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assigned.slice(0,4).map((w,i) => (
                    <tr key={w.id||i} className="border-b border-slate-100">
                      <td className="py-1.5 pr-2 font-mono font-bold text-slate-900">{w.first_name ? `${w.first_name[0]}. ${w.last_name}` : w.user__username}</td>
                      <td className="py-1.5 pr-2 text-slate-600">{w.zone_name || w.zone || '—'}</td>
                      <td className="py-1.5 pr-2 text-slate-600">Collection</td>
                      <td className="py-1.5"><StatusPill status="IN_PROGRESS" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-red-200 flex flex-col">
        <div className="px-4 pt-4 pb-2 border-b border-red-100 bg-red-50/30">
          <SectionHeader icon={AlertOctagon} title="Collection Exceptions" navigate={navigate} actionPath="/app/alerts" />
        </div>
        <div className="p-4 flex-1 overflow-x-auto">
          {exceptions.length === 0 ? <EmptyState message="No Exceptions" sub="All collections operating normally." /> : (
            <table className="w-full text-[11px] font-sans">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Exception', 'Bin', 'Zone', 'Time', 'Status', 'Action'].map(h => (
                    <th key={h} className="text-left py-1.5 pr-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exceptions.slice(0,5).map(e => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-1.5 pr-2 font-bold text-slate-900">{e.message || 'ACCESS_BLOCKED'}</td>
                    <td className="py-1.5 pr-2 font-mono text-slate-700">{e.bin_id}</td>
                    <td className="py-1.5 pr-2 text-slate-600">{e.location || '—'}</td>
                    <td className="py-1.5 pr-2 font-mono text-slate-500">{new Date(e.created_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</td>
                    <td className="py-1.5 pr-2"><StatusPill status={e.status?.toUpperCase() || 'OPEN'} /></td>
                    <td className="py-1.5 flex gap-2">
                      <button onClick={() => navigate('/app/alerts')} className="text-[9px] font-bold text-primary-600 uppercase hover:underline">VIEW</button>
                    </td>
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
   SECTION 11 & 12 — FLEET AVAILABILITY & AREA OPERATIONS
══════════════════════════════════════════════════════════════════════════════ */
function FleetAndAreaOperations({ vehicles, staff, bins, navigate }) {
  // Fleet
  const availableV = vehicles.filter(v => v.status === 'AVAILABLE').length
  const assignedV = vehicles.filter(v => v.status === 'ASSIGNED').length
  const onRouteV = vehicles.filter(v => v.status === 'ON_ROUTE').length
  const maintenanceV = vehicles.filter(v => v.status === 'MAINTENANCE').length
  const attnVehicles = vehicles.filter(v => v.status === 'MAINTENANCE' || v.status === 'INACTIVE')

  // Drivers
  const activeD = staff.filter(s => s.role === 'driver' && s.employment_status === 'ACTIVE')
  
  // Area aggregation
  const zoneMap = {}
  bins.forEach(b => {
    const zKey = b.zone_name || b.zone || 'Unassigned'
    if (!zoneMap[zKey]) zoneMap[zKey] = { name: zKey, bins: 0, critical: 0 }
    zoneMap[zKey].bins++
    if ((b.latest_pct ?? 0) >= 80) zoneMap[zKey].critical++
  })
  const areas = Object.values(zoneMap).sort((a,b)=>b.critical-a.critical)

  return (
    <div className="grid lg:grid-cols-2 gap-5 h-full">
      <div className="flex flex-col gap-5">
        <div className="bg-white border border-slate-300 p-4">
          <SectionHeader icon={TruckIcon} title="Fleet Availability" navigate={navigate} actionPath="/app/vehicles" />
          <div className="grid grid-cols-4 gap-2 mb-4">
             {[
               { l: 'AVAILABLE', v: availableV, c: 'text-green-700' },
               { l: 'ASSIGNED', v: assignedV, c: 'text-primary-700' },
               { l: 'ON ROUTE', v: onRouteV, c: 'text-slate-900' },
               { l: 'MAINTENANCE', v: maintenanceV, c: 'text-amber-700' },
             ].map(m => (
               <div key={m.l} className="text-center">
                 <div className={`font-mono font-bold text-xl ${m.c}`}>{m.v}</div>
                 <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">{m.l}</div>
               </div>
             ))}
          </div>
          {attnVehicles.length > 0 && (
            <div className="border-t border-slate-200 pt-3">
              <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest font-sans mb-2">Vehicles Requiring Attention</div>
              {attnVehicles.slice(0,3).map(v => (
                <div key={v.id} className="flex justify-between items-center text-[11px] mb-1">
                  <span className="font-mono font-bold text-slate-800">{v.vehicle_id}</span>
                  <StatusPill status={v.status} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white border border-slate-300 p-4">
          <SectionHeader icon={UserCircle} title="Driver Status" navigate={navigate} actionPath="/app/staff" />
          <div className="grid grid-cols-4 gap-2">
             {[
               { l: 'AVAILABLE', v: activeD.length - onRouteV, c: 'text-green-700' },
               { l: 'ON ROUTE', v: onRouteV, c: 'text-primary-700' },
               { l: 'ON LEAVE', v: staff.filter(s=>s.role==='driver'&&s.employment_status==='ON_LEAVE').length, c: 'text-amber-700' },
             ].map(m => (
               <div key={m.l} className="text-center">
                 <div className={`font-mono font-bold text-xl ${m.c}`}>{m.v}</div>
                 <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">{m.l}</div>
               </div>
             ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-300 flex flex-col">
        <div className="px-4 pt-4 pb-2 border-b border-slate-200">
          <SectionHeader icon={Layers} title="Area Operations Snapshot" />
        </div>
        <div className="p-4 flex-1 overflow-x-auto">
          {areas.length === 0 ? <EmptyState message="No Data" /> : (
            <table className="w-full text-[11px] font-sans">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Zone', 'Bins', 'Critical', 'Status'].map(h => (
                    <th key={h} className="text-left py-2 pr-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {areas.slice(0,6).map(z => (
                  <tr key={z.name} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 pr-2 font-bold text-slate-900">{z.name}</td>
                    <td className="py-2 pr-2 font-mono text-slate-600">{z.bins}</td>
                    <td className={`py-2 pr-2 font-mono font-bold ${z.critical > 0 ? 'text-red-700' : 'text-slate-400'}`}>{z.critical}</td>
                    <td className="py-2"><StatusPill status={z.critical > 0 ? 'ATTENTION' : 'NORMAL'} /></td>
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
   SECTION 13, 14, 15 — ACTIVITY, NOTIFICATIONS, QUICK ACTIONS
══════════════════════════════════════════════════════════════════════════════ */
function BottomSection({ auditLogs, navigate }) {
  const actions = [
    { label: 'View SmartBins',  path: '/app/bins',      icon: Trash2 },
    { label: 'View Alerts',     path: '/app/alerts',    icon: AlertTriangle },
    { label: 'View Schedules',  path: '/app/schedules', icon: ClipboardList },
    { label: 'View Routes',     path: '/app/schedules', icon: Navigation2 },
    { label: 'View Fleet',      path: '/app/vehicles',  icon: TruckIcon },
    { label: 'View Staff',      path: '/app/staff',     icon: Users },
    { label: 'View Reports',    path: '/app/reports',   icon: FileText },
  ]

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <div className="bg-white border border-slate-300 lg:col-span-2 flex flex-col">
        <div className="px-4 pt-4 pb-2 border-b border-slate-200">
          <SectionHeader icon={Activity} title="Today's Activity Timeline" navigate={navigate} actionPath="/app/audit-logs" />
        </div>
        <div className="p-4 flex-1">
          {auditLogs.length === 0 ? <EmptyState message="No Operations Today" sub="No significant events recorded." /> : (
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
        <div className="bg-white border border-slate-300 flex flex-col">
          <div className="px-4 pt-4 pb-2 border-b border-slate-200">
            <SectionHeader icon={Bell} title="Operational Notifications" />
          </div>
          <div className="p-4 flex justify-between items-center bg-slate-50 border-b border-slate-100">
             <div className="text-[11px] font-bold text-slate-600 uppercase tracking-widest font-sans">Unread</div>
             <div className="font-mono font-bold text-lg text-primary-700">3</div>
          </div>
          <div className="p-3 text-[10px] text-slate-500 font-sans text-center">
            Notifications are handled via the main top-bar.
          </div>
        </div>

        <div className="bg-white border border-slate-300 flex flex-col flex-1">
          <div className="px-4 pt-4 pb-2 border-b border-slate-200">
            <SectionHeader icon={CircleDot} title="Quick Actions" />
          </div>
          <div className="p-4 grid grid-cols-2 gap-2 flex-1">
            {actions.map(({ label, path, icon: Icon }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex flex-col items-center justify-center gap-2 px-2 py-3 border border-slate-200 hover:border-primary-500 hover:bg-primary-50 transition-all group text-center"
              >
                <Icon className="w-4 h-4 text-slate-400 group-hover:text-primary-700 transition-colors" />
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider font-sans leading-tight group-hover:text-primary-700 transition-colors">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export default function MunicipalOfficerDashboard() {
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

  // Fetch Secondary Data
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

  // Timer
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

  return (
    <div className="space-y-5 pb-10">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight leading-tight uppercase">
              MUNICIPAL OPERATIONS
            </h1>
            <div className="text-[10px] font-bold text-primary-600 uppercase tracking-widest font-sans mt-1">
              OFFICER WORKSPACE
            </div>
            <p className="text-sm text-slate-600 font-sans mt-2 max-w-xl">
              Today's collection activity, SmartBin alerts, routes and field operations within your scope.
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

      {/* ── ACTION REQUIRED ────────────────────────────────────────────────── */}
      <FadeIn delay={0.05}>
        <ActionRequiredBar bins={liveBins} alerts={alerts} routes={routes} vehicles={vehicles} navigate={navigate} />
      </FadeIn>

      {/* ── TODAY'S COLLECTION & ALERTS ────────────────────────────────────── */}
      <FadeIn delay={0.1}>
        <div className="grid lg:grid-cols-2 gap-5 h-full">
          <TodaysCollection schedules={schedules} navigate={navigate} />
          <OperationalAlerts alerts={alerts} navigate={navigate} />
        </div>
      </FadeIn>

      {/* ── SMARTBIN PRIORITY ──────────────────────────────────────────────── */}
      <FadeIn delay={0.15}>
        <SmartBinMonitor bins={liveBins} navigate={navigate} />
      </FadeIn>

      {/* ── SCHEDULES ──────────────────────────────────────────────────────── */}
      <FadeIn delay={0.2}>
        <TodaySchedules schedules={schedules} navigate={navigate} />
      </FadeIn>

      {/* ── ROUTES & MAP ───────────────────────────────────────────────────── */}
      <FadeIn delay={0.25}>
        <RoutesAndMap routes={routes} bins={liveBins} navigate={navigate} />
      </FadeIn>

      {/* ── FIELD OPS & EXCEPTIONS ─────────────────────────────────────────── */}
      <FadeIn delay={0.3}>
        <FieldOperations staff={staff} alerts={alerts} navigate={navigate} />
      </FadeIn>

      {/* ── FLEET & AREA ───────────────────────────────────────────────────── */}
      <FadeIn delay={0.35}>
        <FleetAndAreaOperations vehicles={vehicles} staff={staff} bins={liveBins} navigate={navigate} />
      </FadeIn>

      {/* ── TIMELINE, NOTIFICATIONS, QUICK ACTIONS ─────────────────────────── */}
      <FadeIn delay={0.4}>
        <BottomSection auditLogs={auditLogs} navigate={navigate} />
      </FadeIn>

    </div>
  )
}
