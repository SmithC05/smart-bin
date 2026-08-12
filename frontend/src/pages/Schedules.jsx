import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import StatusBadge from '../components/ui/StatusBadge';
import api from '../api';
import { 
  Plus, Edit2, Trash2, X, Save, Calendar, Truck, User, MapPin, 
  Eye, CheckCircle, Navigation, Route as RouteIcon, Info, RefreshCw, AlertTriangle, Search
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { format } from 'date-fns';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LIFECYCLE_STAGES = [
  { status: 'DRAFT', label: 'CREATED' },
  { status: 'PLANNED', label: 'PLANNED' },
  { status: 'DISPATCHED', label: 'DISPATCHED' },
  { status: 'IN_PROGRESS', label: 'IN PROGRESS' },
  { status: 'COMPLETED', label: 'COMPLETED' },
];

export default function Schedules() {
  const reducedMotion = useReducedMotion();
  
  // Data State
  const [schedules, setSchedules] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  
  // Masters
  const [municipalities, setMunicipalities] = useState([]);
  const [zones, setZones] = useState([]);
  const [wards, setWards] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [staff, setStaff] = useState([]);
  const [bins, setBins] = useState([]);
  const [depots, setDepots] = useState([]);
  
  // View State
  const [viewState, setViewState] = useState('LIST'); // LIST, CREATE
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  
  // Filters
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterMuni, setFilterMuni] = useState('');
  const [filterZone, setFilterZone] = useState('');
  const [filterWard, setFilterWard] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Action state
  const [actionLoading, setActionLoading] = useState(false);
  
  // Form State
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    priority: 'NORMAL',
    municipality: '', zone: '', ward: '', 
    bins: [], vehicle: '', driver: '', depot: ''
  });

  useEffect(() => {
    fetchMasters();
    fetchSchedulesAndRoutes();
  }, []);

  const fetchSchedulesAndRoutes = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [schedRes, routesRes] = await Promise.all([
        api.get('/schedules/'),
        api.get('/routes/') // assuming we fetch routes to match with schedules
      ]);
      setSchedules(schedRes.data);
      setRoutes(routesRes.data);
    } catch (error) {
      console.error('Error fetching schedules/routes:', error);
      setErrorMsg('Unable to retrieve collection schedules.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMasters = async () => {
    try {
      const [muniRes, zoneRes, wardRes, vehRes, staffRes, binRes, depotRes] = await Promise.all([
        api.get('/municipalities/'), api.get('/zones/'), api.get('/wards/'),
        api.get('/vehicles/'), api.get('/staff/'), api.get('/bins/'), api.get('/depots/')
      ]);
      setMunicipalities(muniRes.data);
      setZones(zoneRes.data);
      setWards(wardRes.data);
      setVehicles(vehRes.data);
      setStaff(staffRes.data);
      setBins(binRes.data);
      setDepots(depotRes.data);
    } catch (error) {
      console.error('Error fetching masters:', error);
    }
  };

  // Derived Data
  const selectedSchedule = useMemo(() => 
    schedules.find(s => s.id === selectedScheduleId), 
  [schedules, selectedScheduleId]);

  const selectedRoute = useMemo(() => 
    selectedSchedule ? routes.find(r => r.schedule === selectedSchedule.id) : null, 
  [selectedSchedule, routes]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      if (filterDate && s.date !== filterDate) return false;
      if (filterMuni && String(s.municipality) !== filterMuni) return false;
      if (filterZone && String(s.zone) !== filterZone) return false;
      if (filterWard && String(s.ward) !== filterWard) return false;
      if (filterStatus !== 'ALL' && s.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!(
          s.schedule_id.toLowerCase().includes(q) ||
          (s.vehicle_registration || '').toLowerCase().includes(q) ||
          (s.driver_name || '').toLowerCase().includes(q)
        )) return false;
      }
      return true;
    });
  }, [schedules, filterDate, filterMuni, filterZone, filterWard, filterStatus, searchQuery]);

  const metrics = useMemo(() => {
    let planned = 0, dispatched = 0, inProgress = 0, completed = 0, exceptions = 0;
    schedules.filter(s => s.date === filterDate).forEach(s => {
      if (s.status === 'PLANNED') planned++;
      if (s.status === 'DISPATCHED') dispatched++;
      if (s.status === 'IN_PROGRESS') inProgress++;
      if (s.status === 'COMPLETED') completed++;
      if (s.status === 'CANCELLED') exceptions++;
    });
    return { planned, dispatched, inProgress, completed, exceptions, total: planned + dispatched + inProgress + completed + exceptions };
  }, [schedules, filterDate]);

  // Form helpers
  const drivers = staff.filter(s => s.role === 'driver' && s.employment_status === 'ACTIVE');
  const activeVehicles = vehicles.filter(v => v.status === 'AVAILABLE');
  const formZones = zones.filter(z => !formData.municipality || z.municipality === parseInt(formData.municipality));
  const formWards = wards.filter(w => !formData.zone || w.zone === parseInt(formData.zone));
  const formBins = bins.filter(b => (!formData.zone || b.zone === parseInt(formData.zone)) && (!formData.ward || b.ward === parseInt(formData.ward)));
  const formDepots = depots.filter(d => !formData.municipality || d.municipality === parseInt(formData.municipality));

  // Actions
  const handleAction = async (action, id) => {
    setActionLoading(true);
    try {
      await api.post(`/schedules/${id}/${action}/`);
      await fetchSchedulesAndRoutes();
    } catch (error) {
      alert(error.response?.data?.error || `Error during ${action}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSubmit = async () => {
    setActionLoading(true);
    try {
      const payload = {
        schedule_id: `SCH-${Math.floor(1000 + Math.random() * 9000)}`,
        ...formData
      };
      Object.keys(payload).forEach(key => { if (payload[key] === '') payload[key] = null; });
      await api.post('/schedules/', payload);
      setViewState('LIST');
      await fetchSchedulesAndRoutes();
    } catch (error) {
      console.error(error);
      alert('Error creating schedule');
    } finally {
      setActionLoading(false);
    }
  };

  // Validation
  const isDispatchReady = (sched) => {
    if (!sched) return { ready: false, missing: [] };
    const missing = [];
    if (!sched.driver) missing.push('Driver assignment');
    if (!sched.vehicle) missing.push('Vehicle assignment');
    if (!sched.depot) missing.push('Depot assignment');
    if (!sched.bins || sched.bins.length === 0) missing.push('Bin assignment');
    return { ready: missing.length === 0, missing };
  };

  const dispatchReadiness = isDispatchReady(selectedSchedule);

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* HEADER */}
      <div className="bg-slate-900 text-white px-6 py-4 shadow-md sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-400" />
              Collection Scheduling
            </h1>
            <p className="text-sm text-slate-400 mt-1">Plan, optimize and dispatch municipal waste collection operations.</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right mr-2 hidden sm:block">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Context</div>
              <div className="text-xs font-medium text-slate-300">All Authorized Zones</div>
            </div>
            <div className="text-right mr-4">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Today</div>
              <div className="text-xs font-bold text-blue-400">{format(new Date(filterDate), 'dd MMM yyyy')}</div>
            </div>
            <button onClick={fetchSchedulesAndRoutes} className="p-2 bg-slate-800 hover:bg-slate-700 rounded transition-colors text-slate-300">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => {
                setFormData({
                  date: filterDate, priority: 'NORMAL',
                  municipality: '', zone: '', ward: '', bins: [],
                  vehicle: '', driver: '', depot: ''
                });
                setStep(1);
                setViewState('CREATE');
                setSelectedScheduleId(null);
              }}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-bold uppercase tracking-wider rounded transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Schedule</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded text-sm flex items-center shadow-sm">
            <AlertTriangle className="w-5 h-5 mr-2 shrink-0" />
            <div className="flex-1 font-medium">{errorMsg}</div>
            <button onClick={fetchSchedulesAndRoutes} className="text-xs font-bold uppercase bg-white border border-red-200 px-3 py-1 rounded hover:bg-red-50 transition-colors">Retry</button>
          </div>
        )}

        {/* STATUS STRIP */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[
            { label: 'PLANNED', value: metrics.planned, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'READY FOR DISPATCH', value: schedules.filter(s=>s.date===filterDate && s.status==='PLANNED' && isDispatchReady(s).ready).length, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'DISPATCHED', value: metrics.dispatched, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'IN PROGRESS', value: metrics.inProgress, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'COMPLETED', value: metrics.completed, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'EXCEPTIONS', value: metrics.exceptions, color: 'text-red-600', bg: 'bg-red-50' },
          ].map(stat => (
            <div key={stat.label} className={`border border-slate-200 rounded p-4 flex flex-col justify-center items-center text-center shadow-sm bg-white`}>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{stat.label}</div>
              <div className={`text-2xl font-black ${stat.color}`}>{String(stat.value).padStart(2, '0')}</div>
            </div>
          ))}
        </div>

        {viewState === 'CREATE' ? (
          /* CREATE SCHEDULE MULTI-STEP */
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded shadow-sm">
            <div className="border-b border-slate-200 p-6 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Create Collection Schedule</h2>
                <div className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-wider text-blue-600">STEP {step} / 5</div>
              </div>
              <button onClick={() => setViewState('LIST')} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">Operational Scope</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Date</label>
                      <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full text-sm border-slate-300 rounded focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Priority</label>
                      <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full text-sm border-slate-300 rounded focus:ring-blue-500">
                        <option value="NORMAL">NORMAL</option>
                        <option value="HIGH">HIGH</option>
                        <option value="CRITICAL">CRITICAL</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Municipality</label>
                      <select value={formData.municipality} onChange={e => setFormData({...formData, municipality: e.target.value, zone: '', ward: ''})} className="w-full text-sm border-slate-300 rounded focus:ring-blue-500">
                        <option value="">Select Municipality</option>
                        {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Zone</label>
                      <select value={formData.zone} onChange={e => setFormData({...formData, zone: e.target.value, ward: ''})} className="w-full text-sm border-slate-300 rounded focus:ring-blue-500" disabled={!formData.municipality}>
                        <option value="">Select Zone</option>
                        {formZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ward</label>
                      <select value={formData.ward} onChange={e => setFormData({...formData, ward: e.target.value})} className="w-full text-sm border-slate-300 rounded focus:ring-blue-500" disabled={!formData.zone}>
                        <option value="">Select Ward</option>
                        {formWards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-slate-100 pb-2 mb-4">
                     <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Bins</h3>
                     <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">SELECTED: {formData.bins.length}</span>
                  </div>
                  <div className="h-64 overflow-y-auto border border-slate-200 rounded bg-slate-50 p-2 divide-y divide-slate-100 shadow-inner">
                    {formBins.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-500">No eligible SmartBins are available for the selected scope.</div>
                    ) : (
                      formBins.map(b => {
                        const pct = b.latest_pct || 0;
                        const statColor = pct >= 80 ? 'text-red-600 bg-red-50 border-red-200' : pct >= 50 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200';
                        return (
                          <label key={b.id} className="flex items-center space-x-3 p-3 hover:bg-slate-100 cursor-pointer bg-white mb-1 rounded border border-slate-200 transition-colors">
                            <input 
                              type="checkbox" 
                              checked={formData.bins.includes(b.id)}
                              onChange={(e) => setFormData({...formData, bins: e.target.checked ? [...formData.bins, b.id] : formData.bins.filter(id => id !== b.id)})}
                              className="border-slate-300 text-blue-600 focus:ring-blue-500 rounded"
                            />
                            <div className="flex-1">
                              <div className="flex items-center">
                                <span className="text-sm font-bold text-slate-800 font-mono mr-2">{b.bin_id}</span>
                                {b.data_source === 'SIMULATED' ? (
                                  <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1 py-0.5 rounded uppercase border border-slate-200">Simulated</span>
                                ) : (
                                  <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded uppercase border border-indigo-200">Real Device</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500">Ward {b.ward || '--'}</div>
                            </div>
                            <div className={`text-[10px] font-bold px-2 py-1 rounded border uppercase ${statColor}`}>
                              {Math.round(pct)}% {pct >= 80 ? 'CRITICAL' : pct >= 50 ? 'HIGH' : 'NORMAL'}
                            </div>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">Resources</h3>
                  <div className="grid gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Vehicle</label>
                      <select value={formData.vehicle} onChange={e => setFormData({...formData, vehicle: e.target.value})} className="w-full text-sm border-slate-300 rounded focus:ring-blue-500">
                        <option value="">-- Unassigned --</option>
                        {activeVehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number} ({v.vehicle_type.replace(/_/g, ' ')})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Driver</label>
                      <select value={formData.driver} onChange={e => setFormData({...formData, driver: e.target.value})} className="w-full text-sm border-slate-300 rounded focus:ring-blue-500">
                        <option value="">-- Unassigned --</option>
                        {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
              {step === 4 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">Locations</h3>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Depot</label>
                    <select value={formData.depot} onChange={e => setFormData({...formData, depot: e.target.value})} className="w-full text-sm border-slate-300 rounded focus:ring-blue-500">
                      <option value="">-- Select Depot --</option>
                      {formDepots.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>
              )}
              {step === 5 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">Schedule Review</h3>
                  <div className="grid grid-cols-2 gap-y-4 bg-slate-50 p-4 border border-slate-200 rounded">
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</div>
                      <div className="text-sm font-bold text-slate-800">{formData.date}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Priority</div>
                      <div className="text-sm font-bold text-slate-800">{formData.priority}</div>
                    </div>
                    <div className="col-span-2 border-t border-slate-200 pt-3">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Scope</div>
                      <div className="text-sm font-bold text-slate-800">Zone {formData.zone || 'ALL'} · Ward {formData.ward || 'ALL'}</div>
                    </div>
                    <div className="col-span-2 border-t border-slate-200 pt-3">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target</div>
                      <div className="text-sm font-bold text-blue-600">{formData.bins.length} Bins selected</div>
                    </div>
                    <div className="border-t border-slate-200 pt-3">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vehicle</div>
                      <div className="text-sm font-bold text-slate-800">{activeVehicles.find(v => String(v.id) === formData.vehicle)?.registration_number || 'Unassigned'}</div>
                    </div>
                    <div className="border-t border-slate-200 pt-3">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Driver</div>
                      <div className="text-sm font-bold text-slate-800">{drivers.find(d => String(d.id) === formData.driver)?.name || 'Unassigned'}</div>
                    </div>
                    <div className="col-span-2 border-t border-slate-200 pt-3">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Depot</div>
                      <div className="text-sm font-bold text-slate-800">{formDepots.find(d => String(d.id) === formData.depot)?.name || 'Unassigned'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="border-t border-slate-200 p-6 bg-slate-50 flex justify-between items-center rounded-b">
              <button 
                onClick={() => setStep(s => s - 1)} 
                disabled={step === 1 || actionLoading}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 disabled:opacity-50 transition-colors"
              >
                Back
              </button>
              {step < 5 ? (
                <button 
                  onClick={() => setStep(s => s + 1)}
                  className="px-6 py-2 bg-blue-600 text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-blue-700 transition-colors"
                >
                  Next
                </button>
              ) : (
                <button 
                  onClick={handleCreateSubmit}
                  disabled={actionLoading}
                  className="px-6 py-2 bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-emerald-700 transition-colors flex items-center"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Create Schedule
                </button>
              )}
            </div>
          </div>
        ) : (
          /* MAIN LIST VIEW */
          <>
            {/* FILTERS */}
            <Card className="border border-slate-200 p-3 shadow-sm bg-white">
              <div className="flex flex-wrap gap-4 items-center">
                <input 
                  type="date" 
                  value={filterDate} 
                  onChange={e => setFilterDate(e.target.value)}
                  className="py-1.5 px-3 text-sm border border-slate-300 rounded font-medium focus:ring-blue-500 w-full md:w-auto"
                />
                
                <select value={filterMuni} onChange={e => {setFilterMuni(e.target.value); setFilterZone(''); setFilterWard('');}} className="py-1.5 px-3 text-sm border border-slate-300 rounded text-slate-700 focus:ring-blue-500">
                  <option value="">ALL MUNICIPALITIES</option>
                  {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                
                <select value={filterZone} onChange={e => {setFilterZone(e.target.value); setFilterWard('');}} className="py-1.5 px-3 text-sm border border-slate-300 rounded text-slate-700 focus:ring-blue-500" disabled={!filterMuni}>
                  <option value="">ALL ZONES</option>
                  {zones.filter(z => !filterMuni || z.municipality === parseInt(filterMuni)).map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
                
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="py-1.5 px-3 text-sm border border-slate-300 rounded text-slate-700 focus:ring-blue-500">
                  <option value="ALL">ALL STATUSES</option>
                  {LIFECYCLE_STAGES.map(s => <option key={s.status} value={s.status}>{s.label}</option>)}
                  <option value="CANCELLED">CANCELLED</option>
                </select>
                
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search schedules, vehicles, drivers..."
                    className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-300 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
            </Card>

            {/* ACTIVE FILTERS STRIP */}
            <div className="flex items-center gap-2 px-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Active Filters:</span>
              <span className="bg-slate-200 px-2 py-0.5 rounded">DATE: {filterDate}</span>
              {filterZone && <span className="bg-slate-200 px-2 py-0.5 rounded">ZONE: {zones.find(z => String(z.id) === filterZone)?.name || filterZone}</span>}
              {filterStatus !== 'ALL' && <span className="bg-slate-200 px-2 py-0.5 rounded">STATUS: {filterStatus}</span>}
            </div>

            {/* DATA TABLE */}
            <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3 sticky left-0 bg-slate-50 z-10">Schedule ID</th>
                      <th className="px-4 py-3">Zone / Ward</th>
                      <th className="px-4 py-3">Bins</th>
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Driver</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSchedules.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-12 text-center text-slate-500">
                          <p className="text-sm">No Collection Schedules match the current filters.</p>
                          <button onClick={() => {setFilterDate(new Date().toISOString().split('T')[0]); setFilterMuni(''); setFilterZone(''); setFilterWard(''); setFilterStatus('ALL'); setSearchQuery('');}} className="text-xs font-bold text-blue-600 mt-2 hover:underline">[ CLEAR ALL FILTERS ]</button>
                        </td>
                      </tr>
                    ) : (
                      filteredSchedules.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setSelectedScheduleId(s.id)}>
                          <td className="px-4 py-3 font-mono font-bold text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50 z-10">{s.schedule_id}</td>
                          <td className="px-4 py-3">
                            <div className="text-xs font-bold text-slate-700">{s.zone_name || '--'}</div>
                            <div className="text-[10px] text-slate-500 uppercase">{s.ward_name || '--'}</div>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-700">{(s.bins || []).length}</td>
                          <td className="px-4 py-3 text-xs">{s.vehicle_registration || <span className="text-slate-400 italic">Unassigned</span>}</td>
                          <td className="px-4 py-3 text-xs">{s.driver_name || <span className="text-slate-400 italic">Unassigned</span>}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${s.priority === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' : s.priority === 'HIGH' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                              {s.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={s.status} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button className="px-3 py-1 bg-white border border-slate-300 rounded text-[10px] font-bold text-slate-600 uppercase hover:bg-slate-50 hover:text-blue-700 transition-colors">
                              VIEW
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* DETAIL DRAWER */}
      <AnimatePresence>
        {selectedSchedule && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
              onClick={() => setSelectedScheduleId(null)}
            />
            <motion.div 
              initial={reducedMotion ? false : { x: '100%' }}
              animate={{ x: 0 }}
              exit={reducedMotion ? false : { x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[600px] lg:w-[800px] bg-slate-50 shadow-2xl z-50 flex flex-col"
            >
              <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-lg font-bold tracking-tight uppercase flex items-center">
                    {selectedSchedule.schedule_id}
                  </h2>
                  <div className="text-[10px] font-bold uppercase tracking-wider mt-1 text-slate-400">
                    {selectedSchedule.zone_name || 'NO ZONE'} · {selectedSchedule.ward_name || 'NO WARD'}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <StatusBadge status={selectedSchedule.status} />
                  <button onClick={() => setSelectedScheduleId(null)} className="text-slate-400 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                {/* ACTION BAR */}
                <div className="bg-white border border-slate-200 rounded shadow-sm p-2 flex justify-end gap-2 flex-wrap">
                  {selectedSchedule.status === 'DRAFT' && (
                    <button onClick={() => handleAction('plan', selectedSchedule.id)} disabled={actionLoading} className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold uppercase rounded hover:bg-blue-100 disabled:opacity-50">
                      Plan Schedule
                    </button>
                  )}
                  {selectedSchedule.status === 'PLANNED' && (
                    <button onClick={() => handleAction('dispatch', selectedSchedule.id)} disabled={actionLoading || !dispatchReadiness.ready} className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold uppercase rounded hover:bg-emerald-700 disabled:opacity-50">
                      {actionLoading ? 'Dispatching...' : 'Dispatch'}
                    </button>
                  )}
                  {['DRAFT', 'PLANNED'].includes(selectedSchedule.status) && (
                    <button onClick={() => { if(window.confirm('Cancel this schedule?')) handleAction('cancel', selectedSchedule.id); }} disabled={actionLoading} className="px-4 py-2 bg-white text-red-600 border border-slate-200 text-xs font-bold uppercase rounded hover:bg-red-50 disabled:opacity-50">
                      Cancel
                    </button>
                  )}
                </div>

                {/* LIFECYCLE */}
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Schedule Lifecycle</h3>
                  <div className="bg-white border border-slate-200 rounded p-4 shadow-sm flex items-center justify-between">
                    {LIFECYCLE_STAGES.map((stage, idx) => {
                      const isActive = selectedSchedule.status === stage.status;
                      const isPast = LIFECYCLE_STAGES.findIndex(s => s.status === selectedSchedule.status) >= idx;
                      const isCancelled = selectedSchedule.status === 'CANCELLED';
                      return (
                        <div key={stage.status} className="flex flex-col items-center relative z-10 w-full">
                           <div className={`w-4 h-4 rounded-full border-2 mb-2 ${isCancelled ? 'border-red-400 bg-red-100' : isActive ? 'border-blue-600 bg-blue-600' : isPast ? 'border-blue-600 bg-white' : 'border-slate-300 bg-slate-100'}`} />
                           <div className={`text-[9px] font-bold uppercase tracking-wider text-center ${isCancelled ? 'text-red-500' : isActive ? 'text-blue-700' : isPast ? 'text-slate-800' : 'text-slate-400'}`}>
                             {stage.label}
                           </div>
                           {/* Connecting line */}
                           {idx < LIFECYCLE_STAGES.length - 1 && (
                             <div className={`absolute top-2 left-1/2 w-full h-[2px] -z-10 ${isCancelled ? 'bg-red-200' : isPast ? 'bg-blue-200' : 'bg-slate-200'}`} />
                           )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* RESOURCES */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Collection Resources</h3>
                    <div className="bg-white border border-slate-200 rounded shadow-sm divide-y divide-slate-100">
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center">
                           <Truck className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                           <div>
                             <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vehicle</div>
                             <div className="text-sm font-bold text-slate-800">{selectedSchedule.vehicle_registration || <span className="text-red-500">Not Assigned</span>}</div>
                           </div>
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center">
                           <User className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                           <div>
                             <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Driver</div>
                             <div className="text-sm font-bold text-slate-800">{selectedSchedule.driver_name || <span className="text-red-500">Not Assigned</span>}</div>
                           </div>
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center">
                           <MapPin className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                           <div>
                             <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Depot</div>
                             <div className="text-sm font-bold text-slate-800">{selectedSchedule.depot ? 'Assigned' : <span className="text-red-500">Not Assigned</span>}</div>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DISPATCH READINESS */}
                  {['DRAFT', 'PLANNED'].includes(selectedSchedule.status) && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dispatch Readiness</h3>
                      <div className={`border rounded p-4 shadow-sm ${dispatchReadiness.ready ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center mb-3 border-b pb-2">
                           {dispatchReadiness.ready ? (
                             <CheckCircle className="w-5 h-5 text-emerald-600 mr-2 shrink-0" />
                           ) : (
                             <AlertTriangle className="w-5 h-5 text-red-600 mr-2 shrink-0" />
                           )}
                           <h4 className={`text-sm font-bold uppercase tracking-wider ${dispatchReadiness.ready ? 'text-emerald-800' : 'text-red-800'}`}>
                             {dispatchReadiness.ready ? 'READY FOR DISPATCH' : 'NOT READY'}
                           </h4>
                        </div>
                        <ul className="text-xs font-medium space-y-1.5">
                          <li className={`flex items-center ${selectedSchedule.bins?.length > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {selectedSchedule.bins?.length > 0 ? '✓' : '!'} Bins assigned
                          </li>
                          <li className={`flex items-center ${selectedSchedule.vehicle ? 'text-emerald-700' : 'text-red-600'}`}>
                            {selectedSchedule.vehicle ? '✓' : '!'} Vehicle assigned
                          </li>
                          <li className={`flex items-center ${selectedSchedule.driver ? 'text-emerald-700' : 'text-red-600'}`}>
                            {selectedSchedule.driver ? '✓' : '!'} Driver assigned
                          </li>
                          <li className={`flex items-center ${selectedSchedule.depot ? 'text-emerald-700' : 'text-red-600'}`}>
                            {selectedSchedule.depot ? '✓' : '!'} Depot assigned
                          </li>
                          <li className="flex items-center text-slate-500">
                            ✓ Route optimization (Generates on dispatch)
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* ROUTE METRICS (Post-dispatch) */}
                  {selectedRoute && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Route Metrics</h3>
                      <div className="bg-white border border-slate-200 rounded shadow-sm p-4">
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Method</div>
                              <div className="text-sm font-bold text-slate-800">{selectedRoute.optimization_metadata?.method || 'OR-TOOLS'}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Distance Model</div>
                              <div className="text-sm font-bold text-slate-800">HAVERSINE</div>
                            </div>
                            <div className="pt-2 border-t border-slate-100">
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Stops</div>
                              <div className="text-lg font-black text-slate-800">{selectedRoute.optimized_order?.length || 0}</div>
                            </div>
                            <div className="pt-2 border-t border-slate-100">
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Distance</div>
                              <div className="text-lg font-black text-indigo-600">{(selectedRoute.total_distance_km || 0).toFixed(1)} KM</div>
                            </div>
                         </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* OPTIMIZED ROUTE MAP & SEQUENCE */}
                {selectedRoute && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Optimized Collection Order</h3>
                    
                    <div className="bg-slate-900 border border-slate-800 rounded p-4 overflow-x-auto whitespace-nowrap hide-scrollbar">
                      <div className="flex items-center space-x-2 min-w-max px-2 text-xs font-bold">
                        <span className="bg-indigo-900 text-indigo-300 px-3 py-1 rounded-full uppercase border border-indigo-700">Depot</span>
                        {selectedRoute.optimized_order && selectedRoute.optimized_order.map((binId, idx) => (
                          <React.Fragment key={idx}>
                            <span className="text-slate-600">&rarr;</span>
                            <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">{typeof binId === 'object' ? binId.bin_id : binId}</span>
                          </React.Fragment>
                        ))}
                        <span className="text-slate-600">&rarr;</span>
                        <span className="bg-indigo-900 text-indigo-300 px-3 py-1 rounded-full uppercase border border-indigo-700">Depot</span>
                      </div>
                    </div>

                    <div className="h-64 sm:h-96 rounded border border-slate-300 overflow-hidden relative z-0">
                      {selectedRoute.bins && selectedRoute.bins.length > 0 && (
                        <MapContainer center={[selectedRoute.bins[0].lat, selectedRoute.bins[0].lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
                          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                          {selectedRoute.bins.map((bin, i) => (
                            <Marker key={i} position={[bin.lat, bin.lng]}>
                              <Popup>
                                <div className="font-bold text-xs">{bin.bin_id}</div>
                                <div className="text-[10px] text-slate-500">Fill: {bin.latest_pct}%</div>
                              </Popup>
                            </Marker>
                          ))}
                          <Polyline positions={selectedRoute.bins.map(b => [b.lat, b.lng])} color="#4f46e5" weight={3} dashArray="5, 5" />
                        </MapContainer>
                      )}
                    </div>
                  </div>
                )}

                {/* BINS LIST */}
                <div className="space-y-4">
                   <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                     <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Collection Bins</h3>
                     <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">{(selectedSchedule.bins || []).length} BINS</span>
                   </div>
                   <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
                     <table className="w-full text-left text-xs whitespace-nowrap">
                       <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase text-slate-500">
                         <tr>
                           <th className="px-4 py-2">Bin ID</th>
                           <th className="px-4 py-2">Source</th>
                           <th className="px-4 py-2">Fill</th>
                           <th className="px-4 py-2 text-right">Status</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                         {selectedSchedule.bins && selectedSchedule.bins.map(binId => {
                           const b = bins.find(bx => bx.id === binId || bx.bin_id === binId);
                           if (!b) return null;
                           const pct = b.latest_pct || 0;
                           const isSim = b.data_source === 'SIMULATED';
                           return (
                             <tr key={b.id} className="hover:bg-slate-50">
                               <td className="px-4 py-2 font-mono font-bold text-slate-800">{b.bin_id}</td>
                               <td className="px-4 py-2">
                                 {isSim ? (
                                   <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-bold uppercase border border-slate-200">SIMULATED</span>
                                 ) : (
                                   <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded font-bold uppercase border border-indigo-200">REAL DEVICE</span>
                                 )}
                               </td>
                               <td className="px-4 py-2 font-bold text-slate-700">{Math.round(pct)}%</td>
                               <td className="px-4 py-2 text-right">
                                 <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${pct >= 80 ? 'bg-red-100 text-red-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                   {pct >= 80 ? 'CRITICAL' : pct >= 50 ? 'HIGH' : 'NORMAL'}
                                 </span>
                               </td>
                             </tr>
                           );
                         })}
                       </tbody>
                     </table>
                   </div>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
