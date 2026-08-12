import { useLocation } from 'react-router-dom'
import { Bell, Search, LogOut, User } from 'lucide-react'
import { usePolling } from '../../context/PollingContext'
import { useAuth } from '../../context/AuthContext'
import NotificationDropdown from './NotificationDropdown'

const PAGE_TITLES = {
  '/app':               'Dashboard',
  '/app/map':           'Bin Map',
  '/app/bins':          'Bin Management',
  '/app/alerts':        'Alerts',
  '/app/settings':      'Settings',
  '/app/vehicles':      'Vehicles',
  '/app/schedules':     'Schedules',
  '/app/staff':         'Staff',
  '/app/reports':       'Reports',
  '/app/notifications': 'Notifications',
  '/app/audit-logs':    'Audit Logs',
  '/app/demo':          'Demo Simulation',
}

export default function Topbar() {
  const { pathname }    = useLocation()
  const { isFetching }  = usePolling()
  const { user, logout } = useAuth()
  const title           = PAGE_TITLES[pathname] ?? 'Municipal ERP'

  const getBreadcrumb = () => {
    if (['/app/settings', '/app/audit-logs', '/app/demo'].includes(pathname)) return 'Administration'
    return 'Operations'
  }

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shadow-sm shrink-0">
      {/* Left — Contextual Breadcrumb */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
          <div className="h-4 w-px bg-slate-300 mx-2"></div>
          <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">{getBreadcrumb()}</span>
        </div>
      </div>

      {/* Right — Search + Notifications + User */}
      <div className="flex items-center gap-5">
        
        {/* Status Indicators */}
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-600">
          <span className="relative flex items-center justify-center w-2 h-2">
            {isFetching && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75 animate-ping" />
            )}
            <span className={`w-2 h-2 rounded-full ${isFetching ? 'bg-slate-500' : 'bg-green-600'}`} />
          </span>
          SYSTEM ONLINE
        </div>

        {/* Notifications */}
        <NotificationDropdown />

        <div className="h-6 w-px bg-slate-200 mx-1"></div>

        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 bg-slate-100 text-slate-700 border border-slate-300">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:block text-sm text-left">
            <p className="font-semibold text-slate-900 leading-none">{user?.username || 'User'}</p>
            <p className="text-xs font-medium text-slate-500 mt-1 capitalize">{user?.role?.replace(/_/g, ' ') || 'Guest'}</p>
          </div>
        </div>

        <button 
          onClick={logout} 
          className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded transition"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
