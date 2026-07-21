import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  MapPin,
  Trash2,
  Bell,
  Settings,
} from 'lucide-react'

const navItems = [
  { to: '/',        label: 'Dashboard',       icon: LayoutDashboard, end: true },
  { to: '/map',     label: 'Bin Map',         icon: MapPin },
  { to: '/bins',    label: 'Bin Management',  icon: Trash2 },
  { to: '/alerts',  label: 'Alerts',          icon: Bell },
  { to: '/settings',label: 'Settings',        icon: Settings },
]

export default function Sidebar() {
  return (
    <aside className="flex flex-col w-64 min-h-screen bg-gray-100 border-r border-gray-200 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-200">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-600 shadow-md">
          <Trash2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-base font-bold text-gray-900 leading-tight block">SmartBin</span>
          <span className="text-[11px] text-primary-600 font-medium tracking-wide">DASHBOARD</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-4 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          Main Menu
        </p>
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `nav-link${isActive ? ' active' : ''}`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-semibold text-sm shrink-0">
            A
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">Admin</p>
            <p className="text-xs text-gray-400 truncate">admin@smartbin.io</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
