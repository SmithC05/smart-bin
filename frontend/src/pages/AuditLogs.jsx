import React, { useState, useEffect } from 'react';
import api from '../api';
import Card from '../components/ui/Card';
import { RefreshCw, Search, Filter, Shield } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination & Filtering state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        page: page,
      });
      if (search) params.append('search', search);
      if (module) params.append('module', module);
      if (action) params.append('action', action);
      if (startDate) params.append('start_date', startDate.toISOString());
      if (endDate) params.append('end_date', endDate.toISOString());

      const res = await api.get(`/audit-logs/?${params.toString()}`);
      setLogs(res.data.results || []);
      setTotalCount(res.data.count || 0);
      // Assuming page size is 100 for now. Could read from API response if provided.
      setTotalPages(Math.ceil((res.data.count || 0) / 100) || 1);
    } catch (err) {
      console.error(err);
      setError('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, module, action, startDate, endDate]); // search is handled by a form submit

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };
  
  const resetFilters = () => {
    setSearch('');
    setModule('');
    setAction('');
    setStartDate(null);
    setEndDate(null);
    setPage(1);
  };

  const getActionColor = (act) => {
    if (act.includes('CREATED')) return 'bg-green-100 text-green-800 border-green-200';
    if (act.includes('UPDATED')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (act.includes('DELETED') || act.includes('DEACTIVATED') || act.includes('CANCELLED')) return 'bg-red-100 text-red-800 border-red-200';
    if (act.includes('COMPLETED') || act.includes('COLLECTED')) return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    if (act.includes('EXCEPTION')) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-slate-600" />
            Audit Logs
          </h1>
          <p className="text-slate-500">System-wide operational accountability and history.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchLogs} className="btn-secondary" title="Refresh">
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Search User / Record ID</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. EMP-001, VEH-123..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 input-field"
                />
              </div>
            </div>
            
            <div className="w-40">
              <label className="block text-sm font-medium text-slate-700 mb-1">Module</label>
              <select value={module} onChange={(e) => { setModule(e.target.value); setPage(1); }} className="input-field">
                <option value="">All Modules</option>
                <option value="Vehicles">Vehicles</option>
                <option value="Staff">Staff</option>
                <option value="Collection Scheduling">Scheduling</option>
                <option value="Operations">Operations</option>
              </select>
            </div>

            <div className="w-48">
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <DatePicker
                selected={startDate}
                onChange={(date) => { setStartDate(date); setPage(1); }}
                className="input-field w-full"
                placeholderText="Select start date"
                isClearable
              />
            </div>
            
            <div className="w-48">
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <DatePicker
                selected={endDate}
                onChange={(date) => { setEndDate(date); setPage(1); }}
                className="input-field w-full"
                placeholderText="Select end date"
                isClearable
              />
            </div>

            <button type="submit" className="btn-primary flex items-center gap-2 h-10">
              <Search className="h-4 w-4" /> Search
            </button>
            <button type="button" onClick={resetFilters} className="btn-secondary h-10">
              Reset
            </button>
          </form>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-600 border-b border-red-100">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
              <tr>
                <th className="px-6 py-3 font-medium">Timestamp</th>
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Action</th>
                <th className="px-6 py-3 font-medium">Module / Record</th>
                <th className="px-6 py-3 font-medium hidden md:table-cell">Location</th>
                <th className="px-6 py-3 font-medium">Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-400" />
                    Loading audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                    No audit logs found matching the criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                      {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4">
                      {log.user ? (
                         <div className="font-medium text-slate-900">{log.username || 'Unknown'}</div>
                      ) : (
                         <div className="font-medium text-slate-500 italic">{log.actor_name || 'SYSTEM'}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 font-medium">{log.module}</div>
                      <div className="text-xs text-slate-500 font-mono mt-1">{log.record_id}</div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      {log.municipality_name ? (
                        <div className="text-slate-600 flex flex-col">
                          <span>{log.municipality_name}</span>
                          {log.zone_name && <span className="text-xs text-slate-400">{log.zone_name}</span>}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Global</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {log.changes && Object.keys(log.changes).length > 0 ? (
                         <pre className="text-xs bg-slate-100 p-2 rounded overflow-x-auto max-w-xs text-slate-700 font-mono">
                           {JSON.stringify(log.changes, null, 2)}
                         </pre>
                      ) : (
                         <span className="text-slate-400 text-xs italic">No additional data</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Showing <span className="font-medium">{logs.length}</span> of <span className="font-medium">{totalCount}</span> results
          </div>
          <div className="flex gap-2">
            <button 
              className="btn-secondary py-1 px-3"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="flex items-center px-2 text-sm text-slate-600">
              Page {page} of {totalPages}
            </span>
            <button 
              className="btn-secondary py-1 px-3"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AuditLogs;
