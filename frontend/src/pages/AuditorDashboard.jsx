import React, { useState, useEffect } from 'react';
import api from '../api';
import Card from '../components/ui/Card';
import { 
  RefreshCw, Search, Shield, AlertTriangle, CheckCircle, 
  Clock, User, FileText, ChevronRight, X, List, Server, Key
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, isToday } from 'date-fns';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

const AuditorDashboard = () => {
  const reducedMotion = useReducedMotion();
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination & Filtering state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState(new Date(new Date().setHours(0,0,0,0))); // Default Today
  const [endDate, setEndDate] = useState(new Date(new Date().setHours(23,59,59,999)));

  // Drawer state
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [traceLogs, setTraceLogs] = useState([]);
  const [traceLoading, setTraceLoading] = useState(false);

  // Derived Metrics
  const [metrics, setMetrics] = useState({
    todayEvents: 0,
    exceptions: 0,
    accessEvents: 0,
    failedAccess: 0,
    scheduleChanges: 0,
    dispatchEvents: 0
  });

  const fetchLogs = async (isRefresh = false) => {
    if (isRefresh) {
      // Don't set full loading state to avoid spinner flash
    } else {
      setLoading(true);
    }
    setError('');
    
    try {
      const params = new URLSearchParams({ page: page });
      if (searchQuery) params.append('search', searchQuery);
      if (module) params.append('module', module);
      if (action) params.append('action', action);
      if (startDate) params.append('start_date', startDate.toISOString());
      if (endDate) params.append('end_date', endDate.toISOString());

      const res = await api.get(`/audit-logs/?${params.toString()}`);
      const fetchedLogs = res.data.results || [];
      setLogs(fetchedLogs);
      setTotalCount(res.data.count || 0);
      setTotalPages(Math.ceil((res.data.count || 0) / 100) || 1);

      // Calculate simple metrics based on current page/filters as proxy if no aggregate API
      let todayCount = 0;
      let excCount = 0;
      let accCount = 0;
      let failedAccCount = 0;
      let schedCount = 0;
      let dispatchCount = 0;

      fetchedLogs.forEach(l => {
        if (isToday(new Date(l.timestamp))) todayCount++;
        if (l.action.includes('EXCEPTION')) excCount++;
        if (l.action.includes('LOGIN') || l.action.includes('AUTH')) accCount++;
        if (l.action.includes('FAILED') || l.action.includes('DENIED')) failedAccCount++;
        if (l.module === 'Collection Scheduling') schedCount++;
        if (l.action === 'DISPATCHED' || l.action.includes('DISPATCH')) dispatchCount++;
      });

      setMetrics({
        todayEvents: todayCount > 0 ? `${todayCount}+` : todayCount,
        exceptions: excCount,
        accessEvents: accCount,
        failedAccess: failedAccCount,
        scheduleChanges: schedCount,
        dispatchEvents: dispatchCount
      });

    } catch (err) {
      console.error(err);
      setError('Unable to retrieve audit events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, module, action, startDate, endDate]); 

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };
  
  const resetFilters = () => {
    setSearchQuery('');
    setModule('');
    setAction('');
    setStartDate(null);
    setEndDate(null);
    setPage(1);
  };

  const loadTrace = async (referenceId) => {
    if (!referenceId) return;
    setTraceLoading(true);
    try {
      const res = await api.get(`/audit-logs/?search=${referenceId}`);
      // Sort oldest first for trace view
      setTraceLogs((res.data.results || []).sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp)));
    } catch (err) {
      console.error(err);
    } finally {
      setTraceLoading(false);
    }
  };

  const openDrawer = (event) => {
    setSelectedEvent(event);
    if (event.record_id) {
      loadTrace(event.record_id);
    } else {
      setTraceLogs([]);
    }
  };

  const getActionColor = (act) => {
    const actUp = act.toUpperCase();
    if (actUp.includes('CREATED') || actUp.includes('SUCCESS') || actUp.includes('COMPLETED')) return 'text-emerald-700 bg-emerald-100 border-emerald-200';
    if (actUp.includes('UPDATED')) return 'text-blue-700 bg-blue-100 border-blue-200';
    if (actUp.includes('DELETED') || actUp.includes('FAILED') || actUp.includes('DENIED') || actUp.includes('CANCELLED')) return 'text-red-700 bg-red-100 border-red-200';
    if (actUp.includes('EXCEPTION') || actUp.includes('WARNING')) return 'text-amber-700 bg-amber-100 border-amber-200';
    return 'text-slate-700 bg-slate-100 border-slate-200';
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* HEADER */}
      <div className="bg-slate-900 text-white px-6 py-4 shadow-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Audit & Compliance
            </h1>
            <p className="text-sm text-slate-400 mt-1">Operational Traceability Center</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-xs uppercase text-slate-500 font-bold mb-1">Reporting Period</span>
              <div className="text-sm text-slate-300">
                 {startDate ? format(startDate, 'dd MMM yyyy') : 'All Time'} 
                 {endDate && startDate && ' - '}
                 {endDate ? format(endDate, 'dd MMM yyyy') : ''}
              </div>
            </div>
            <button 
              onClick={() => fetchLogs(true)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded transition-colors text-indigo-300"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* COMPLIANCE STATUS STRIP */}
        <div className="bg-slate-800 rounded-lg p-3 shadow flex flex-wrap gap-4 items-center justify-between overflow-hidden">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-4">System Compliance Status</div>
          <div className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-wider">
            <span className="flex items-center text-emerald-400"><CheckCircle className="w-3 h-3 mr-1"/> Audit Logging Active</span>
            <span className="flex items-center text-emerald-400"><CheckCircle className="w-3 h-3 mr-1"/> Access Control Active</span>
            <span className="flex items-center text-emerald-400"><CheckCircle className="w-3 h-3 mr-1"/> Device Auth Active</span>
            <span className="flex items-center text-indigo-300"><List className="w-3 h-3 mr-1"/> Operational Trace Available</span>
            <span className="flex items-center text-amber-400"><AlertTriangle className="w-3 h-3 mr-1"/> Exceptions Monitored</span>
          </div>
        </div>

        {/* METRICS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 border border-slate-200">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Audit Events</div>
            <div className="text-2xl font-black text-slate-800">{totalCount.toLocaleString()}</div>
          </Card>
          <Card className="p-4 border border-slate-200">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Today's Events</div>
            <div className="text-2xl font-black text-indigo-600">{metrics.todayEvents || '—'}</div>
          </Card>
          <Card className="p-4 border border-slate-200">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Failed Access</div>
            <div className="text-2xl font-black text-red-600">{metrics.failedAccess || '0'}</div>
          </Card>
          <Card className="p-4 border border-slate-200">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Schedule Changes</div>
            <div className="text-2xl font-black text-slate-700">{metrics.scheduleChanges || '0'}</div>
          </Card>
        </div>

        {/* REVIEW REQUIRED */}
        {(metrics.failedAccess > 0 || metrics.exceptions > 0) && (
          <motion.div 
            initial={reducedMotion ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <h2 className="text-xs font-bold text-red-800 uppercase tracking-wider mb-3 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Review Required
            </h2>
            <div className="flex flex-wrap gap-4">
              {metrics.failedAccess > 0 && (
                <button onClick={() => { setAction('FAILED'); setPage(1); }} className="text-sm font-bold text-red-700 underline uppercase">
                  {metrics.failedAccess} Failed Access Attempts
                </button>
              )}
              {metrics.exceptions > 0 && (
                <button onClick={() => { setAction('EXCEPTION'); setPage(1); }} className="text-sm font-bold text-amber-700 underline uppercase">
                  {metrics.exceptions} Exceptions Recorded
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* FILTERS */}
        <Card className="p-4 border border-slate-200">
           <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Search Records</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Actor, Reference ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full rounded border-slate-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            
            <div className="w-full sm:w-40">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Module</label>
              <select value={module} onChange={(e) => { setModule(e.target.value); setPage(1); }} className="w-full rounded border-slate-300 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                <option value="">All</option>
                <option value="Fleet">Fleet</option>
                <option value="Staff">Staff</option>
                <option value="Collection Scheduling">Scheduling</option>
                <option value="Operations">Operations</option>
                <option value="SmartBin">SmartBin</option>
              </select>
            </div>

            <div className="w-full sm:w-40">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Start Date</label>
              <DatePicker
                selected={startDate}
                onChange={(date) => { setStartDate(date); setPage(1); }}
                className="w-full rounded border-slate-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholderText="Select start"
                isClearable
              />
            </div>

            <div className="w-full sm:w-40">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">End Date</label>
              <DatePicker
                selected={endDate}
                onChange={(date) => { setEndDate(date); setPage(1); }}
                className="w-full rounded border-slate-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholderText="Select end"
                isClearable
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button type="submit" className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-bold uppercase transition-colors">
                Apply
              </button>
              <button type="button" onClick={resetFilters} className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-sm font-bold uppercase transition-colors">
                Reset
              </button>
            </div>
          </form>
        </Card>

        {/* ERROR STATE */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
            <h3 className="text-sm font-bold text-red-800 uppercase">Audit Data Unavailable</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button onClick={() => fetchLogs(true)} className="mt-2 text-xs font-semibold text-red-800 uppercase hover:underline">
              [ RETRY ]
            </button>
          </div>
        )}

        {/* AUDIT EVENT STREAM */}
        <Card className="border border-slate-200 overflow-hidden shadow-sm">
          <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Audit Event Stream</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center">
                      <div className="animate-pulse flex flex-col items-center">
                        <div className="h-4 w-32 bg-slate-200 rounded mb-4"></div>
                        <div className="h-4 w-48 bg-slate-200 rounded"></div>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center text-slate-500">
                      <Shield className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                      <p className="font-bold uppercase tracking-wider">No Audit Events</p>
                      <p className="text-xs mt-1">No audit events match the selected filters.</p>
                      <button onClick={resetFilters} className="mt-4 text-xs font-bold text-indigo-600 hover:underline uppercase">[ RESET FILTERS ]</button>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr 
                      key={log.id} 
                      onClick={() => openDrawer(log)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 font-mono">
                        {format(new Date(log.timestamp), 'HH:mm:ss')}
                        <div className="text-[10px] text-slate-400">{format(new Date(log.timestamp), 'dd MMM yyyy')}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800 text-xs uppercase">{log.username || log.actor_name || 'SYSTEM'}</div>
                        {log.role && <div className="text-[10px] text-slate-500 uppercase">{log.role.replace('_', ' ')}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 font-medium uppercase">
                        {log.module}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold text-slate-800 uppercase">{log.action}</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-600">
                        {log.record_id || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getActionColor(log.action)}`}>
                          {(log.action.includes('FAILED') || log.action.includes('DENIED') || log.action.includes('EXCEPTION')) ? 'FAILED' : 'SUCCESS'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="text-xs font-medium text-slate-500 uppercase">
              Showing {logs.length} of {totalCount} records
            </div>
            <div className="flex gap-2">
              <button 
                className="px-3 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-slate-600 uppercase hover:bg-slate-100 disabled:opacity-50"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <button 
                className="px-3 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-slate-600 uppercase hover:bg-slate-100 disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* EVENT DETAIL DRAWER */}
      <AnimatePresence>
        {selectedEvent && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity"
              onClick={() => setSelectedEvent(null)}
            />
            <motion.div 
              initial={reducedMotion ? false : { x: '100%' }}
              animate={{ x: 0 }}
              exit={reducedMotion ? false : { x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[500px] bg-white shadow-2xl z-50 overflow-y-auto flex flex-col"
            >
              <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                <h2 className="text-lg font-bold tracking-tight uppercase flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-indigo-400" />
                  Audit Event
                </h2>
                <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-8 flex-1">
                
                {/* Event Primary Detail */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Event Details</div>
                  <div className="bg-slate-50 border border-slate-200 rounded p-4 grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                    <div>
                      <div className="text-xs text-slate-500 uppercase font-bold">Event ID</div>
                      <div className="font-mono text-slate-800">{selectedEvent.id}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase font-bold">Time</div>
                      <div className="text-slate-800">{format(new Date(selectedEvent.timestamp), 'dd MMM yyyy HH:mm:ss')}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase font-bold">Actor</div>
                      <div className="text-slate-800 font-bold">{selectedEvent.username || selectedEvent.actor_name || 'SYSTEM'}</div>
                      <div className="text-[10px] text-slate-500 uppercase">{selectedEvent.role?.replace('_', ' ') || 'SYSTEM'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase font-bold">Action</div>
                      <div className="text-slate-800">{selectedEvent.action}</div>
                      <div className="text-[10px] text-slate-500 uppercase">{selectedEvent.module}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase font-bold">Reference</div>
                      <div className="font-mono text-slate-800">{selectedEvent.record_id || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase font-bold">Result</div>
                      <span className={`inline-flex items-center px-2 py-0.5 mt-1 rounded text-[10px] font-bold uppercase border ${getActionColor(selectedEvent.action)}`}>
                        {(selectedEvent.action.includes('FAILED') || selectedEvent.action.includes('DENIED') || selectedEvent.action.includes('EXCEPTION')) ? 'FAILED' : 'SUCCESS'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Operational Context */}
                {selectedEvent.municipality_name && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Operational Context</div>
                    <div className="bg-white border border-slate-200 rounded p-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-slate-500 uppercase font-bold">Municipality</div>
                        <div className="text-slate-800">{selectedEvent.municipality_name}</div>
                      </div>
                      {selectedEvent.zone_name && (
                        <div>
                          <div className="text-xs text-slate-500 uppercase font-bold">Zone</div>
                          <div className="text-slate-800">{selectedEvent.zone_name}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Change Details */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Change Details</div>
                  <div className="bg-white border border-slate-200 rounded overflow-hidden">
                    {selectedEvent.changes && Object.keys(selectedEvent.changes).length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                            <tr>
                              <th className="px-4 py-2">Field</th>
                              <th className="px-4 py-2">Changes (JSON)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {Object.entries(selectedEvent.changes).map(([key, value]) => (
                              <tr key={key}>
                                <td className="px-4 py-2 font-mono text-xs text-slate-700">{key}</td>
                                <td className="px-4 py-2 font-mono text-[10px] text-slate-600 bg-slate-50/50">
                                  {JSON.stringify(value)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 text-xs text-slate-500 italic">
                        Detailed before/after values are not available for this event.
                      </div>
                    )}
                  </div>
                </div>

                {/* Operation Trace */}
                {selectedEvent.record_id && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Operation Trace : {selectedEvent.record_id}</div>
                    <div className="bg-slate-50 border border-slate-200 rounded p-4">
                      {traceLoading ? (
                        <div className="text-xs text-slate-500 text-center py-4">Loading trace...</div>
                      ) : traceLogs.length > 0 ? (
                        <div className="relative border-l-2 border-indigo-200 ml-3 space-y-6 py-2">
                          {traceLogs.map((tLog, idx) => (
                            <div key={tLog.id} className="relative pl-6">
                              <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${tLog.id === selectedEvent.id ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                              <div className="text-xs text-slate-500 font-mono mb-1">{format(new Date(tLog.timestamp), 'HH:mm:ss')}</div>
                              <div className={`text-sm font-bold uppercase ${tLog.id === selectedEvent.id ? 'text-indigo-800' : 'text-slate-800'}`}>
                                {tLog.action}
                              </div>
                              <div className="text-[10px] text-slate-500 uppercase mt-0.5">by {tLog.username || tLog.actor_name || 'System'}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 italic">Trace not available.</div>
                      )}
                    </div>
                  </div>
                )}
                
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* REPORTS SECTION */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        <Card className="border border-slate-200 overflow-hidden shadow-sm p-4">
          <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4 flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Audit Reports
          </h2>
          <div className="flex flex-wrap gap-4">
            <a href="/app/reports" className="px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-sm font-bold text-slate-700 uppercase transition-colors">
              Daily Activity
            </a>
            <a href="/app/reports" className="px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-sm font-bold text-slate-700 uppercase transition-colors">
              Collection Audit
            </a>
            <a href="/app/reports" className="px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-sm font-bold text-slate-700 uppercase transition-colors">
              Dispatch History
            </a>
            <a href="/app/reports" className="px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-sm font-bold text-slate-700 uppercase transition-colors">
              Exception Report
            </a>
          </div>
        </Card>
      </div>

    </div>
  );
};

export default AuditorDashboard;
