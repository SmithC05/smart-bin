import { useState, useEffect, useRef } from 'react'
import { Bell, Check, Trash2, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../../api'
import { usePolling } from '../../context/PollingContext'

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef(null)
  const { start, stop } = usePolling()

  const fetchNotifications = async () => {
    try {
      start()
      const res = await api.get('/api/notifications/')
      const data = res.data.results || res.data // handle pagination if any
      const unread = data.filter(n => !n.is_read)
      setNotifications(data.slice(0, 5)) // show top 5 in dropdown
      setUnreadCount(unread.length) // Wait, maybe use /unread-count/ for accuracy if paginated
      const countRes = await api.get('/api/notifications/unread-count/')
      setUnreadCount(countRes.data.count)
    } catch (err) {
      console.error('Failed to fetch notifications', err)
    } finally {
      stop()
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000) // Poll every 60s
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAsRead = async (id, e) => {
    e.stopPropagation()
    try {
      await api.post(`/api/notifications/${id}/read/`)
      fetchNotifications()
    } catch (err) {
      console.error(err)
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.post('/api/notifications/read-all/')
      fetchNotifications()
      setIsOpen(false)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 rounded text-slate-500 hover:bg-slate-100 transition" 
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded shadow-lg z-50 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
            <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[300px]">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">No recent notifications</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map(n => (
                  <li key={n.id} className={`p-4 transition hover:bg-slate-50 flex gap-3 ${!n.is_read ? 'bg-blue-50/30' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.is_read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-wide">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!n.is_read && (
                      <button onClick={(e) => markAsRead(n.id, e)} className="text-slate-400 hover:text-blue-600 p-1 rounded transition h-fit" title="Mark as read">
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="p-2 border-t border-slate-200 bg-slate-50 shrink-0">
            <Link 
              to="/notifications" 
              onClick={() => setIsOpen(false)}
              className="block w-full py-2 text-center text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition"
            >
              View All Notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
