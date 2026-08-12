import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, useInView, AnimatePresence } from 'framer-motion';
import {
  Building2, Trash2, Truck, Users, MapPin, Bell, Shield, BarChart3,
  Calendar, AlertTriangle, CheckCircle2, Wifi, Navigation2,
  ChevronRight, Menu, X, ArrowRight, Layers, Database,
  Settings, Zap, Activity, Radio, Lock, Eye, Cpu,
  Route, ClipboardList, Globe, UserCheck, Megaphone,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   Typography helpers
   font-display  = Playfair Display (serif, formal section headings)
   font-serif    = DM Serif Display  (italic cursive hero accent)
   font-mono     = JetBrains Mono    (data, IDs, code)
   font-sans     = Inter             (body, labels, UI)
───────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────
   Motion helpers
───────────────────────────────────────────────────────────── */
function FadeIn({ children, delay = 0, y = 16, className = '' }) {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduced ? {} : { opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

function StaggerParent({ children, className = '', staggerChildren = 0.08 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={{ visible: { transition: { staggerChildren } } }}
    >
      {children}
    </motion.div>
  );
}

function StaggerChild({ children, className = '' }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={reduced ? {} : {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
      }}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Animated progress bar
───────────────────────────────────────────────────────────── */
function ProgressBar({ value, color = 'bg-primary-600' }) {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="h-2.5 w-full bg-slate-200 rounded-none overflow-hidden">
      <motion.div
        className={`h-full ${color}`}
        initial={{ width: 0 }}
        animate={inView ? { width: `${value}%` } : {}}
        transition={reduced ? { duration: 0 } : { duration: 1, ease: 'easeOut', delay: 0.2 }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section eyebrow label — consistently styled
───────────────────────────────────────────────────────────── */
function Eyebrow({ light = false, children }) {
  return (
    <span className={`inline-block text-[11px] font-bold tracking-[0.18em] uppercase mb-3 font-sans
      ${light ? 'text-slate-200' : 'text-primary-700'}`}>
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section wrapper
───────────────────────────────────────────────────────────── */
function Section({ id, className = '', children }) {
  return (
    <section id={id} className={`scroll-mt-16 ${className}`}>
      {children}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   NAVBAR
───────────────────────────────────────────────────────────── */
function Navbar({ navigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  };

  const navLinks = [
    { label: 'Overview',       id: 'overview'        },
    { label: 'Infrastructure', id: 'infrastructure'  },
    { label: 'Operations',     id: 'operations'      },
    { label: 'Security',       id: 'security'        },
  ];

  return (
    <motion.header
      initial={reduced ? {} : { y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={`fixed top-0 inset-x-0 z-50 transition-colors duration-200 ${
        scrolled ? 'bg-primary-950 border-b border-primary-800 shadow-lg' : 'bg-primary-950/95 border-b border-primary-900'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-primary-700 border border-primary-500">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div className="leading-none">
              <span className="block text-[13px] font-extrabold text-white tracking-widest font-sans uppercase">SmartBin</span>
              <span className="block text-[9px] text-primary-300 font-medium tracking-widest uppercase font-sans">Municipal Waste Management ERP</span>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Primary navigation">
            {navLinks.map(({ label, id }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="px-3 py-1.5 text-[13px] font-medium text-primary-200 hover:text-white hover:bg-primary-800 transition-colors font-sans tracking-wide"
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => navigate('/login')}
              className="ml-4 px-5 py-1.5 text-[13px] font-bold text-white bg-primary-700 hover:bg-primary-600 border border-primary-500 transition-colors font-sans tracking-wider uppercase"
            >
              Login
            </button>
          </nav>

          {/* Mobile menu trigger */}
          <button
            className="md:hidden p-2 text-primary-200 hover:text-white hover:bg-primary-800"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-primary-950 border-t border-primary-800 overflow-hidden"
            aria-label="Mobile navigation"
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.map(({ label, id }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-primary-200 hover:text-white hover:bg-primary-800 font-sans"
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => navigate('/login')}
                className="w-full text-left mt-2 px-3 py-2 text-sm font-bold text-white bg-primary-700 border border-primary-500 font-sans uppercase tracking-wider"
              >
                Login to ERP
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

/* ─────────────────────────────────────────────────────────────
   HERO
───────────────────────────────────────────────────────────── */
function Hero({ navigate, scrollTo }) {
  const reduced = useReducedMotion();

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } },
  };
  const itemVariants = reduced ? {} : {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
  };

  return (
    <section
      id="overview"
      className="relative min-h-screen bg-primary-950 flex items-center pt-14 overflow-hidden"
      aria-labelledby="hero-headline"
    >
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage: 'linear-gradient(#8eb4cc 1px, transparent 1px), linear-gradient(90deg, #8eb4cc 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
        aria-hidden="true"
      />
      {/* Radial glow — very subtle */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 20% 50%, rgba(36,82,117,0.25) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left — Headline + CTAs */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants}>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] uppercase text-primary-200 border border-primary-600 bg-primary-900/60 mb-6 font-sans">
                <Radio className="w-3 h-3" />
                Municipal Infrastructure Platform
              </span>
            </motion.div>

            {/* Hero headline: DM Serif Display for the cursive/elegant touch */}
            <motion.h1
              id="hero-headline"
              variants={itemVariants}
              className="leading-tight mb-4"
            >
              <span className="block font-serif text-5xl sm:text-6xl text-white" style={{ fontStyle: 'normal' }}>
                Smart Municipal
              </span>
              <span className="block font-serif text-5xl sm:text-6xl italic text-white">
                Waste Management
              </span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-base text-slate-200 leading-relaxed mb-8 max-w-lg font-sans font-light">
              A unified digital platform for monitoring, planning and executing municipal
              waste collection operations — from IoT telemetry to route dispatch.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 px-7 py-3 text-sm font-bold text-white bg-primary-700 hover:bg-primary-600 border border-primary-500 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 font-sans uppercase tracking-wider"
              >
                Access ERP <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollTo('infrastructure')}
                className="inline-flex items-center gap-2 px-7 py-3 text-sm font-semibold text-white bg-transparent hover:bg-primary-800 border border-slate-400 hover:border-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 font-sans"
              >
                Explore Platform
              </button>
            </motion.div>

            {/* Stats row */}
            <motion.div variants={itemVariants} className="mt-10 pt-8 border-t border-primary-800 grid grid-cols-3 gap-6">
              {[
                { value: '12', label: 'Modules',    sub: 'Integrated'  },
                { value: '18', label: 'Admin Zones', sub: 'Supported'  },
                { value: '5',  label: 'User Roles',  sub: 'RBAC'       },
              ].map(({ value, label, sub }) => (
                <div key={label}>
                  <div className="font-display text-3xl font-bold text-white">{value}</div>
                  <div className="text-xs font-bold text-slate-200 uppercase tracking-widest font-sans mt-1">{label}</div>
                  <div className="text-[11px] text-slate-400 tracking-wider font-sans">{sub}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right — Operational dashboard panel */}
          <motion.div
            initial={reduced ? {} : { opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
          >
            <HeroDashboard />
          </motion.div>

        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   HERO — Operational Dashboard Panel
───────────────────────────────────────────────────────────── */
function HeroDashboard() {
  const reduced = useReducedMotion();

  const rows = [
    { icon: Trash2,   label: 'Smart Bins',       value: '1,284', unit: 'Active devices',   color: 'text-primary-200' },
    { icon: Route,    label: 'Collection Routes', value: '96',    unit: 'Scheduled today',  color: 'text-green-300' },
    { icon: Truck,    label: 'Fleet Vehicles',    value: '42',    unit: 'Tracked units',    color: 'text-amber-300' },
    { icon: MapPin,   label: 'Operational Zones', value: '18',    unit: 'Geographic areas', color: 'text-primary-200' },
  ];

  const statuses = [
    { label: 'IoT Network',    status: 'ONLINE',  dot: 'bg-green-500' },
    { label: 'Collection Ops', status: 'ACTIVE',  dot: 'bg-green-500' },
    { label: 'Routing Engine', status: 'READY',   dot: 'bg-green-500' },
    { label: 'Alert Monitor',  status: 'RUNNING', dot: 'bg-amber-400' },
  ];

  return (
    <div className="border border-primary-600 bg-primary-900/50">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-primary-700 bg-primary-800/60">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[11px] font-bold text-primary-100 uppercase tracking-[0.18em] font-sans">Platform Capabilities</span>
        </div>
        <span className="text-[10px] text-slate-300 uppercase tracking-widest font-sans font-medium border border-primary-500 px-2 py-0.5">Illustrative</span>
      </div>

      {/* Metric rows */}
      <div className="px-4 py-4 space-y-4 border-b border-primary-800">
        {rows.map(({ icon: Icon, label, value, unit, color }, i) => (
          <motion.div
            key={label}
            initial={reduced ? {} : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-sm font-medium text-slate-100 font-sans">{label}</span>
            </div>
            <div className="text-right">
              <span className="text-base font-bold text-white font-mono">{value}</span>
              <span className="text-[10px] text-slate-300 ml-2 font-sans">{unit}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Route visualization */}
      <div className="px-4 py-3 border-b border-primary-800">
        <div className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.18em] mb-3 font-sans">
          Collection Route — Illustrative
        </div>
        <div className="flex items-center gap-1 overflow-hidden">
          {['DEPOT', 'Z1-01', 'Z1-02', 'Z1-03', 'DEPOT'].map((label, i, arr) => (
            <div key={i} className="flex items-center flex-shrink-0">
              <div className="flex flex-col items-center">
                <div className={`w-2.5 h-2.5 rounded-full border-2 ${
                  label === 'DEPOT' ? 'bg-primary-500 border-primary-300' : 'bg-green-500 border-green-300'
                }`} />
                <span className="text-[9px] text-slate-200 mt-1 whitespace-nowrap font-mono">{label}</span>
              </div>
              {i < arr.length - 1 && (
                <motion.div
                  className="h-px bg-primary-500 flex-1 mx-1"
                  style={{ minWidth: 22 }}
                  initial={reduced ? {} : { scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.8 + i * 0.15, duration: 0.4 }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* System statuses */}
      <div className="px-4 py-3">
        <div className="text-[10px] font-bold text-slate-200 uppercase tracking-[0.18em] mb-3 font-sans">System Status</div>
        <div className="grid grid-cols-2 gap-y-2 gap-x-4">
          {statuses.map(({ label, status, dot }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[11px] text-slate-200 font-sans">{label}</span>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                <span className="text-[10px] font-bold text-white tracking-wider font-mono">{status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   OPERATIONAL SNAPSHOT STRIP
───────────────────────────────────────────────────────────── */
function OperationalSnapshot() {
  const items = [
    { icon: Wifi,        title: 'SmartBin Network',   desc: 'Continuous IoT telemetry and fill-level monitoring across all deployed containers.',  status: 'ONLINE',   dot: 'bg-green-400' },
    { icon: Calendar,    title: 'Collection Planning', desc: 'Automated and manual scheduling of collection runs aligned to zone workloads.',       status: 'ACTIVE',   dot: 'bg-green-400' },
    { icon: Navigation2, title: 'Route Engine',        desc: 'OR-Tools based optimization for efficient multi-stop collection dispatch.',           status: 'READY',    dot: 'bg-green-400' },
    { icon: Truck,       title: 'Fleet Visibility',    desc: 'Real-time vehicle status, assignment and capacity tracking per zone.',                status: 'TRACKING', dot: 'bg-amber-300' },
    { icon: Users,       title: 'Workforce Coord.',    desc: 'Driver and field worker management, geographic assignment and operational status.',   status: 'MANAGED',  dot: 'bg-green-400' },
  ];

  return (
    <Section id="snapshot" className="bg-primary-900 border-y border-primary-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <StaggerParent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-primary-700">
          {items.map(({ icon: Icon, title, desc, status, dot }) => (
            <StaggerChild key={title}>
              <div className="px-5 py-5 group hover:bg-primary-800/60 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <Icon className="w-5 h-5 text-primary-200 group-hover:text-white transition-colors" />
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                    <span className="text-[9px] font-bold text-primary-200 tracking-[0.2em] uppercase font-sans">{status}</span>
                  </div>
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5 font-sans">{title}</h3>
                <p className="text-[12px] text-slate-300 leading-relaxed font-sans">{desc}</p>
              </div>
            </StaggerChild>
          ))}
        </StaggerParent>
      </div>
    </Section>
  );
}

/* ─────────────────────────────────────────────────────────────
   SMARTBIN INFRASTRUCTURE
───────────────────────────────────────────────────────────── */
function InfrastructureSection() {
  const bins = [
    { id: 'SB-0041', zone: 'Zone 04', ward: 'Ward 18', fill: 82, status: 'HIGH',     lastRead: '14:32:08', tag: 'Illustrative' },
    { id: 'SB-0107', zone: 'Zone 02', ward: 'Ward 07', fill: 56, status: 'MEDIUM',   lastRead: '14:29:41', tag: 'Illustrative' },
    { id: 'SB-0213', zone: 'Zone 07', ward: 'Ward 23', fill: 95, status: 'CRITICAL', lastRead: '14:31:52', tag: 'Illustrative' },
    { id: 'SB-0308', zone: 'Zone 01', ward: 'Ward 03', fill: 20, status: 'LOW',      lastRead: '14:28:15', tag: 'Illustrative' },
    { id: 'SB-0412', zone: 'Zone 09', ward: 'Ward 31', fill: 68, status: 'MEDIUM',   lastRead: '14:30:07', tag: 'Illustrative' },
    { id: 'SB-0055', zone: 'Zone 03', ward: 'Ward 12', fill: 88, status: 'HIGH',     lastRead: '14:32:00', tag: 'Illustrative' },
  ];

  const statusStyle = {
    CRITICAL: 'text-red-700 border-red-400 bg-red-50',
    HIGH:     'text-amber-700 border-amber-400 bg-amber-50',
    MEDIUM:   'text-primary-700 border-primary-400 bg-primary-50',
    LOW:      'text-green-700 border-green-400 bg-green-50',
  };
  const fillColor = {
    CRITICAL: 'bg-red-500',
    HIGH:     'bg-amber-500',
    MEDIUM:   'bg-primary-500',
    LOW:      'bg-green-500',
  };

  return (
    <Section id="infrastructure" className="bg-slate-100 border-b border-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <FadeIn>
          <div className="mb-10">
            <Eyebrow>IoT Telemetry</Eyebrow>
            <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight mt-1">
              Connected Municipal Infrastructure
            </h2>
            <p className="text-sm text-slate-700 mt-3 max-w-2xl font-sans leading-relaxed">
              SmartBin telemetry provides a continuous operational view of waste container status
              and collection requirements across all municipal zones.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 border border-amber-400 text-amber-800 text-[11px] font-bold tracking-wider uppercase font-sans">
              <AlertTriangle className="w-3 h-3" /> Sample data — Illustrative platform capabilities
            </div>
          </div>
        </FadeIn>

        <StaggerParent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" staggerChildren={0.07}>
          {bins.map(({ id, zone, ward, fill, status, lastRead, tag }) => (
            <StaggerChild key={id}>
              <div className="bg-white border border-slate-300 hover:border-primary-500 transition-all group shadow-sm">
                {/* Card header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-primary-700" />
                    <span className="text-sm font-bold text-slate-900 font-mono">{id}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 border tracking-widest uppercase font-sans ${statusStyle[status]}`}>
                    {status}
                  </span>
                </div>

                {/* Fill level */}
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider font-sans">Fill Level</span>
                    <span className="text-base font-bold text-slate-900 font-mono">{fill}%</span>
                  </div>
                  <ProgressBar value={fill} color={fillColor[status]} />
                </div>

                {/* Metadata */}
                <div className="px-4 pb-4 pt-2 grid grid-cols-2 gap-y-3 gap-x-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Zone</span>
                    <div className="font-semibold text-slate-900 mt-0.5 text-sm font-sans">{zone}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Ward</span>
                    <div className="font-semibold text-slate-900 mt-0.5 text-sm font-sans">{ward}</div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Last Reading</span>
                    <div className="font-bold text-slate-900 mt-0.5 text-sm font-mono">{lastRead}</div>
                  </div>
                </div>

                <div className="px-4 py-2 border-t border-slate-200 bg-slate-50">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-sans">{tag}</span>
                </div>
              </div>
            </StaggerChild>
          ))}
        </StaggerParent>
      </div>
    </Section>
  );
}

/* ─────────────────────────────────────────────────────────────
   COLLECTION INTELLIGENCE FLOW
───────────────────────────────────────────────────────────── */
function CollectionIntelligence() {
  const steps = [
    { num: '01', icon: Trash2,        title: 'SmartBin Telemetry',   desc: 'IoT sensors transmit real-time fill level readings from deployed bins across all municipal zones.' },
    { num: '02', icon: Activity,      title: 'Fill Level Analysis',   desc: 'The system continuously processes incoming readings and tracks each container\'s fill progression.' },
    { num: '03', icon: Bell,          title: 'Alert Generation',      desc: 'High and critical fill thresholds trigger structured alerts with priority classification and zone tagging.' },
    { num: '04', icon: ClipboardList, title: 'Collection Planning',   desc: 'Supervisors review alert queues and build collection plans assigning bins, vehicles and workforce.' },
    { num: '05', icon: Navigation2,   title: 'Route Optimization',    desc: 'OR-Tools generates optimized multi-stop routes, minimising distance using Haversine geometry.' },
    { num: '06', icon: Zap,           title: 'Dispatch',              desc: 'Routes are dispatched to field drivers. Driver mobile interface provides turn-by-turn stop navigation.' },
    { num: '07', icon: CheckCircle2,  title: 'Collection & Confirm',  desc: 'Drivers confirm each stop. Completion status propagates back through the ERP to close the schedule.' },
  ];

  return (
    <Section id="operations" className="bg-white border-b border-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <FadeIn>
          <div className="mb-12">
            <Eyebrow>End-to-End Workflow</Eyebrow>
            <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight mt-1">
              Collection Intelligence
            </h2>
            <p className="text-sm text-slate-700 mt-3 max-w-2xl font-sans leading-relaxed">
              SmartBin is not merely a sensor dashboard. It is an end-to-end municipal operational system
              connecting IoT infrastructure to field collection execution.
            </p>
          </div>
        </FadeIn>

        <StaggerParent className="relative" staggerChildren={0.1}>
          <div className="absolute left-[28px] top-4 bottom-4 w-px bg-slate-200 hidden sm:block" aria-hidden="true" />
          <div className="space-y-2">
            {steps.map(({ num, icon: Icon, title, desc }) => (
              <StaggerChild key={num}>
                <div className="flex items-start gap-5 group hover:bg-slate-50 transition-colors p-4 -mx-4 border-l-2 border-transparent hover:border-primary-500">
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 border-2 border-primary-700 bg-primary-900 flex items-center justify-center group-hover:border-primary-400 group-hover:bg-primary-800 transition-colors">
                      <Icon className="w-5 h-5 text-primary-200 group-hover:text-white transition-colors" />
                    </div>
                    <span className="absolute -top-2 -right-2 text-[10px] font-bold text-white bg-primary-600 px-1.5 py-0.5 font-mono">{num}</span>
                  </div>
                  <div className="pt-2 flex-1">
                    <h3 className="text-base font-bold text-slate-900 mb-1 font-display">{title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed font-sans">{desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors flex-shrink-0 mt-3" />
                </div>
              </StaggerChild>
            ))}
          </div>
        </StaggerParent>
      </div>
    </Section>
  );
}

/* ─────────────────────────────────────────────────────────────
   ROUTE OPTIMIZATION
───────────────────────────────────────────────────────────── */
function RouteOptimizationSection() {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const stops = [
    { label: 'DEPOT',  x: 60,  y: 30,  depot: true  },
    { label: 'BIN 01', x: 160, y: 80,  depot: false },
    { label: 'BIN 02', x: 260, y: 50,  depot: false },
    { label: 'BIN 03', x: 320, y: 140, depot: false },
    { label: 'BIN 04', x: 200, y: 180, depot: false },
    { label: 'BIN 05', x: 100, y: 150, depot: false },
    { label: 'BIN 06', x: 80,  y: 220, depot: false },
    { label: 'DEPOT',  x: 60,  y: 30,  depot: true  },
  ];

  const pathD = stops.map((s, i) => `${i === 0 ? 'M' : 'L'} ${s.x} ${s.y}`).join(' ');

  const metrics = [
    { label: 'Collection Stops', value: '08'       },
    { label: 'Route Distance',   value: '12.4 km'  },
    { label: 'Optimization',     value: 'OR-Tools' },
    { label: 'Distance Model',   value: 'Haversine'},
  ];

  return (
    <Section className="bg-slate-100 border-b border-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <FadeIn>
            <Eyebrow>Dispatch Intelligence</Eyebrow>
            <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight mt-1 mb-4">
              Optimized Collection Routes
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-8 font-sans">
              The routing engine applies Google OR-Tools to construct efficient multi-stop collection routes.
              Distance calculations use the Haversine formula for straight-line geographic distance.
              Road distance and travel time are determined by actual navigation.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {metrics.map(({ label, value }) => (
                <div key={label} className="bg-white border border-slate-300 px-4 py-3 shadow-sm">
                  <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1 font-sans">{label}</div>
                  <div className="text-lg font-bold text-primary-700 font-mono">{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-[12px] text-slate-600 border-l-4 border-amber-500 pl-3 font-sans font-medium">
              Illustrative route — not operational data
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div ref={ref} className="bg-white border border-slate-300 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-sans">Route Visualization</span>
                <span className="text-[9px] text-slate-500 border border-slate-300 px-2 py-0.5 uppercase tracking-wider font-sans font-bold">Illustrative</span>
              </div>
              <svg viewBox="0 0 380 260" className="w-full" aria-label="Illustrative collection route diagram">
                {[60, 120, 180, 240].map(y => (
                  <line key={y} x1="20" y1={y} x2="360" y2={y} stroke="#e2e8f0" strokeWidth="0.5" />
                ))}
                {[60, 120, 180, 240, 300, 360].map(x => (
                  <line key={x} x1={x} y1="20" x2={x} y2="250" stroke="#e2e8f0" strokeWidth="0.5" />
                ))}
                <motion.path
                  d={pathD}
                  fill="none"
                  stroke="#245275"
                  strokeWidth="2"
                  strokeDasharray="5 3"
                  initial={reduced ? {} : { pathLength: 0 }}
                  animate={inView ? { pathLength: 1 } : {}}
                  transition={{ duration: 1.5, ease: 'easeInOut', delay: 0.3 }}
                />
                {stops.slice(0, -1).map(({ label, x, y, depot }, i) => (
                  <motion.g
                    key={`${label}-${i}`}
                    initial={reduced ? {} : { opacity: 0, scale: 0 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: 0.5 + i * 0.15, duration: 0.3 }}
                  >
                    <circle cx={x} cy={y} r={depot ? 8 : 6}
                      fill={depot ? '#245275' : '#22c55e'}
                      stroke={depot ? '#3e81ad' : '#16a34a'}
                      strokeWidth="2"
                    />
                    <text x={x} y={y + 20} textAnchor="middle" fontSize="8.5"
                      fill="#475569" fontFamily="'JetBrains Mono', monospace" fontWeight="600">
                      {label}
                    </text>
                  </motion.g>
                ))}
              </svg>
              <div className="flex items-center gap-6 mt-2 pt-3 border-t border-slate-200 text-[11px] text-slate-600 font-sans">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-primary-700" />
                  <span className="font-medium">Depot</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="font-medium">Collection Stop</span>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </Section>
  );
}

/* ─────────────────────────────────────────────────────────────
   FLEET + WORKFORCE
───────────────────────────────────────────────────────────── */
function FleetWorkforceSection() {
  const vehicles = [
    { id: 'VEH-0042', type: 'Compactor',   status: 'AVAILABLE', driver: 'R. Kumar', zone: 'Zone 04' },
    { id: 'VEH-0017', type: 'Tipper',      status: 'DEPLOYED',  driver: 'A. Singh', zone: 'Zone 02' },
    { id: 'VEH-0031', type: 'Compactor',   status: 'DEPLOYED',  driver: 'M. Patel', zone: 'Zone 07' },
    { id: 'VEH-0058', type: 'Mini Loader', status: 'AVAILABLE', driver: 'S. Rao',   zone: 'Zone 01' },
  ];

  const staff = [
    { id: 'DRV-011', name: 'R. Kumar',  role: 'Driver',       zone: 'Zone 04', status: 'ON DUTY'  },
    { id: 'DRV-022', name: 'A. Singh',  role: 'Driver',       zone: 'Zone 02', status: 'ON DUTY'  },
    { id: 'WRK-043', name: 'P. Sharma', role: 'Field Worker', zone: 'Zone 03', status: 'STANDBY'  },
    { id: 'SUP-004', name: 'D. Mehta',  role: 'Supervisor',   zone: 'Zone 04', status: 'ACTIVE'   },
  ];

  const vStatus = {
    AVAILABLE: 'text-green-700 bg-green-50 border-green-400',
    DEPLOYED:  'text-amber-700 bg-amber-50 border-amber-400',
  };
  const sStatus = {
    'ON DUTY': 'text-green-700 bg-green-50 border-green-400',
    'STANDBY': 'text-slate-600 bg-slate-100 border-slate-400',
    'ACTIVE':  'text-primary-700 bg-primary-50 border-primary-400',
  };

  return (
    <Section className="bg-white border-b border-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <FadeIn>
          <div className="mb-10">
            <Eyebrow>Resource Management</Eyebrow>
            <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight mt-1">Fleet &amp; Workforce</h2>
            <p className="text-sm text-slate-700 mt-3 font-sans leading-relaxed">
              Unified management of vehicles, assignments and field personnel across all operational zones.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-400 text-slate-700 text-[11px] font-bold tracking-wider uppercase font-sans">
              Illustrative data — not operational records
            </div>
          </div>
        </FadeIn>

        <div className="grid lg:grid-cols-2 gap-8">
          <FadeIn>
            <div className="border border-slate-300 shadow-sm">
              <div className="flex items-center gap-3 px-4 py-3 bg-primary-950 border-b border-primary-800">
                <Truck className="w-4 h-4 text-primary-200" />
                <span className="text-sm font-bold text-white font-sans">Fleet Management</span>
                <span className="ml-auto text-[10px] text-primary-300 uppercase tracking-widest font-sans font-bold">Vehicles</span>
              </div>
              <div className="divide-y divide-slate-200">
                {vehicles.map(({ id, type, status, driver, zone }) => (
                  <div key={id} className="flex items-center px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 font-mono">{id}</span>
                        <span className="text-xs text-slate-500 font-sans">{type}</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5 font-sans font-medium">{driver} · {zone}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 border uppercase tracking-wide font-sans ${vStatus[status]}`}>
                      {status}
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-600 flex items-center justify-between font-sans font-semibold">
                <span>4 of 42 shown</span>
                <span className="uppercase tracking-widest">Fleet Registry</span>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="border border-slate-300 shadow-sm">
              <div className="flex items-center gap-3 px-4 py-3 bg-primary-950 border-b border-primary-800">
                <Users className="w-4 h-4 text-primary-200" />
                <span className="text-sm font-bold text-white font-sans">Workforce Management</span>
                <span className="ml-auto text-[10px] text-primary-300 uppercase tracking-widest font-sans font-bold">Staff</span>
              </div>
              <div className="divide-y divide-slate-200">
                {staff.map(({ id, name, role, zone, status }) => (
                  <div key={id} className="flex items-center px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-primary-700 border border-primary-500 flex items-center justify-center text-[11px] font-bold text-white font-sans">
                          {name[0]}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 font-sans">{name}</div>
                          <div className="text-[11px] text-slate-600 font-sans font-medium">{role} · {zone}</div>
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 border uppercase tracking-wide font-sans ${sStatus[status]}`}>
                      {status}
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-600 flex items-center justify-between font-sans font-semibold">
                <span>4 of many shown</span>
                <span className="uppercase tracking-widest">Staff Registry</span>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </Section>
  );
}

/* ─────────────────────────────────────────────────────────────
   GOVERNMENT ERP STRUCTURE
───────────────────────────────────────────────────────────── */
function GovERPSection() {
  return (
    <Section className="bg-primary-950 border-b border-primary-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          <FadeIn>
            <Eyebrow light>Administrative Architecture</Eyebrow>
            <h2 className="font-display text-3xl font-bold text-white tracking-tight mt-1 mb-4">
              Municipal ERP Structure
            </h2>
            <p className="text-sm text-slate-200 leading-relaxed mb-6 font-sans">
              Every operational record in SmartBin is aligned with municipal administrative boundaries.
              Data is scoped by municipality, zone and ward, with role-based access controls
              ensuring personnel operate only within their authorized geographic assignments.
            </p>
            <div className="space-y-4">
              {[
                { icon: Globe,     label: 'Municipality',  desc: 'Top-level administrative boundary' },
                { icon: Layers,    label: 'Zones',         desc: 'Operational collection areas within the municipality' },
                { icon: MapPin,    label: 'Wards',         desc: 'Sub-zone civic divisions aligned to local governance' },
                { icon: Trash2,    label: 'Bins & Routes', desc: 'Physical assets assigned to zone and ward context' },
                { icon: UserCheck, label: 'RBAC',          desc: 'Role-based access: system admin → zone supervisor → driver' },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary-800 border border-primary-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-primary-200" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white font-sans">{label}</span>
                    <span className="text-[12px] text-slate-300 ml-2 font-sans">{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="bg-primary-900/50 border border-primary-700 p-6">
              <div className="text-[10px] font-bold text-slate-200 uppercase tracking-[0.2em] mb-5 font-sans">Administrative Hierarchy</div>
              <div className="space-y-1 font-mono text-[12px] leading-6">
                <div className="text-white font-bold text-[14px]">MUNICIPALITY</div>
                <div className="ml-4 text-primary-400">│</div>
                <div className="ml-4 text-primary-300">┌────┬────┬────┐</div>
                <div className="ml-4 flex gap-6">
                  <span className="text-green-400 font-bold">ZONE 01</span>
                  <span className="text-green-400 font-bold">ZONE 02</span>
                  <span className="text-green-400 font-bold">ZONE 03</span>
                </div>
                <div className="ml-4 text-primary-400">│</div>
                <div className="ml-4 flex gap-6">
                  <span className="text-amber-400">WARD</span>
                  <span className="text-amber-400">WARD</span>
                  <span className="text-amber-400">WARD</span>
                </div>
                <div className="ml-4 text-primary-400">│</div>
                <div className="ml-4 text-slate-200">BINS  ─  ROUTES  ─  SCHEDULES</div>
                <div className="ml-4 text-primary-400">│</div>
                <div className="ml-4 text-slate-200">ALERTS  ─  DISPATCH  ─  AUDIT</div>
              </div>
              <div className="mt-6 pt-4 border-t border-primary-700">
                <div className="text-[10px] font-bold text-slate-200 uppercase tracking-[0.2em] mb-3 font-sans">Role Hierarchy</div>
                {[
                  { role: 'System Admin',     scope: 'Full system access'     },
                  { role: 'Municipal Admin',  scope: 'Municipality scoped'    },
                  { role: 'Municipal Officer',scope: 'Operational management' },
                  { role: 'Zone Supervisor',  scope: 'Zone scoped operations' },
                  { role: 'Driver',           scope: 'Assigned routes only'   },
                ].map(({ role, scope }) => (
                  <div key={role} className="flex justify-between text-[11px] py-1 border-b border-primary-800/60 last:border-0">
                    <span className="text-primary-100 font-sans font-medium">{role}</span>
                    <span className="text-slate-300 font-sans">{scope}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

        </div>
      </div>
    </Section>
  );
}

/* ─────────────────────────────────────────────────────────────
   CAPABILITIES GRID
───────────────────────────────────────────────────────────── */
function CapabilitiesGrid() {
  const caps = [
    { num: '01', icon: Trash2,       title: 'SmartBin Monitoring',   desc: 'Real-time fill level tracking and bin health monitoring across all deployed IoT sensors.' },
    { num: '02', icon: Bell,         title: 'Alert Management',      desc: 'Structured alert queue with priority classification, zone tagging and resolution tracking.' },
    { num: '03', icon: Database,     title: 'Municipal Master Data', desc: 'Municipalities, zones and wards as structured administrative reference data.' },
    { num: '04', icon: Truck,        title: 'Fleet Management',      desc: 'Vehicle registry with type, capacity, status and zone assignment management.' },
    { num: '05', icon: Users,        title: 'Workforce Management',  desc: 'Driver and field worker registry with geographic assignments and employment status.' },
    { num: '06', icon: Calendar,     title: 'Collection Scheduling', desc: 'Structured schedule creation linking zones, vehicles, workforce and collection plans.' },
    { num: '07', icon: Navigation2,  title: 'Route Optimization',   desc: 'OR-Tools route generation for efficient multi-stop collection dispatch.' },
    { num: '08', icon: Zap,          title: 'Dispatch Management',  desc: 'Structured dispatch of optimized routes to field drivers with real-time status.' },
    { num: '09', icon: MapPin,       title: 'Field Operations',     desc: 'Driver mobile interface for stop-by-stop navigation and collection confirmation.' },
    { num: '10', icon: Shield,       title: 'Audit Logging',        desc: 'Traceable record of operational actions for accountability and governance review.' },
    { num: '11', icon: BarChart3,    title: 'Reporting',            desc: 'Operational reporting across collection performance, fleet and workforce utilisation.' },
    { num: '12', icon: Megaphone,    title: 'Notifications',        desc: 'Internal notification system for operational events, alerts and system messages.' },
  ];

  return (
    <Section className="bg-slate-100 border-b border-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <FadeIn>
          <div className="mb-10">
            <Eyebrow>Platform Modules</Eyebrow>
            <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight mt-1">System Capabilities</h2>
            <p className="text-sm text-slate-700 mt-3 font-sans leading-relaxed">
              Twelve integrated operational modules covering the full municipal waste management lifecycle.
            </p>
          </div>
        </FadeIn>

        <StaggerParent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" staggerChildren={0.05}>
          {caps.map(({ num, icon: Icon, title, desc }) => (
            <StaggerChild key={num}>
              <div className="group bg-white border border-slate-300 hover:border-primary-600 p-4 transition-all hover:-translate-y-0.5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 bg-primary-50 border border-primary-300 flex items-center justify-center group-hover:bg-primary-700 group-hover:border-primary-600 transition-colors">
                    <Icon className="w-4 h-4 text-primary-700 group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-[12px] font-bold text-slate-400 font-mono">{num}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1.5 leading-snug font-display">{title}</h3>
                <p className="text-[12px] text-slate-600 leading-relaxed font-sans">{desc}</p>
              </div>
            </StaggerChild>
          ))}
        </StaggerParent>
      </div>
    </Section>
  );
}

/* ─────────────────────────────────────────────────────────────
   SECURITY SECTION
───────────────────────────────────────────────────────────── */
function SecuritySection() {
  const features = [
    { icon: Lock,     title: 'Role-Based Access Control', desc: 'Only authorized personnel access operational data. Each user role is scoped to appropriate system functions and geographic boundaries.' },
    { icon: Globe,    title: 'Geographic Scoping',        desc: 'Users operate within their assigned municipalities, zones and wards. Cross-boundary data access is restricted by default.' },
    { icon: Cpu,      title: 'Device Authentication',     desc: 'SmartBin IoT telemetry uses authenticated device access. Unauthenticated sensor data is rejected at the API layer.' },
    { icon: Eye,      title: 'Auditability',              desc: 'Significant operational actions are recorded with actor, timestamp and context, supporting accountability and governance review.' },
    { icon: Settings, title: 'Secure Configuration',      desc: 'Sensitive credentials, API keys and system secrets remain outside frontend and public configuration at all times.' },
  ];

  return (
    <Section id="security" className="bg-white border-b border-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <FadeIn>
          <div className="mb-10">
            <Eyebrow>Access &amp; Governance</Eyebrow>
            <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight mt-1">
              Built for Controlled Municipal Operations
            </h2>
            <p className="text-sm text-slate-700 mt-3 max-w-2xl font-sans leading-relaxed">
              SmartBin is designed for deployment within municipal operational environments
              where access control, auditability and data integrity are non-negotiable requirements.
            </p>
          </div>
        </FadeIn>

        <StaggerParent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" staggerChildren={0.08}>
          {features.map(({ icon: Icon, title, desc }) => (
            <StaggerChild key={title}>
              <div className="group border border-slate-300 hover:border-primary-500 p-5 transition-all bg-slate-50 hover:bg-white shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-primary-900 border border-primary-700 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary-200" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug font-display">{title}</h3>
                </div>
                <p className="text-[12px] text-slate-700 leading-relaxed font-sans">{desc}</p>
              </div>
            </StaggerChild>
          ))}

          {/* Compliance card */}
          <StaggerChild>
            <div className="border border-slate-300 p-5 bg-primary-950 shadow-sm">
              <div className="text-[10px] font-bold text-primary-300 uppercase tracking-[0.2em] mb-4 font-sans">Access Model</div>
              <div className="space-y-2.5">
                {[
                  'JWT-based authentication',
                  'Refresh token rotation',
                  'Backend permission enforcement',
                  'No sensitive data in frontend',
                  'Audit trail on key actions',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-[12px] text-primary-100 font-sans">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </StaggerChild>
        </StaggerParent>
      </div>
    </Section>
  );
}

/* ─────────────────────────────────────────────────────────────
   FINAL CTA
───────────────────────────────────────────────────────────── */
function FinalCTA({ navigate }) {
  return (
    <Section className="bg-primary-950 border-b border-primary-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <FadeIn>
          <div className="w-16 h-16 bg-primary-800 border border-primary-600 flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-8 h-8 text-primary-200" />
          </div>
          <h2 className="font-serif text-4xl font-bold text-white tracking-tight mb-2">
            Ready to Access the
          </h2>
          <h2 className="font-serif text-4xl font-bold text-primary-300 italic mb-6">
            Municipal ERP?
          </h2>
          <p className="text-base text-primary-200 mb-8 max-w-lg mx-auto leading-relaxed font-sans">
            Authorized municipal personnel can access the operational management system securely.
            Contact your system administrator if you require access credentials.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 px-8 py-3 text-sm font-bold text-white bg-primary-700 hover:bg-primary-600 border border-primary-500 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-primary-950 font-sans uppercase tracking-wider"
          >
            Access ERP <ArrowRight className="w-4 h-4" />
          </button>
          <p className="mt-4 text-[11px] text-primary-500 uppercase tracking-widest font-sans">
            Authorized personnel only
          </p>
        </FadeIn>
      </div>
    </Section>
  );
}

/* ─────────────────────────────────────────────────────────────
   FOOTER
───────────────────────────────────────────────────────────── */
function Footer({ scrollTo }) {
  const navGroups = [
    {
      title: 'Platform',
      links: [
        { label: 'Overview',       id: 'overview'       },
        { label: 'Infrastructure', id: 'infrastructure' },
        { label: 'Operations',     id: 'operations'     },
        { label: 'Security',       id: 'security'       },
      ],
    },
  ];

  return (
    <footer className="bg-primary-950 border-t border-primary-800" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-10 border-b border-primary-800">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary-700 border border-primary-500 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="block text-sm font-extrabold text-white tracking-widest font-sans uppercase">SmartBin</span>
                <span className="block text-[9px] text-primary-400 uppercase tracking-widest font-sans">Municipal Waste Management ERP</span>
              </div>
            </div>
            <p className="text-[13px] text-primary-300 leading-relaxed max-w-xs font-sans">
              Digital infrastructure for intelligent municipal waste collection operations.
            </p>
          </div>

          {/* Nav */}
          {navGroups.map(({ title, links }) => (
            <div key={title}>
              <h3 className="text-[10px] font-bold text-slate-200 uppercase tracking-[0.2em] mb-4 font-sans">{title}</h3>
              <ul className="space-y-2">
                {links.map(({ label, id }) => (
                  <li key={label}>
                    <button
                      onClick={() => scrollTo(id)}
                      className="text-[13px] text-slate-200 hover:text-white transition-colors font-sans font-medium"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Access */}
          <div>
            <h3 className="text-[10px] font-bold text-slate-200 uppercase tracking-[0.2em] mb-4 font-sans">Administrative Access</h3>
            <p className="text-[13px] text-slate-200 mb-4 leading-relaxed font-sans">
              System access is restricted to authorized municipal personnel only.
            </p>
            <div className="space-y-2 text-[12px] text-slate-300 font-sans">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-200" /> Secure JWT authentication
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-slate-200" /> Role-based access control
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-slate-200" /> Operational audit logging
              </div>
            </div>
          </div>

        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-slate-400 font-sans">
            © 2026 SmartBin Municipal ERP. All operational data is managed securely.
          </p>
          <p className="text-[11px] text-slate-500 uppercase tracking-widest font-sans">
            Authorized personnel only
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────────────────────
   ROOT COMPONENT
───────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const reduced  = useReducedMotion();

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <div className="min-h-screen bg-primary-950 overflow-x-hidden">
      <Navbar navigate={navigate} />
      <Hero   navigate={navigate} scrollTo={scrollTo} />
      <OperationalSnapshot />
      <InfrastructureSection />
      <CollectionIntelligence />
      <RouteOptimizationSection />
      <FleetWorkforceSection />
      <GovERPSection />
      <CapabilitiesGrid />
      <SecuritySection />
      <FinalCTA navigate={navigate} />
      <Footer   scrollTo={scrollTo} />
    </div>
  );
}
