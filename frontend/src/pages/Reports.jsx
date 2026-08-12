import React, { useState, useEffect } from 'react';
import api from '../api';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Download, RefreshCw, Filter, LayoutDashboard, Truck, Users, Map, AlertTriangle, CheckCircle, Search, Trash2 } from 'lucide-react';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  
  // Filters
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  
  const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'collections', label: 'Collections', icon: CheckCircle },
    { id: 'exceptions', label: 'Exceptions', icon: AlertTriangle },
    { id: 'bins', label: 'SmartBins', icon: Trash2 },
    { id: 'fleet', label: 'Fleet', icon: Truck },
    { id: 'workforce', label: 'Workforce', icon: Users },
    { id: 'zones', label: 'Zones', icon: Map },
  ];

  const fetchReportData = async () => {
    setLoading(true);
    try {
      let params = new URLSearchParams();
      if (startDate) params.append('from', startDate.toISOString().split('T')[0]);
      if (endDate) params.append('to', endDate.toISOString().split('T')[0]);
      
      const response = await api.get(`/reports/${activeTab}/?${params.toString()}`);
      setReportData(response.data);
    } catch (error) {
      console.error('Failed to fetch report data:', error);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [activeTab, startDate, endDate]);

  const handleExport = () => {
    let params = new URLSearchParams();
    if (startDate) params.append('from', startDate.toISOString().split('T')[0]);
    if (endDate) params.append('to', endDate.toISOString().split('T')[0]);
    params.append('export', 'csv');
    
    // Create a temporary link to download the file directly from the API endpoint
    // Needs auth token! So fetch as blob instead.
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

  // ----- RENDER HELPERS -----
  
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-slate-800/20 rounded-xl border border-slate-700/50">
      <AlertTriangle className="w-12 h-12 mb-4 opacity-50" />
      <h3 className="text-lg font-medium text-slate-300">NO DATA AVAILABLE</h3>
      <p className="mt-2 text-sm text-center max-w-md">No operational records match the selected reporting period and scope.</p>
    </div>
  );

  const renderOverview = () => {
    if (!reportData) return renderEmptyState();
    const { schedules, bins, fleet, workforce } = reportData;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card: Schedules */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Collection Operations</h3>
            <div className="text-3xl font-bold text-white mb-4">{schedules?.total || 0} <span className="text-sm font-normal text-slate-400">Total</span></div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Completed</span><span className="text-green-400 font-medium">{schedules?.completed || 0}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Planned/Disp</span><span className="text-blue-400">{schedules?.planned + schedules?.dispatched || 0}</span></div>
            </div>
          </div>
          
          {/* Card: Bins */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">SmartBins</h3>
            <div className="text-3xl font-bold text-white mb-4">{bins?.total || 0} <span className="text-sm font-normal text-slate-400">Total</span></div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Open Alerts</span><span className="text-red-400 font-medium">{bins?.open_alerts || 0}</span></div>
            </div>
          </div>
          
          {/* Card: Fleet */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Fleet</h3>
            <div className="text-3xl font-bold text-white mb-4">{fleet?.active || 0} <span className="text-sm font-normal text-slate-400">Active</span></div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">On Route</span><span className="text-amber-400">{fleet?.on_route || 0}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Maintenance</span><span className="text-red-400">{fleet?.maintenance || 0}</span></div>
            </div>
          </div>
          
          {/* Card: Workforce */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Workforce</h3>
            <div className="text-3xl font-bold text-white mb-4">{workforce?.active_drivers + workforce?.active_workers || 0} <span className="text-sm font-normal text-slate-400">Field Staff</span></div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Drivers</span><span>{workforce?.active_drivers || 0}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Field Workers</span><span>{workforce?.active_workers || 0}</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCollections = () => {
    if (!reportData) return renderEmptyState();
    const { schedules, records } = reportData;
    
    if (schedules?.total === 0 && records?.total === 0) return renderEmptyState();
    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-medium text-white mb-4 border-b border-slate-700 pb-2">Schedule Metrics</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-700/50"><td className="py-3 text-slate-400">Total Schedules</td><td className="text-right font-medium text-white">{schedules.total}</td></tr>
              <tr className="border-b border-slate-700/50"><td className="py-3 text-slate-400">Draft</td><td className="text-right">{schedules.draft}</td></tr>
              <tr className="border-b border-slate-700/50"><td className="py-3 text-slate-400">Planned</td><td className="text-right">{schedules.planned}</td></tr>
              <tr className="border-b border-slate-700/50"><td className="py-3 text-slate-400">Dispatched</td><td className="text-right">{schedules.dispatched}</td></tr>
              <tr className="border-b border-slate-700/50"><td className="py-3 text-slate-400">In Progress</td><td className="text-right">{schedules.in_progress}</td></tr>
              <tr className="border-b border-slate-700/50"><td className="py-3 text-slate-400">Completed</td><td className="text-right text-green-400">{schedules.completed}</td></tr>
              <tr><td className="py-3 text-slate-400">Cancelled</td><td className="text-right text-red-400">{schedules.cancelled}</td></tr>
            </tbody>
          </table>
        </div>
        
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-medium text-white mb-4 border-b border-slate-700 pb-2">Collection Record Metrics</h3>
          <div className="mb-6 bg-slate-900/50 p-4 rounded-lg flex items-center justify-between border border-slate-700/50">
            <div>
              <p className="text-slate-400 text-sm mb-1">Completion Rate</p>
              <p className="text-2xl font-bold text-white">{records.completion_rate}%</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-sm mb-1">Collected / Total</p>
              <p className="text-lg font-medium text-slate-300">{records.collected} / {records.total}</p>
            </div>
          </div>
          
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-700/50"><td className="py-3 text-slate-400">Pending</td><td className="text-right">{records.pending}</td></tr>
              <tr className="border-b border-slate-700/50"><td className="py-3 text-slate-400">Arrived</td><td className="text-right text-amber-400">{records.arrived}</td></tr>
              <tr className="border-b border-slate-700/50"><td className="py-3 text-slate-400">Collected</td><td className="text-right text-green-400 font-medium">{records.collected}</td></tr>
              <tr><td className="py-3 text-slate-400">Unable To Collect</td><td className="text-right text-red-400 font-medium">{records.unable_to_collect}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderExceptions = () => {
    if (!reportData || !reportData.details || reportData.details.length === 0) return renderEmptyState();
    
    return (
      <div className="space-y-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6">
          <h3 className="text-lg font-medium text-white mb-4">Exception Summary</h3>
          <div className="flex flex-wrap gap-4">
            {Object.entries(reportData.summary).map(([reason, count]) => (
              <div key={reason} className="bg-slate-900/50 border border-slate-700 px-4 py-3 rounded-lg flex-1 min-w-[150px]">
                <p className="text-slate-400 text-xs mb-1 uppercase tracking-wider">{reason}</p>
                <p className="text-xl font-bold text-red-400">{count}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3">Bin</th>
                  <th className="px-4 py-3">Zone</th>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {reportData.details.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="px-4 py-3 whitespace-nowrap">{item.date}</td>
                    <td className="px-4 py-3 text-blue-400">{item.schedule_id}</td>
                    <td className="px-4 py-3">{item.bin_id}</td>
                    <td className="px-4 py-3">{item.zone_name}</td>
                    <td className="px-4 py-3">{item.driver_name}</td>
                    <td className="px-4 py-3">{item.vehicle}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs border border-red-500/30">
                        {item.reason}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 truncate max-w-xs">{item.notes || '-'}</td>
                  </tr>
                ))}
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
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Total Monitored Bins</h3>
          <div className="text-3xl font-bold text-white mb-1">{reportData.total_bins}</div>
        </div>
        
        {reportData.trend && reportData.trend.length > 0 ? (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 className="text-lg font-medium text-white mb-6">Bin Fill-Level Trend</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportData.trend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="day" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                    formatter={(value) => [`${value}%`, 'Avg Fill Level']}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="avg_fill" stroke="#3b82f6" activeDot={{ r: 8 }} name="Average Fill %" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-500 mt-4 text-center">Trend lines represent actual historical BinReading data. Missing days indicate no readings were transmitted.</p>
          </div>
        ) : (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-12 text-center text-slate-500">
            No historical trend data available for the selected period.
          </div>
        )}
      </div>
    );
  };

  const renderFleet = () => {
    if (!reportData) return renderEmptyState();
    
    return (
      <div className="space-y-6">
        <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-lg flex items-start space-x-3 text-sm text-slate-300">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-400">Vehicle Utilization Data Not Available</p>
            <p className="mt-1 text-slate-400">Historical operating-duration tracking is not currently supported by the underlying operational models.</p>
          </div>
        </div>
      
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 className="text-lg font-medium text-white mb-4 border-b border-slate-700 pb-2">Status Distribution</h3>
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(reportData.status_summary || {}).map(([status, count]) => (
                  <tr key={status} className="border-b border-slate-700/50">
                    <td className="py-3 text-slate-400 capitalize">{status.replace(/_/g, ' ')}</td>
                    <td className="text-right font-medium text-white">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 className="text-lg font-medium text-white mb-4 border-b border-slate-700 pb-2">Type Distribution</h3>
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(reportData.type_summary || {}).map(([type, count]) => (
                  <tr key={type} className="border-b border-slate-700/50">
                    <td className="py-3 text-slate-400 capitalize">{type.replace(/_/g, ' ')}</td>
                    <td className="text-right font-medium text-white">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {reportData.operations && reportData.operations.length > 0 && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden mt-6">
            <div className="p-4 bg-slate-900/50 border-b border-slate-700">
              <h3 className="text-lg font-medium text-white">Vehicle Schedule Assignments</h3>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-800 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">Registration</th>
                  <th className="px-4 py-3 text-right">Assigned Schedules</th>
                  <th className="px-4 py-3 text-right">Completed Schedules</th>
                </tr>
              </thead>
              <tbody>
                {reportData.operations.map((op, idx) => (
                  <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="px-4 py-3 font-medium text-white">{op.vehicle__registration_number}</td>
                    <td className="px-4 py-3 text-right">{op.assigned}</td>
                    <td className="px-4 py-3 text-right text-green-400">{op.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };
  
  const renderWorkforce = () => {
    if (!reportData) return renderEmptyState();
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-medium text-white mb-4 border-b border-slate-700 pb-2">Employment Status</h3>
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(reportData.status || {}).map(([status, count]) => (
                <tr key={status} className="border-b border-slate-700/50">
                  <td className="py-3 text-slate-400 capitalize">{status.replace(/_/g, ' ')}</td>
                  <td className="text-right font-medium text-white">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-medium text-white mb-4 border-b border-slate-700 pb-2">Role Distribution</h3>
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(reportData.roles || {}).map(([role, count]) => (
                <tr key={role} className="border-b border-slate-700/50">
                  <td className="py-3 text-slate-400 capitalize">{role.replace(/_/g, ' ')}</td>
                  <td className="text-right font-medium text-white">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  const renderZones = () => {
    if (!reportData || reportData.length === 0) return renderEmptyState();
    
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">Zone</th>
                <th className="px-4 py-3 text-right">Schedules</th>
                <th className="px-4 py-3 text-right">Completed</th>
                <th className="px-4 py-3 text-right">Exceptions</th>
                <th className="px-4 py-3 text-right">Open Alerts</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="px-4 py-3 font-medium text-white">{item.zone || 'Unassigned'}</td>
                  <td className="px-4 py-3 text-right">{item.schedules}</td>
                  <td className="px-4 py-3 text-right text-green-400">{item.completed}</td>
                  <td className="px-4 py-3 text-right text-red-400">{item.exceptions}</td>
                  <td className="px-4 py-3 text-right text-amber-400">{item.open_alerts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'collections': return renderCollections();
      case 'exceptions': return renderExceptions();
      case 'bins': return renderBins();
      case 'fleet': return renderFleet();
      case 'workforce': return renderWorkforce();
      case 'zones': return renderZones();
      default: return renderEmptyState();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center">
            <LayoutDashboard className="mr-3 text-blue-500" />
            Reports & Analytics
          </h1>
          <p className="text-slate-400 mt-1">Operational data insights and compliance reporting.</p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <button 
            onClick={fetchReportData}
            className="flex items-center space-x-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            <span>Refresh</span>
          </button>
          <button 
            onClick={handleExport}
            disabled={!reportData}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center text-slate-400 text-sm font-medium mr-2">
          <Filter className="w-4 h-4 mr-2" />
          FILTERS
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-slate-500 text-sm">Period:</span>
          <DatePicker
            selectsRange={true}
            startDate={startDate}
            endDate={endDate}
            onChange={(update) => setDateRange(update)}
            placeholderText="Select date range"
            className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 w-64 focus:outline-none focus:border-blue-500"
            isClearable
          />
        </div>
      </div>

      {/* Report Layout */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-3 text-sm font-medium transition-colors text-left border-l-2 ${
                    isActive 
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500' 
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center p-12 bg-slate-800/20 rounded-xl border border-slate-700/50 h-64">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="animate-fade-in">
              {renderContent()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
