import { useLocation } from 'react-router-dom'
import { Bell, Search } from 'lucide-react'
import { usePolling } from '../../context/PollingContext'

const PAGE_TITLES = {
  '/':         'Dashboard',
  '/map':      'Bin Map',
  '/bins':     'Bin Management',
  '/alerts':   'Alerts',
  '/settings': 'Settings',
}

export default function Topbar() {
  const { pathname }    = useLocation()
  const { isFetching }  = usePolling()
  const title           = PAGE_TITLES[pathname] ?? 'SmartBin'

  return (
    <header className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-gray-100 shadow-sm shrink-0">
      {/* Left — Page title + Live badge */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        <span className="badge-live">
          {/* Outer ring pulses when a fetch is in-flight */}
          <span className="relative flex items-center justify-center w-1.5 h-1.5">
            {isFetching && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
            )}
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          </span>
          Live
        </span>
      </div>

      {/* Right — Search + Notifications */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search bins…"
            className="pl-9 pr-4 py-1.5 text-sm bg-gray-100 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 transition w-48"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition" aria-label="Notifications">
          <Bell className="w-4.5 h-4.5 text-gray-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
        </button>
      </div>
    </header>
  )
}
