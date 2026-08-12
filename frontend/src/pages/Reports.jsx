import React, { useState, useEffect } from 'react';
import api from '../api';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { 
  Download, RefreshCw, Filter, LayoutDashboard, Truck, Users, 
  Map, AlertTriangle, CheckCircle, Trash2, Calendar, FileText,
  Activity, ShieldAlert, FileBarChart2
} from 'lucide-react';
import { format, subDays } from 'date-fns';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [masterData, setMasterData] = useState({ municipalities: [], zones: [], wards: [] });
  
  // Scope
  const [filterMuni, setFilterMuni] = useState('');
  const [filterZone, setFilterZone] = useState('');
  const [filterWard, setFilterWard] = useState('');
  
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  
  const TABS = [
    { id: 'overview', label: 'Executive Summary', icon: LayoutDashboard, title: 'MUNICIPAL OPERATIONAL SUMMARY' },
    { id: 'collections', label: 'Collection Operations', icon: CheckCircle, title: 'COLLECTION OPERATIONS REPORT' },
    { id: 'bins', label: 'SmartBin Analytics', icon: Trash2, title: 'SMARTBIN STATUS REPORT' },
    { id: 'alerts', label: 'Alerts & Incidents', icon: ShieldAlert, title: 'ALERT & INCIDENT REPORT' },
    { id: 'fleet', label: 'Fleet Status', icon: Truck, title: 'FLEET STATUS REPORT' },
    { id: 'workforce', label: 'Workforce Analytics', icon: Users, title: 'WORKFORCE OPERATIONS REPORT' },
    { id: 'zones', label: 'Zone Performance', icon: Map, title: 'ZONE PERFORMANCE REPORT' },
  ];

  useEffect(() => {
    fetchMasters();
    setQuickDate(7); // Default to last 7 days
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [activeTab, startDate, endDate, filterMuni, filterZone, filterWard]);

  const fetchMasters = async () => {
    try {
      const [muniRes, zoneRes, wardRes] = await Promise.all([
        api.get('/municipalities/'), api.get('/zones/'), api.get('/wards/')
      ]);
      setMasterData({ municipalities: muniRes.data, zones: zoneRes.data, wards: wardRes.data });
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      let params = new URLSearchParams();
      if (startDate) params.append('from', startDate.toISOString().split('T')[0]);
      if (endDate) params.append('to', endDate.toISOString().split('T')[0]);
      if (filterMuni) params.append('municipality', filterMuni);
      if (filterZone) params.append('zone', filterZone);
      if (filterWard) params.append('ward', filterWard);
      
      const response = await api.get(`/reports/${activeTab}/?${params.toString()}`);
      setReportData(response.data);
    } catch (error) {
      console.error('Failed to fetch report data:', error);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    let params = new URLSearchParams();
    if (startDate) params.append('from', startDate.toISOString().split('T')[0]);
    if (endDate) params.append('to', endDate.toISOString().split('T')[0]);
    if (filterMuni) params.append('municipality', filterMuni);
    if (filterZone) params.append('zone', filterZone);
    if (filterWard) params.append('ward', filterWard);
    params.append('export', 'csv');
    
    api.get(`/reports/${activeTab}/?${params.toString()}`, { responseType: 'blob' })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('link');
        link.href = url;
        link.setAttribute('download', `${activeTab}_report.csv`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
      });
  };

  const setQuickDate = (days) => {
    const end = new Date();
    const start = subDays(new Date(), days);
    setDateRange([start, end]);
  };

  // ----- RENDER HELPERS -----
  
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center p-16 bg-white border border-slate-200 shadow-sm text-center">
      <AlertTriangle className="w-12 h-12 mb-4 text-slate-300" />
      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">NO DATA AVAILABLE</h3>
      <p className="mt-2 text-xs text-slate-400 max-w-sm">No operational records exist for the selected reporting period and administrative scope.</p>
      <button onClick={() => setDateRange([null, null])} className="mt-4 px-4 py-2 border border-slate-300 text-xs font-bold uppercase text-slate-600 hover:bg-slate-50 transition-colors">Clear Date Filter</button>
    </div>
  );

  const getScopeText = () => {
    let parts = [];
    if (filterMuni) parts.push(masterData.municipalities.find(m => m.id === parseInt(filterMuni))?.name || 'Municipality');
    if (filterZone) parts.push(masterData.zones.find(z => z.id === parseInt(filterZone))?.name || 'Zone');
    if (filterWard) parts.push(masterData.wards.find(w => w.id === parseInt(filterWard))?.name || 'Ward');
    return parts.length > 0 ? parts.join(' > ') : 'ALL AUTHORIZED SCOPES';
  };

  const ReportHeader = ({ title }) => (
    <div className="border-b-2 border-slate-900 pb-4 mb-6 hidden print:block">
      <h1 className="text-2xl font-black uppercase text-slate-900">MUNICIPAL SOLID WASTE MANAGEMENT ERP</h1>
      <h2 className="text-xl font-bold uppercase text-slate-700 mt-2">{title}</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm font-mono text-slate-600">
        <div>
          <strong>REPORTING PERIOD:</strong><br/>
          {startDate ? format(startDate, 'dd MMM yyyy') : 'BEGINNING'} &mdash; {endDate ? format(endDate, 'dd MMM yyyy') : 'TODAY'}
        </div>
        <div>
          <strong>ADMINISTRATIVE SCOPE:</strong><br/>
          {getScopeText()}
        </div>
      </div>
      <div className="mt-2 text-xs font-mono text-slate-400">
        GENERATED: {format(new Date(), 'dd MMM yyyy HH:mm:ss')} · DATA SOURCE: SMARTBIN ERP
      </div>
    </div>
  );

  const renderOverview = () => {
    if (!reportData) return renderEmptyState();
    const { schedules, bins, fleet, workforce } = reportData;
    
    return (
      <div className="space-y-6">
        <ReportHeader title={TABS.find(t=>t.id==='overview').title} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 p-5 shadow-sm print:shadow-none print:border-slate-400">
            <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">COLLECTION SCHEDULES</h3>
            <div className="text-3xl font-black text-slate-800 mb-4">{String(schedules?.total || 0).padStart(2, '0')}</div>
            <div className="space-y-2 text-xs font-bold uppercase text-slate-600">
              <div className="flex justify-between border-b border-slate-100 pb-1"><span>COMPLETED</span><span className="text-emerald-600">{schedules?.completed || 0}</span></div>
              <div className="flex justify-between border-b border-slate-100 pb-1"><span>IN PROGRESS</span><span className="text-indigo-600">{schedules?.in_progress || 0}</span></div>
              <div className="flex justify-between border-b border-slate-100 pb-1"><span>CANCELLED</span><span className="text-red-600">{schedules?.cancelled || 0}</span></div>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 p-5 shadow-sm print:shadow-none print:border-slate-400">
            <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">SMARTBINS</h3>
            <div className="text-3xl font-black text-slate-800 mb-4">{String(bins?.total || 0).padStart(2, '0')}</div>
            <div className="space-y-2 text-xs font-bold uppercase text-slate-600">
              <div className="flex justify-between border-b border-slate-100 pb-1"><span>OPEN ALERTS</span><span className="text-red-600">{bins?.open_alerts || 0}</span></div>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 p-5 shadow-sm print:shadow-none print:border-slate-400">
            <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">FLEET</h3>
            <div className="text-3xl font-black text-slate-800 mb-4">{String(fleet?.active || 0).padStart(2, '0')}</div>
            <div className="space-y-2 text-xs font-bold uppercase text-slate-600">
              <div className="flex justify-between border-b border-slate-100 pb-1"><span>ON ROUTE</span><span className="text-indigo-600">{fleet?.on_route || 0}</span></div>
              <div className="flex justify-between border-b border-slate-100 pb-1"><span>MAINTENANCE</span><span className="text-red-600">{fleet?.maintenance || 0}</span></div>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 p-5 shadow-sm print:shadow-none print:border-slate-400">
            <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">WORKFORCE</h3>
            <div className="text-3xl font-black text-slate-800 mb-4">{String((workforce?.active_drivers || 0) + (workforce?.active_workers || 0)).padStart(2, '0')}</div>
            <div className="space-y-2 text-xs font-bold uppercase text-slate-600">
              <div className="flex justify-between border-b border-slate-100 pb-1"><span>DRIVERS</span><span>{workforce?.active_drivers || 0}</span></div>
              <div className="flex justify-between border-b border-slate-100 pb-1"><span>FIELD WORKERS</span><span>{workforce?.active_workers || 0}</span></div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-4 shadow-sm text-center print:hidden">
           <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">DATA LIMITATIONS (NOT AVAILABLE)</h3>
           <p className="text-xs text-slate-500">The current backend reporting APIs do not expose: Real vs Simulated Bin breakdowns, Route Distances, or Location Data Quality metrics. These have been explicitly omitted to preserve data honesty.</p>
        </div>
      </div>
    );
  };

  const renderCollections = () => {
    if (!reportData) return renderEmptyState();
    const { schedules, records } = reportData;
    if (schedules?.total === 0 && records?.total === 0) return renderEmptyState();
    
    return (
      <div className="space-y-6">
        <ReportHeader title={TABS.find(t=>t.id==='collections').title} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 shadow-sm print:shadow-none print:border-slate-400 overflow-hidden">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider p-4 border-b border-slate-200 bg-slate-50">COLLECTION PERFORMANCE (SCHEDULES)</h3>
            <table className="w-full text-sm text-left">
              <tbody className="divide-y divide-slate-100">
                <tr><td className="py-3 px-4 text-xs font-bold text-slate-600 uppercase">TOTAL SCHEDULES</td><td className="px-4 text-right font-black text-slate-900">{schedules.total}</td></tr>
                <tr><td className="py-3 px-4 text-xs font-bold text-slate-600 uppercase">DRAFT</td><td className="px-4 text-right font-bold text-slate-700">{schedules.draft}</td></tr>
                <tr><td className="py-3 px-4 text-xs font-bold text-slate-600 uppercase">PLANNED</td><td className="px-4 text-right font-bold text-slate-700">{schedules.planned}</td></tr>
                <tr><td className="py-3 px-4 text-xs font-bold text-slate-600 uppercase">DISPATCHED</td><td className="px-4 text-right font-bold text-indigo-600">{schedules.dispatched}</td></tr>
                <tr><td className="py-3 px-4 text-xs font-bold text-slate-600 uppercase">IN PROGRESS</td><td className="px-4 text-right font-bold text-indigo-600">{schedules.in_progress}</td></tr>
                <tr><td className="py-3 px-4 text-xs font-bold text-slate-600 uppercase">COMPLETED</td><td className="px-4 text-right font-bold text-emerald-600">{schedules.completed}</td></tr>
                <tr><td className="py-3 px-4 text-xs font-bold text-slate-600 uppercase">CANCELLED</td><td className="px-4 text-right font-bold text-red-600">{schedules.cancelled}</td></tr>
              </tbody>
            </table>
          </div>
          
          <div className="bg-white border border-slate-200 shadow-sm print:shadow-none print:border-slate-400 overflow-hidden">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider p-4 border-b border-slate-200 bg-slate-50">DISPATCH ANALYTICS (BIN LEVEL)</h3>
            <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1">COMPLETION RATE</p>
                <p className="text-3xl font-black text-indigo-900">{records.completion_rate}%</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1">COLLECTED / ELIGIBLE</p>
                <p className="text-lg font-bold text-indigo-800">{records.collected} / {records.total}</p>
              </div>
            </div>
            <table className="w-full text-sm text-left">
              <tbody className="divide-y divide-slate-100">
                <tr><td className="py-3 px-4 text-xs font-bold text-slate-600 uppercase">PENDING</td><td className="px-4 text-right font-bold text-slate-700">{records.pending}</td></tr>
                <tr><td className="py-3 px-4 text-xs font-bold text-slate-600 uppercase">ARRIVED</td><td className="px-4 text-right font-bold text-amber-600">{records.arrived}</td></tr>
                <tr><td className="py-3 px-4 text-xs font-bold text-slate-600 uppercase">COLLECTED</td><td className="px-4 text-right font-bold text-emerald-600">{records.collected}</td></tr>
                <tr><td className="py-3 px-4 text-xs font-bold text-slate-600 uppercase">UNABLE TO COLLECT</td><td className="px-4 text-right font-bold text-red-600">{records.unable_to_collect}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderBins = () => {
    if (!reportData) return renderEmptyState();
    return (
      <div className="space-y-6">
        <ReportHeader title={TABS.find(t=>t.id==='bins').title} />
        <div className="bg-white border border-slate-200 shadow-sm print:shadow-none print:border-slate-400 p-6">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">TOTAL MONITORED ASSETS</h3>
          <div className="text-4xl font-black text-slate-900 mb-1">{reportData.total_bins}</div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">REAL VS SIMULATED BREAKDOWN NOT AVAILABLE VIA REPORTING API</p>
        </div>
        
        {reportData.trend && reportData.trend.length > 0 ? (
          <div className="bg-white border border-slate-200 shadow-sm print:shadow-none print:border-slate-400 p-6">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-6">FILL LEVEL ANALYSIS</h3>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportData.trend} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" tick={{fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis stroke="#64748b" domain={[0, 100]} tickFormatter={(val) => `${val}%`} tick={{fontSize: 10, fontWeight: 'bold'}} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#0f172a', color: '#f8fafc', fontSize: '12px', fontWeight: 'bold' }}
                    formatter={(value) => [`${value}%`, 'AVERAGE FILL LEVEL']}
                    labelStyle={{color: '#94a3b8'}}
                  />
                  <Line type="monotone" dataKey="avg_fill" stroke="#0f172a" activeDot={{ r: 6 }} name="Avg Fill %" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-slate-500 mt-4 text-center font-bold uppercase tracking-wider">Chart Accessibility: The chart displays the average recorded fill level percentage over the selected period. Missing days indicate no readings were recorded.</p>
          </div>
        ) : (
           <div className="bg-slate-50 border border-slate-200 p-12 text-center shadow-sm">
             <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">INSUFFICIENT HISTORICAL DATA</p>
           </div>
        )}
      </div>
    );
  };

  const renderAlerts = () => {
    if (!reportData) return renderEmptyState();
    return (
      <div className="space-y-6">
        <ReportHeader title={TABS.find(t=>t.id==='alerts').title} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-white border border-slate-200 shadow-sm print:shadow-none print:border-slate-400 overflow-hidden">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider p-4 border-b border-slate-200 bg-slate-50">ALERT ANALYTICS</h3>
              <table className="w-full text-sm text-left">
                <tbody className="divide-y divide-slate-100">
                  <tr><td className="py-3 px-4 text-xs font-bold text-slate-600 uppercase">TOTAL ALERTS</td><td className="px-4 text-right font-black text-slate-900">{reportData.total}</td></tr>
                  {Object.entries(reportData.level_summary || {}).map(([level, count]) => (
                    <tr key={level}>
                      <td className="py-3 px-4 text-xs font-bold text-slate-600 uppercase">{level}</td>
                      <td className={`px-4 text-right font-bold ${level === 'danger' ? 'text-red-600' : 'text-amber-600'}`}>{count}</td>
                    </tr>
                  ))}
                  <tr><td colSpan="2" className="bg-slate-50 py-1"></td></tr>
                  {Object.entries(reportData.status_summary || {}).map(([status, count]) => (
                    <tr key={status}>
                      <td className="py-3 px-4 text-xs font-bold text-slate-600 uppercase">{status}</td>
                      <td className="px-4 text-right font-bold text-slate-700">{count}</td>
                    </tr>
                  ))}
                  <tr><td colSpan="2" className="bg-slate-50 py-1"></td></tr>
                  <tr>
                    <td className="py-3 px-4 text-xs font-bold text-slate-600 uppercase">AVG RESOLUTION TIME</td>
                    <td className="px-4 text-right font-bold text-slate-700 font-mono">
                      {reportData.avg_resolution_hours ? `${reportData.avg_resolution_hours} HR` : '--'}
                    </td>
                  </tr>
                </tbody>
              </table>
           </div>
        </div>
      </div>
    );
  };

  const renderFleet = () => {
    if (!reportData) return renderEmptyState();
    return (
      <div className="space-y-6">
        <ReportHeader title={TABS.find(t=>t.id==='fleet').title} />
        
        <div className="bg-amber-50 border border-amber-200 p-4 shadow-sm text-sm print:hidden">
          <p className="font-bold text-amber-800 uppercase tracking-wider text-xs flex items-center"><AlertTriangle className="w-4 h-4 mr-2" /> DATA LIMITATIONS</p>
          <p className="mt-1 text-amber-700 text-xs">Historical vehicle utilization metrics (operating hours, mileage, fuel consumption) are not supported by the underlying operational models. The data below represents current point-in-time status or direct schedule relationships.</p>
        </div>
      
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 shadow-sm print:shadow-none print:border-slate-400 overflow-hidden">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider p-4 border-b border-slate-200 bg-slate-50">FLEET PERFORMANCE (STATUS)</h3>
            <table className="w-full text-sm text-left">
              <tbody className="divide-y divide-slate-100">
                <tr><td className="py-3 px-4 text-xs font-bold text-slate-600 uppercase">TOTAL VEHICLES</td><td className="px-4 text-right font-black text-slate-900">{reportData.total}</td></tr>
                {Object.entries(reportData.status_summary || {}).map(([status, count]) => (
                  <tr key={status}>
                    <td className="py-3 px-4 text-xs font-bold text-slate-600 uppercase">{status.replace(/_/g, ' ')}</td>
                    <td className="px-4 text-right font-bold text-slate-700">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-white border border-slate-200 shadow-sm print:shadow-none print:border-slate-400 overflow-hidden">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider p-4 border-b border-slate-200 bg-slate-50">VEHICLE DISTRIBUTION (TYPE)</h3>
            <table className="w-full text-sm text-left">
              <tbody className="divide-y divide-slate-100">
                {Object.entries(reportData.type_summary || {}).map(([type, count]) => (
                  <tr key={type}>
                    <td className="py-3 px-4 text-xs font-bold text-slate-600 uppercase">{type.replace(/_/g, ' ')}</td>
                    <td className="px-4 text-right font-bold text-slate-700">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {reportData.operations && reportData.operations.length > 0 && (
          <div className="bg-white border border-slate-200 shadow-sm print:shadow-none print:border-slate-400 overflow-hidden mt-6">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider p-4 border-b border-slate-200 bg-slate-50">VEHICLE ASSIGNMENT SUMMARY</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-[10px] text-slate-500 uppercase bg-white border-b border-slate-200 font-bold tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Registration</th>
                    <th className="px-4 py-3 text-right">Assigned Schedules</th>
                    <th className="px-4 py-3 text-right">Completed Schedules</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.operations.map((op, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold font-mono text-slate-800">{op.vehicle__registration_number}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-600">{op.assigned}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">{op.completed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  const renderWorkforce = () => {
    if (!reportData) return renderEmptyState();
    return (
      <div className="space-y-6">
        <ReportHeader title={TABS.find(t=>t.id==='workforce').title} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 shadow-sm print:shadow-none print:border-slate-400 overflow-hidden">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider p-4 border-b border-slate-200 bg-slate-50">EMPLOYMENT STATUS</h3>
            <table className="w-full text-sm text-left">
              <tbody className="divide-y divide-slate-100">
                <tr><td className="py-3 px-4 text-xs font-bold text-slate-600 uppercase">TOTAL STAFF</td><td className="px-4 text-right font-black text-slate-900">{reportData.total}</td></tr>
                {Object.entries(reportData.status || {}).map(([status, count]) => (
                  <tr key={status}>
                    <td className="py-3 px-4 text-xs font-bold text-slate-600 uppercase">{status.replace(/_/g, ' ')}</td>
                    <td className="px-4 text-right font-bold text-slate-700">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-white border border-slate-200 shadow-sm print:shadow-none print:border-slate-400 overflow-hidden">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider p-4 border-b border-slate-200 bg-slate-50">ROLE DISTRIBUTION</h3>
            <table className="w-full text-sm text-left">
              <tbody className="divide-y divide-slate-100">
                {Object.entries(reportData.roles || {}).map(([role, count]) => (
                  <tr key={role}>
                    <td className="py-3 px-4 text-xs font-bold text-slate-600 uppercase">{role.replace(/_/g, ' ')}</td>
                    <td className="px-4 text-right font-bold text-slate-700">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };
  
  const renderZones = () => {
    if (!reportData || reportData.length === 0) return renderEmptyState();
    return (
      <div className="space-y-6">
        <ReportHeader title={TABS.find(t=>t.id==='zones').title} />
        
        <div className="bg-slate-50 border border-slate-200 p-4 shadow-sm text-center print:hidden">
           <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">DATA LIMITATIONS</h3>
           <p className="text-xs text-slate-500">Ward-level performance metrics are not aggregated by the current reporting API. Only Zone metrics are available.</p>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm print:shadow-none print:border-slate-400 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-[10px] text-slate-500 uppercase bg-slate-50 border-b border-slate-200 font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3 sticky left-0 bg-slate-50">Zone</th>
                  <th className="px-4 py-3 text-right">Schedules</th>
                  <th className="px-4 py-3 text-right">Completed</th>
                  <th className="px-4 py-3 text-right">Exceptions</th>
                  <th className="px-4 py-3 text-right">Open Alerts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-800 sticky left-0 bg-white">{item.zone || 'UNASSIGNED'}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-600">{item.schedules}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{item.completed}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">{item.exceptions}</td>
                    <td className="px-4 py-3 text-right font-bold text-amber-600">{item.open_alerts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'collections': return renderCollections();
      case 'bins': return renderBins();
      case 'alerts': return renderAlerts();
      case 'fleet': return renderFleet();
      case 'workforce': return renderWorkforce();
      case 'zones': return renderZones();
      default: return renderEmptyState();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12 print:bg-white print:p-0">
      {/* HEADER */}
      <div className="bg-slate-900 text-white px-6 py-4 shadow-md sticky top-0 z-20 print:hidden">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase flex items-center">
              <FileBarChart2 className="w-5 h-5 mr-2 text-indigo-400" />
              Reports & Analytics
            </h1>
            <p className="text-sm text-slate-400 mt-1">Municipal operational reporting, performance analysis and data insights.</p>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={fetchReportData} className="p-2 bg-slate-800 hover:bg-slate-700 rounded transition-colors text-slate-300">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={handleExport}
              disabled={!reportData || loading}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 print:p-0 print:max-w-full">
        
        {/* SCOPE BAR */}
        <div className="bg-white border border-slate-200 p-4 shadow-sm mb-6 print:hidden">
          <div className="flex items-center text-slate-700 text-xs font-bold uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
            <Filter className="w-4 h-4 mr-2" />
            REPORT SCOPE
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">DATE RANGE</label>
              <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => setDateRange(update)}
                placeholderText="Select range..."
                className="w-full py-1.5 px-3 text-sm border border-slate-300 rounded text-slate-700 focus:ring-indigo-500 font-mono"
                isClearable
                dateFormat="dd MMM yyyy"
              />
            </div>
            
            <div className="flex space-x-2">
              <button onClick={() => setQuickDate(0)} className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600 uppercase rounded hover:bg-slate-200">TODAY</button>
              <button onClick={() => setQuickDate(7)} className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600 uppercase rounded hover:bg-slate-200">7 DAYS</button>
              <button onClick={() => setQuickDate(30)} className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600 uppercase rounded hover:bg-slate-200">30 DAYS</button>
            </div>
            
            <div className="w-px h-8 bg-slate-200 hidden lg:block mx-2"></div>
            
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">MUNICIPALITY</label>
              <select value={filterMuni} onChange={e => {setFilterMuni(e.target.value); setFilterZone(''); setFilterWard('');}} className="w-full py-1.5 px-3 text-sm border border-slate-300 rounded text-slate-700 focus:ring-indigo-500 font-bold">
                <option value="">ALL AUTHORIZED</option>
                {masterData.municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">ZONE</label>
              <select value={filterZone} onChange={e => {setFilterZone(e.target.value); setFilterWard('');}} className="w-full py-1.5 px-3 text-sm border border-slate-300 rounded text-slate-700 focus:ring-indigo-500 font-bold" disabled={!filterMuni}>
                <option value="">ALL ZONES</option>
                {masterData.zones.filter(z => !filterMuni || z.municipality === parseInt(filterMuni)).map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">WARD</label>
              <select value={filterWard} onChange={e => setFilterWard(e.target.value)} className="w-full py-1.5 px-3 text-sm border border-slate-300 rounded text-slate-700 focus:ring-indigo-500 font-bold" disabled={!filterZone}>
                <option value="">ALL WARDS</option>
                {masterData.wards.filter(w => !filterZone || w.zone === parseInt(filterZone)).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

          </div>
        </div>

        {/* LAYOUT */}
        <div className="flex flex-col md:flex-row gap-6 print:block">
          
          {/* CATALOG SIDEBAR */}
          <div className="w-full md:w-64 flex-shrink-0 print:hidden">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 ml-2">AVAILABLE REPORTS</h3>
            <div className="bg-white border border-slate-200 shadow-sm flex flex-col rounded">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-4 py-4 text-xs font-bold uppercase tracking-wider transition-colors text-left border-l-4 ${
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

          {/* REPORT CONTENT */}
          <div className="flex-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-24 bg-white border border-slate-200 shadow-sm print:hidden">
                <RefreshCw className="w-8 h-8 animate-spin text-slate-300 mb-4" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">GENERATING REPORT...</p>
              </div>
            ) : (
              <div className="animate-fade-in print:animate-none">
                {renderContent()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
