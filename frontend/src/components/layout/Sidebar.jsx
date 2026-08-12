import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  MapPin,
  Trash2,
  Bell,
  Settings,
  Building2,
  Truck,
  Users,
  Calendar,
  Shield,
  BarChart3,
  Database,
  FileText,
  Zap,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2 rounded-none text-sm font-medium transition-colors border-l-2 ${
    isActive
      ? 'bg-primary-900 text-white border-primary-500'
      : 'border-transparent hover:bg-primary-900 hover:text-white'
  }`

export default function Sidebar() {
  const { user } = useAuth()

  const isManager = ['system_admin', 'municipal_admin', 'municipal_officer', 'zone_supervisor'].includes(user?.role);
  const isAdmin   = ['system_admin', 'municipal_admin'].includes(user?.role);

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-primary-950 border-r border-primary-900 shrink-0 text-slate-300">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-primary-900 bg-primary-950">
        <div className="flex items-center justify-center w-8 h-8 bg-primary-800 shadow-sm border border-primary-700">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-sm font-bold text-white leading-tight block">Municipal ERP</span>
          <span className="text-[10px] text-primary-300 font-medium tracking-wider uppercase">Waste Management</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">

        {/* Operations */}
        <div>
          <p className="px-3 mb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
            Operations
          </p>
          <div className="space-y-1">
            <NavLink to="/app"       end   className={navLinkClass}>
              <LayoutDashboard className="w-4 h-4 shrink-0" />Dashboard
            </NavLink>
            <NavLink to="/app/bins"        className={navLinkClass}>
              <Trash2 className="w-4 h-4 shrink-0" />Smart Bins
            </NavLink>
            <NavLink to="/app/vehicles"    className={navLinkClass}>
              <Truck className="w-4 h-4 shrink-0" />Vehicles
            </NavLink>
            <NavLink to="/app/schedules"   className={navLinkClass}>
              <Calendar className="w-4 h-4 shrink-0" />Schedules
            </NavLink>
            <NavLink to="/app/map"         className={navLinkClass}>
              <MapPin className="w-4 h-4 shrink-0" />Bin Map
            </NavLink>
            <NavLink to="/app/alerts"      className={navLinkClass}>
              <Bell className="w-4 h-4 shrink-0" />Alerts
            </NavLink>
            {isManager && (
              <>
                <NavLink to="/app/staff"         className={navLinkClass}>
                  <Users className="w-4 h-4 shrink-0" />Staff
                </NavLink>
                <NavLink to="/app/reports"       className={navLinkClass}>
                  <BarChart3 className="w-4 h-4 shrink-0" />Reports
                </NavLink>
                <NavLink to="/app/notifications" className={navLinkClass}>
                  <Bell className="w-4 h-4 shrink-0" />Notifications
                </NavLink>
              </>
            )}
          </div>
        </div>

        {/* Administration */}
        {isAdmin && (
          <div>
            <p className="px-3 mb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
              Administration
            </p>
            <div className="space-y-1">
              <NavLink to="/app/audit-logs" className={navLinkClass}>
                <Shield className="w-4 h-4 shrink-0" />Audit Logs
              </NavLink>
              <NavLink to="/app/demo"       className={navLinkClass}>
                <Zap className="w-4 h-4 shrink-0" />Demo Simulation
              </NavLink>
              <NavLink to="/app/settings"   className={navLinkClass}>
                <Settings className="w-4 h-4 shrink-0" />Settings
              </NavLink>
            </div>
          </div>
        )}

      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-primary-900 bg-primary-950">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 bg-primary-800 text-primary-200 font-semibold text-sm shrink-0 uppercase border border-primary-700">
            {user?.username?.[0] || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate capitalize">{user?.username || 'User'}</p>
            <p className="text-[11px] text-primary-300 truncate capitalize">{user?.role?.replace(/_/g, ' ') || 'Guest'}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
