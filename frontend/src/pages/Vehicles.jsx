import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import StatusBadge from '../components/ui/StatusBadge';
import api from '../api';
import { 
  Plus, Edit2, Trash2, X, Save, Truck, User, MapPin, 
  Eye, RefreshCw, AlertTriangle, Search, Activity, Navigation, Wrench, ShieldAlert
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const EMPTY_FORM = {
  vehicle_id: '',
  registration_number: '',
  vehicle_type: 'COMPACTOR',
  capacity: '',
  capacity_unit: 'm3',
  municipality: '',
  zone: '',
  depot: '',
  driver: '',
  status: 'AVAILABLE',
  is_active: true
};

export default function Vehicles() {
  const reducedMotion = useReducedMotion();
  const { user } = useAuth();
  const canManage = ['system_admin', 'municipal_admin', 'zone_supervisor'].includes(user?.role);
  
  // Data State
  const [vehicles, setVehicles] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  
  // Masters
  const [municipalities, setMunicipalities] = useState([]);
  const [zones, setZones] = useState([]);
  const [depots, setDepots] = useState([]);
  const [staff, setStaff] = useState([]);
  
  // View State
  const [viewState, setViewState] = useState('LIST'); // LIST, MAP
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [form, setForm] = useState(null); // null or form object
  
  // Filters
  const [filterMuni, setFilterMuni] = useState('');
  const [filterZone, setFilterZone] = useState('');
  const [filterDepot, setFilterDepot] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Action state
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchMasters();
    fetchFleetData();
  }, []);

  const fetchFleetData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [vehRes, schedRes, routesRes] = await Promise.all([
        api.get('/vehicles/'),
        api.get('/schedules/'),
        api.get('/routes/') 
      ]);
      setVehicles(vehRes.data);
      setSchedules(schedRes.data);
      setRoutes(routesRes.data);
    } catch (error) {
      console.error('Error fetching fleet data:', error);
      setErrorMsg('Unable to retrieve vehicle information.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMasters = async () => {
    try {
      const [muniRes, zoneRes, depotRes, staffRes] = await Promise.all([
        api.get('/municipalities/'), api.get('/zones/'), api.get('/depots/'), api.get('/staff/')
      ]);
      setMunicipalities(muniRes.data);
      setZones(zoneRes.data);
      setDepots(depotRes.data);
      setStaff(staffRes.data);
    } catch (error) {
      console.error('Error fetching masters:', error);
    }
  };

  // Derived Data
  const selectedVehicle = useMemo(() => 
    vehicles.find(v => v.id === selectedVehicleId), 
  [vehicles, selectedVehicleId]);

  const activeOperation = useMemo(() => {
    if (!selectedVehicle) return null;
    const activeScheds = schedules.filter(s => String(s.vehicle) === String(selectedVehicle.id) && ['DISPATCHED', 'IN_PROGRESS'].includes(s.status));
    if (activeScheds.length === 0) return null;
    // get most recent
    activeScheds.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    const sched = activeScheds[0];
    const route = routes.find(r => r.schedule === sched.id);
    return { schedule: sched, route };
  }, [selectedVehicle, schedules, routes]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      if (filterMuni && String(v.municipality) !== filterMuni) return false;
      if (filterZone && String(v.zone) !== filterZone) return false;
      if (filterDepot && String(v.depot) !== filterDepot) return false;
      if (filterType !== 'ALL' && v.vehicle_type !== filterType) return false;
      if (filterStatus !== 'ALL' && v.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!(
          v.vehicle_id.toLowerCase().includes(q) ||
          v.registration_number.toLowerCase().includes(q) ||
          (v.driver_name || '').toLowerCase().includes(q)
        )) return false;
      }
      return true;
    });
  }, [vehicles, filterMuni, filterZone, filterDepot, filterType, filterStatus, searchQuery]);

  const metrics = useMemo(() => {
    let available = 0, assigned = 0, onRoute = 0, maintenance = 0, inactive = 0;
    let compactors = 0, tippers = 0, miniTrucks = 0, tractors = 0, others = 0;
    
    vehicles.forEach(v => {
      if (v.status === 'AVAILABLE') available++;
      if (v.status === 'ASSIGNED') assigned++;
      if (v.status === 'ON_ROUTE') onRoute++;
      if (v.status === 'MAINTENANCE') maintenance++;
      if (v.status === 'INACTIVE') inactive++;
      
      if (v.vehicle_type === 'COMPACTOR') compactors++;
      if (v.vehicle_type === 'TIPPER') tippers++;
      if (v.vehicle_type === 'MINI_TRUCK') miniTrucks++;
      if (v.vehicle_type === 'TRACTOR') tractors++;
      if (v.vehicle_type === 'OTHER') others++;
    });
    
    const unassignedDrivers = vehicles.filter(v => !v.driver && v.status !== 'INACTIVE').length;
    
    return { 
      total: vehicles.length, available, assigned, onRoute, maintenance, inactive,
      unassignedDrivers,
      types: { compactors, tippers, miniTrucks, tractors, others }
    };
  }, [vehicles]);

  const drivers = staff.filter(s => s.role === 'driver' && s.employment_status === 'ACTIVE');

  // Actions
  const saveVehicle = async () => {
    setActionLoading(true);
    try {
      const payload = {
        ...form,
        municipality: form.municipality ? Number(form.municipality) : null,
        zone: form.zone ? Number(form.zone) : null,
        depot: form.depot ? Number(form.depot) : null,
        driver: form.driver ? Number(form.driver) : null,
        capacity: Number(form.capacity)
      };
      
      if (form.id) {
        await api.patch(`/vehicles/${form.id}/`, payload);
      } else {
        await api.post('/vehicles/', payload);
      }
      setForm(null);
      await fetchFleetData();
    } catch (err) {
      alert(err.response?.data?.detail || err.response?.data?.error || 'Failed to save vehicle.');
    } finally {
      setActionLoading(false);
    }
  };

  const deactivateVehicle = async (v) => {
    if (!window.confirm(`Are you sure you want to deactivate ${v.vehicle_id}? This vehicle will no longer appear as an active fleet asset.`)) return;
    setActionLoading(true);
    try {
      await api.patch(`/vehicles/${v.id}/`, { status: 'INACTIVE', is_active: false });
      await fetchFleetData();
      if (selectedVehicleId === v.id) setSelectedVehicleId(null);
    } catch (err) {
      alert('Failed to deactivate vehicle.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* HEADER */}
      <div className="bg-slate-900 text-white px-6 py-4 shadow-md sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase flex items-center">
              <Truck className="w-5 h-5 mr-2 text-indigo-400" />
              Fleet Management
            </h1>
            <p className="text-sm text-slate-400 mt-1">Municipal collection vehicle registry, assignment and operational status.</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right mr-4 hidden sm:block">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Last Updated</div>
              <div className="text-xs font-bold text-slate-300">{format(new Date(), 'HH:mm')}</div>
            </div>
            <button onClick={fetchFleetData} className="p-2 bg-slate-800 hover:bg-slate-700 rounded transition-colors text-slate-300">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {canManage && (
              <button 
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setSelectedVehicleId(null);
                }}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-bold uppercase tracking-wider rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Vehicle</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded text-sm flex items-center shadow-sm">
            <AlertTriangle className="w-5 h-5 mr-2 shrink-0" />
            <div className="flex-1 font-medium">{errorMsg}</div>
            <button onClick={fetchFleetData} className="text-xs font-bold uppercase bg-white border border-red-200 px-3 py-1 rounded hover:bg-red-50 transition-colors">Retry</button>
          </div>
        )}

        {/* FLEET STATUS STRIP */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded p-4 flex flex-col justify-center items-center text-center shadow-sm">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">TOTAL</div>
            <div className="text-2xl font-black text-white">{String(metrics.total).padStart(2, '0')}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded p-4 flex flex-col justify-center items-center text-center shadow-sm">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">AVAILABLE</div>
            <div className="text-2xl font-black text-emerald-600">{String(metrics.available).padStart(2, '0')}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded p-4 flex flex-col justify-center items-center text-center shadow-sm">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">ASSIGNED</div>
            <div className="text-2xl font-black text-blue-600">{String(metrics.assigned).padStart(2, '0')}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded p-4 flex flex-col justify-center items-center text-center shadow-sm">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">ON ROUTE</div>
            <div className="text-2xl font-black text-indigo-600">{String(metrics.onRoute).padStart(2, '0')}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded p-4 flex flex-col justify-center items-center text-center shadow-sm">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">MAINTENANCE</div>
            <div className="text-2xl font-black text-red-600">{String(metrics.maintenance).padStart(2, '0')}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded p-4 flex flex-col justify-center items-center text-center shadow-sm">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">INACTIVE</div>
            <div className="text-2xl font-black text-slate-400">{String(metrics.inactive).padStart(2, '0')}</div>
          </div>
        </div>

        {/* SECONDARY STRIPS (Readiness & Distribution) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* Readiness */}
           <div className="bg-white border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row justify-between items-center rounded">
              <div className="flex items-center mb-2 md:mb-0">
                <ShieldAlert className="w-5 h-5 text-slate-400 mr-2" />
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Fleet Attention</h3>
              </div>
              <div className="flex space-x-6 text-center">
                 <div>
                   <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">MAINTENANCE</div>
                   <div className="text-lg font-bold text-red-600">{String(metrics.maintenance).padStart(2, '0')}</div>
                 </div>
                 <div>
                   <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">UNASSIGNED</div>
                   <div className="text-lg font-bold text-amber-600">{String(metrics.unassignedDrivers).padStart(2, '0')}</div>
                 </div>
              </div>
           </div>

           {/* Type Distribution */}
           <div className="bg-white border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row justify-between items-center rounded overflow-x-auto">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 md:mb-0 mr-4 shrink-0">Vehicle Types</h3>
              <div className="flex space-x-4 text-center">
                 <div>
                   <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">COMPACTOR</div>
                   <div className="text-sm font-bold text-slate-800">{metrics.types.compactors}</div>
                 </div>
                 <div>
                   <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TIPPER</div>
                   <div className="text-sm font-bold text-slate-800">{metrics.types.tippers}</div>
                 </div>
                 <div>
                   <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">MINI TRUCK</div>
                   <div className="text-sm font-bold text-slate-800">{metrics.types.miniTrucks}</div>
                 </div>
                 <div>
                   <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TRACTOR</div>
                   <div className="text-sm font-bold text-slate-800">{metrics.types.tractors}</div>
                 </div>
              </div>
           </div>
        </div>

        {/* FILTERS */}
        <Card className="border border-slate-200 p-3 shadow-sm bg-white">
          <div className="flex flex-wrap gap-4 items-center">
            
            <select value={filterMuni} onChange={e => {setFilterMuni(e.target.value); setFilterZone(''); setFilterDepot('');}} className="py-1.5 px-3 text-sm border border-slate-300 rounded text-slate-700 focus:ring-blue-500">
              <option value="">ALL MUNICIPALITIES</option>
              {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            
            <select value={filterZone} onChange={e => {setFilterZone(e.target.value); setFilterDepot('');}} className="py-1.5 px-3 text-sm border border-slate-300 rounded text-slate-700 focus:ring-blue-500" disabled={!filterMuni}>
              <option value="">ALL ZONES</option>
              {zones.filter(z => !filterMuni || z.municipality === parseInt(filterMuni)).map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
            
            <select value={filterDepot} onChange={e => setFilterDepot(e.target.value)} className="py-1.5 px-3 text-sm border border-slate-300 rounded text-slate-700 focus:ring-blue-500" disabled={!filterMuni}>
              <option value="">ALL DEPOTS</option>
              {depots.filter(d => (!filterMuni || d.municipality === parseInt(filterMuni)) && (!filterZone || !d.zone || d.zone === parseInt(filterZone))).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>

            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="py-1.5 px-3 text-sm border border-slate-300 rounded text-slate-700 focus:ring-blue-500">
              <option value="ALL">ALL TYPES</option>
              <option value="COMPACTOR">COMPACTOR</option>
              <option value="TIPPER">TIPPER</option>
              <option value="MINI_TRUCK">MINI TRUCK</option>
              <option value="TRACTOR">TRACTOR</option>
              <option value="OTHER">OTHER</option>
            </select>
            
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="py-1.5 px-3 text-sm border border-slate-300 rounded text-slate-700 focus:ring-blue-500">
              <option value="ALL">ALL STATUSES</option>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="ON_ROUTE">ON ROUTE</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
            
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vehicles, registration..."
                className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-300 rounded focus:ring-blue-500"
              />
            </div>
          </div>
        </Card>

        {/* ACTIVE FILTERS STRIP */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 px-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Active Filters:</span>
            {filterZone && <span className="bg-slate-200 px-2 py-0.5 rounded">ZONE: {zones.find(z => String(z.id) === filterZone)?.name || filterZone}</span>}
            {filterDepot && <span className="bg-slate-200 px-2 py-0.5 rounded">DEPOT: {depots.find(d => String(d.id) === filterDepot)?.name || filterDepot}</span>}
            {filterType !== 'ALL' && <span className="bg-slate-200 px-2 py-0.5 rounded">TYPE: {filterType}</span>}
            {filterStatus !== 'ALL' && <span className="bg-slate-200 px-2 py-0.5 rounded">STATUS: {filterStatus}</span>}
          </div>
          <div className="flex space-x-2 border border-slate-300 rounded overflow-hidden">
             <button onClick={() => setViewState('LIST')} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${viewState === 'LIST' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500'}`}>TABLE VIEW</button>
             <button onClick={() => setViewState('MAP')} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${viewState === 'MAP' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500'}`}>MAP VIEW</button>
          </div>
        </div>

        {viewState === 'LIST' ? (
          /* DATA TABLE */
          <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                  <tr>
                    <th className="px-4 py-3 sticky left-0 bg-slate-50 z-10">Vehicle ID</th>
                    <th className="px-4 py-3">Registration</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Capacity</th>
                    <th className="px-4 py-3">Zone / Depot</th>
                    <th className="px-4 py-3">Driver</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVehicles.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-12 text-center text-slate-500">
                        <p className="text-sm">No vehicles match the current filters.</p>
                        <button onClick={() => {setFilterMuni(''); setFilterZone(''); setFilterDepot(''); setFilterStatus('ALL'); setFilterType('ALL'); setSearchQuery('');}} className="text-xs font-bold text-indigo-600 mt-2 hover:underline">[ CLEAR ALL FILTERS ]</button>
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setSelectedVehicleId(v.id)}>
                        <td className="px-4 py-3 font-mono font-bold text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50 z-10">{v.vehicle_id}</td>
                        <td className="px-4 py-3 font-mono text-slate-600 text-xs">{v.registration_number}</td>
                        <td className="px-4 py-3 text-xs uppercase text-slate-700 font-bold">{v.vehicle_type.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-600">{v.capacity} {v.capacity_unit}</td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-bold text-slate-700">{v.zone_name || '--'}</div>
                          <div className="text-[10px] text-slate-500 uppercase">{v.depot_name || '--'}</div>
                        </td>
                        <td className="px-4 py-3 text-xs">{v.driver_name || <span className="text-amber-600 italic font-medium">Unassigned</span>}</td>
                        <td className="px-4 py-3">
                          <StatusBadge 
                            status={v.status === 'AVAILABLE' ? 'normal' : ['MAINTENANCE', 'INACTIVE'].includes(v.status) ? 'critical' : 'warning'}
                            label={v.status} 
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button className="px-3 py-1 bg-white border border-slate-300 rounded text-[10px] font-bold text-slate-600 uppercase hover:bg-slate-50 hover:text-indigo-700 transition-colors">
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
        ) : (
          /* MAP VIEW */
          <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white h-[600px] relative z-0">
            <MapContainer center={[13.0827, 80.2707]} zoom={11} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
              {/* Plot depots that have vehicles matching filters */}
              {depots.filter(d => filteredVehicles.some(v => v.depot === d.id)).map((depot, i) => {
                if (!depot.lat || !depot.lng) return null;
                const depotVehicles = filteredVehicles.filter(v => v.depot === depot.id);
                return (
                  <Marker key={i} position={[depot.lat, depot.lng]}>
                    <Popup>
                      <div className="font-bold text-xs uppercase">{depot.name}</div>
                      <div className="text-[10px] text-slate-500 mt-1">{depotVehicles.length} Vehicles Assigned</div>
                      <div className="flex flex-col mt-2 gap-1 max-h-32 overflow-y-auto">
                        {depotVehicles.map(v => (
                           <button key={v.id} onClick={() => setSelectedVehicleId(v.id)} className="text-[10px] font-bold font-mono text-left bg-slate-100 px-1 py-0.5 rounded hover:bg-blue-100 hover:text-blue-700">
                             {v.vehicle_id} - {v.status}
                           </button>
                        ))}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur p-3 border border-slate-200 shadow rounded z-[1000] text-[10px] font-bold text-slate-700 uppercase">
               <div className="mb-2 text-slate-500 tracking-wider">Map Legend</div>
               <div className="flex items-center mb-1"><span className="text-blue-500 mr-2 text-lg leading-none">■</span> DEPOT / ASSIGNED AREA</div>
               <div className="text-[9px] text-slate-400 mt-2 normal-case max-w-[150px] leading-tight">Displays operational jurisdiction areas (Depots). Backend does not currently support live GPS streaming.</div>
            </div>
          </Card>
        )}
      </div>

      {/* CREATE / EDIT FORM MODAL */}
      <AnimatePresence>
        {form && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
              onClick={() => setForm(null)}
            />
            <motion.div 
              initial={reducedMotion ? false : { opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reducedMotion ? false : { opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-slate-50 rounded shadow-2xl flex flex-col max-h-full pointer-events-auto"
            >
              <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center rounded-t shrink-0">
                <h2 className="text-lg font-bold tracking-tight uppercase">
                  {form.id ? 'Edit Vehicle' : 'Add Vehicle'} {form.vehicle_id && `- ${form.vehicle_id}`}
                </h2>
                <button onClick={() => setForm(null)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6">
                 {/* Identity */}
                 <div className="space-y-4">
                   <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2">Vehicle Identity</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Vehicle ID</label>
                       <input value={form.vehicle_id} disabled={!!form.id} onChange={e => setForm({...form, vehicle_id: e.target.value})} className="w-full text-sm border-slate-300 rounded focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 font-mono" />
                     </div>
                     <div>
                       <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Registration Number</label>
                       <input value={form.registration_number} onChange={e => setForm({...form, registration_number: e.target.value})} className="w-full text-sm border-slate-300 rounded focus:ring-indigo-500 font-mono uppercase" />
                     </div>
                     <div>
                       <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Type</label>
                       <select value={form.vehicle_type} onChange={e => setForm({...form, vehicle_type: e.target.value})} className="w-full text-sm border-slate-300 rounded focus:ring-indigo-500">
                         <option value="COMPACTOR">Compactor</option>
                         <option value="TIPPER">Tipper</option>
                         <option value="MINI_TRUCK">Mini Truck</option>
                         <option value="TRACTOR">Tractor</option>
                         <option value="OTHER">Other</option>
                       </select>
                     </div>
                     <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Capacity</label>
                          <input type="number" min="0" step="0.1" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} className="w-full text-sm border-slate-300 rounded focus:ring-indigo-500" />
                        </div>
                        <div className="w-24">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Unit</label>
                          <select value={form.capacity_unit} onChange={e => setForm({...form, capacity_unit: e.target.value})} className="w-full text-sm border-slate-300 rounded focus:ring-indigo-500">
                            <option value="m3">m³</option>
                            <option value="kg">kg</option>
                            <option value="tons">Tons</option>
                          </select>
                        </div>
                     </div>
                   </div>
                 </div>

                 {/* Geography & Assignments */}
                 <div className="space-y-4">
                   <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2">Operational Assignment</h3>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div>
                       <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Municipality</label>
                       <select value={form.municipality} onChange={e => setForm({...form, municipality: e.target.value, zone: '', depot: ''})} className="w-full text-sm border-slate-300 rounded focus:ring-indigo-500">
                         <option value="">-- Select --</option>
                         {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Zone</label>
                       <select value={form.zone} onChange={e => setForm({...form, zone: e.target.value, depot: ''})} className="w-full text-sm border-slate-300 rounded focus:ring-indigo-500" disabled={!form.municipality}>
                         <option value="">-- Select --</option>
                         {zones.filter(z => !form.municipality || z.municipality === parseInt(form.municipality)).map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Depot</label>
                       <select value={form.depot} onChange={e => setForm({...form, depot: e.target.value})} className="w-full text-sm border-slate-300 rounded focus:ring-indigo-500" disabled={!form.municipality}>
                         <option value="">-- Select --</option>
                         {depots.filter(d => (!form.municipality || d.municipality === parseInt(form.municipality)) && (!form.zone || !d.zone || d.zone === parseInt(form.zone))).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                       </select>
                     </div>
                     <div className="md:col-span-3">
                       <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Driver</label>
                       <select value={form.driver} onChange={e => setForm({...form, driver: e.target.value})} className="w-full text-sm border-slate-300 rounded focus:ring-indigo-500">
                         <option value="">-- Unassigned --</option>
                         {drivers.map(d => <option key={d.id} value={d.id}>{d.name || 'Unnamed'} ({d.username})</option>)}
                       </select>
                     </div>
                   </div>
                 </div>

                 {/* Status */}
                 <div className="space-y-4">
                   <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2">Status</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                       <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full text-sm border-slate-300 rounded focus:ring-indigo-500">
                         <option value="AVAILABLE">AVAILABLE</option>
                         <option value="ASSIGNED">ASSIGNED</option>
                         <option value="ON_ROUTE">ON ROUTE</option>
                         <option value="MAINTENANCE">MAINTENANCE</option>
                         <option value="INACTIVE">INACTIVE</option>
                       </select>
                     </div>
                     <div className="flex items-center pt-5">
                       <label className="flex items-center cursor-pointer">
                         <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                         <span className="ml-2 text-sm font-bold text-slate-700 uppercase tracking-wider">Active Asset</span>
                       </label>
                     </div>
                   </div>
                 </div>

              </div>
              <div className="bg-slate-100 p-4 rounded-b flex justify-end gap-3 border-t border-slate-200 shrink-0">
                <button onClick={() => setForm(null)} className="px-4 py-2 text-xs font-bold text-slate-600 uppercase hover:bg-slate-200 rounded transition-colors">Cancel</button>
                <button onClick={saveVehicle} disabled={actionLoading} className="px-6 py-2 bg-indigo-600 text-white text-xs font-bold uppercase rounded hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center">
                  {actionLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {form.id ? 'Save Changes' : 'Create Vehicle'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAIL DRAWER */}
      <AnimatePresence>
        {selectedVehicle && !form && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
              onClick={() => setSelectedVehicleId(null)}
            />
            <motion.div 
              initial={reducedMotion ? false : { x: '100%' }}
              animate={{ x: 0 }}
              exit={reducedMotion ? false : { x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[500px] lg:w-[600px] bg-slate-50 shadow-2xl z-50 flex flex-col"
            >
              <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-lg font-bold tracking-tight uppercase flex items-center">
                    {selectedVehicle.vehicle_id}
                  </h2>
                  <div className="text-[10px] font-bold uppercase tracking-wider mt-1 text-slate-400 font-mono">
                    {selectedVehicle.registration_number}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <StatusBadge status={selectedVehicle.status === 'AVAILABLE' ? 'normal' : ['MAINTENANCE', 'INACTIVE'].includes(selectedVehicle.status) ? 'critical' : 'warning'} label={selectedVehicle.status} />
                  <button onClick={() => setSelectedVehicleId(null)} className="text-slate-400 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                {/* ACTION BAR */}
                {canManage && (
                  <div className="bg-white border border-slate-200 rounded shadow-sm p-2 flex justify-end gap-2 flex-wrap">
                    <button onClick={() => setForm(selectedVehicle)} className="px-4 py-2 bg-white text-indigo-700 border border-slate-200 text-xs font-bold uppercase rounded hover:bg-slate-50 disabled:opacity-50">
                      Edit
                    </button>
                    {selectedVehicle.status !== 'INACTIVE' && (
                      <button onClick={() => deactivateVehicle(selectedVehicle)} disabled={actionLoading} className="px-4 py-2 bg-white text-red-600 border border-slate-200 text-xs font-bold uppercase rounded hover:bg-red-50 disabled:opacity-50">
                        Deactivate
                      </button>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* IDENTITY */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vehicle Identification</h3>
                    <div className="bg-white border border-slate-200 rounded p-4 shadow-sm divide-y divide-slate-100">
                       <div className="py-2 flex justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vehicle ID</span>
                          <span className="text-sm font-bold text-slate-800 font-mono">{selectedVehicle.vehicle_id}</span>
                       </div>
                       <div className="py-2 flex justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Registration</span>
                          <span className="text-sm font-bold text-slate-800 font-mono">{selectedVehicle.registration_number}</span>
                       </div>
                       <div className="py-2 flex justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</span>
                          <span className="text-sm font-bold text-slate-800 uppercase">{selectedVehicle.vehicle_type.replace('_', ' ')}</span>
                       </div>
                       <div className="py-2 flex justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${selectedVehicle.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>{selectedVehicle.is_active ? 'YES' : 'NO'}</span>
                       </div>
                    </div>
                  </div>

                  {/* CAPACITY & DRIVER */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Capacity</h3>
                      <div className="bg-indigo-50 border border-indigo-200 rounded p-4 shadow-sm flex items-end">
                        <span className="text-3xl font-black text-indigo-700 leading-none">{selectedVehicle.capacity}</span>
                        <span className="text-sm font-bold text-indigo-500 ml-1 mb-1 uppercase">{selectedVehicle.capacity_unit}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Current Driver</h3>
                      {selectedVehicle.driver_name ? (
                        <div className="bg-white border border-slate-200 rounded p-4 shadow-sm flex items-center">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mr-3">
                             <User className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-800">{selectedVehicle.driver_name}</div>
                            <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">ASSIGNED / ACTIVE</div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-slate-200 rounded p-4 shadow-sm text-center">
                           <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">NO DRIVER ASSIGNED</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* OPERATIONAL JURISDICTION */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operational Jurisdiction</h3>
                  <div className="bg-white border border-slate-200 rounded p-4 shadow-sm flex items-center justify-between overflow-x-auto whitespace-nowrap hide-scrollbar">
                    <div className="flex flex-col">
                       <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">MUNICIPALITY</span>
                       <span className="text-sm font-bold text-slate-800">{selectedVehicle.municipality_name || '--'}</span>
                    </div>
                    <div className="text-slate-300 mx-4">&rarr;</div>
                    <div className="flex flex-col">
                       <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">ZONE</span>
                       <span className="text-sm font-bold text-slate-800">{selectedVehicle.zone_name || '--'}</span>
                    </div>
                    <div className="text-slate-300 mx-4">&rarr;</div>
                    <div className="flex flex-col">
                       <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">DEPOT</span>
                       <span className="text-sm font-bold text-slate-800">{selectedVehicle.depot_name || '--'}</span>
                    </div>
                  </div>
                </div>

                {/* CURRENT OPERATION (or Empty State) */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Operation</h3>
                  
                  {selectedVehicle.status === 'MAINTENANCE' ? (
                     <div className="bg-red-50 border border-red-200 rounded p-6 shadow-sm text-center">
                        <Wrench className="w-8 h-8 text-red-500 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-red-800 uppercase tracking-wider">MAINTENANCE</h4>
                        <p className="text-xs text-red-600 mt-2">CURRENTLY UNAVAILABLE</p>
                     </div>
                  ) : activeOperation ? (
                    <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
                       <div className="bg-indigo-50 border-b border-indigo-100 p-4">
                         <div className="flex justify-between items-center mb-2">
                           <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">STATUS</div>
                           <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-100 px-2 py-0.5 rounded">{activeOperation.schedule.status.replace('_', ' ')}</div>
                         </div>
                         <div className="flex justify-between items-center">
                           <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">SCHEDULE</div>
                           <div className="text-sm font-bold text-indigo-900 font-mono">{activeOperation.schedule.schedule_id}</div>
                         </div>
                       </div>
                       
                       {activeOperation.route && (
                         <div className="p-4">
                           <div className="flex justify-between items-center mb-4">
                             <div>
                               <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">CURRENT ROUTE</div>
                               <div className="text-sm font-bold text-slate-800 font-mono">{activeOperation.route.name || `RT-${activeOperation.route.id}`}</div>
                             </div>
                             <div className="text-right">
                               <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">STOPS</div>
                               <div className="text-sm font-bold text-slate-800">{activeOperation.route.optimized_order?.length || 0}</div>
                             </div>
                             <div className="text-right">
                               <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">DISTANCE</div>
                               <div className="text-sm font-bold text-slate-800">{(activeOperation.route.total_distance_km||0).toFixed(1)} KM</div>
                             </div>
                           </div>
                           
                           <div className="bg-slate-900 border border-slate-800 rounded p-3 overflow-x-auto whitespace-nowrap hide-scrollbar mb-4">
                             <div className="flex items-center space-x-2 min-w-max px-1 text-[10px] font-bold uppercase tracking-wider">
                               <span className="bg-indigo-900 text-indigo-300 px-2 py-1 rounded border border-indigo-700">Depot</span>
                               {activeOperation.route.optimized_order && activeOperation.route.optimized_order.map((binId, idx) => {
                                 const record = activeOperation.route.records?.find(r => r.bin_id === binId || r.bin === binId);
                                 const color = record ? (
                                   record.status === 'COLLECTED' ? 'text-emerald-400 border-emerald-700' :
                                   record.status === 'UNABLE_TO_COLLECT' ? 'text-red-400 border-red-700' :
                                   record.status === 'ARRIVED' ? 'text-amber-400 border-amber-700' :
                                   'text-slate-300 border-slate-700'
                                 ) : 'text-slate-300 border-slate-700';
                                 
                                 return (
                                   <React.Fragment key={idx}>
                                     <span className="text-slate-600">&rarr;</span>
                                     <span className={`px-2 py-1 rounded border flex flex-col items-center ${color}`}>
                                       <span>{typeof binId === 'object' ? binId.bin_id : binId}</span>
                                       {record && <span className="text-[8px] mt-0.5">{record.status.replace(/_/g, ' ')}</span>}
                                     </span>
                                   </React.Fragment>
                                 );
                               })}
                               <span className="text-slate-600">&rarr;</span>
                               <span className="bg-indigo-900 text-indigo-300 px-2 py-1 rounded border border-indigo-700">Depot</span>
                             </div>
                           </div>
                           
                           <div className="text-center">
                             <a href="/app/schedules" className="text-xs font-bold text-indigo-600 hover:underline uppercase tracking-wider">
                               [ VIEW IN DISPATCH ]
                             </a>
                           </div>
                         </div>
                       )}
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded p-6 shadow-sm text-center">
                       <Activity className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                       <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">NO ACTIVE COLLECTION</h4>
                       <p className="text-xs text-slate-500 mt-2">Vehicle is currently available for assignment.</p>
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
