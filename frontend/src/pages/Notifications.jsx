import { useState, useEffect } from 'react'
import { Check, Info, AlertTriangle, Truck, CheckCircle, Search, Calendar, Bell, ShieldAlert, Wrench } from 'lucide-react'
import api from '../api'
import Card from '../components/ui/Card'
import { usePolling } from '../context/PollingContext'

const getIcon = (type) => {
  switch(type) {
    case 'SMARTBIN_CRITICAL': return <AlertTriangle className="w-5 h-5 text-red-500" />
    case 'SCHEDULE_DISPATCHED': return <Truck className="w-5 h-5 text-blue-500" />
    case 'SCHEDULE_CANCELLED': return <ShieldAlert className="w-5 h-5 text-red-500" />
    case 'ROUTE_STARTED': return <Truck className="w-5 h-5 text-orange-500" />
    case 'ROUTE_COMPLETED': return <CheckCircle className="w-5 h-5 text-green-500" />
    case 'COLLECTION_EXCEPTION': return <AlertTriangle className="w-5 h-5 text-amber-500" />
    case 'VEHICLE_MAINTENANCE': return <Wrench className="w-5 h-5 text-slate-500" />
    default: return <Info className="w-5 h-5 text-slate-500" />
  }
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const { start, stop } = usePolling()

  const fetchNotifications = async () => {
    try {
      start()
      const res = await api.get('/notifications/')
      setNotifications(res.data.results || res.data)
    } catch (err) {
      console.error(err)
    } finally {
      stop()
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read/`)
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (err) {
      console.error(err)
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all/')
      setNotifications(notifications.map(n => ({ ...n, is_read: true })))
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Loading notifications...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-slate-700" />
            Notifications & Escalations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Operational alerts and events in your authorized geographic scope.
          </p>
        </div>
        <button 
          onClick={markAllAsRead} 
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded transition"
        >
          <Check className="w-4 h-4" />
          Mark all as read
        </button>
      </div>

      <Card>
        <div className="divide-y divide-slate-200">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No notifications to display.
            </div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className={`flex items-start gap-4 p-4 transition hover:bg-slate-50 ${!n.is_read ? 'bg-blue-50/20' : ''}`}>
                <div className={`p-2 rounded-full mt-1 ${!n.is_read ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'bg-slate-50'}`}>
                  {getIcon(n.notification_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className={`text-base ${!n.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                      {n.title}
                    </h3>
                    <span className="flex items-center gap-1 text-xs font-medium text-slate-500 uppercase tracking-wide shrink-0">
                      <Calendar className="w-3 h-3" />
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                </div>
                {!n.is_read && (
                  <button 
                    onClick={() => markAsRead(n.id)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition mt-1 h-fit"
                    title="Mark as read"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
