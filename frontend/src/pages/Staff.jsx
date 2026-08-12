import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import StatusBadge from '../components/ui/StatusBadge';
import api from '../api';
import { 
  Plus, Edit2, Trash2, X, Save, Users, User, UserCheck, 
  RefreshCw, AlertTriangle, Search, Activity, ShieldAlert,
  MapPin, CheckCircle, Clock
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = {
  employee_id: '',
  first_name: '',
  last_name: '',
  email: '',
  designation: '',
  role: 'driver',
  employment_status: 'ACTIVE',
  phone: '',
  municipality: '',
  zone: '',
  ward: ''
};

export default function Staff() {
  const reducedMotion = useReducedMotion();
  const { user } = useAuth();
  const canManage = ['system_admin', 'municipal_admin', 'zone_supervisor'].includes(user?.role);
  
  // Data State
  const [staff, setStaff] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  
  // Masters
  const [municipalities, setMunicipalities] = useState([]);
  const [zones, setZones] = useState([]);
  const [wards, setWards] = useState([]);
  
  // View State
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [form, setForm] = useState(null); // null or form object
  
  // Filters
  const [filterMuni, setFilterMuni] = useState('');
  const [filterZone, setFilterZone] = useState('');
  const [filterWard, setFilterWard] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Action state
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchMasters();
    fetchWorkforceData();
  }, []);

  const fetchWorkforceData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [staffRes, vehRes, schedRes, binRes] = await Promise.all([
        api.get('/staff/'),
        api.get('/vehicles/'),
        api.get('/schedules/'),
        api.get('/bins/')
      ]);
      setStaff(staffRes.data);
      setVehicles(vehRes.data);
      setSchedules(schedRes.data);
      setBins(binRes.data);
    } catch (error) {
      console.error('Error fetching workforce data:', error);
      setErrorMsg('Unable to retrieve workforce information.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMasters = async () => {
    try {
      const [muniRes, zoneRes, wardRes] = await Promise.all([
        api.get('/municipalities/'), api.get('/zones/'), api.get('/wards/')
      ]);
      setMunicipalities(muniRes.data);
      setZones(zoneRes.data);
      setWards(wardRes.data);
    } catch (error) {
      console.error('Error fetching masters:', error);
    }
  };

  // Derived Data
  const selectedStaff = useMemo(() => 
    staff.find(s => s.id === selectedStaffId), 
  [staff, selectedStaffId]);

  const activeDriverOperation = useMemo(() => {
    if (!selectedStaff || selectedStaff.role !== 'driver') return null;
    const vehicle = vehicles.find(v => v.driver === selectedStaff.id || v.driver_name === selectedStaff.username || v.driver_name === selectedStaff.name);
    if (!vehicle) return null;
    const sched = schedules.find(s => String(s.vehicle) === String(vehicle.id) && ['DISPATCHED', 'IN_PROGRESS'].includes(s.status));
    return { vehicle, schedule: sched };
  }, [selectedStaff, vehicles, schedules]);

  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      if (filterMuni && String(s.municipality) !== filterMuni) return false;
      if (filterZone && String(s.zone) !== filterZone) return false;
      if (filterWard && String(s.ward) !== filterWard) return false;
      if (filterRole !== 'ALL' && s.role !== filterRole) return false;
      if (filterStatus !== 'ALL' && s.employment_status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!(
          (s.employee_id || '').toLowerCase().includes(q) ||
          (s.name || '').toLowerCase().includes(q) ||
          (s.phone || '').toLowerCase().includes(q) ||
          (s.designation || '').toLowerCase().includes(q)
        )) return false;
      }
      return true;
    });
  }, [staff, filterMuni, filterZone, filterWard, filterRole, filterStatus, searchQuery]);

  const metrics = useMemo(() => {
    let active = 0, onLeave = 0, suspended = 0, inactive = 0;
    let roles = {
      system_admin: 0, municipal_admin: 0, municipal_officer: 0,
      zone_supervisor: 0, driver: 0, field_worker: 0, auditor: 0
    };
    let missingPhone = 0, missingDesignation = 0, missingArea = 0, missingEmployeeId = 0;
    let assignedDrivers = 0;

    staff.forEach(s => {
      if (s.employment_status === 'ACTIVE') active++;
      if (s.employment_status === 'ON_LEAVE') onLeave++;
      if (s.employment_status === 'SUSPENDED') suspended++;
      if (s.employment_status === 'INACTIVE') inactive++;
      
      if (roles[s.role] !== undefined) roles[s.role]++;
      
      if (!s.phone) missingPhone++;
      if (!s.designation) missingDesignation++;
      if (!s.municipality && !s.zone && !s.ward) missingArea++;
      if (!s.employee_id) missingEmployeeId++;

      if (s.role === 'driver') {
        const hasVehicle = vehicles.some(v => v.driver === s.id || v.driver_name === s.username || v.driver_name === s.name);
        if (hasVehicle) assignedDrivers++;
      }
    });
    
    return { 
      total: staff.length, active, onLeave, suspended, inactive,
      roles,
      quality: { missingPhone, missingDesignation, missingArea, missingEmployeeId },
      assignedDrivers,
      unassignedDrivers: roles.driver - assignedDrivers
    };
  }, [staff, vehicles]);

  // Actions
  const saveStaff = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = { ...form };
      if (!payload.municipality) payload.municipality = null;
      if (!payload.zone) payload.zone = null;
      if (!payload.ward) payload.ward = null;

      if (form.id) {
        await api.patch(`/staff/${form.id}/`, payload);
      } else {
        await api.post('/staff/', payload);
      }
      setForm(null);
      await fetchWorkforceData();
    } catch (err) {
      alert(err.response?.data?.detail || err.response?.data?.error || 'Failed to save staff member. Check your permissions and data.');
    } finally {
      setActionLoading(false);
    }
  };

  const deactivateStaff = async (s) => {
    if (!window.confirm(`Are you sure you want to deactivate ${s.name || s.employee_id}? This will mark the employee as INACTIVE.`)) return;
    setActionLoading(true);
    try {
      await api.patch(`/staff/${s.id}/`, { employment_status: 'INACTIVE' });
      await fetchWorkforceData();
      if (selectedStaffId === s.id) setSelectedStaffId(null);
    } catch (err) {
      alert('Failed to deactivate staff member.');
    } finally {
      setActionLoading(false);
    }
  };

  const reactivateStaff = async (s) => {
    if (!window.confirm(`Set employment status to ACTIVE?`)) return;
    setActionLoading(true);
    try {
      await api.patch(`/staff/${s.id}/`, { employment_status: 'ACTIVE' });
      await fetchWorkforceData();
      if (selectedStaffId === s.id) setSelectedStaffId(null);
    } catch (err) {
      alert('Failed to reactivate staff member.');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditForm = (staffMember) => {
    setForm({
      id: staffMember.id,
      employee_id: staffMember.employee_id || '',
      first_name: '', // We don't get this back individually unless we parse name
      last_name: '',
      email: staffMember.email || '',
      designation: staffMember.designation || '',
      role: staffMember.role || 'driver',
      employment_status: staffMember.employment_status || 'ACTIVE',
      phone: staffMember.phone || '',
      municipality: staffMember.municipality || '',
      zone: staffMember.zone || '',
      ward: staffMember.ward || ''
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* HEADER */}
      <div className="bg-slate-900 text-white px-6 py-4 shadow-md sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase flex items-center">
              <Users className="w-5 h-5 mr-2 text-indigo-400" />
              Staff & Workforce
            </h1>
            <p className="text-sm text-slate-400 mt-1">Municipal workforce registry, operational assignment and staff status.</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right mr-4 hidden sm:block">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Last Updated</div>
              <div className="text-xs font-bold text-slate-300">{format(new Date(), 'HH:mm')}</div>
            </div>
            <button onClick={fetchWorkforceData} className="p-2 bg-slate-800 hover:bg-slate-700 rounded transition-colors text-slate-300">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {canManage && (
              <button 
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setSelectedStaffId(null);
                }}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-bold uppercase tracking-wider rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Staff</span>
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
            <button onClick={fetchWorkforceData} className="text-xs font-bold uppercase bg-white border border-red-200 px-3 py-1 rounded hover:bg-red-50 transition-colors">Retry</button>
          </div>
        )}

        {/* WORKFORCE STATUS STRIP */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded p-4 flex flex-col justify-center items-center text-center shadow-sm">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">TOTAL</div>
            <div className="text-2xl font-black text-white">{String(metrics.total).padStart(2, '0')}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded p-4 flex flex-col justify-center items-center text-center shadow-sm">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">ACTIVE</div>
            <div className="text-2xl font-black text-emerald-600">{String(metrics.active).padStart(2, '0')}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded p-4 flex flex-col justify-center items-center text-center shadow-sm">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">ON LEAVE</div>
            <div className="text-2xl font-black text-amber-600">{String(metrics.onLeave).padStart(2, '0')}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded p-4 flex flex-col justify-center items-center text-center shadow-sm">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SUSPENDED</div>
            <div className="text-2xl font-black text-red-600">{String(metrics.suspended).padStart(2, '0')}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded p-4 flex flex-col justify-center items-center text-center shadow-sm">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">INACTIVE</div>
            <div className="text-2xl font-black text-slate-400">{String(metrics.inactive).padStart(2, '0')}</div>
          </div>
        </div>

        {/* SECONDARY STRIPS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* Role Distribution */}
           <div className="bg-white border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row justify-between items-center rounded overflow-x-auto">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 md:mb-0 mr-4 shrink-0">Workforce by Role</h3>
              <div className="flex space-x-4 text-center">
                 {Object.entries(metrics.roles).filter(([k,v]) => v > 0).map(([key, value]) => (
                   <div key={key}>
                     <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{key.replace('_', ' ')}</div>
                     <div className="text-sm font-bold text-slate-800">{value}</div>
                   </div>
                 ))}
              </div>
           </div>

           {/* Field Operations */}
           <div className="bg-white border border-slate-200 p-4 shadow-sm flex flex-col justify-between rounded">
              <div className="flex items-center justify-between mb-2">
                 <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Field Operations</h3>
                 <div className="flex items-center text-amber-600 text-[10px] font-bold uppercase">
                    <ShieldAlert className="w-3 h-3 mr-1" />
                    {metrics.unassignedDrivers} Unassigned Drivers
                 </div>
              </div>
              <div className="flex space-x-6 text-center">
                 <div>
                   <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">DRIVERS</div>
                   <div className="text-lg font-bold text-indigo-700">{String(metrics.roles.driver).padStart(2, '0')}</div>
                 </div>
                 <div>
                   <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">FIELD WORKERS</div>
                   <div className="text-lg font-bold text-indigo-700">{String(metrics.roles.field_worker).padStart(2, '0')}</div>
                 </div>
                 <div className="border-l border-slate-200 pl-6">
                   <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ASSIGNED DRIVERS</div>
                   <div className="text-lg font-bold text-emerald-600">{String(metrics.assignedDrivers).padStart(2, '0')}</div>
                 </div>
              </div>
           </div>
        </div>

        {/* FILTERS */}
        <Card className="border border-slate-200 p-3 shadow-sm bg-white">
          <div className="flex flex-wrap gap-4 items-center">
            
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

            <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="py-1.5 px-3 text-sm border border-slate-300 rounded text-slate-700 focus:ring-blue-500">
              <option value="ALL">ALL ROLES</option>
              <option value="system_admin">SYSTEM ADMIN</option>
              <option value="municipal_admin">MUNICIPAL ADMIN</option>
              <option value="municipal_officer">MUNICIPAL OFFICER</option>
              <option value="zone_supervisor">ZONE SUPERVISOR</option>
              <option value="driver">DRIVER</option>
              <option value="field_worker">FIELD WORKER</option>
              <option value="auditor">AUDITOR</option>
            </select>
            
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="py-1.5 px-3 text-sm border border-slate-300 rounded text-slate-700 focus:ring-blue-500">
              <option value="ALL">ALL STATUSES</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="ON_LEAVE">ON LEAVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
            
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID, name, designation..."
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
            {filterWard && <span className="bg-slate-200 px-2 py-0.5 rounded">WARD: {wards.find(w => String(w.id) === filterWard)?.name || filterWard}</span>}
            {filterRole !== 'ALL' && <span className="bg-slate-200 px-2 py-0.5 rounded">ROLE: {filterRole.replace('_', ' ')}</span>}
            {filterStatus !== 'ALL' && <span className="bg-slate-200 px-2 py-0.5 rounded">STATUS: {filterStatus}</span>}
            {(filterZone || filterWard || filterRole !== 'ALL' || filterStatus !== 'ALL' || filterMuni) && (
               <button 
                 onClick={() => {setFilterMuni(''); setFilterZone(''); setFilterWard(''); setFilterRole('ALL'); setFilterStatus('ALL'); setSearchQuery('');}} 
                 className="text-indigo-600 hover:underline ml-2"
               >[ CLEAR ALL ]</button>
            )}
          </div>
        </div>

        {/* DATA TABLE */}
        <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3 sticky left-0 bg-slate-50 z-10">Emp ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Designation</th>
                  <th className="px-4 py-3">Jurisdiction</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Employment</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-12 text-center text-slate-500">
                      <p className="text-sm">No workforce records match the selected filters.</p>
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setSelectedStaffId(s.id)}>
                      <td className="px-4 py-3 font-mono font-bold text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50 z-10">{s.employee_id || '--'}</td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-800">{s.name}</td>
                      <td className="px-4 py-3 text-[10px] uppercase text-slate-700 font-bold bg-slate-100 px-2 rounded-full inline-flex mt-2">{s.role.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 truncate max-w-[150px]">{s.designation || '--'}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold text-slate-700">{s.zone_name || s.municipality_name || '--'}</div>
                        <div className="text-[10px] text-slate-500 uppercase">{s.ward_name || ''}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{s.phone || '--'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge 
                          status={s.employment_status === 'ACTIVE' ? 'active' : s.employment_status === 'ON_LEAVE' ? 'warning' : 'critical'}
                          label={s.employment_status} 
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
                  {form.id ? 'Edit Staff Member' : 'Add Staff Member'} {form.employee_id && `- ${form.employee_id}`}
                </h2>
                <button onClick={() => setForm(null)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={saveStaff} className="flex flex-col h-full overflow-hidden">
                <div className="p-6 overflow-y-auto space-y-6">
                  
                  {!form.id && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2">User Account</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">First Name</label>
                          <input required value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className="w-full text-sm border-slate-300 rounded focus:ring-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Last Name</label>
                          <input required value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className="w-full text-sm border-slate-300 rounded focus:ring-indigo-500" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                          <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full text-sm border-slate-300 rounded focus:ring-indigo-500" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2">Employment Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Employee ID</label>
                        <input value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})} className="w-full text-sm border-slate-300 rounded focus:ring-indigo-500 font-mono" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Employment Status</label>
                        <select value={form.employment_status} onChange={e => setForm({...form, employment_status: e.target.value})} className="w-full text-sm border-slate-300 rounded focus:ring-indigo-500">
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="ON_LEAVE">ON LEAVE</option>
                          <option value="SUSPENDED">SUSPENDED</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Role</label>
                        <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full text-sm border-slate-300 rounded focus:ring-indigo-500">
                          <option value="system_admin">System Admin</option>
                          <option value="municipal_admin">Municipal Admin</option>
                          <option value="municipal_officer">Municipal Officer</option>
                          <option value="zone_supervisor">Zone Supervisor</option>
                          <option value="driver">Driver</option>
                          <option value="field_worker">Field Worker</option>
                          <option value="auditor">Auditor</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Designation</label>
                        <input value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} className="w-full text-sm border-slate-300 rounded focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone</label>
                        <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full text-sm border-slate-300 rounded focus:ring-indigo-500" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2">Geographic Scope</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Municipality</label>
                        <select required value={form.municipality} onChange={e => setForm({...form, municipality: e.target.value, zone: '', ward: ''})} className="w-full text-sm border-slate-300 rounded focus:ring-indigo-500">
                          <option value="">-- Select --</option>
                          {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Zone</label>
                        <select value={form.zone} onChange={e => setForm({...form, zone: e.target.value, ward: ''})} className="w-full text-sm border-slate-300 rounded focus:ring-indigo-500" disabled={!form.municipality}>
                          <option value="">-- Select --</option>
                          {zones.filter(z => !form.municipality || z.municipality === parseInt(form.municipality)).map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ward</label>
                        <select value={form.ward} onChange={e => setForm({...form, ward: e.target.value})} className="w-full text-sm border-slate-300 rounded focus:ring-indigo-500" disabled={!form.zone}>
                          <option value="">-- Select --</option>
                          {wards.filter(w => !form.zone || w.zone === parseInt(form.zone)).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                </div>
                <div className="bg-slate-100 p-4 rounded-b flex justify-end gap-3 border-t border-slate-200 shrink-0">
                  <button type="button" onClick={() => setForm(null)} className="px-4 py-2 text-xs font-bold text-slate-600 uppercase hover:bg-slate-200 rounded transition-colors">Cancel</button>
                  <button type="submit" disabled={actionLoading} className="px-6 py-2 bg-indigo-600 text-white text-xs font-bold uppercase rounded hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center">
                    {actionLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    {form.id ? 'Save Changes' : 'Create Staff Member'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAIL DRAWER */}
      <AnimatePresence>
        {selectedStaff && !form && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
              onClick={() => setSelectedStaffId(null)}
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
                    {selectedStaff.name}
                  </h2>
                  <div className="text-[10px] font-bold uppercase tracking-wider mt-1 text-slate-400 font-mono">
                    {selectedStaff.employee_id || 'NO EMPLOYEE ID'}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <StatusBadge status={selectedStaff.employment_status === 'ACTIVE' ? 'active' : selectedStaff.employment_status === 'ON_LEAVE' ? 'warning' : 'critical'} label={selectedStaff.employment_status} />
                  <button onClick={() => setSelectedStaffId(null)} className="text-slate-400 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                {/* ACTION BAR */}
                {canManage && (
                  <div className="bg-white border border-slate-200 rounded shadow-sm p-2 flex justify-end gap-2 flex-wrap">
                    <button onClick={() => openEditForm(selectedStaff)} className="px-4 py-2 bg-white text-indigo-700 border border-slate-200 text-xs font-bold uppercase rounded hover:bg-slate-50 disabled:opacity-50">
                      Edit
                    </button>
                    {selectedStaff.employment_status !== 'ACTIVE' ? (
                      <button onClick={() => reactivateStaff(selectedStaff)} disabled={actionLoading} className="px-4 py-2 bg-white text-emerald-600 border border-slate-200 text-xs font-bold uppercase rounded hover:bg-emerald-50 disabled:opacity-50">
                        Reactivate
                      </button>
                    ) : (
                      <button onClick={() => deactivateStaff(selectedStaff)} disabled={actionLoading} className="px-4 py-2 bg-white text-red-600 border border-slate-200 text-xs font-bold uppercase rounded hover:bg-red-50 disabled:opacity-50">
                        Deactivate
                      </button>
                    )}
                  </div>
                )}

                {/* EMPLOYEE INFORMATION */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Employee Information</h3>
                  <div className="bg-white border border-slate-200 rounded p-4 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
                     <div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Employee ID</span>
                        <span className="text-sm font-bold text-slate-800 font-mono">{selectedStaff.employee_id || '--'}</span>
                     </div>
                     <div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Name</span>
                        <span className="text-sm font-bold text-slate-800">{selectedStaff.name}</span>
                     </div>
                     <div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Designation</span>
                        <span className="text-sm font-bold text-slate-800">{selectedStaff.designation || '--'}</span>
                     </div>
                     <div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone</span>
                        <span className="text-sm font-bold text-slate-800 font-mono">{selectedStaff.phone || '--'}</span>
                     </div>
                     <div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Employment Status</span>
                        <span className="text-sm font-bold text-slate-800">{selectedStaff.employment_status}</span>
                     </div>
                     <div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Date of Joining</span>
                        <span className="text-sm font-bold text-slate-800">{selectedStaff.date_of_joining ? format(new Date(selectedStaff.date_of_joining), 'dd MMM yyyy') : '--'}</span>
                     </div>
                  </div>
                </div>

                {/* ROLE & ACCESS */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role & Access</h3>
                  <div className="bg-white border border-slate-200 rounded p-4 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
                     <div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">System Account</span>
                        <span className="text-sm font-bold text-slate-800 font-mono">{selectedStaff.username}</span>
                     </div>
                     <div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Account Status</span>
                        <span className="text-sm font-bold text-emerald-600 uppercase">ACTIVE</span>
                     </div>
                     <div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Role</span>
                        <span className="text-[10px] px-2 py-1 bg-slate-100 font-bold uppercase rounded border border-slate-200">{selectedStaff.role.replace('_', ' ')}</span>
                     </div>
                  </div>
                </div>

                {/* OPERATIONAL JURISDICTION */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operational Jurisdiction</h3>
                  <div className="bg-white border border-slate-200 rounded p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between overflow-x-auto whitespace-nowrap hide-scrollbar gap-4 md:gap-0">
                    <div className="flex flex-col">
                       <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">MUNICIPALITY</span>
                       <span className="text-sm font-bold text-slate-800">{selectedStaff.municipality_name || '--'}</span>
                    </div>
                    <div className="hidden md:block text-slate-300 mx-4">&rarr;</div>
                    <div className="flex flex-col">
                       <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">ZONE</span>
                       <span className="text-sm font-bold text-slate-800">{selectedStaff.zone_name || '--'}</span>
                    </div>
                    <div className="hidden md:block text-slate-300 mx-4">&rarr;</div>
                    <div className="flex flex-col">
                       <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">WARD</span>
                       <span className="text-sm font-bold text-slate-800">{selectedStaff.ward_name || '--'}</span>
                    </div>
                  </div>
                </div>

                {/* DRIVER SPECIFIC: VEHICLE & COLLECTION ASSIGNMENT */}
                {selectedStaff.role === 'driver' && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operational Status</h3>
                    {activeDriverOperation && activeDriverOperation.vehicle ? (
                      <div className="bg-indigo-50 border border-indigo-200 rounded shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-indigo-100 flex justify-between items-center bg-indigo-100/50">
                           <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">CURRENT VEHICLE</div>
                           <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">{activeDriverOperation.vehicle.status.replace('_', ' ')}</div>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-4">
                           <div>
                             <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Vehicle</div>
                             <div className="text-sm font-bold text-slate-800 font-mono">{activeDriverOperation.vehicle.vehicle_id}</div>
                             <div className="text-xs text-slate-600 mt-1 uppercase">{activeDriverOperation.vehicle.vehicle_type}</div>
                           </div>
                           <div className="text-right">
                             <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Registration</div>
                             <div className="text-sm font-bold text-slate-800 font-mono uppercase">{activeDriverOperation.vehicle.registration_number}</div>
                           </div>
                        </div>
                        
                        {activeDriverOperation.schedule && (
                          <div className="border-t border-indigo-100 bg-white p-4">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">CURRENT COLLECTION</div>
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="text-sm font-bold text-slate-800 font-mono">{activeDriverOperation.schedule.schedule_id}</span>
                                <span className="text-xs text-slate-500 ml-2">({activeDriverOperation.schedule.status.replace('_', ' ')})</span>
                              </div>
                              <a href="/app/schedules" className="text-xs font-bold text-indigo-600 hover:underline uppercase tracking-wider">
                                [ VIEW SCHEDULE ]
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200 rounded p-6 shadow-sm text-center">
                         <Activity className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                         <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">CURRENT ASSIGNMENT: UNASSIGNED</h4>
                         <p className="text-xs text-slate-500 mt-2">This driver currently has no active vehicle assignment.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* FIELD WORKER SPECIFIC */}
                {selectedStaff.role === 'field_worker' && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Field Assignment</h3>
                    <div className="bg-white border border-slate-200 rounded p-4 shadow-sm text-center">
                       <MapPin className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                       <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">OPERATIONAL AREA</h4>
                       <p className="text-sm text-slate-800 font-bold mt-2">
                         {selectedStaff.zone_name || 'NO ZONE'} &mdash; {selectedStaff.ward_name || 'NO WARD'}
                       </p>
                       <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-wider">Task tracking runs via collection schedules</p>
                    </div>
                  </div>
                )}

                {/* SUPERVISOR / OFFICER SPECIFIC */}
                {['zone_supervisor', 'municipal_officer', 'municipal_admin'].includes(selectedStaff.role) && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operational Scope Summary</h3>
                    <div className="bg-white border border-slate-200 rounded p-4 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                       <div>
                         <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">STAFF</div>
                         <div className="text-xl font-black text-slate-800">
                           {staff.filter(s => 
                             (selectedStaff.zone && s.zone === selectedStaff.zone) || 
                             (!selectedStaff.zone && selectedStaff.municipality && s.municipality === selectedStaff.municipality)
                           ).length}
                         </div>
                       </div>
                       <div>
                         <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">VEHICLES</div>
                         <div className="text-xl font-black text-slate-800">
                           {vehicles.filter(v => 
                             (selectedStaff.zone && v.zone === selectedStaff.zone) || 
                             (!selectedStaff.zone && selectedStaff.municipality && v.municipality === selectedStaff.municipality)
                           ).length}
                         </div>
                       </div>
                       <div>
                         <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SMARTBINS</div>
                         <div className="text-xl font-black text-slate-800">
                           {bins.filter(b => 
                             (selectedStaff.zone && b.zone === selectedStaff.zone) || 
                             (!selectedStaff.zone && selectedStaff.municipality && b.municipality === selectedStaff.municipality)
                           ).length}
                         </div>
                       </div>
                       <div>
                         <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">ACTIVE SCHED.</div>
                         <div className="text-xl font-black text-slate-800">
                           {schedules.filter(s => 
                             ['PLANNED', 'DISPATCHED', 'IN_PROGRESS'].includes(s.status) &&
                             ((selectedStaff.zone && s.zone === selectedStaff.zone) || 
                              (!selectedStaff.zone && selectedStaff.municipality && s.municipality === selectedStaff.municipality))
                           ).length}
                         </div>
                       </div>
                    </div>
                  </div>
                )}
                
                {/* RECENT ACTIVITY MOCK / EMPTY STATE */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recent Activity</h3>
                  <div className="bg-slate-50 border border-slate-200 rounded p-4 shadow-sm text-center">
                    <Clock className="w-5 h-5 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">NO ACTIVITY HISTORY AVAILABLE</p>
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
