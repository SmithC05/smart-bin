import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import {
  Building2, User, Eye, EyeOff, Lock, ShieldCheck,
  ChevronLeft, AlertTriangle, CheckCircle2, Loader2,
  Wifi, Navigation2, Truck, Users, Radio, MapPin,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   Role display names (for success transition message)
───────────────────────────────────────────────────────────── */
const ROLE_LABELS = {
  SYSTEM_ADMIN:       'System Administration',
  MUNICIPAL_ADMIN:    'Municipal Operations',
  MUNICIPAL_OFFICER:  'Operational Management',
  ZONE_SUPERVISOR:    'Zone Operations',
  DRIVER:             'Driver Operations',
  FIELD_WORKER:       'Field Operations',
  AUDITOR:            'Audit & Compliance',
};

/* ─────────────────────────────────────────────────────────────
   LEFT PANEL — Operational SVG Visualization
───────────────────────────────────────────────────────────── */
function RouteVisualization({ reduced }) {
  const nodes = [
    { id: 'depot', cx: 100, cy: 50,  label: 'DEPOT',  fill: '#3e81ad', stroke: '#95bed9', r: 10, isDepot: true },
    { id: 'b1',    cx: 44,  cy: 130, label: 'BIN 01', fill: '#22c55e', stroke: '#4ade80', r: 7,  isDepot: false },
    { id: 'b2',    cx: 160, cy: 120, label: 'BIN 02', fill: '#22c55e', stroke: '#4ade80', r: 7,  isDepot: false },
    { id: 'b3',    cx: 60,  cy: 215, label: 'BIN 03', fill: '#f59e0b', stroke: '#fcd34d', r: 7,  isDepot: false },
    { id: 'b4',    cx: 148, cy: 210, label: 'BIN 04', fill: '#22c55e', stroke: '#4ade80', r: 7,  isDepot: false },
    { id: 'b5',    cx: 100, cy: 280, label: 'BIN 05', fill: '#ef4444', stroke: '#f87171', r: 7,  isDepot: false },
  ];

  const edges = [
    { from: 'depot', to: 'b1' },
    { from: 'depot', to: 'b2' },
    { from: 'b1',    to: 'b3' },
    { from: 'b2',    to: 'b4' },
    { from: 'b3',    to: 'b5' },
    { from: 'b4',    to: 'b5' },
  ];

  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));

  const pathFor = ({ from, to }) => {
    const a = byId[from];
    const b = byId[to];
    const mx = (a.cx + b.cx) / 2;
    const my = (a.cy + b.cy) / 2;
    return `M ${a.cx} ${a.cy} Q ${mx + 8} ${my} ${b.cx} ${b.cy}`;
  };

  return (
    <svg
      viewBox="0 0 200 310"
      className="w-full max-w-[200px] mx-auto"
      aria-label="Illustrative municipal collection route diagram"
      role="img"
    >
      {/* Grid reference lines */}
      {[50, 100, 150, 200, 250, 300].map(y => (
        <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="rgba(148,190,217,0.07)" strokeWidth="1" />
      ))}
      {[50, 100, 150].map(x => (
        <line key={x} x1={x} y1="0" x2={x} y2="310" stroke="rgba(148,190,217,0.07)" strokeWidth="1" />
      ))}

      {/* Edges */}
      {edges.map(({ from, to }, i) => (
        <motion.path
          key={`${from}-${to}`}
          d={pathFor({ from, to })}
          fill="none"
          stroke="rgba(148,190,217,0.35)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          initial={reduced ? {} : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.5 + i * 0.18, ease: 'easeInOut' }}
        />
      ))}

      {/* Pulse rings on depot */}
      {!reduced && (
        <motion.circle
          cx={byId.depot.cx}
          cy={byId.depot.cy}
          r={18}
          fill="none"
          stroke="rgba(62,129,173,0.3)"
          strokeWidth="1.5"
          animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: `${byId.depot.cx}px`, originY: `${byId.depot.cy}px` }}
        />
      )}

      {/* Nodes */}
      {nodes.map((n, i) => (
        <motion.g
          key={n.id}
          initial={reduced ? {} : { opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 + i * 0.15, duration: 0.4, ease: 'backOut' }}
        >
          <circle
            cx={n.cx} cy={n.cy} r={n.r}
            fill={n.fill} stroke={n.stroke} strokeWidth="2"
          />
          <text
            x={n.cx} y={n.cy + n.r + 12}
            textAnchor="middle"
            fontSize={n.isDepot ? '8.5' : '7.5'}
            fill="rgba(148,190,217,0.85)"
            fontFamily="'JetBrains Mono', monospace"
            fontWeight="600"
          >
            {n.label}
          </text>
        </motion.g>
      ))}

      {/* Animated travelling dot */}
      {!reduced && (
        <motion.circle
          r={3.5}
          fill="#95bed9"
          initial={{ cx: nodes[0].cx, cy: nodes[0].cy }}
          animate={{
            cx: nodes.map(n => n.cx),
            cy: nodes.map(n => n.cy),
          }}
          transition={{
            duration: nodes.length * 1.2,
            repeat: Infinity,
            ease: 'linear',
            repeatDelay: 1,
          }}
        />
      )}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   LEFT PANEL
───────────────────────────────────────────────────────────── */
function LeftPanel({ reduced }) {
  const systemStatus = [
    { icon: Wifi,        label: 'IoT Network',        status: 'ONLINE',  dot: 'bg-green-400' },
    { icon: Navigation2, label: 'Collection Ops',      status: 'ACTIVE',  dot: 'bg-green-400' },
    { icon: Truck,       label: 'Routing Engine',      status: 'READY',   dot: 'bg-green-400' },
    { icon: Users,       label: 'Field Operations',    status: 'ACTIVE',  dot: 'bg-amber-300' },
  ];

  const panelVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } },
  };
  const itemVariants = reduced ? {} : {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  return (
    <motion.div
      className="hidden lg:flex flex-col justify-between bg-primary-950 border-r border-primary-800 px-10 py-10 min-h-screen relative overflow-hidden"
      variants={panelVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Background grid texture */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#8eb4cc 1px, transparent 1px), linear-gradient(90deg, #8eb4cc 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
        aria-hidden="true"
      />
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 30% 40%, rgba(36,82,117,0.2) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative">
        {/* Brand header */}
        <motion.div variants={itemVariants} className="flex items-center gap-3 mb-12">
          <div className="w-9 h-9 bg-primary-700 border border-primary-500 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="leading-none">
            <span className="block text-[13px] font-extrabold text-white tracking-[0.2em] uppercase font-sans">SmartBin</span>
            <span className="block text-[9px] text-slate-300 font-medium tracking-[0.18em] uppercase font-sans mt-0.5">Municipal Waste Management ERP</span>
          </div>
        </motion.div>

        {/* Main heading */}
        <motion.div variants={itemVariants} className="mb-8">
          <h1 className="font-serif text-4xl text-white leading-tight italic mb-4">
            Municipal<br />Operations
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed font-sans max-w-xs">
            A unified digital platform for monitoring, planning and executing
            municipal waste collection operations.
          </p>
        </motion.div>

        {/* Divider */}
        <motion.div variants={itemVariants} className="border-t border-primary-700 mb-8" />

        {/* Route visualization */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] mb-4 font-sans flex items-center gap-2">
            <Radio className="w-3 h-3" />
            Collection Route — Illustrative
          </div>
          <RouteVisualization reduced={reduced} />
        </motion.div>
      </div>

      {/* Platform status */}
      <motion.div variants={itemVariants} className="relative">
        <div className="border border-primary-700 bg-primary-900/40 p-4">
          <div className="text-[10px] font-bold text-slate-200 uppercase tracking-[0.2em] mb-4 font-sans flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Platform Status
          </div>
          <div className="space-y-3">
            {systemStatus.map(({ icon: Icon, label, status, dot }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-slate-300" />
                  <span className="text-[12px] text-slate-200 font-sans">{label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                  <span className="text-[10px] font-bold text-white tracking-wider font-mono">{status}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-primary-800 text-[9px] text-slate-500 uppercase tracking-widest font-sans">
            Platform capability indicators
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN LOGIN COMPONENT
───────────────────────────────────────────────────────────── */
export default function Login() {
  /* ── Existing auth logic — preserved exactly ── */
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const { login, user }         = useAuth();
  const navigate                = useNavigate();

  /* ── New UI states ── */
  const [showPassword,  setShowPassword]  = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [networkError,  setNetworkError]  = useState(false);
  const [successState,  setSuccessState]  = useState(false);
  const [errorType,     setErrorType]     = useState(''); // 'auth' | 'network'

  const reduced       = useReducedMotion();
  const usernameRef   = useRef(null);
  const passwordRef   = useRef(null);

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || successState) return;

    setError('');
    setErrorType('');
    setNetworkError(false);
    setLoading(true);

    try {
      const success = await login(username, password);
      if (success) {
        setSuccessState(true);
        // Brief success moment, then navigate
        setTimeout(() => navigate('/app'), reduced ? 0 : 1400);
      } else {
        setErrorType('auth');
        setError('The username or password is incorrect. Please verify your credentials and try again.');
      }
    } catch (err) {
      setErrorType('network');
      setNetworkError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setNetworkError(false);
    setErrorType('');
    usernameRef.current?.focus();
  };

  /* ── Animation variants ── */
  const pageVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };
  const itemVariants = reduced ? {} : {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  /* ── Role label for success message ── */
  const roleLabel = user?.role ? (ROLE_LABELS[user.role] || 'Operations') : 'Operations';

  return (
    <div className="min-h-screen flex bg-slate-100">

      {/* ── LEFT PANEL ── */}
      <div className="lg:w-[42%] xl:w-[38%] flex-shrink-0">
        <LeftPanel reduced={reduced} />
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col min-h-screen">

        {/* Mobile brand bar — visible only on small screens */}
        <div className="lg:hidden bg-primary-950 border-b border-primary-800 px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-700 border border-primary-500 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="block text-[12px] font-extrabold text-white tracking-widest uppercase font-sans">SmartBin</span>
            <span className="block text-[9px] text-slate-300 tracking-widest uppercase font-sans">Municipal Waste Management ERP</span>
          </div>
        </div>

        {/* Back link */}
        <div className="px-6 lg:px-12 pt-6">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-[12px] font-bold text-slate-600 hover:text-primary-700 transition-colors uppercase tracking-wider font-sans group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Platform
          </button>
        </div>

        {/* Main form area */}
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <motion.div
            className="w-full max-w-md"
            variants={pageVariants}
            initial="hidden"
            animate="visible"
          >

            {/* Success state */}
            <AnimatePresence>
              {successState && (
                <motion.div
                  initial={reduced ? {} : { opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center bg-white border border-green-300 p-10 shadow-sm"
                >
                  <div className="w-14 h-14 bg-green-50 border border-green-300 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="w-7 h-7 text-green-600" />
                  </div>
                  <h2 className="text-[11px] font-bold text-green-700 uppercase tracking-[0.2em] font-sans mb-2">
                    Authentication Successful
                  </h2>
                  <h3 className="font-display text-xl font-bold text-slate-900 mb-2">
                    Loading {roleLabel}
                  </h3>
                  <p className="text-sm text-slate-600 font-sans flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    Preparing your workspace…
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Normal form */}
            {!successState && (
              <>
                {/* Heading block */}
                <motion.div variants={itemVariants} className="mb-8">
                  <div className="text-[10px] font-bold text-primary-700 uppercase tracking-[0.22em] mb-3 font-sans flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Administrative Access
                  </div>
                  <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight mb-2">
                    Secure Access
                  </h2>
                  <p className="text-sm text-slate-600 font-sans leading-relaxed">
                    Sign in using your authorized municipal credentials.
                  </p>
                </motion.div>

                {/* Divider */}
                <motion.div variants={itemVariants} className="border-t border-slate-300 mb-8" />

                {/* Error banners */}
                <AnimatePresence mode="wait">
                  {errorType === 'auth' && (
                    <motion.div
                      key="auth-error"
                      initial={reduced ? {} : { opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mb-6 border border-red-400 bg-red-50 p-4"
                      role="alert"
                      aria-live="assertive"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[11px] font-bold text-red-700 uppercase tracking-[0.16em] font-sans mb-1">
                            Authentication Failed
                          </p>
                          <p className="text-[12px] text-red-700 font-sans leading-relaxed">{error}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {errorType === 'network' && (
                    <motion.div
                      key="net-error"
                      initial={reduced ? {} : { opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mb-6 border border-amber-400 bg-amber-50 p-4"
                      role="alert"
                      aria-live="assertive"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-[11px] font-bold text-amber-800 uppercase tracking-[0.16em] font-sans mb-1">
                            Service Unavailable
                          </p>
                          <p className="text-[12px] text-amber-800 font-sans leading-relaxed mb-3">
                            The municipal ERP service could not be reached. Please try again shortly.
                          </p>
                          <button
                            onClick={handleRetry}
                            className="text-[11px] font-bold text-amber-800 uppercase tracking-wider border border-amber-500 px-3 py-1 hover:bg-amber-100 transition-colors font-sans"
                          >
                            Try Again
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Form */}
                <form onSubmit={handleSubmit} noValidate>
                  <div className="space-y-5">

                    {/* Username field */}
                    <motion.div variants={itemVariants}>
                      <label
                        htmlFor="login-username"
                        className="block text-[11px] font-bold text-slate-700 uppercase tracking-[0.16em] mb-2 font-sans"
                      >
                        Employee ID / Username
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                          <User className="w-4 h-4 text-slate-400" />
                        </div>
                        <input
                          id="login-username"
                          ref={usernameRef}
                          type="text"
                          autoComplete="username"
                          required
                          disabled={loading}
                          value={username}
                          onChange={(e) => { setUsername(e.target.value); setErrorType(''); }}
                          placeholder="Enter your employee ID or username"
                          className="w-full pl-10 pr-4 py-3 text-sm font-sans text-slate-900 placeholder-slate-400
                            bg-white border border-slate-300 rounded-none
                            focus:outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-500
                            disabled:bg-slate-50 disabled:text-slate-400
                            transition-colors"
                        />
                      </div>
                    </motion.div>

                    {/* Password field */}
                    <motion.div variants={itemVariants}>
                      <label
                        htmlFor="login-password"
                        className="block text-[11px] font-bold text-slate-700 uppercase tracking-[0.16em] mb-2 font-sans"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                          <Lock className="w-4 h-4 text-slate-400" />
                        </div>
                        <input
                          id="login-password"
                          ref={passwordRef}
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          required
                          disabled={loading}
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setErrorType(''); }}
                          placeholder="Enter your password"
                          className="w-full pl-10 pr-12 py-3 text-sm font-sans text-slate-900 placeholder-slate-400
                            bg-white border border-slate-300 rounded-none
                            focus:outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-500
                            disabled:bg-slate-50 disabled:text-slate-400
                            transition-colors"
                        />
                        <button
                          type="button"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowPassword(v => !v)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none focus:text-primary-600"
                        >
                          {showPassword
                            ? <EyeOff className="w-4 h-4" aria-hidden="true" />
                            : <Eye    className="w-4 h-4" aria-hidden="true" />}
                        </button>
                      </div>
                    </motion.div>

                    {/* Sign-in button */}
                    <motion.div variants={itemVariants} className="pt-2">
                      <motion.button
                        type="submit"
                        disabled={loading || !username.trim() || !password}
                        whileHover={!reduced && !loading ? { y: -1 } : {}}
                        whileTap={!reduced ? { y: 0 } : {}}
                        className="w-full flex items-center justify-center gap-3 py-3.5 px-6
                          text-sm font-bold text-white uppercase tracking-[0.2em] font-sans
                          bg-primary-700 hover:bg-primary-600
                          border border-primary-600
                          disabled:opacity-50 disabled:cursor-not-allowed
                          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                          transition-colors"
                        aria-busy={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                            Authenticating…
                          </>
                        ) : (
                          'Sign In'
                        )}
                      </motion.button>
                    </motion.div>

                  </div>
                </form>

                {/* Credential assistance note — no fake password reset */}
                <motion.p variants={itemVariants} className="mt-4 text-[11px] text-slate-500 font-sans text-center">
                  For credential assistance, contact your system administrator.
                </motion.p>

                {/* Divider */}
                <motion.div variants={itemVariants} className="border-t border-slate-200 mt-8 mb-6" />

                {/* Security notice */}
                <motion.div
                  variants={itemVariants}
                  className="flex items-start gap-3 bg-slate-50 border border-slate-300 p-4"
                >
                  <ShieldCheck className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.18em] font-sans mb-1">
                      Authorized Personnel Only
                    </p>
                    <p className="text-[12px] text-slate-600 font-sans leading-relaxed">
                      Access to municipal operational systems is restricted to
                      authorized users. Unauthorized access attempts are logged.
                    </p>
                  </div>
                </motion.div>

              </>
            )}
          </motion.div>
        </div>

        {/* Bottom system info bar */}
        <div className="px-6 lg:px-12 py-4 border-t border-slate-300 bg-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.16em] font-sans">SmartBin Municipal ERP</span>
              <span className="text-[11px] text-slate-500 font-sans ml-2">· Administrative Access Portal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                {import.meta.env.MODE === 'production' ? 'PRODUCTION' : 'DEVELOPMENT'}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
