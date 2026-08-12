import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
  Building2, MapPin, Map, Factory, Settings as SettingsIcon, 
  Users, Shield, AlertTriangle, CheckCircle, Database, Server,
  Globe, Clock, Layers, Activity, Search, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('MASTER DATA');
  const [activeTab, setActiveTab] = useState('Municipalities');
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [municipalities, setMunicipalities] = useState([]);
  const [zones, setZones] = useState([]);
  const [wards, setWards] = useState([]);
  const [depots, setDepots] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [staff, setStaff] = useState([]);
  const [settings, setSettings] = useState([]);
  const [demoStatus, setDemoStatus] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  
  const NAVIGATION = {
    'OVERVIEW': [
      { id: 'Overview', label: 'Dashboard', icon: LayoutDashboard }
    ],
    'MASTER DATA': [
      { id: 'Municipalities', label: 'Municipalities', icon: Building2 },
      { id: 'Zones', label: 'Zones', icon: Map },
      { id: 'Wards', label: 'Wards', icon: MapPin },
      { id: 'Depots', label: 'Depots', icon: Factory },
      { id: 'Facilities', label: 'Processing Facilities', icon: Factory }
    ],
    'ACCESS CONTROL': [
      { id: 'Users', label: 'Users & Staff', icon: Users },
      { id: 'Roles', label: 'Role Directory', icon: Shield }
    ],
    'SYSTEM': [
      { id: 'Configuration', label: 'Configuration', icon: SettingsIcon },
      { id: 'DataQuality', label: 'Data Quality', icon: Database },
      { id: 'SystemInfo', label: 'System Information', icon: Server }
    ]
  };

  // Quick fix for missing icon in import
  function LayoutDashboard(props) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
  }

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [muniRes, zoneRes, wardRes, depotRes, facRes, staffRes, setRes, demoRes, auditRes] = await Promise.all([
        api.get('/municipalities/'),
        api.get('/zones/'),
        api.get('/wards/'),
        api.get('/depots/'),
        api.get('/facilities/'),
        api.get('/staff/'),
        api.get('/settings/').catch(() => ({ data: [] })),
        api.get('/demo/status').catch(() => ({ data: null })),
        api.get('/audit-logs/?limit=10').catch(() => ({ data: { results: [] } }))
      ]);
      
      setMunicipalities(muniRes.data);
      setZones(zoneRes.data);
      setWards(wardRes.data);
      setDepots(depotRes.data);
      setFacilities(facRes.data);
      setStaff(staffRes.data);
      setSettings(setRes.data);
      setDemoStatus(demoRes.data);
      setAuditLogs(auditRes.data.results || []);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingSave = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updates = Object.fromEntries(formData.entries());
    
    try {
      await api.put('/settings/', updates);
      alert('Settings updated successfully.');
      fetchAllData();
    } catch (err) {
      alert('Failed to update settings.');
    }
  };

  // --- RENDERS ---

  const renderOverview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold uppercase text-slate-800 border-b-2 border-slate-900 pb-2 mb-6">ADMINISTRATION OVERVIEW</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 shadow-sm text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">MUNICIPALITIES</p>
          <p className="text-3xl font-black text-slate-900">{municipalities.length}</p>
        </div>
        <div className="bg-white border border-slate-200 p-5 shadow-sm text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">ZONES</p>
          <p className="text-3xl font-black text-slate-900">{zones.length}</p>
        </div>
        <div className="bg-white border border-slate-200 p-5 shadow-sm text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">WARDS</p>
          <p className="text-3xl font-black text-slate-900">{wards.length}</p>
        </div>
        <div className="bg-white border border-slate-200 p-5 shadow-sm text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">DEPOTS</p>
          <p className="text-3xl font-black text-slate-900">{depots.length}</p>
        </div>
        <div className="bg-white border border-slate-200 p-5 shadow-sm text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">FACILITIES</p>
          <p className="text-3xl font-black text-slate-900">{facilities.length}</p>
        </div>
        <div className="bg-white border border-slate-200 p-5 shadow-sm text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">ACTIVE STAFF</p>
          <p className="text-3xl font-black text-slate-900">{staff.filter(s => s.employment_status === 'ACTIVE').length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white border border-slate-200 p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">MUNICIPAL OPERATIONAL HIERARCHY</h3>
          <div className="font-mono text-sm text-slate-700 space-y-1">
            <p>MUNICIPALITY</p>
            <p className="text-slate-400">      │</p>
            <p>      ├── ZONE</p>
            <p className="text-slate-400">      │      │</p>
            <p>      │      └── WARD</p>
            <p className="text-slate-400">      │</p>
            <p>      ├── DEPOT</p>
            <p className="text-slate-400">      │</p>
            <p>      └── PROCESSING FACILITY</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">RECENT ADMINISTRATIVE ACTIVITY</h3>
          {auditLogs.length > 0 ? (
            <div className="space-y-4">
              {auditLogs.slice(0, 5).map(log => (
                <div key={log.id} className="text-sm border-l-2 border-slate-200 pl-3">
                  <p className="text-slate-500 text-xs font-mono">{format(new Date(log.timestamp), 'HH:mm - dd MMM yyyy')}</p>
                  <p className="font-bold text-slate-800">{log.action} <span className="text-slate-500 font-normal">on {log.model_name} {log.record_id}</span></p>
                  <p className="text-slate-500 text-xs">{log.actor_name}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">NO ADMINISTRATIVE ACTIVITY AVAILABLE</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderTable = (headers, rows) => (
    <div className="bg-white border border-slate-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm text-left whitespace-nowrap">
        <thead className="text-[10px] text-slate-500 uppercase bg-slate-50 border-b border-slate-200 font-bold tracking-wider">
          <tr>{headers.map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length > 0 ? rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50">
              {row.map((cell, j) => <td key={j} className={`px-4 py-3 ${j===0 ? 'font-bold text-slate-800' : 'text-slate-600'}`}>{cell}</td>)}
            </tr>
          )) : (
            <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-slate-500 text-xs font-bold uppercase tracking-wider">NO MASTER DATA FOUND</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const getMuniName = (id) => municipalities.find(m => m.id === id)?.name || 'N/A';
  const getZoneName = (id) => zones.find(z => z.id === id)?.name || 'N/A';

  const renderDataQuality = () => {
    const issues = [];
    
    const orphansZones = zones.filter(z => !z.municipality).length;
    if (orphansZones > 0) issues.push({ level: 'ACTION REQUIRED', msg: `${orphansZones} zones without valid municipality` });
    
    const orphanWards = wards.filter(w => !w.zone).length;
    if (orphanWards > 0) issues.push({ level: 'ACTION REQUIRED', msg: `${orphanWards} wards without valid zone` });
    
    const orphanDepots = depots.filter(d => !d.zone).length;
    if (orphanDepots > 0) issues.push({ level: 'ACTION REQUIRED', msg: `${orphanDepots} depots without valid zone` });

    const orphanStaff = staff.filter(s => !s.municipality && s.role !== 'SYSTEM_ADMIN').length;
    if (orphanStaff > 0) issues.push({ level: 'WARNING', msg: `${orphanStaff} operational staff without municipality assignment` });

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold uppercase text-slate-800 border-b-2 border-slate-900 pb-2 mb-6">MASTER DATA QUALITY</h2>
        {issues.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-200 p-6 flex items-start">
            <CheckCircle className="w-6 h-6 text-emerald-600 mr-3 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-800 uppercase tracking-wider">OK</p>
              <p className="text-sm text-emerald-700 mt-1">All master data relationships are valid.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {issues.map((iss, idx) => (
              <div key={idx} className={`border p-4 flex items-start ${iss.level === 'ACTION REQUIRED' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                <AlertTriangle className={`w-5 h-5 mr-3 mt-0.5 ${iss.level === 'ACTION REQUIRED' ? 'text-red-600' : 'text-amber-600'}`} />
                <div>
                  <p className="font-bold uppercase tracking-wider text-xs">{iss.level}</p>
                  <p className="text-sm mt-1">{iss.msg}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderConfiguration = () => (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-bold uppercase text-slate-800 border-b-2 border-slate-900 pb-2 mb-6">SYSTEM CONFIGURATION</h2>
      <form onSubmit={handleSettingSave} className="bg-white border border-slate-200 shadow-sm p-6 space-y-4">
        {settings.map(s => (
          <div key={s.key}>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">{s.key.replace(/_/g, ' ')}</label>
            <input type="text" name={s.key} defaultValue={s.value} className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
        ))}
        {settings.length === 0 && <p className="text-sm text-slate-500">No configuration settings available.</p>}
        {settings.length > 0 && (
          <div className="pt-4 border-t border-slate-100 flex justify-end">
             <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 text-sm font-bold uppercase tracking-wider rounded transition-colors">SAVE CHANGES</button>
          </div>
        )}
      </form>
      
      {demoStatus && (
        <div className="bg-white border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">SIMULATOR CONTROL</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-800 text-sm">SIMULATOR STATUS</p>
              <p className="text-xs text-slate-500 mt-1">Environment-controlled feature.</p>
            </div>
            <div className={`px-3 py-1 rounded text-xs font-bold uppercase ${demoStatus.is_enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
              {demoStatus.is_enabled ? 'ENABLED' : 'DISABLED'}
            </div>
          </div>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider pt-2 border-t border-slate-50">Note: Modifying simulator state must be done via Environment Variables. Do not attempt to bypass backend controls.</p>
        </div>
      )}
    </div>
  );

  const renderRoleDirectory = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold uppercase text-slate-800 border-b-2 border-slate-900 pb-2 mb-6">ROLE REFERENCE</h2>
      
      <div className="bg-amber-50 border border-amber-200 p-4 mb-6">
        <p className="font-bold text-amber-800 uppercase tracking-wider text-xs flex items-center"><AlertTriangle className="w-4 h-4 mr-2" /> SECURITY RULE ENFORCEMENT</p>
        <p className="text-sm text-amber-700 mt-1">Role assignments and permissions are strictly enforced by the backend Django RBAC architecture. The interface below serves purely as an informational reference. Do not attempt to alter permissions via the frontend.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {role: 'SYSTEM ADMIN', desc: 'System-wide administrative access and oversight.'},
          {role: 'MUNICIPAL ADMIN', desc: 'Municipality-level administration and configuration.'},
          {role: 'MUNICIPAL OFFICER', desc: 'Municipal operational management and dispatching.'},
          {role: 'ZONE SUPERVISOR', desc: 'Zone-level field supervision and resource allocation.'},
          {role: 'DRIVER', desc: 'Assigned vehicle and collection operations.'},
          {role: 'FIELD WORKER', desc: 'Field collection operations and incident reporting.'},
          {role: 'AUDITOR', desc: 'Authorized read-only audit visibility across the platform.'},
        ].map(r => (
          <div key={r.role} className="bg-white border border-slate-200 p-4 shadow-sm">
            <h4 className="font-bold text-slate-800 text-sm">{r.role}</h4>
            <p className="text-xs text-slate-600 mt-1">{r.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSystemInfo = () => (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-bold uppercase text-slate-800 border-b-2 border-slate-900 pb-2 mb-6">SYSTEM INFORMATION</h2>
      <div className="bg-white border border-slate-200 p-0 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <tbody className="divide-y divide-slate-100">
            <tr><td className="py-3 px-4 font-bold text-slate-700 w-1/3">APPLICATION</td><td className="py-3 px-4 text-slate-600">SmartBin Municipal ERP</td></tr>
            <tr><td className="py-3 px-4 font-bold text-slate-700">FRONTEND</td><td className="py-3 px-4 text-slate-600">React</td></tr>
            <tr><td className="py-3 px-4 font-bold text-slate-700">BACKEND</td><td className="py-3 px-4 text-slate-600">Django REST Framework</td></tr>
            <tr><td className="py-3 px-4 font-bold text-slate-700">ROUTING ENGINE</td><td className="py-3 px-4 text-slate-600">OR-Tools</td></tr>
            <tr><td className="py-3 px-4 font-bold text-slate-700">MAP SERVICE</td><td className="py-3 px-4 text-slate-600">React Leaflet</td></tr>
          </tbody>
        </table>
      </div>
      
      <div className="bg-white border border-slate-200 p-6 shadow-sm">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">SYSTEM HEALTH</h3>
        <p className="text-sm text-slate-500 italic">Not available</p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch(activeTab) {
      case 'Overview': return renderOverview();
      case 'Municipalities': 
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2 mb-6">
              <h2 className="text-xl font-bold uppercase text-slate-800">MUNICIPALITIES</h2>
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50" disabled>ADD MUNICIPALITY</button>
            </div>
            {renderTable(
              ['CODE', 'NAME', 'IS DEMO', 'STATUS', 'ACTION'],
              municipalities.map(m => [m.code, m.name, m.is_demo ? 'YES' : 'NO', 'ACTIVE', 'VIEW'])
            )}
          </div>
        );
      case 'Zones':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2 mb-6">
              <h2 className="text-xl font-bold uppercase text-slate-800">ZONES</h2>
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50" disabled>ADD ZONE</button>
            </div>
            {renderTable(
              ['CODE', 'NAME', 'MUNICIPALITY', 'STATUS', 'ACTION'],
              zones.map(z => [z.code, z.name, getMuniName(z.municipality), 'ACTIVE', 'VIEW'])
            )}
          </div>
        );
      case 'Wards':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2 mb-6">
              <h2 className="text-xl font-bold uppercase text-slate-800">WARDS</h2>
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50" disabled>ADD WARD</button>
            </div>
            {renderTable(
              ['CODE', 'NAME', 'ZONE', 'MUNICIPALITY', 'STATUS', 'ACTION'],
              wards.map(w => [w.code, w.name, getZoneName(w.zone), getMuniName(w.municipality), 'ACTIVE', 'VIEW'])
            )}
          </div>
        );
      case 'Depots':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2 mb-6">
              <h2 className="text-xl font-bold uppercase text-slate-800">DEPOTS</h2>
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50" disabled>ADD DEPOT</button>
            </div>
            {renderTable(
              ['CODE', 'NAME', 'ZONE', 'MUNICIPALITY', 'STATUS', 'ACTION'],
              depots.map(d => [d.code, d.name, getZoneName(d.zone), getMuniName(d.municipality), 'ACTIVE', 'VIEW'])
            )}
          </div>
        );
      case 'Facilities':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2 mb-6">
              <h2 className="text-xl font-bold uppercase text-slate-800">PROCESSING FACILITIES</h2>
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50" disabled>ADD FACILITY</button>
            </div>
            {renderTable(
              ['CODE', 'NAME', 'ZONE', 'MUNICIPALITY', 'STATUS', 'ACTION'],
              facilities.map(f => [f.code, f.name, getZoneName(f.zone), getMuniName(f.municipality), 'ACTIVE', 'VIEW'])
            )}
          </div>
        );
      case 'Users':
        return (
          <div className="space-y-6">
             <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2 mb-6">
              <h2 className="text-xl font-bold uppercase text-slate-800">USERS & STAFF</h2>
              <a href="/app/staff" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors">OPEN STAFF DIRECTORY</a>
            </div>
            {renderTable(
              ['EMP ID', 'NAME', 'ROLE', 'MUNICIPALITY', 'ZONE', 'STATUS'],
              staff.map(s => [
                s.employee_id, 
                `${s.user?.first_name || ''} ${s.user?.last_name || ''}`, 
                s.role.replace(/_/g, ' '), 
                getMuniName(s.municipality), 
                getZoneName(s.zone), 
                s.employment_status
              ])
            )}
          </div>
        );
      case 'Roles': return renderRoleDirectory();
      case 'Configuration': return renderConfiguration();
      case 'DataQuality': return renderDataQuality();
      case 'SystemInfo': return renderSystemInfo();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* HEADER */}
      <div className="bg-slate-900 text-white px-6 py-4 shadow-md sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase flex items-center">
              <Layers className="w-5 h-5 mr-2 text-indigo-400" />
              ADMINISTRATION
            </h1>
            <p className="text-sm text-slate-400 mt-1">Municipal master data, access control and system configuration.</p>
          </div>
          <div className="flex items-center space-x-3">
             <div className="flex items-center px-3 py-1.5 bg-slate-800 rounded text-xs font-bold uppercase text-slate-300">
               <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
               SYSTEM STATUS: OPERATIONAL
             </div>
             <button onClick={fetchAllData} className="p-2 bg-slate-800 hover:bg-slate-700 rounded transition-colors text-slate-300">
               <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* NAVIGATION SIDEBAR */}
          <div className="w-full lg:w-64 flex-shrink-0">
             <div className="space-y-6">
                {Object.entries(NAVIGATION).map(([category, items]) => (
                  <div key={category}>
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-2">{category}</h3>
                    <div className="bg-white border border-slate-200 shadow-sm flex flex-col rounded overflow-hidden">
                      {items.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors text-left border-l-4 ${
                              isActive 
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-600' 
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent'
                            }`}
                          >
                            <Icon className="w-4 h-4 mr-3" />
                            {tab.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
             </div>
          </div>

          {/* CONTENT AREA */}
          <div className="flex-1 min-w-0">
            {loading ? (
               <div className="flex flex-col items-center justify-center p-24 bg-white border border-slate-200 shadow-sm">
                 <RefreshCw className="w-8 h-8 animate-spin text-slate-300 mb-4" />
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">LOADING ADMINISTRATION DATA...</p>
               </div>
            ) : (
              <div className="animate-fade-in">
                {renderContent()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
