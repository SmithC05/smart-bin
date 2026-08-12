import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import StatusBadge from '../components/ui/StatusBadge';
import api from '../api';
import { 
  AlertTriangle, ShieldAlert, CheckCircle, Clock, 
  MapPin, Activity, Search, RefreshCw, X, Link as LinkIcon,
  Filter
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function Alerts() {
  const reducedMotion = useReducedMotion();
  const { user } = useAuth();
  
  // Data State
  const [alerts, setAlerts] = useState([]);
  const [bins, setBins] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [staff, setStaff] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [zones, setZones] = useState([]);
  const [wards, setWards] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  
  // View State
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  
  // Filters
  const [filterMuni, setFilterMuni] = useState('');
  const [filterZone, setFilterZone] = useState('');
  const [filterWard, setFilterWard] = useState('');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      if (!alerts.length) setLoading(true);
      setErrorMsg(null);
      
      const [
        alertsRes, binsRes, schedulesRes, routesRes, 
        vehiclesRes, staffRes, muniRes, zoneRes, wardRes
      ] = await Promise.all([
        api.get('/alerts/'),
        api.get('/bins/'),
        api.get('/schedules/'),
        api.get('/routes/'),
        api.get('/vehicles/'),
        api.get('/staff/'),
        api.get('/municipalities/'),
        api.get('/zones/'),
        api.get('/wards/')
      ]);
      
      setAlerts(alertsRes.data);
      setBins(binsRes.data);
      setSchedules(schedulesRes.data);
      setRoutes(routesRes.data);
      setVehicles(vehiclesRes.data);
      setStaff(staffRes.data);
      setMunicipalities(muniRes.data);
      setZones(zoneRes.data);
      setWards(wardRes.data);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setErrorMsg('Unable to retrieve alert information from the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (alertId, action) => {
    setActionLoading(true);
    try {
      await api.patch(`/alerts/${alertId}/`, { status: action });
      await fetchData();
    } catch (error) {
      alert(`Failed to ${action} alert.`);
    } finally {
      setActionLoading(false);
    }
  };

  // Derived Data
  const augmentedAlerts = useMemo(() => {
    return alerts.map(alert => {
      const bin = bins.find(b => b.bin_id === alert.bin_id || b.id === alert.bin);
      return { ...alert, bin_details: bin };
    });
  }, [alerts, bins]);

  const selectedAlert = useMemo(() => 
    augmentedAlerts.find(a => a.id === selectedAlertId), 
  [augmentedAlerts, selectedAlertId]);

  const activeRelationships = useMemo(() => {
    if (!selectedAlert || !selectedAlert.bin_details) return null;
    
    // Find active schedule that includes this route/bin
    const activeSchedule = schedules.find(s => 
      ['DISPATCHED', 'IN_PROGRESS'].includes(s.status) &&
      s.route_details?.bins?.some(b => b.id === selectedAlert.bin_details.id)
    );
    
    if (!activeSchedule) return null;
    
    const vehicle = vehicles.find(v => v.id === activeSchedule.vehicle);
    const driver = staff.find(s => vehicle && (s.id === vehicle.driver || s.username === vehicle.driver_name || s.name === vehicle.driver_name));
    
    return {
      schedule: activeSchedule,
      route: activeSchedule.route_details || routes.find(r => r.id === activeSchedule.route),
      vehicle,
      driver
    };
  }, [selectedAlert, schedules, routes, vehicles, staff]);

  const filteredAlerts = useMemo(() => {
    return augmentedAlerts.filter(a => {
      if (filterPriority !== 'ALL' && a.level !== filterPriority) return false;
      if (filterStatus !== 'ALL' && a.status !== filterStatus) return false;
      
      const b = a.bin_details;
      if (b) {
        if (filterMuni && String(b.municipality) !== filterMuni) return false;
        if (filterZone && String(b.zone) !== filterZone) return false;
        if (filterWard && String(b.ward) !== filterWard) return false;
      } else if (filterMuni || filterZone || filterWard) {
        return false;
      }
      
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!(
          String(a.id).includes(q) ||
          (a.bin_id || '').toLowerCase().includes(q) ||
          (a.message || '').toLowerCase().includes(q) ||
          (a.location || '').toLowerCase().includes(q)
        )) return false;
      }
      return true;
    });
  }, [augmentedAlerts, filterPriority, filterStatus, filterMuni, filterZone, filterWard, searchQuery]);

  const metrics = useMemo(() => {
    let danger = 0, warning = 0, open = 0, acknowledged = 0, resolved = 0;
    
    augmentedAlerts.forEach(a => {
      if (a.level === 'danger') danger++;
      if (a.level === 'warning') warning++;
      
      if (a.status === 'open') open++;
      if (a.status === 'acknowledged') acknowledged++;
      if (a.status === 'resolved') resolved++;
    });
    
    return { total: augmentedAlerts.length, danger, warning, open, acknowledged, resolved };
  }, [augmentedAlerts]);

  const unhandledDanger = useMemo(() => augmentedAlerts.filter(a => a.level === 'danger' && a.status === 'open'), [augmentedAlerts]);
  const unhandledWarning = useMemo(() => augmentedAlerts.filter(a => a.level === 'warning' && a.status === 'open'), [augmentedAlerts]);

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* HEADER */}
      <div className="bg-slate-900 text-white px-6 py-4 shadow-md sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase flex items-center">
              <ShieldAlert className="w-5 h-5 mr-2 text-red-500" />
              Alerts & Incidents
            </h1>
            <p className="text-sm text-slate-400 mt-1">Municipal operational alerts, exceptions and incident monitoring.</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Last Updated</div>
              <div className="text-xs font-bold text-slate-300">{format(new Date(), 'HH:mm:ss')}</div>
            </div>
            <button onClick={fetchData} className="p-2 bg-slate-800 hover:bg-slate-700 rounded transition-colors text-slate-300 flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded text-sm flex items-center shadow-sm">
            <AlertTriangle className="w-5 h-5 mr-2 shrink-0" />
            <div className="flex-1 font-medium">{errorMsg}</div>
          </div>
        )}

        {/* STATUS STRIP */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded p-4 flex flex-col justify-center items-center text-center shadow-sm">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">TOTAL ALERTS</div>
            <div className="text-2xl font-black text-white">{String(metrics.total).padStart(2, '0')}</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded p-4 flex flex-col justify-center items-center text-center shadow-sm">
            <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">DANGER</div>
            <div className="text-2xl font-black text-red-700">{String(metrics.danger).padStart(2, '0')}</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded p-4 flex flex-col justify-center items-center text-center shadow-sm">
            <div className="text-[10px] font-bold text-orange-700 uppercase tracking-wider mb-1">WARNING</div>
            <div className="text-2xl font-black text-orange-700">{String(metrics.warning).padStart(2, '0')}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded p-4 flex flex-col justify-center items-center text-center shadow-sm">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">OPEN</div>
            <div className="text-2xl font-black text-slate-800">{String(metrics.open).padStart(2, '0')}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded p-4 flex flex-col justify-center items-center text-center shadow-sm">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">ACKNOWLEDGED</div>
            <div className="text-2xl font-black text-indigo-600">{String(metrics.acknowledged).padStart(2, '0')}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded p-4 flex flex-col justify-center items-center text-center shadow-sm">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">RESOLVED</div>
            <div className="text-2xl font-black text-emerald-600">{String(metrics.resolved).padStart(2, '0')}</div>
          </div>
        </div>

        {/* IMMEDIATE ATTENTION */}
        <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden flex flex-col md:flex-row">
           <div className="bg-slate-900 text-white p-4 md:w-64 shrink-0 flex flex-col justify-center">
             <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Action Required</div>
             <h3 className="text-sm font-bold tracking-tight uppercase flex items-center">
               <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
               Immediate Attention
             </h3>
           </div>
           <div className="p-4 flex-1 flex flex-wrap gap-6 items-center">
             {unhandledDanger.length === 0 && unhandledWarning.length === 0 ? (
               <div className="flex items-center text-emerald-600 text-sm font-bold">
                 <CheckCircle className="w-5 h-5 mr-2" />
                 NO CRITICAL INCIDENTS REQUIRE IMMEDIATE ATTENTION
               </div>
             ) : (
               <>
                 {unhandledDanger.length > 0 && (
                   <div className="flex items-center text-red-600 font-bold cursor-pointer hover:underline" onClick={() => {setFilterPriority('danger'); setFilterStatus('open');}}>
                     <span className="text-xl font-black mr-2">{String(unhandledDanger.length).padStart(2, '0')}</span>
                     <span className="text-xs uppercase tracking-wider">OPEN DANGER ALERTS</span>
                   </div>
                 )}
                 {unhandledWarning.length > 0 && (
                   <div className="flex items-center text-orange-600 font-bold cursor-pointer hover:underline" onClick={() => {setFilterPriority('warning'); setFilterStatus('open');}}>
                     <span className="text-xl font-black mr-2">{String(unhandledWarning.length).padStart(2, '0')}</span>
                     <span className="text-xs uppercase tracking-wider">OPEN WARNING ALERTS</span>
                   </div>
                 )}
               </>
             )}
           </div>
        </div>

        {/* FILTERS */}
        <Card className="border border-slate-200 p-3 shadow-sm bg-white">
          <div className="flex flex-wrap gap-4 items-center">
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="py-1.5 px-3 text-sm border border-slate-300 rounded text-slate-700 focus:ring-blue-500">
                <option value="ALL">ALL PRIORITIES</option>
                <option value="danger">DANGER</option>
                <option value="warning">WARNING</option>
              </select>
            </div>

            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="py-1.5 px-3 text-sm border border-slate-300 rounded text-slate-700 focus:ring-blue-500">
              <option value="ALL">ALL STATUSES</option>
              <option value="open">OPEN</option>
              <option value="acknowledged">ACKNOWLEDGED</option>
              <option value="resolved">RESOLVED</option>
            </select>
            
            <div className="w-px h-6 bg-slate-300 mx-1 hidden md:block"></div>
            
            <select value={filterMuni} onChange={e => {setFilterMuni(e.target.value); setFilterZone(''); setFilterWard('');}} className="py-1.5 px-3 text-sm border border-slate-300 rounded text-slate-700 focus:ring-blue-500">
              <option value="">ALL MUNICIPALITIES</option>
              {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            
            <select value={filterZone} onChange={e => {setFilterZone(e.target.value); setFilterWard('');}} className="py-1.5 px-3 text-sm border border-slate-300 rounded text-slate-700 focus:ring-blue-500" disabled={!filterMuni}>
              <option value="">ALL ZONES</option>
              {zones.filter(z => !filterMuni || z.municipality === parseInt(filterMuni)).map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
            
            <select value={filterWard} onChange={e => setFilterWard(e.target.value)} className="py-1.5 px-3 text-sm border border-slate-300 rounded text-slate-700 focus:ring-blue-500" disabled={!filterZone}>
              <option value="">ALL WARDS</option>
              {wards.filter(w => !filterZone || w.zone === parseInt(filterZone)).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search alerts or bins..."
                className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-300 rounded focus:ring-blue-500"
              />
            </div>
          </div>
        </Card>
        
        {/* ACTIVE FILTERS STRIP */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 px-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Active Filters:</span>
            {filterPriority !== 'ALL' && <span className="bg-slate-200 px-2 py-0.5 rounded">PRIORITY: {filterPriority}</span>}
            {filterStatus !== 'ALL' && <span className="bg-slate-200 px-2 py-0.5 rounded">STATUS: {filterStatus}</span>}
            {filterZone && <span className="bg-slate-200 px-2 py-0.5 rounded">ZONE: {zones.find(z => String(z.id) === filterZone)?.name || filterZone}</span>}
            {filterWard && <span className="bg-slate-200 px-2 py-0.5 rounded">WARD: {wards.find(w => String(w.id) === filterWard)?.name || filterWard}</span>}
            {(filterPriority !== 'ALL' || filterStatus !== 'ALL' || filterZone || filterWard || filterMuni) && (
               <button 
                 onClick={() => {setFilterMuni(''); setFilterZone(''); setFilterWard(''); setFilterPriority('ALL'); setFilterStatus('ALL'); setSearchQuery('');}} 
                 className="text-indigo-600 hover:underline ml-2"
               >[ CLEAR ALL ]</button>
            )}
          </div>
        </div>

        {/* ALERT TABLE */}
        <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3 sticky left-0 bg-slate-50 z-10">Time</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Bin / Asset</th>
                  <th className="px-4 py-3">Zone / Ward</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-16 text-center">
                      <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">No matching alerts</p>
                      <p className="text-xs text-slate-500 mt-1">There are currently no active alerts within this scope.</p>
                    </td>
                  </tr>
                ) : (
                  filteredAlerts.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setSelectedAlertId(a.id)}>
                      <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-slate-50 z-10">
                        <div className="text-sm font-bold text-slate-800 font-mono">{format(new Date(a.created_at), 'HH:mm')}</div>
                        <div className="text-[9px] text-slate-400 uppercase font-bold">{format(new Date(a.created_at), 'dd MMM')}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase inline-flex border ${
                          a.level === 'danger' ? 'bg-red-50 text-red-700 border-red-200' : 
                          'bg-orange-50 text-orange-700 border-orange-200'
                        }`}>
                          {a.level}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold text-slate-800">{a.message}</div>
                        {a.fill_pct && (
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Fill: {Math.round(a.fill_pct)}%</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase inline-flex border ${
                          a.bin_details?.is_simulated ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                          {a.bin_details?.is_simulated ? 'SIMULATED' : 'REAL DEVICE'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-800 font-mono">
                        {a.bin_id || 'UNKNOWN'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {a.bin_details ? (
                          <>
                            <div className="font-bold text-slate-700">{zones.find(z => z.id === a.bin_details.zone)?.name || '--'}</div>
                            <div className="text-[10px] uppercase text-slate-500">{wards.find(w => w.id === a.bin_details.ward)?.name || '--'}</div>
                          </>
                        ) : '--'}
                      </td>
                      <td className="px-4 py-3">
                        <div className={`text-[10px] font-bold uppercase tracking-wider ${
                          a.status === 'open' ? 'text-slate-800' :
                          a.status === 'acknowledged' ? 'text-indigo-600' : 'text-emerald-600'
                        }`}>
                          {a.status}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="px-3 py-1 bg-white border border-slate-300 rounded text-[10px] font-bold text-slate-600 uppercase hover:bg-slate-50 hover:text-indigo-700 transition-colors">
                          REVIEW
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* INCIDENT DETAIL DRAWER */}
      <AnimatePresence>
        {selectedAlert && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
              onClick={() => setSelectedAlertId(null)}
            />
            <motion.div 
              initial={reducedMotion ? false : { x: '100%' }}
              animate={{ x: 0 }}
              exit={reducedMotion ? false : { x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[500px] lg:w-[600px] bg-slate-50 shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className={`px-6 py-4 flex justify-between items-center shrink-0 text-white ${
                selectedAlert.level === 'danger' ? 'bg-red-700' : 
                selectedAlert.level === 'warning' ? 'bg-orange-600' : 'bg-slate-900'
              }`}>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold tracking-tight uppercase flex items-center">
                      INCIDENT
                    </h2>
                    <span className="text-[10px] font-bold bg-black/20 px-2 py-0.5 rounded tracking-widest">
                      {selectedAlert.level}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider mt-1 text-white/70 font-mono">
                    ALT-{String(selectedAlert.id).padStart(5, '0')}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-[10px] font-bold px-2 py-1 bg-white/20 rounded uppercase tracking-wider">
                    {selectedAlert.status}
                  </span>
                  <button onClick={() => setSelectedAlertId(null)} className="text-white/70 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 hide-scrollbar">
                
                {/* ACTION BAR */}
                <div className="bg-white border border-slate-200 rounded shadow-sm p-3 flex justify-between items-center flex-wrap gap-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Operational Action</div>
                  <div className="flex gap-2">
                    {selectedAlert.status === 'open' && (
                      <button 
                        onClick={() => handleAction(selectedAlert.id, 'acknowledged')}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold uppercase rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        Acknowledge Alert
                      </button>
                    )}
                    {(selectedAlert.status === 'open' || selectedAlert.status === 'acknowledged') && (
                      <button 
                        onClick={() => handleAction(selectedAlert.id, 'resolved')}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-white text-emerald-600 border border-emerald-200 text-xs font-bold uppercase rounded hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                      >
                        Resolve Incident
                      </button>
                    )}
                    {selectedAlert.status === 'resolved' && (
                      <div className="flex items-center text-emerald-600 text-xs font-bold uppercase tracking-wider px-2">
                        <CheckCircle className="w-4 h-4 mr-1" /> Incident Resolved
                      </div>
                    )}
                  </div>
                </div>

                {/* SUMMARY & SOURCE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Incident Summary</h3>
                    <div className="bg-white border border-slate-200 rounded p-4 shadow-sm h-[120px] flex flex-col justify-center">
                       <div className="text-sm font-bold text-slate-800 mb-2">{selectedAlert.message}</div>
                       <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">CURRENT READING</div>
                       <div className={`text-2xl font-black ${selectedAlert.level === 'danger' ? 'text-red-600' : 'text-orange-600'}`}>
                         {Math.round(selectedAlert.fill_pct)}%
                       </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Source</h3>
                    <div className="bg-white border border-slate-200 rounded p-4 shadow-sm h-[120px] flex flex-col justify-center">
                       <div className="flex items-center mb-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase border ${
                            selectedAlert.bin_details?.is_simulated ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            {selectedAlert.bin_details?.is_simulated ? 'SIMULATED' : 'REAL DEVICE'}
                          </span>
                       </div>
                       <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">BIN ASSET</div>
                       <div className="text-lg font-black text-slate-800 font-mono">{selectedAlert.bin_id}</div>
                    </div>
                  </div>
                </div>

                {/* LIFECYCLE */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Incident Lifecycle</h3>
                  <div className="bg-white border border-slate-200 rounded p-4 shadow-sm flex flex-col md:flex-row justify-between relative">
                    <div className="hidden md:block absolute top-1/2 left-8 right-8 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
                    
                    <div className="relative z-10 flex md:flex-col items-center gap-3 md:gap-1 mb-4 md:mb-0">
                       <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-sm shrink-0"></div>
                       <div className="md:text-center flex-1 md:flex-none">
                         <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">DETECTED</div>
                         <div className="text-xs font-bold text-slate-800 font-mono">{format(new Date(selectedAlert.created_at), 'HH:mm:ss')}</div>
                         <div className="text-[9px] text-slate-400">{format(new Date(selectedAlert.created_at), 'dd MMM yyyy')}</div>
                       </div>
                    </div>
                    
                    <div className="relative z-10 flex md:flex-col items-center gap-3 md:gap-1 mb-4 md:mb-0">
                       <div className={`w-4 h-4 rounded-full border-2 border-white shadow-sm shrink-0 ${selectedAlert.acknowledged_at ? 'bg-indigo-500' : 'bg-slate-200'}`}></div>
                       <div className="md:text-center flex-1 md:flex-none">
                         <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">ACKNOWLEDGED</div>
                         {selectedAlert.acknowledged_at ? (
                           <>
                             <div className="text-xs font-bold text-slate-800 font-mono">{format(new Date(selectedAlert.acknowledged_at), 'HH:mm:ss')}</div>
                             <div className="text-[9px] text-slate-400">{format(new Date(selectedAlert.acknowledged_at), 'dd MMM yyyy')}</div>
                           </>
                         ) : <div className="text-xs font-bold text-slate-300">—</div>}
                       </div>
                    </div>

                    <div className="relative z-10 flex md:flex-col items-center gap-3 md:gap-1">
                       <div className={`w-4 h-4 rounded-full border-2 border-white shadow-sm shrink-0 ${selectedAlert.resolved_at ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                       <div className="md:text-center flex-1 md:flex-none">
                         <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">RESOLVED</div>
                         {selectedAlert.resolved_at ? (
                           <>
                             <div className="text-xs font-bold text-slate-800 font-mono">{format(new Date(selectedAlert.resolved_at), 'HH:mm:ss')}</div>
                             <div className="text-[9px] text-slate-400">{format(new Date(selectedAlert.resolved_at), 'dd MMM yyyy')}</div>
                           </>
                         ) : <div className="text-xs font-bold text-slate-300">—</div>}
                       </div>
                    </div>
                  </div>
                </div>

                {/* OPERATIONAL CONTEXT */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operational Context</h3>
                  <div className="bg-white border border-slate-200 rounded p-4 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4">
                    <div>
                       <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">MUNICIPALITY</span>
                       <span className="text-sm font-bold text-slate-800">{selectedAlert.bin_details ? (municipalities.find(m => m.id === selectedAlert.bin_details.municipality)?.name || '--') : '--'}</span>
                    </div>
                    <div>
                       <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">ZONE & WARD</span>
                       <span className="text-sm font-bold text-slate-800">
                         {selectedAlert.bin_details ? `${zones.find(z => z.id === selectedAlert.bin_details.zone)?.name || '--'} · ${wards.find(w => w.id === selectedAlert.bin_details.ward)?.name || '--'}` : '--'}
                       </span>
                    </div>

                    {activeRelationships ? (
                      <div className="md:col-span-2 mt-2 pt-4 border-t border-slate-100">
                        <div className="flex items-center text-amber-600 text-[10px] font-bold uppercase tracking-wider mb-3">
                          <Activity className="w-3 h-3 mr-1" />
                          Collection Impact Detected
                        </div>
                        <div className="grid grid-cols-2 gap-4 bg-amber-50/50 p-3 rounded border border-amber-100">
                          <div>
                            <span className="block text-[9px] font-bold text-amber-700/70 uppercase tracking-wider mb-0.5">ACTIVE SCHEDULE</span>
                            <span className="text-xs font-bold text-amber-900 font-mono">{activeRelationships.schedule.schedule_id}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-amber-700/70 uppercase tracking-wider mb-0.5">ROUTE</span>
                            <span className="text-xs font-bold text-amber-900 font-mono">{activeRelationships.route.route_id}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-amber-700/70 uppercase tracking-wider mb-0.5">VEHICLE</span>
                            <span className="text-xs font-bold text-amber-900 font-mono">{activeRelationships.vehicle?.vehicle_id || 'NOT ASSIGNED'}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-amber-700/70 uppercase tracking-wider mb-0.5">DRIVER</span>
                            <span className="text-xs font-bold text-amber-900">{activeRelationships.driver?.name || 'NOT ASSIGNED'}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                       <div className="md:col-span-2 mt-2 pt-4 border-t border-slate-100 text-center">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NO ACTIVE COLLECTION IMPACT</span>
                       </div>
                    )}
                  </div>
                </div>

                {/* MAP */}
                {selectedAlert.bin_details && selectedAlert.bin_details.latitude && selectedAlert.bin_details.longitude && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Incident Location</h3>
                    <div className="bg-white border border-slate-200 rounded shadow-sm h-64 overflow-hidden relative z-0">
                      <MapContainer 
                        center={[selectedAlert.bin_details.latitude, selectedAlert.bin_details.longitude]} 
                        zoom={15} 
                        scrollWheelZoom={false}
                        className="h-full w-full"
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker 
                          position={[selectedAlert.bin_details.latitude, selectedAlert.bin_details.longitude]}
                          icon={selectedAlert.level === 'danger' ? redIcon : orangeIcon}
                        >
                          <Popup>
                            <div className="font-bold font-mono">{selectedAlert.bin_id}</div>
                            <div className="text-xs uppercase">{selectedAlert.message}</div>
                          </Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                    <div className="text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                      LAT: {selectedAlert.bin_details.latitude} · LNG: {selectedAlert.bin_details.longitude}
                    </div>
                  </div>
                )}
                
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
