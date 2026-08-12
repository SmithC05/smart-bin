import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { motion, useReducedMotion } from 'framer-motion'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '../context/AuthContext'
import {
  MapPin,
  CheckCircle,
  ArrowRight,
  Check,
  AlertTriangle,
  RefreshCw,
  ClipboardList,
  Map as MapIcon,
  Bell,
  User,
  Navigation2
} from 'lucide-react'
import Card from '../components/ui/Card'

// Fix leaflet icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const pendingIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const currentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const completedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const exceptionIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function FieldWorkerDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const reducedMotion = useReducedMotion()

  const [schedules, setSchedules] = useState([])
  const [activeSchedule, setActiveSchedule] = useState(null)
  const [routeData, setRouteData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  
  const [actionLoading, setActionLoading] = useState(null)
  const [exceptionModal, setExceptionModal] = useState({ isOpen: false, recordId: null, reason: 'ACCESS_BLOCKED', notes: '' })

  const [activeTab, setActiveTab] = useState('tasks') // 'tasks', 'map', 'alerts', 'profile'
  
  const tasksRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    fetchData()
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/driver/schedules/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      })
      setSchedules(response.data)
      
      const inProgress = response.data.find(s => s.status === 'IN_PROGRESS')
      const targetSchedule = inProgress || (response.data.length > 0 ? response.data[0] : null)
      
      if (targetSchedule) {
        setActiveSchedule(targetSchedule)
        if (targetSchedule.status === 'IN_PROGRESS') {
          await fetchRoute(targetSchedule.id)
        } else {
          setRouteData(null)
        }
      } else {
        setActiveSchedule(null)
        setRouteData(null)
      }
    } catch (err) {
      console.error(err)
      setError('Unable to retrieve your current assignment.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchRoute = async (scheduleId) => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/driver/${scheduleId}/route/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      })
      setRouteData(response.data)
    } catch (err) {
      console.error(err)
      setError('Unable to retrieve task data.')
    }
  }

  const handleStartAssignment = async (scheduleId) => {
    try {
      await axios.post(`http://127.0.0.1:8000/api/driver/${scheduleId}/start/`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      })
      await fetchData()
    } catch (err) {
      console.error(err)
      alert('Failed to start assignment. ' + (err.response?.data?.error || ''))
    }
  }
  
  const handleCompleteAssignment = async (scheduleId) => {
    const confirm = window.confirm("Complete this assignment? All tasks must be collected or marked as exception.")
    if (!confirm) return
    try {
      await axios.post(`http://127.0.0.1:8000/api/driver/${scheduleId}/complete-route/`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      })
      alert('Assignment completed successfully!')
      await fetchData()
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.error || 'Failed to complete assignment.')
    }
  }

  const handleAction = async (recordId, action, extraData = {}) => {
    setActionLoading(recordId)
    try {
      await axios.post(`http://127.0.0.1:8000/api/driver/records/${recordId}/${action}/`, extraData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      })
      if (activeSchedule) {
        await fetchRoute(activeSchedule.id)
      }
    } catch (err) {
      console.error(err)
      alert('Failed to update task status.')
    } finally {
      setActionLoading(null)
      if (action === 'exception') {
        setExceptionModal({ isOpen: false, recordId: null, reason: 'ACCESS_BLOCKED', notes: '' })
      }
    }
  }

  const submitException = () => {
    if (!exceptionModal.recordId) return
    handleAction(exceptionModal.recordId, 'exception', { 
      reason: exceptionModal.reason, 
      notes: exceptionModal.notes 
    })
  }

  const scrollToSection = (ref) => {
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-slate-500 font-medium">Loading Workspace...</p>
      </div>
    )
  }

  // Derived values
  const hasSchedule = !!activeSchedule
  const isRouteActive = hasSchedule && activeSchedule.status === 'IN_PROGRESS' && routeData
  
  const totalTasks = routeData ? routeData.records.length : 0
  const completedTasks = routeData ? routeData.records.filter(r => r.status === 'COLLECTED' || r.status === 'UNABLE_TO_COLLECT').length : 0
  const remainingTasks = totalTasks - completedTasks
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  
  const nextTaskIdx = routeData ? routeData.records.findIndex(r => r.status === 'PENDING' || r.status === 'ARRIVED') : -1
  const nextTask = nextTaskIdx !== -1 ? routeData.records[nextTaskIdx] : null
  const allCompleted = isRouteActive && totalTasks > 0 && remainingTasks === 0

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-8">
      {/* HEADER */}
      <div className="bg-slate-900 text-white p-4 md:px-8 shadow-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold tracking-tight">FIELD OPERATIONS</h1>
            <div className="flex items-center text-sm text-slate-300 mt-1">
              <span className="font-medium mr-3">{user?.first_name || 'Worker'} {user?.last_name || ''}</span>
              <span className="mr-3 text-slate-400">FIELD WORKER</span>
            </div>
            <div className="flex items-center text-xs mt-1 text-slate-400">
              <span className="mr-3 uppercase">{activeSchedule?.zone_details?.name || 'ZONE --'} · WARD {activeSchedule?.ward_details?.ward_number || '--'}</span>
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-1.5 ${isOnline ? 'bg-emerald-400' : 'bg-red-500'}`}></div>
                <span className="uppercase font-medium text-slate-300">{isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <button 
              onClick={() => fetchData(true)}
              className="mt-1 flex items-center text-xs text-indigo-300 hover:text-white transition-colors p-2 bg-slate-800 rounded"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        
        {!isOnline && (
          <div className="bg-slate-800 border-l-4 border-slate-500 p-4 rounded shadow-sm">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-slate-400 mr-3" />
              <div>
                <h3 className="text-sm font-bold text-white">OFFLINE</h3>
                <p className="text-xs text-slate-400 mt-1">Changes may not be submitted until connection is restored.</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
              <div>
                <h3 className="text-sm font-bold text-red-800">TASK DATA UNAVAILABLE</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <button onClick={() => fetchData(true)} className="mt-2 text-xs font-semibold text-red-800 uppercase hover:underline">
                  [ RETRY ]
                </button>
              </div>
            </div>
          </div>
        )}

        {!hasSchedule && !error && (
          <Card className="border border-slate-200">
            <div className="p-8 text-center flex flex-col items-center">
              <CheckCircle className="h-16 w-16 text-slate-300 mb-4" />
              <h2 className="text-xl font-bold text-slate-800 mb-2 uppercase">No Field Assignment</h2>
              <p className="text-slate-500 max-w-sm mb-6">You currently have no collection task assigned.</p>
              <p className="text-sm text-slate-400">Please contact your Zone Supervisor for your next assignment.</p>
            </div>
          </Card>
        )}
        
        {hasSchedule && isRouteActive && totalTasks === 0 && (
          <Card className="border border-slate-200">
            <div className="p-8 text-center flex flex-col items-center">
              <CheckCircle className="h-16 w-16 text-slate-300 mb-4" />
              <h2 className="text-xl font-bold text-slate-800 mb-2 uppercase">No Collection Tasks</h2>
              <p className="text-slate-500 max-w-sm mb-6">There are currently no collection tasks available for this assignment.</p>
            </div>
          </Card>
        )}

        {hasSchedule && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* LEFT COLUMN / MOBILE MAIN */}
            <div className="md:col-span-8 space-y-6">
              
              {/* TODAY'S ASSIGNMENT */}
              <Card className="border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                  <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Assignment</h2>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-500 uppercase">Collection</div>
                    <div className="text-sm font-bold text-slate-800 mt-1">{activeSchedule.zone_details?.name || 'ZONE'}</div>
                    <div className="text-sm font-medium text-slate-600">WARD {activeSchedule.ward_details?.ward_number || '--'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase">Schedule</div>
                    <div className="text-sm font-bold text-slate-800 mt-1">{activeSchedule.schedule_id}</div>
                  </div>
                  <div className="col-span-2 border-t border-slate-100 pt-3 flex justify-between items-center">
                    <div>
                      <div className="text-xs text-slate-500 uppercase">Tasks</div>
                      <div className="text-sm font-bold text-slate-800">{isRouteActive ? `${completedTasks} / ${totalTasks} Completed` : 'Not Started'}</div>
                    </div>
                    <div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                        activeSchedule.status === 'IN_PROGRESS' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {activeSchedule.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* ACTION: START ASSIGNMENT */}
              {activeSchedule.status !== 'IN_PROGRESS' && (
                <button
                  onClick={() => handleStartAssignment(activeSchedule.id)}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md flex items-center justify-center font-bold text-lg transition-colors"
                >
                  START ASSIGNMENT
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              )}

              {/* ACTIVE WORKSPACE */}
              {isRouteActive && totalTasks > 0 && (
                <>
                  {/* PROGRESS BAR */}
                  <Card className="border border-slate-200 shadow-sm p-5">
                    <div className="flex justify-between items-end mb-2">
                      <h2 className="text-sm font-bold text-slate-800 uppercase">Collection Progress</h2>
                      <span className="text-2xl font-black text-indigo-600">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-4 mb-3 overflow-hidden shadow-inner">
                      <motion.div 
                        className="bg-indigo-500 h-4 rounded-full" 
                        initial={reducedMotion ? false : { width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                    <div className="flex justify-between text-xs font-medium text-slate-500 uppercase tracking-wider">
                      <span>{completedTasks} / {totalTasks} Tasks Completed</span>
                      <span>{remainingTasks} Tasks Remaining</span>
                    </div>
                  </Card>

                  {/* NEXT TASK */}
                  {nextTask && (
                    <Card className="border-2 border-indigo-500 shadow-md overflow-hidden relative">
                      <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase">
                        Current
                      </div>
                      <div className="p-5">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Next Task</h2>
                        
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-2xl font-black text-slate-800 mb-1">{nextTask.bin_details?.bin_id || 'Unknown Bin'}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {nextTask.bin_details?.is_real ? (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Real Device</span>
                              ) : (
                                <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Simulated</span>
                              )}
                              <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase border border-red-200">Critical</span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-[10px] text-slate-500 uppercase font-semibold">Fill Level</div>
                            <div className="text-xl font-bold text-red-600">{nextTask.bin_details?.current_fill_level || 90}%</div>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-5 flex flex-col gap-2">
                          <div className="flex items-start text-sm text-slate-700">
                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 mr-2 shrink-0" />
                            <span>{nextTask.bin_details?.location || 'Unknown Location'}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 uppercase font-medium pt-2 border-t border-slate-200">
                            <span>ZONE: {activeSchedule.zone_details?.name || 'ZONE'}</span>
                            <span>WARD: {activeSchedule.ward_details?.ward_number || 'WARD'}</span>
                          </div>
                        </div>

                        {/* ACTIONS */}
                        {nextTask.status === 'PENDING' && (
                          <button
                            onClick={() => handleAction(nextTask.id, 'arrive')}
                            disabled={actionLoading === nextTask.id}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                          >
                            <Navigation2 className="w-5 h-5 mr-2" />
                            Mark Arrived
                          </button>
                        )}

                        {nextTask.status === 'ARRIVED' && (
                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              onClick={() => handleAction(nextTask.id, 'collect')}
                              disabled={actionLoading === nextTask.id}
                              className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center font-bold uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50"
                            >
                              <Check className="w-5 h-5 mr-2" />
                              Mark Completed
                            </button>
                            <button
                              onClick={() => setExceptionModal({ isOpen: true, recordId: nextTask.id, reason: 'ACCESS_BLOCKED', notes: '' })}
                              disabled={actionLoading === nextTask.id}
                              className="py-4 px-6 bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-300 rounded-lg flex items-center justify-center font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                            >
                              <AlertTriangle className="w-5 h-5 mr-2" />
                              Report Exception
                            </button>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}

                  {/* ALL COMPLETED */}
                  {allCompleted && (
                    <Card className="border-2 border-emerald-500 shadow-md p-6 text-center">
                      <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                      <h2 className="text-xl font-bold text-slate-800 uppercase mb-2">Assignment Complete</h2>
                      <p className="text-slate-600 mb-6">{totalTasks} / {totalTasks} TASKS COMPLETED</p>
                      <button
                        onClick={() => handleCompleteAssignment(activeSchedule.id)}
                        className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center justify-center font-bold uppercase transition-colors"
                      >
                        [ COMPLETE ASSIGNMENT ]
                      </button>
                    </Card>
                  )}

                  {/* TASK LIST */}
                  <div ref={tasksRef}>
                    <Card className="border border-slate-200 shadow-sm overflow-hidden">
                      <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">My Collection Tasks</h2>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {routeData.records.map((record, idx) => {
                          const isCurrent = record.id === nextTask?.id
                          const isCompleted = record.status === 'COLLECTED'
                          const isException = record.status === 'UNABLE_TO_COLLECT'
                          
                          return (
                            <div key={record.id} className={`p-4 transition-colors ${isCurrent ? 'bg-indigo-50/50' : ''}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center">
                                  <div className="w-6 h-6 rounded bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold mr-3">
                                    {String(idx + 1).padStart(2, '0')}
                                  </div>
                                  <div className="font-bold text-slate-800">{record.bin_details?.bin_id}</div>
                                </div>
                                <div className="text-right flex items-center space-x-2">
                                  {isCompleted && <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded flex items-center"><Check className="w-3 h-3 mr-1"/> Completed</span>}
                                  {isException && <span className="text-[10px] font-bold uppercase bg-orange-100 text-orange-700 px-2 py-0.5 rounded flex items-center"><AlertTriangle className="w-3 h-3 mr-1"/> Exception</span>}
                                  {isCurrent && <span className="text-[10px] font-bold uppercase bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded flex items-center"><ArrowRight className="w-3 h-3 mr-1"/> Current</span>}
                                  {!isCompleted && !isException && !isCurrent && <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center">Pending</span>}
                                </div>
                              </div>
                              <div className="flex items-center justify-between pl-9">
                                <div className="flex items-center space-x-2">
                                  <span className={`text-[10px] font-bold uppercase tracking-wider ${record.bin_details?.is_real ? 'text-emerald-600' : 'text-slate-500'}`}>
                                    {record.bin_details?.is_real ? 'REAL DEVICE' : 'SIMULATED'}
                                  </span>
                                </div>
                                <div className="text-[10px] font-bold uppercase text-red-600">
                                  {record.bin_details?.current_fill_level || 0}%
                                </div>
                              </div>
                              {isException && (
                                <div className="pl-9 mt-1 text-xs text-orange-700 font-medium">Issue: {record.exception_reason}</div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </Card>
                  </div>
                  
                  {/* MAP */}
                  <div ref={mapRef}>
                    <Card className="border border-slate-200 shadow-sm overflow-hidden">
                      <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Collection Area</h2>
                      </div>
                      <div className="h-64 bg-slate-200 w-full relative z-0">
                        {routeData.records.length > 0 ? (
                           <MapContainer 
                             center={
                               routeData.records[0].bin_details?.latitude 
                                 ? [routeData.records[0].bin_details.latitude, routeData.records[0].bin_details.longitude]
                                 : [11.0168, 76.9558] 
                             } 
                             zoom={13} 
                             style={{ height: '100%', width: '100%' }}
                             zoomControl={false}
                           >
                             <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                             {routeData.records.map((r, i) => {
                               if (!r.bin_details?.latitude) return null
                               const pos = [r.bin_details.latitude, r.bin_details.longitude]
                               
                               let icon = pendingIcon
                               if (r.status === 'COLLECTED') icon = completedIcon
                               else if (r.status === 'UNABLE_TO_COLLECT') icon = exceptionIcon
                               else if (r.id === nextTask?.id) icon = currentIcon
                               
                               return (
                                 <Marker key={r.id} position={pos} icon={icon}>
                                   <Popup>
                                     <div className="font-bold">{r.bin_details.bin_id}</div>
                                     <div className="text-xs">{r.status}</div>
                                   </Popup>
                                 </Marker>
                               )
                             })}
                           </MapContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-slate-400">Map unavailable</div>
                        )}
                      </div>
                    </Card>
                  </div>
                </>
              )}
            </div>

            {/* RIGHT COLUMN (desktop only) */}
            <div className="md:col-span-4 space-y-6 hidden md:block">
              <Card className="border border-slate-200 shadow-sm overflow-hidden sticky top-24">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                  <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Summary</h2>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned Tasks</div>
                    <div className="text-xl font-bold text-slate-800">{totalTasks}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Completed</div>
                    <div className="text-xl font-bold text-emerald-600">{completedTasks}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Remaining</div>
                    <div className="text-xl font-bold text-indigo-600">{remainingTasks}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Exceptions</div>
                    <div className="text-xl font-bold text-orange-500">
                      {routeData ? routeData.records.filter(r => r.status === 'UNABLE_TO_COLLECT').length : 0}
                    </div>
                  </div>
                  <hr className="border-slate-100" />
                  <div className="pt-2">
                    <button className="w-full py-3 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold uppercase rounded hover:bg-slate-100 transition-colors flex items-center justify-center">
                      <User className="w-4 h-4 mr-2" />
                      Contact Supervisor
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* EXCEPTION MODAL */}
      {exceptionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="bg-orange-500 px-4 py-3">
              <h2 className="text-white font-bold uppercase tracking-wider flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Report Exception
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Exception Type</label>
                <select 
                  className="w-full border-slate-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                  value={exceptionModal.reason}
                  onChange={(e) => setExceptionModal({...exceptionModal, reason: e.target.value})}
                >
                  <option value="ACCESS_BLOCKED">Access Blocked</option>
                  <option value="BIN_DAMAGED">Bin Damaged</option>
                  <option value="LOCATION_UNAVAILABLE">Location Unavailable</option>
                  <option value="COLLECTION_NOT_POSSIBLE">Collection Not Possible</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notes (Optional)</label>
                <textarea 
                  className="w-full border-slate-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500 h-20"
                  placeholder="Additional details..."
                  value={exceptionModal.notes}
                  onChange={(e) => setExceptionModal({...exceptionModal, notes: e.target.value})}
                ></textarea>
              </div>
              <div className="flex space-x-3 pt-2">
                <button 
                  onClick={() => setExceptionModal({ isOpen: false, recordId: null, reason: 'ACCESS_BLOCKED', notes: '' })}
                  className="flex-1 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold uppercase text-sm transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={submitException}
                  disabled={actionLoading === exceptionModal.recordId}
                  className="flex-1 py-3 text-white bg-orange-600 hover:bg-orange-700 rounded-lg font-bold uppercase text-sm transition-colors disabled:opacity-50"
                >
                  Report
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* MOBILE BOTTOM ACTION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 pb-safe">
        <div className="flex justify-around items-center h-16">
          <button 
            onClick={() => { setActiveTab('tasks'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'tasks' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <ClipboardList className={`w-5 h-5 ${activeTab === 'tasks' ? 'fill-indigo-100' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Tasks</span>
          </button>
          <button 
            onClick={() => { setActiveTab('map'); scrollToSection(mapRef) }}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'map' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <MapIcon className={`w-5 h-5 ${activeTab === 'map' ? 'fill-indigo-100' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Map</span>
          </button>
          <button 
            onClick={() => { setActiveTab('alerts') }}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'alerts' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Bell className={`w-5 h-5 ${activeTab === 'alerts' ? 'fill-indigo-100' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Alerts</span>
          </button>
          <button 
            onClick={() => { setActiveTab('profile') }}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'profile' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <User className={`w-5 h-5 ${activeTab === 'profile' ? 'fill-indigo-100' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
          </button>
        </div>
      </div>
    </div>
  )
}
