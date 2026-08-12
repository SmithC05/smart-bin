import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, useInView } from 'framer-motion'
import {
  Trash2, AlertTriangle, Route, BarChart3, CheckCircle2, AlertCircle,
  Clock, RefreshCw, Building2, Truck, Users, MapPin, Bell, Shield,
  Settings, Database, Wifi, Navigation2, Activity, Zap, ChevronRight,
  Plus, ClipboardList, FileText, Radio, Cpu, Eye, UserCheck,
  TrendingUp, Package, Layers, Server, CircleDot, AlertOctagon,
  AreaChart,
} from 'lucide-react'
import {
  AreaChart as ReAreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
} from 'recharts'
import api from '../api'
import { useDashboard, useLiveBins, useAlerts, useRoutes } from '../hooks/useBins'
import { timeAgo, formatDate } from '../utils/binHelpers'

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

/* ─── Inline progress bar ───────────────────────────────────────────────────── */
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

/* ─── Section header ────────────────────────────────────────────────────────── */
function SectionHeader({ icon: Icon, title, action, actionLabel, actionPath, navigate }) {
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

/* ─── Status pill ───────────────────────────────────────────────────────────── */
function StatusPill({ status }) {
  const map = {
    ONLINE:      'text-green-700 bg-green-50 border-green-400',
    ACTIVE:      'text-green-700 bg-green-50 border-green-400',
    READY:       'text-primary-700 bg-primary-50 border-primary-400',
    CONNECTED:   'text-green-700 bg-green-50 border-green-400',
    DEGRADED:    'text-amber-700 bg-amber-50 border-amber-400',
    OFFLINE:     'text-red-700 bg-red-50 border-red-400',
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

/* ─── Section skeleton ──────────────────────────────────────────────────────── */
function Skeleton({ rows = 3 }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-8 bg-slate-100 border border-slate-200" />
      ))}
    </div>
  )
}

/* ─── Section error ─────────────────────────────────────────────────────────── */
function SectionError({ message, onRetry }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200">
      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider font-sans">{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="mt-1 text-[11px] text-red-700 font-bold uppercase tracking-wider border border-red-400 px-2 py-0.5 hover:bg-red-100 transition-colors font-sans">
            Retry
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Empty state ───────────────────────────────────────────────────────────── */
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

/* ─── Fill bar color ────────────────────────────────────────────────────────── */
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
   SECTION 1 — SYSTEM STATUS STRIP
══════════════════════════════════════════════════════════════════════════════ */
function SystemStatusStrip() {
  const items = [
    { label: 'API Service',         status: 'ONLINE',    dot: 'bg-green-500' },
    { label: 'Database',            status: 'CONNECTED', dot: 'bg-green-500' },
    { label: 'IoT Ingestion',       status: 'ACTIVE',    dot: 'bg-green-500' },
    { label: 'Routing Engine',      status: 'READY',     dot: 'bg-primary-500' },
    { label: 'Notification Service',status: 'ACTIVE',    dot: 'bg-green-500' },
    { label: 'Audit System',        status: 'ACTIVE',    dot: 'bg-green-500' },
  ]
  return (
    <div className="bg-primary-950 border border-primary-800 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em] font-sans flex-shrink-0 flex items-center gap-1.5">
          <Server className="w-3 h-3" /> Platform Status
        </span>
        <div className="w-px h-4 bg-primary-700 hidden sm:block" />
        {items.map(({ label, status, dot }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
            <span className="text-[11px] text-slate-300 font-sans">{label}</span>
            <span className="text-[9px] font-bold text-white tracking-wider font-mono">{status}</span>
          </div>
        ))}
        <div className="ml-auto text-[9px] text-slate-500 font-sans uppercase tracking-widest hidden lg:block">
          Platform capability indicators
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 2 — PRIMARY METRICS ROW
══════════════════════════════════════════════════════════════════════════════ */
function MetricsRow({ bins, dashboard, alerts, vehicles, staff, schedules }) {
  const realBins   = bins.filter(b => b.bin_type === 'REAL')
  const simBins    = bins.filter(b => b.bin_type !== 'REAL')
  const critAlerts = alerts.filter(a => a.status === 'open' || a.level === 'danger' || (a.fill_pct ?? 0) >= 80)
  const activeRoutes = dashboard?.routes_today ?? 0
  const totalVehicles = vehicles.length
  const activeStaff   = staff.filter(s => s.employment_status === 'ACTIVE').length
  const todaySchedules = schedules.filter(s =>
    s.date === new Date().toISOString().split('T')[0]
  ).length

  const metrics = [
    {
      label:   'Total SmartBins',
      value:   dashboard?.total_bins ?? bins.length,
      sub:     `${realBins.length} real · ${simBins.length} simulated`,
      icon:    Trash2,
      border:  'border-l-primary-600',
      urgent:  false,
    },
    {
      label:   'Need Collection',
      value:   dashboard?.need_collection ?? 0,
      sub:     'Fill level ≥ threshold',
      icon:    AlertOctagon,
      border:  (dashboard?.need_collection ?? 0) > 0 ? 'border-l-red-500' : 'border-l-green-500',
      urgent:  (dashboard?.need_collection ?? 0) > 0,
    },
    {
      label:   'Open Alerts',
      value:   dashboard?.open_alerts ?? alerts.length,
      sub:     `${critAlerts.length} critical`,
      icon:    AlertTriangle,
      border:  (dashboard?.open_alerts ?? 0) > 0 ? 'border-l-red-500' : 'border-l-green-500',
      urgent:  (dashboard?.open_alerts ?? 0) > 0,
    },
    {
      label:   'Active Routes',
      value:   activeRoutes,
      sub:     'Planned + dispatched',
      icon:    Navigation2,
      border:  'border-l-primary-600',
      urgent:  false,
    },
    {
      label:   "Today's Schedules",
      value:   todaySchedules > 0 ? todaySchedules : '—',
      sub:     todaySchedules > 0 ? 'Collection schedules' : 'No data',
      icon:    ClipboardList,
      border:  'border-l-primary-600',
      urgent:  false,
    },
    {
      label:   'Average Fill',
      value:   dashboard?.avg_fill_pct != null ? `${dashboard.avg_fill_pct}%` : '—',
      sub:     'Network-wide average',
      icon:    BarChart3,
      border:  (dashboard?.avg_fill_pct ?? 0) >= 70 ? 'border-l-amber-500' : 'border-l-primary-600',
      urgent:  false,
    },
    {
      label:   'Vehicles',
      value:   totalVehicles > 0 ? totalVehicles : '—',
      sub:     totalVehicles > 0 ? `${vehicles.filter(v => v.status === 'AVAILABLE').length} available` : 'Loading',
      icon:    Truck,
      border:  'border-l-primary-600',
      urgent:  false,
    },
    {
      label:   'Active Staff',
      value:   activeStaff > 0 ? activeStaff : '—',
      sub:     activeStaff > 0 ? `${staff.filter(s => s.role === 'driver' && s.employment_status === 'ACTIVE').length} drivers` : 'Loading',
      icon:    Users,
      border:  'border-l-primary-600',
      urgent:  false,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-px bg-slate-300 border border-slate-300">
      {metrics.map(({ label, value, sub, icon: Icon, border, urgent }, i) => (
        <FadeIn key={label} delay={i * 0.04}>
          <div className={`bg-white px-3 py-4 border-l-4 ${border} h-full`}>
            <div className="flex items-start justify-between mb-2">
              <Icon className={`w-4 h-4 flex-shrink-0 ${urgent ? 'text-red-500' : 'text-primary-600'}`} />
            </div>
            <div className={`font-mono text-2xl font-bold leading-none mb-1.5 ${urgent ? 'text-red-700' : 'text-slate-900'}`}>
              {typeof value === 'number'
                ? <AnimatedNumber value={value} />
                : value}
            </div>
            <div className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.15em] font-sans leading-tight mb-0.5">
              {label}
            </div>
            <div className="text-[10px] text-slate-500 font-sans leading-tight">{sub}</div>
          </div>
        </FadeIn>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 3 — SMARTBIN NETWORK
══════════════════════════════════════════════════════════════════════════════ */
function SmartBinNetwork({ bins, loading, navigate }) {
  if (loading && bins.length === 0) return (
    <div className="bg-white border border-slate-300 p-4">
      <SectionHeader icon={Trash2} title="SmartBin Network" navigate={navigate} actionPath="/app/bins" actionLabel="Bin Management" />
      <Skeleton rows={4} />
    </div>
  )

  const realBins = bins.filter(b => b.bin_type === 'REAL')
  const simBins  = bins.filter(b => b.bin_type !== 'REAL')
  const critical = bins.filter(b => (b.latest_pct ?? 0) >= 80)
  const high     = bins.filter(b => (b.latest_pct ?? 0) >= 60 && (b.latest_pct ?? 0) < 80)
  const normal   = bins.filter(b => (b.latest_pct ?? 0) < 60)
  const topBins  = [...bins].sort((a, b) => (b.latest_pct ?? 0) - (a.latest_pct ?? 0)).slice(0, 6)

  const realDevice = realBins[0]

  return (
    <div className="bg-white border border-slate-300">
      <div className="px-4 pt-4 pb-2 border-b border-slate-200">
        <SectionHeader icon={Trash2} title="SmartBin Network" navigate={navigate} actionPath="/app/bins" actionLabel="Bin Management" />
      </div>

      <div className="grid lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">

        {/* Left: distribution */}
        <div className="px-4 py-4">
          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.16em] mb-4 font-sans">Fill Distribution</div>
          <div className="space-y-3">
            {[
              { label: 'Critical (≥80%)', count: critical.length, color: 'bg-red-500', text: 'text-red-700' },
              { label: 'High (60–79%)',   count: high.length,     color: 'bg-amber-500', text: 'text-amber-700' },
              { label: 'Normal (<60%)',   count: normal.length,   color: 'bg-green-500', text: 'text-green-700' },
            ].map(({ label, count, color, text }) => (
              <div key={label}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-600 font-sans font-medium">{label}</span>
                  <span className={`font-bold font-mono ${text}`}>{count}</span>
                </div>
                <MiniBar value={bins.length ? (count / bins.length) * 100 : 0} color={color} height="h-2" />
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 gap-3 text-[11px]">
            <div className="bg-slate-50 border border-slate-200 px-3 py-2">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-sans mb-1">Real Devices</div>
              <div className="font-bold text-primary-700 font-mono text-lg">{realBins.length}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 px-3 py-2">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-sans mb-1">Simulated</div>
              <div className="font-bold text-slate-700 font-mono text-lg">{simBins.length}</div>
            </div>
          </div>
        </div>

        {/* Middle: top bins needing attention */}
        <div className="px-4 py-4">
          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.16em] mb-4 font-sans">Highest Fill — Attention Required</div>
          {topBins.length === 0 ? (
            <EmptyState message="All bins normal" sub="No bins above threshold" />
          ) : (
            <div className="space-y-2">
              {topBins.map(bin => (
                <div key={bin.bin_id} className="flex items-center gap-3 p-2 border border-slate-200 hover:border-primary-300 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-slate-900 font-mono">{bin.bin_id}</span>
                      {bin.bin_type === 'REAL' && (
                        <span className="text-[8px] font-bold text-primary-600 border border-primary-400 bg-primary-50 px-1 py-0.5 uppercase tracking-wider font-sans">Real</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans">{bin.zone || '—'}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`font-mono font-bold text-sm ${fillTextColor(bin.latest_pct ?? 0)}`}>
                      {Math.round(bin.latest_pct ?? 0)}%
                    </div>
                    <MiniBar value={bin.latest_pct ?? 0} color={fillBarColor(bin.latest_pct ?? 0)} height="h-1.5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: real device callout */}
        <div className="px-4 py-4">
          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.16em] mb-4 font-sans flex items-center gap-2">
            <CircleDot className="w-3 h-3 text-primary-600" />
            Physical Device Status
          </div>
          {realDevice ? (
            <div className="border border-primary-400 bg-primary-50/30">
              <div className="flex items-center justify-between px-3 py-2 bg-primary-950 border-b border-primary-800">
                <span className="text-[11px] font-bold text-white font-mono">{realDevice.bin_id}</span>
                <span className="text-[9px] font-bold text-green-300 border border-green-600 px-1.5 py-0.5 font-sans uppercase tracking-wider">Real Device</span>
              </div>
              <div className="px-3 py-3 space-y-2.5">
                {[
                  { label: 'Fill Level',   value: `${Math.round(realDevice.latest_pct ?? 0)}%`, highlight: true },
                  { label: 'Zone',         value: realDevice.zone || '—' },
                  { label: 'Location',     value: realDevice.location || '—' },
                  { label: 'Last Reading', value: realDevice.last_seen || '—' },
                  { label: 'Status',       value: realDevice.status?.toUpperCase() || '—' },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className="flex justify-between text-[11px]">
                    <span className="text-slate-600 font-sans font-medium">{label}</span>
                    <span className={`font-mono font-bold ${highlight ? fillTextColor(realDevice.latest_pct ?? 0) : 'text-slate-900'}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-3 py-2 border-t border-primary-200">
                <MiniBar value={realDevice.latest_pct ?? 0} color={fillBarColor(realDevice.latest_pct ?? 0)} height="h-2.5" />
              </div>
            </div>
          ) : (
            <EmptyState message="No Physical Device" sub="No REAL bin type registered in the system." />
          )}
        </div>

      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 4 — ALERT INTELLIGENCE
══════════════════════════════════════════════════════════════════════════════ */
function AlertIntelligence({ alerts, loading, navigate }) {
  if (loading && alerts.length === 0) return (
    <div className="bg-white border border-slate-300 p-4">
      <SectionHeader icon={AlertTriangle} title="Alert & Incident Centre" navigate={navigate} actionPath="/app/alerts" actionLabel="View Alerts" />
      <Skeleton rows={4} />
    </div>
  )

  const open  = alerts.filter(a => a.status === 'open')
  const acked = alerts.filter(a => a.status === 'acknowledged')
  const resolved = alerts.filter(a => a.status === 'resolved')
  const byCrit = alerts.filter(a => (a.fill_pct ?? 0) >= 80 && a.status === 'open')
  const byHigh = alerts.filter(a => (a.fill_pct ?? 0) >= 60 && (a.fill_pct ?? 0) < 80 && a.status === 'open')
  const topAlerts = [...open].sort((a, b) => (b.fill_pct ?? 0) - (a.fill_pct ?? 0)).slice(0, 5)

  return (
    <div className="bg-white border border-slate-300">
      <div className="px-4 pt-4 pb-2 border-b border-slate-200">
        <SectionHeader icon={AlertTriangle} title="Alert & Incident Centre" navigate={navigate} actionPath="/app/alerts" actionLabel="View Alerts" />
      </div>
      <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        {/* Severity summary */}
        <div className="px-4 py-4">
          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.16em] mb-3 font-sans">By Status</div>
          <div className="space-y-2.5">
            {[
              { label: 'Open',       count: open.length,     cls: 'text-red-700 bg-red-50 border-red-300' },
              { label: 'Acknowledged', count: acked.length,  cls: 'text-amber-700 bg-amber-50 border-amber-300' },
              { label: 'Resolved',   count: resolved.length, cls: 'text-green-700 bg-green-50 border-green-300' },
            ].map(({ label, count, cls }) => (
              <div key={label} className={`flex items-center justify-between px-3 py-2 border ${cls}`}>
                <span className="text-[11px] font-bold uppercase tracking-wider font-sans">{label}</span>
                <span className="font-mono font-bold text-base">{count}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 gap-2">
            <div className="text-center border border-red-200 bg-red-50 py-2">
              <div className="font-mono font-bold text-xl text-red-700">{byCrit.length}</div>
              <div className="text-[9px] font-bold text-red-600 uppercase tracking-wider font-sans">Critical Fill</div>
            </div>
            <div className="text-center border border-amber-200 bg-amber-50 py-2">
              <div className="font-mono font-bold text-xl text-amber-700">{byHigh.length}</div>
              <div className="text-[9px] font-bold text-amber-600 uppercase tracking-wider font-sans">High Fill</div>
            </div>
          </div>
        </div>

        {/* Top alerts */}
        <div className="px-4 py-4">
          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.16em] mb-3 font-sans">Highest Priority Open</div>
          {topAlerts.length === 0 ? (
            <EmptyState message="All Clear" sub="No open alerts at this time." />
          ) : (
            <div className="space-y-2">
              {topAlerts.map((a, i) => (
                <div key={a.id ?? i} className={`flex items-start gap-3 p-2.5 border ${(a.fill_pct ?? 0) >= 80 ? 'border-red-200 bg-red-50/40' : 'border-amber-200 bg-amber-50/40'}`}>
                  <div className={`w-1 h-full flex-shrink-0 self-stretch rounded-none ${(a.fill_pct ?? 0) >= 80 ? 'bg-red-500' : 'bg-amber-400'}`} style={{ minHeight: 36 }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-bold text-slate-900">{a.bin_id}</span>
                      <span className={`text-[9px] font-bold font-mono ${(a.fill_pct ?? 0) >= 80 ? 'text-red-700' : 'text-amber-700'}`}>
                        {Math.round(a.fill_pct ?? 0)}%
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-600 font-sans truncate">{a.message}</div>
                    <div className="text-[9px] text-slate-400 font-sans mt-0.5">{a.recorded_at ? timeAgo(a.recorded_at) : '—'}</div>
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
   SECTION 5 — COLLECTION OPERATIONS + NOTIFICATIONS
══════════════════════════════════════════════════════════════════════════════ */
function CollectionOpsPanel({ schedules, loading, navigate }) {
  const byStatus = {
    PENDING:     schedules.filter(s => s.status === 'PENDING').length,
    DISPATCHED:  schedules.filter(s => s.status === 'DISPATCHED').length,
    IN_PROGRESS: schedules.filter(s => s.status === 'IN_PROGRESS').length,
    COMPLETED:   schedules.filter(s => s.status === 'COMPLETED').length,
    CANCELLED:   schedules.filter(s => s.status === 'CANCELLED').length,
  }
  const total = schedules.length || 1

  const bars = [
    { label: 'Completed',   count: byStatus.COMPLETED,   color: 'bg-green-500' },
    { label: 'In Progress', count: byStatus.IN_PROGRESS, color: 'bg-amber-500' },
    { label: 'Dispatched',  count: byStatus.DISPATCHED,  color: 'bg-primary-500' },
    { label: 'Pending',     count: byStatus.PENDING,     color: 'bg-slate-400' },
    { label: 'Cancelled',   count: byStatus.CANCELLED,   color: 'bg-red-400' },
  ]

  return (
    <div className="bg-white border border-slate-300 h-full">
      <div className="px-4 pt-4 pb-2 border-b border-slate-200">
        <SectionHeader icon={ClipboardList} title="Collection Operations" navigate={navigate} actionPath="/app/schedules" actionLabel="Schedules" />
      </div>
      <div className="px-4 py-4">
        {loading && schedules.length === 0 ? <Skeleton rows={5} /> : (
          <>
            <div className="space-y-3 mb-4">
              {bars.map(({ label, count, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-600 font-sans font-medium w-24 flex-shrink-0">{label}</span>
                  <div className="flex-1">
                    <MiniBar value={(count / total) * 100} color={color} height="h-2" />
                  </div>
                  <span className="font-mono font-bold text-sm text-slate-900 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200 pt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="font-mono font-bold text-lg text-slate-900">{schedules.length}</div>
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-sans">Total</div>
              </div>
              <div>
                <div className="font-mono font-bold text-lg text-green-700">{byStatus.COMPLETED}</div>
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-sans">Completed</div>
              </div>
              <div>
                <div className={`font-mono font-bold text-lg ${byStatus.CANCELLED > 0 ? 'text-red-700' : 'text-slate-400'}`}>{byStatus.CANCELLED}</div>
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-sans">Cancelled</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function NotificationsPanel({ notifications, loading, navigate }) {
  const unread = notifications.filter(n => !n.is_read)
  const top    = notifications.slice(0, 5)

  const typeIcon = (type) => {
    const map = {
      SMARTBIN_CRITICAL:   { icon: AlertTriangle, cls: 'text-red-500' },
      SCHEDULE_DISPATCHED: { icon: Truck,         cls: 'text-primary-600' },
      ROUTE_COMPLETED:     { icon: CheckCircle2,  cls: 'text-green-600' },
      COLLECTION_EXCEPTION:{ icon: AlertCircle,   cls: 'text-amber-500' },
    }
    const found = map[type]
    if (!found) return { icon: Bell, cls: 'text-slate-500' }
    return found
  }

  return (
    <div className="bg-white border border-slate-300 h-full">
      <div className="px-4 pt-4 pb-2 border-b border-slate-200">
        <div className="flex items-center justify-between mb-0">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary-700" />
            <h2 className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.18em] font-sans">Notifications</h2>
            {unread.length > 0 && (
              <span className="text-[9px] font-bold text-white bg-red-600 px-1.5 py-0.5 font-sans">{unread.length} unread</span>
            )}
          </div>
          <button
            onClick={() => navigate('/app/notifications')}
            className="flex items-center gap-1 text-[10px] font-bold text-primary-700 hover:text-primary-900 uppercase tracking-wider font-sans"
          >
            View All <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="px-4 py-4">
        {loading && notifications.length === 0 ? <Skeleton rows={4} /> : (
          top.length === 0
            ? <EmptyState message="No Notifications" sub="Your notification queue is empty." />
            : (
              <div className="space-y-2">
                {top.map(n => {
                  const { icon: NIcon, cls } = typeIcon(n.notification_type)
                  return (
                    <div key={n.id} className={`flex items-start gap-3 p-2.5 border transition-colors ${!n.is_read ? 'border-primary-200 bg-primary-50/20' : 'border-slate-200'}`}>
                      <NIcon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${cls}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-sans truncate ${!n.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                          {n.title}
                        </div>
                        <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                          {n.created_at ? timeAgo(n.created_at) : '—'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 6 — ROUTE OPERATIONS
══════════════════════════════════════════════════════════════════════════════ */
function RouteOperations({ routes, loading, navigate }) {
  const planned   = routes.filter(r => r.status === 'PLANNED')
  const active    = routes.filter(r => r.status === 'DISPATCHED' || r.status === 'IN_PROGRESS')
  const completed = routes.filter(r => r.status === 'COMPLETED')
  const exceptions= routes.filter(r => r.status === 'EXCEPTION' || r.status === 'CANCELLED')

  return (
    <div className="bg-white border border-slate-300">
      <div className="px-4 pt-4 pb-2 border-b border-slate-200">
        <SectionHeader icon={Navigation2} title="Route Operations" navigate={navigate} actionPath="/app/schedules" actionLabel="Schedules" />
      </div>
      <div className="grid sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        {[
          { label: 'Active',    count: active.length,    cls: 'text-primary-700', dot: 'bg-primary-500' },
          { label: 'Planned',   count: planned.length,   cls: 'text-slate-700',   dot: 'bg-slate-400' },
          { label: 'Completed', count: completed.length, cls: 'text-green-700',   dot: 'bg-green-500' },
          { label: 'Exceptions',count: exceptions.length,cls: exceptions.length > 0 ? 'text-red-700' : 'text-slate-400', dot: 'bg-red-500' },
        ].map(({ label, count, cls, dot }) => (
          <div key={label} className="px-4 py-4 text-center">
            <div className={`font-mono font-bold text-3xl mb-1 ${cls}`}>
              {loading && routes.length === 0 ? '—' : <AnimatedNumber value={count} />}
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider font-sans">{label}</span>
            </div>
          </div>
        ))}
      </div>
      {active.length > 0 && (
        <div className="border-t border-slate-200 px-4 py-3">
          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.16em] mb-2 font-sans">Active Routes</div>
          <div className="space-y-1.5 overflow-x-auto">
            <table className="w-full text-[11px] font-sans min-w-[480px]">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Route ID', 'Zone', 'Vehicle', 'Stops', 'Status'].map(h => (
                    <th key={h} className="text-left py-1.5 pr-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {active.slice(0, 4).map(r => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-1.5 pr-3 font-mono font-bold text-slate-900">RT-{String(r.id).padStart(4, '0')}</td>
                    <td className="py-1.5 pr-3 text-slate-700">{r.zone_name || r.zone || '—'}</td>
                    <td className="py-1.5 pr-3 font-mono text-slate-700">{r.vehicle || '—'}</td>
                    <td className="py-1.5 pr-3 text-slate-700">{r.stops?.length ?? r.stop_count ?? '—'}</td>
                    <td className="py-1.5"><StatusPill status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 7 — FLEET + WORKFORCE
══════════════════════════════════════════════════════════════════════════════ */
function FleetWorkforce({ vehicles, staff, loadingVehicles, loadingStaff, navigate }) {
  const vByStatus = {
    AVAILABLE:   vehicles.filter(v => v.status === 'AVAILABLE').length,
    ON_ROUTE:    vehicles.filter(v => v.status === 'ON_ROUTE' || v.status === 'DEPLOYED').length,
    MAINTENANCE: vehicles.filter(v => v.status === 'MAINTENANCE').length,
    INACTIVE:    vehicles.filter(v => v.status === 'INACTIVE').length,
  }
  const drivers   = staff.filter(s => s.role === 'driver' && s.employment_status === 'ACTIVE')
  const workers   = staff.filter(s => s.role === 'field_worker' && s.employment_status === 'ACTIVE')
  const supervisors = staff.filter(s => s.role === 'zone_supervisor' && s.employment_status === 'ACTIVE')

  return (
    <div className="grid lg:grid-cols-2 gap-4">

      {/* Fleet */}
      <div className="bg-white border border-slate-300">
        <div className="px-4 pt-4 pb-2 border-b border-slate-200">
          <SectionHeader icon={Truck} title="Fleet Status" navigate={navigate} actionPath="/app/vehicles" actionLabel="Fleet" />
        </div>
        <div className="px-4 py-4">
          {loadingVehicles && vehicles.length === 0 ? <Skeleton rows={3} /> : (
            <>
              <div className="grid grid-cols-4 gap-px bg-slate-200 border border-slate-200 mb-4">
                {[
                  { label: 'Available',   count: vByStatus.AVAILABLE,   cls: 'text-green-700' },
                  { label: 'On Route',    count: vByStatus.ON_ROUTE,    cls: 'text-primary-700' },
                  { label: 'Maintenance',count: vByStatus.MAINTENANCE, cls: 'text-amber-700' },
                  { label: 'Inactive',    count: vByStatus.INACTIVE,    cls: 'text-slate-500' },
                ].map(({ label, count, cls }) => (
                  <div key={label} className="bg-white px-3 py-3 text-center">
                    <div className={`font-mono font-bold text-xl ${cls}`}>{count}</div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-sans mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
              {vehicles.length === 0
                ? <EmptyState message="No Vehicles" sub="No vehicles registered." actionLabel="Add Vehicle" onAction={() => navigate('/app/vehicles')} />
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] font-sans min-w-[360px]">
                      <thead>
                        <tr className="border-b border-slate-200">
                          {['Vehicle', 'Type', 'Status'].map(h => (
                            <th key={h} className="text-left py-1.5 pr-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {vehicles.slice(0, 5).map(v => (
                          <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-1.5 pr-3 font-mono font-bold text-slate-900">{v.vehicle_id}</td>
                            <td className="py-1.5 pr-3 text-slate-700">{v.vehicle_type}</td>
                            <td className="py-1.5"><StatusPill status={v.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </>
          )}
        </div>
      </div>

      {/* Workforce */}
      <div className="bg-white border border-slate-300">
        <div className="px-4 pt-4 pb-2 border-b border-slate-200">
          <SectionHeader icon={Users} title="Workforce" navigate={navigate} actionPath="/app/staff" actionLabel="Staff" />
        </div>
        <div className="px-4 py-4">
          {loadingStaff && staff.length === 0 ? <Skeleton rows={3} /> : (
            <>
              <div className="grid grid-cols-3 gap-px bg-slate-200 border border-slate-200 mb-4">
                {[
                  { label: 'Drivers',      count: drivers.length,    cls: 'text-primary-700' },
                  { label: 'Field Workers',count: workers.length,    cls: 'text-slate-700' },
                  { label: 'Supervisors',  count: supervisors.length,cls: 'text-slate-700' },
                ].map(({ label, count, cls }) => (
                  <div key={label} className="bg-white px-3 py-3 text-center">
                    <div className={`font-mono font-bold text-xl ${cls}`}>{count}</div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-sans mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
              {staff.length === 0
                ? <EmptyState message="No Staff" sub="No staff registered." actionLabel="Add Staff" onAction={() => navigate('/app/staff')} />
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] font-sans min-w-[360px]">
                      <thead>
                        <tr className="border-b border-slate-200">
                          {['Name', 'Role', 'Status'].map(h => (
                            <th key={h} className="text-left py-1.5 pr-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {staff.filter(s => s.employment_status === 'ACTIVE').slice(0, 5).map(s => (
                          <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-1.5 pr-3 font-semibold text-slate-900 font-sans">
                              {s.first_name} {s.last_name}
                            </td>
                            <td className="py-1.5 pr-3 text-slate-600 capitalize">{s.role?.replace(/_/g, ' ')}</td>
                            <td className="py-1.5"><StatusPill status={s.employment_status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 8 — ZONE OVERVIEW
══════════════════════════════════════════════════════════════════════════════ */
function ZoneOverview({ bins, zones, routes }) {
  // Compute per-zone stats from live bin data
  const zoneMap = {}
  bins.forEach(b => {
    const key = b.zone || 'Unassigned'
    if (!zoneMap[key]) zoneMap[key] = { zone: key, bins: 0, critical: 0, high: 0 }
    zoneMap[key].bins++
    const pct = b.latest_pct ?? 0
    if (pct >= 80) zoneMap[key].critical++
    else if (pct >= 60) zoneMap[key].high++
  })

  const zoneRows = Object.values(zoneMap).sort((a, b) => b.critical - a.critical)
  if (zoneRows.length === 0) return null

  return (
    <div className="bg-white border border-slate-300">
      <div className="px-4 pt-4 pb-2 border-b border-slate-200">
        <SectionHeader icon={Layers} title="Zone Overview" />
      </div>
      <div className="px-4 py-4 overflow-x-auto">
        <table className="w-full text-[11px] font-sans min-w-[500px]">
          <thead>
            <tr className="border-b border-slate-200">
              {['Zone', 'Bins', 'Critical Fill', 'High Fill', 'Normal', 'Situation'].map(h => (
                <th key={h} className="text-left py-2 pr-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {zoneRows.map(({ zone, bins: total, critical, high }) => {
              const normal = total - critical - high
              const situation = critical > 0 ? 'ATTENTION' : high > 0 ? 'MONITOR' : 'NORMAL'
              const sitCls = critical > 0 ? 'text-red-700 bg-red-50 border-red-300' : high > 0 ? 'text-amber-700 bg-amber-50 border-amber-300' : 'text-green-700 bg-green-50 border-green-300'
              return (
                <tr key={zone} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 pr-4 font-bold text-slate-900 font-sans">{zone}</td>
                  <td className="py-2 pr-4 font-mono font-bold text-slate-700">{total}</td>
                  <td className="py-2 pr-4 font-mono font-bold text-red-700">{critical || '—'}</td>
                  <td className="py-2 pr-4 font-mono font-bold text-amber-700">{high || '—'}</td>
                  <td className="py-2 pr-4 font-mono text-green-700">{normal}</td>
                  <td className="py-2">
                    <span className={`text-[9px] font-bold border px-1.5 py-0.5 uppercase tracking-wider font-sans ${sitCls}`}>
                      {situation}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 9 — RECENT ACTIVITY
══════════════════════════════════════════════════════════════════════════════ */
function RecentActivity({ auditLogs, loading, navigate }) {
  const MODULE_ICONS = {
    Bin:          Trash2,
    Vehicle:      Truck,
    Staff:        Users,
    Schedule:     ClipboardList,
    Route:        Navigation2,
    Alert:        AlertTriangle,
    Notification: Bell,
    Auth:         Shield,
  }

  return (
    <div className="bg-white border border-slate-300">
      <div className="px-4 pt-4 pb-2 border-b border-slate-200">
        <SectionHeader icon={Activity} title="Recent Activity" navigate={navigate} actionPath="/app/audit-logs" actionLabel="Audit Logs" />
      </div>
      <div className="px-4 py-4">
        {loading && auditLogs.length === 0 ? <Skeleton rows={5} /> : (
          auditLogs.length === 0
            ? <EmptyState message="No Recent Activity" sub="No audit events recorded yet." />
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] font-sans min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-200">
                      {['Time', 'Actor', 'Action', 'Module', 'Reference', 'Result'].map(h => (
                        <th key={h} className="text-left py-2 pr-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.slice(0, 8).map((log, i) => {
                      const LIcon = MODULE_ICONS[log.module] || Activity
                      return (
                        <tr key={log.id ?? i} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 pr-4 text-slate-500 font-mono whitespace-nowrap">
                            {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td className="py-2 pr-4 text-slate-700 font-sans">{log.actor_username || log.actor || '—'}</td>
                          <td className="py-2 pr-4 text-slate-900 font-medium font-sans">{log.action || '—'}</td>
                          <td className="py-2 pr-4">
                            <span className="inline-flex items-center gap-1 text-slate-600">
                              <LIcon className="w-3 h-3" />
                              {log.module || '—'}
                            </span>
                          </td>
                          <td className="py-2 pr-4 font-mono text-slate-700">{log.reference_id || log.object_id || '—'}</td>
                          <td className="py-2">
                            <span className={`text-[9px] font-bold border px-1.5 py-0.5 uppercase tracking-wider font-sans
                              ${log.status === 'SUCCESS' || log.result === 'SUCCESS'
                                ? 'text-green-700 bg-green-50 border-green-300'
                                : log.status === 'FAILURE' || log.result === 'FAILURE'
                                  ? 'text-red-700 bg-red-50 border-red-300'
                                  : 'text-slate-600 bg-slate-50 border-slate-300'}`}>
                              {log.status || log.result || 'OK'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 10 — FILL TREND CHART
══════════════════════════════════════════════════════════════════════════════ */
function FillTrendChart({ trendData, loading }) {
  if (loading && trendData.length === 0) return (
    <div className="bg-white border border-slate-300 p-4">
      <SectionHeader icon={TrendingUp} title="Network Fill Trend" />
      <div className="h-48 flex items-center justify-center">
        <div className="animate-pulse h-32 w-full bg-slate-100 border border-slate-200" />
      </div>
    </div>
  )

  return (
    <div className="bg-white border border-slate-300">
      <div className="px-4 pt-4 pb-2 border-b border-slate-200">
        <SectionHeader icon={TrendingUp} title="Network Fill Level Trend (Hourly)" />
      </div>
      <div className="px-4 py-4">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ReAreaChart data={trendData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="fillGradAdmin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#245275" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#245275" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <ReTooltip
                contentStyle={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 0, fontSize: 11, fontFamily: 'Inter' }}
                formatter={v => [`${v}%`, 'Avg Fill']}
              />
              <Area type="monotone" dataKey="avg" stroke="#245275" strokeWidth={2} fill="url(#fillGradAdmin)"
                dot={{ r: 2.5, fill: '#245275', strokeWidth: 0 }}
                activeDot={{ r: 4, fill: '#142536', stroke: '#fff', strokeWidth: 2 }}
              />
            </ReAreaChart>
          </ResponsiveContainer>
        </div>
        {trendData.length === 0 && <EmptyState message="No Trend Data" sub="Simulate readings to populate trend data." />}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION 11 — QUICK ACTIONS
══════════════════════════════════════════════════════════════════════════════ */
function QuickActions({ navigate, onSimulate, simulating }) {
  const actions = [
    { label: 'Bin Management',    path: '/app/bins',      icon: Trash2 },
    { label: 'Add Vehicle',       path: '/app/vehicles',  icon: Truck },
    { label: 'Add Staff',         path: '/app/staff',     icon: Users },
    { label: 'Create Schedule',   path: '/app/schedules', icon: ClipboardList },
    { label: 'View Alerts',       path: '/app/alerts',    icon: AlertTriangle },
    { label: 'Reports',           path: '/app/reports',   icon: FileText },
    { label: 'Audit Logs',        path: '/app/audit-logs',icon: Shield },
    { label: 'Settings',          path: '/app/settings',  icon: Settings },
  ]

  return (
    <div className="bg-white border border-slate-300">
      <div className="px-4 pt-4 pb-2 border-b border-slate-200">
        <SectionHeader icon={Zap} title="Quick Actions" />
      </div>
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {actions.map(({ label, path, icon: Icon }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-2 px-3 py-4 border border-slate-200 hover:border-primary-500 hover:bg-primary-50 transition-all group text-center"
            >
              <Icon className="w-4 h-4 text-slate-500 group-hover:text-primary-700 transition-colors" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider font-sans leading-tight group-hover:text-primary-700 transition-colors">
                {label}
              </span>
            </button>
          ))}
        </div>
        {onSimulate && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <button
              onClick={onSimulate}
              disabled={simulating}
              className="flex items-center gap-2 px-4 py-2 bg-primary-950 text-white text-[11px] font-bold uppercase tracking-wider hover:bg-primary-800 disabled:opacity-50 transition-colors font-sans"
            >
              <Radio className={`w-3.5 h-3.5 ${simulating ? 'animate-pulse' : ''}`} />
              {simulating ? 'Simulating Network Readings…' : 'Simulate SmartBin Network Reading'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════════════════════════════════ */
export default function SystemAdminDashboard() {
  // ── Existing hooks ──────────────────────────────────────────────────────────
  const { bins: liveBins, loading: binsLoading, error: binsError, lastUpdated } = useLiveBins()
  const { data: dashboard, refetch: refetchDashboard, loading: dashLoading }    = useDashboard()
  const { alerts, loading: alertsLoading }                                       = useAlerts()
  const { routes, loading: routesLoading }                                       = useRoutes()

  // ── Additional API state ────────────────────────────────────────────────────
  const [vehicles,      setVehicles]      = useState([])
  const [staff,         setStaff]         = useState([])
  const [schedules,     setSchedules]     = useState([])
  const [notifications, setNotifications] = useState([])
  const [auditLogs,     setAuditLogs]     = useState([])
  const [trendData,     setTrendData]     = useState([])

  const [loadingVehicles,  setLoadingVehicles]  = useState(true)
  const [loadingStaff,     setLoadingStaff]     = useState(true)
  const [loadingSchedules, setLoadingSchedules] = useState(true)
  const [loadingNotifs,    setLoadingNotifs]    = useState(true)
  const [loadingAudit,     setLoadingAudit]     = useState(true)
  const [loadingTrend,     setLoadingTrend]     = useState(true)

  const [refreshing,    setRefreshing]    = useState(false)
  const [simulating,    setSimulating]    = useState(false)
  const [secondsAgo,    setSecondsAgo]    = useState(0)

  const navigate = useNavigate()

  // ── Fetch secondary data ────────────────────────────────────────────────────
  const fetchSecondary = useCallback(async () => {
    const safe = async (fn, setter, errSetter) => {
      try { await fn() }
      catch (e) { console.warn('Dashboard fetch error:', e?.message) }
      finally { errSetter?.(false) }
    }

    safe(async () => {
      const r = await api.get('/vehicles/')
      setVehicles(r.data?.results ?? r.data ?? [])
    }, setVehicles, setLoadingVehicles)

    safe(async () => {
      const r = await api.get('/staff/')
      setStaff(r.data?.results ?? r.data ?? [])
    }, setStaff, setLoadingStaff)

    safe(async () => {
      const r = await api.get('/schedules/')
      setSchedules(r.data?.results ?? r.data ?? [])
    }, setSchedules, setLoadingSchedules)

    safe(async () => {
      const r = await api.get('/notifications/')
      setNotifications(r.data?.results ?? r.data ?? [])
    }, setNotifications, setLoadingNotifs)

    safe(async () => {
      const r = await api.get('/audit-logs/')
      setAuditLogs(r.data?.results ?? r.data ?? [])
    }, setAuditLogs, setLoadingAudit)

    safe(async () => {
      const r = await api.get('/trend/')
      setTrendData(r.data ?? [])
    }, setTrendData, setLoadingTrend)
  }, [])

  useEffect(() => {
    fetchSecondary()
  }, [fetchSecondary])

  // ── Last-updated counter ─────────────────────────────────────────────────
  useEffect(() => {
    setSecondsAgo(0)
    const t = setInterval(() => setSecondsAgo(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [lastUpdated])

  // ── Refresh ──────────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.allSettled([refetchDashboard(), fetchSecondary()])
    setRefreshing(false)
  }

  // ── Simulate ─────────────────────────────────────────────────────────────
  const simulateReadings = async () => {
    setSimulating(true)
    try {
      await api.post('/simulate/', {})
      const trend = await api.get('/trend/')
      setTrendData(trend.data)
      refetchDashboard()
    } finally {
      setSimulating(false)
    }
  }

  const now = new Date()
  const lastUpdatedStr = now.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })

  // ── Stagger animations ───────────────────────────────────────────────────
  const reduced = useReducedMotion()

  return (
    <div className="space-y-5 pb-10">

      {/* ── PAGE HEADER ────────────────────────────────────────────────────── */}
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold text-primary-700 uppercase tracking-[0.2em] font-sans mb-1 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" />
              System Administration
            </div>
            <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight leading-tight">
              Municipal Operations Command Center
            </h1>
            <p className="text-sm text-slate-600 font-sans mt-1 leading-relaxed">
              Monitor infrastructure, operations, resources and system activity across the ERP.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-sans">Last Updated</div>
              <div className="text-[11px] font-mono text-slate-700">{lastUpdatedStr}</div>
              {lastUpdated && (
                <div className="text-[9px] text-slate-400 font-sans">{secondsAgo}s ago via WebSocket</div>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-primary-950 text-white text-[11px] font-bold uppercase tracking-wider hover:bg-primary-800 disabled:opacity-50 transition-colors font-sans border border-primary-800"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
      </FadeIn>

      {/* ── SYSTEM STATUS STRIP ────────────────────────────────────────────── */}
      <FadeIn delay={0.05}>
        <SystemStatusStrip />
      </FadeIn>

      {/* Error banner */}
      {binsError && (
        <FadeIn>
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-300">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-red-700 font-sans">
              <span className="font-bold uppercase tracking-wider">SmartBin data unavailable — </span>
              {binsError}
            </p>
          </div>
        </FadeIn>
      )}

      {/* ── PRIMARY METRICS ────────────────────────────────────────────────── */}
      <FadeIn delay={0.1}>
        <MetricsRow
          bins={liveBins}
          dashboard={dashboard}
          alerts={alerts}
          vehicles={vehicles}
          staff={staff}
          schedules={schedules}
        />
      </FadeIn>

      {/* ── SMARTBIN NETWORK ───────────────────────────────────────────────── */}
      <FadeIn delay={0.15}>
        <SmartBinNetwork bins={liveBins} loading={binsLoading} navigate={navigate} />
      </FadeIn>

      {/* ── ALERT INTELLIGENCE ─────────────────────────────────────────────── */}
      <FadeIn delay={0.18}>
        <AlertIntelligence alerts={alerts} loading={alertsLoading} navigate={navigate} />
      </FadeIn>

      {/* ── COLLECTION OPS + NOTIFICATIONS ─────────────────────────────────── */}
      <FadeIn delay={0.2}>
        <div className="grid lg:grid-cols-2 gap-5">
          <CollectionOpsPanel schedules={schedules} loading={loadingSchedules} navigate={navigate} />
          <NotificationsPanel notifications={notifications} loading={loadingNotifs} navigate={navigate} />
        </div>
      </FadeIn>

      {/* ── ROUTE OPERATIONS ───────────────────────────────────────────────── */}
      <FadeIn delay={0.22}>
        <RouteOperations routes={routes} loading={routesLoading} navigate={navigate} />
      </FadeIn>

      {/* ── FLEET + WORKFORCE ──────────────────────────────────────────────── */}
      <FadeIn delay={0.24}>
        <FleetWorkforce
          vehicles={vehicles}
          staff={staff}
          loadingVehicles={loadingVehicles}
          loadingStaff={loadingStaff}
          navigate={navigate}
        />
      </FadeIn>

      {/* ── ZONE OVERVIEW ──────────────────────────────────────────────────── */}
      {liveBins.length > 0 && (
        <FadeIn delay={0.26}>
          <ZoneOverview bins={liveBins} routes={routes} />
        </FadeIn>
      )}

      {/* ── FILL TREND ─────────────────────────────────────────────────────── */}
      <FadeIn delay={0.28}>
        <FillTrendChart trendData={trendData} loading={loadingTrend} />
      </FadeIn>

      {/* ── RECENT ACTIVITY ────────────────────────────────────────────────── */}
      <FadeIn delay={0.3}>
        <RecentActivity auditLogs={auditLogs} loading={loadingAudit} navigate={navigate} />
      </FadeIn>

      {/* ── QUICK ACTIONS ──────────────────────────────────────────────────── */}
      <FadeIn delay={0.32}>
        <QuickActions navigate={navigate} onSimulate={simulateReadings} simulating={simulating} />
      </FadeIn>

    </div>
  )
}
