import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import api from '../api';
import { Plus, Edit2, Trash2, X, Save, Calendar, Truck, User, MapPin, Eye, CheckCircle, Navigation, Route as RouteIcon, Info } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function Schedules() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Masters
  const [municipalities, setMunicipalities] = useState([]);
  const [zones, setZones] = useState([]);
  const [wards, setWards] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [staff, setStaff] = useState([]);
  const [bins, setBins] = useState([]);
  const [depots, setDepots] = useState([]);
  
  // Views
  const [viewState, setViewState] = useState('LIST'); // LIST, CREATE, DETAIL
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [scheduleRoute, setScheduleRoute] = useState(null);

  // Form
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    priority: 'NORMAL',
    municipality: '',
    zone: '',
    ward: '',
    bins: [],
    vehicle: '',
    driver: '',
    workers: [],
    depot: ''
  });

  useEffect(() => {
    fetchSchedules();
    fetchMasters();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await api.get('/schedules/');
      setSchedules(res.data);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasters = async () => {
    try {
      const [muniRes, zoneRes, wardRes, vehRes, staffRes, binRes, depotRes] = await Promise.all([
        api.get('/municipalities/'),
        api.get('/zones/'),
        api.get('/wards/'),
        api.get('/vehicles/'),
        api.get('/staff/'),
        api.get('/bins/'),
        api.get('/depots/')
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

  const drivers = staff.filter(s => s.role === 'driver' && s.employment_status === 'ACTIVE');
  const workers = staff.filter(s => s.role === 'field_worker' && s.employment_status === 'ACTIVE');
  const activeVehicles = vehicles.filter(v => v.status === 'AVAILABLE');

  const filteredZones = zones.filter(z => !formData.municipality || z.municipality === parseInt(formData.municipality));
  const filteredBins = bins.filter(b => !formData.zone || b.zone === parseInt(formData.zone));

  const handleAction = async (action, id) => {
    try {
      await api.post(`/schedules/${id}/${action}/`);
      fetchSchedules();
      if (selectedSchedule) {
        const updated = await api.get(`/schedules/${id}/`);
        setSelectedSchedule(updated.data);
      }
    } catch (error) {
      alert(error.response?.data?.error || `Error during ${action}`);
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        schedule_id: `SCH-${Date.now()}`,
        ...formData
      };
      // Format empty foreign keys to null
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') payload[key] = null;
      });
      
      await api.post('/schedules/', payload);
      setViewState('LIST');
      fetchSchedules();
    } catch (error) {
      console.error(error);
      alert('Error creating schedule');
    }
  };

  const columns = [
    { key: 'schedule_id', label: 'SCHEDULE ID' },
    { key: 'date', label: 'DATE' },
    { key: 'zone_name', label: 'ZONE' },
    { 
      key: 'bins', 
      label: 'BINS',
      render: (val) => val?.length || 0
    },
    { key: 'vehicle_registration', label: 'VEHICLE', render: (val) => val || 'Unassigned' },
    { key: 'driver_name', label: 'DRIVER', render: (val) => val || 'Unassigned' },
    {
      key: 'priority',
      label: 'PRIORITY',
      render: (val) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          val === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
          val === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
          'bg-blue-500/20 text-blue-400'
        }`}>
          {val}
        </span>
      )
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (val) => <StatusBadge status={val} />
    },
    {
      key: 'actions',
      label: 'ACTIONS',
      render: (_, row) => (
        <div className="flex space-x-2">
          <button 
            onClick={async () => { 
              setSelectedSchedule(row);
              setViewState('DETAIL');
              setScheduleRoute(null);
              if (row.status === 'DISPATCHED' || row.status === 'COMPLETED') {
                try {
                  const r = await api.get('/routes/');
                  const thisRoute = r.data.find(route => route.schedule === row.id);
                  setScheduleRoute(thisRoute || null);
                } catch(e) { console.error('Error fetching route', e); }
              }
            }}
            className="text-gray-400 hover:text-white transition-colors"
            title="View Details"
          >
            <Eye size={18} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Collection Scheduling</h1>
          <p className="text-gray-400 mt-1">Manage, dispatch, and track collection schedules</p>
        </div>
        {viewState === 'LIST' && (
          <button 
            onClick={() => {
              setFormData({
                date: new Date().toISOString().split('T')[0],
                priority: 'NORMAL',
                municipality: '', zone: '', ward: '', bins: [],
                vehicle: '', driver: '', workers: [], depot: ''
              });
              setStep(1);
              setViewState('CREATE');
            }}
            className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors font-medium shadow-lg shadow-blue-500/20"
          >
            <Plus size={18} />
            <span>Create Schedule</span>
          </button>
        )}
      </div>

      {viewState === 'LIST' && (
        <Card>
          <CardContent className="p-0">
            <DataTable 
              data={schedules}
              columns={columns}
              loading={loading}
              keyField="id"
            />
          </CardContent>
        </Card>
      )}

      {viewState === 'CREATE' && (
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Create Collection Schedule</CardTitle>
              <button onClick={() => setViewState('LIST')} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex justify-between mt-4">
              {['Scope', 'Bins', 'Resources', 'Locations', 'Review'].map((label, i) => (
                <div key={label} className={`flex items-center ${step === i + 1 ? 'text-blue-400' : 'text-gray-500'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 text-xs border ${step === i + 1 ? 'border-blue-400 bg-blue-500/20' : 'border-gray-500'}`}>
                    {i + 1}
                  </div>
                  {label}
                </div>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
                    <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Priority</label>
                    <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white">
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Municipality</label>
                    <select value={formData.municipality} onChange={e => setFormData({...formData, municipality: e.target.value, zone: ''})} className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white">
                      <option value="">Select Municipality</option>
                      {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Zone</label>
                    <select value={formData.zone} onChange={e => setFormData({...formData, zone: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white" disabled={!formData.municipality}>
                      <option value="">Select Zone</option>
                      {filteredZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <p className="text-gray-400">Select bins to include in this schedule from the selected zone.</p>
                <div className="h-64 overflow-y-auto bg-slate-800/50 rounded-md border border-slate-700 p-2">
                  {filteredBins.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No bins found for this zone.</p>
                  ) : (
                    filteredBins.map(b => (
                      <label key={b.id} className="flex items-center space-x-3 p-2 hover:bg-slate-700 rounded cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={formData.bins.includes(b.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({...formData, bins: [...formData.bins, b.id]});
                            } else {
                              setFormData({...formData, bins: formData.bins.filter(id => id !== b.id)});
                            }
                          }}
                          className="bg-slate-800 border-slate-600 rounded text-blue-500"
                        />
                        <span className="text-white">{b.bin_id}</span>
                        <span className="text-gray-400 text-sm ml-auto">Fill: {b.latest_reading?.fill_pct || 0}%</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Vehicle</label>
                  <select value={formData.vehicle} onChange={e => setFormData({...formData, vehicle: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white">
                    <option value="">Select Vehicle</option>
                    {activeVehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Driver</label>
                  <select value={formData.driver} onChange={e => setFormData({...formData, driver: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white">
                    <option value="">Select Driver</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Depot</label>
                  <select value={formData.depot} onChange={e => setFormData({...formData, depot: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white">
                    <option value="">Select Depot</option>
                    {depots.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4 text-gray-300">
                <h3 className="text-white font-medium mb-4">Review Schedule</h3>
                <div className="grid grid-cols-2 gap-y-2">
                  <span className="text-gray-500">Date:</span> <span>{formData.date}</span>
                  <span className="text-gray-500">Priority:</span> <span>{formData.priority}</span>
                  <span className="text-gray-500">Selected Bins:</span> <span>{formData.bins.length}</span>
                  <span className="text-gray-500">Vehicle ID:</span> <span>{formData.vehicle || 'None'}</span>
                  <span className="text-gray-500">Driver ID:</span> <span>{formData.driver || 'None'}</span>
                  <span className="text-gray-500">Depot ID:</span> <span>{formData.depot || 'None'}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-6 border-t border-slate-700">
              <button 
                onClick={() => setStep(step - 1)} 
                disabled={step === 1}
                className="px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50"
              >
                Back
              </button>
              {step < 5 ? (
                <button 
                  onClick={() => setStep(step + 1)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Next
                </button>
              ) : (
                <button 
                  onClick={handleSubmit}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition-colors flex items-center space-x-2"
                >
                  <Save size={18} />
                  <span>Save Draft</span>
                </button>
              )}
            </div>

          </CardContent>
        </Card>
      )}

      {viewState === 'DETAIL' && selectedSchedule && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <button onClick={() => setViewState('LIST')} className="text-gray-400 hover:text-white flex items-center space-x-1 mb-4">
                <span>&larr; Back to List</span>
              </button>
              <h2 className="text-3xl font-bold text-white flex items-center space-x-3">
                <span>{selectedSchedule.schedule_id}</span>
                <StatusBadge status={selectedSchedule.status} />
              </h2>
              <div className="text-gray-400 mt-2 flex items-center space-x-4">
                <span className="flex items-center"><Calendar size={16} className="mr-1"/> {selectedSchedule.date}</span>
                <span className="flex items-center"><MapPin size={16} className="mr-1"/> {selectedSchedule.zone_name}</span>
              </div>
            </div>
            
            <div className="flex space-x-2 border border-slate-700 bg-slate-800 rounded-lg p-1">
              {selectedSchedule.status === 'DRAFT' && (
                <button onClick={() => handleAction('plan', selectedSchedule.id)} className="flex items-center space-x-1 px-3 py-2 text-sm text-blue-400 hover:bg-slate-700 rounded">
                  <CheckCircle size={16} /> <span>Plan</span>
                </button>
              )}
              {selectedSchedule.status === 'PLANNED' && (
                <button onClick={() => handleAction('dispatch', selectedSchedule.id)} className="flex items-center space-x-1 px-3 py-2 text-sm text-green-400 hover:bg-slate-700 rounded">
                  <Navigation size={16} /> <span>Dispatch</span>
                </button>
              )}
              {['DRAFT', 'PLANNED'].includes(selectedSchedule.status) && (
                <button onClick={() => handleAction('cancel', selectedSchedule.id)} className="flex items-center space-x-1 px-3 py-2 text-sm text-red-400 hover:bg-slate-700 rounded">
                  <X size={16} /> <span>Cancel</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-blue-400">
                  <MapPin size={20} />
                  <span>Collection Area</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between"><span className="text-gray-500">Municipality</span><span className="text-white">{selectedSchedule.municipality_name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Zone</span><span className="text-white">{selectedSchedule.zone_name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Bins</span><span className="text-white">{selectedSchedule.bins?.length || 0}</span></div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-green-400">
                  <Truck size={20} />
                  <span>Crew & Vehicle</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between"><span className="text-gray-500">Vehicle</span><span className="text-white">{selectedSchedule.vehicle_registration || 'Unassigned'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Driver</span><span className="text-white">{selectedSchedule.driver_name || 'Unassigned'}</span></div>
              </CardContent>
            </Card>
          </div>
          
          {/* Route Section */}
          {(selectedSchedule.status === 'DISPATCHED' || selectedSchedule.status === 'COMPLETED') && scheduleRoute && (
            <Card className="border-blue-500/30">
              <CardHeader className="bg-blue-500/10 border-b border-blue-500/20">
                <CardTitle className="flex items-center space-x-2 text-blue-400">
                  <RouteIcon size={20} />
                  <span>Optimized Route</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                
                {/* Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 text-center">
                    <p className="text-gray-500 text-sm font-medium mb-1">Total Distance</p>
                    <p className="text-2xl font-bold text-white">{scheduleRoute.total_distance_km ? scheduleRoute.total_distance_km.toFixed(2) : '-'} <span className="text-sm font-normal text-gray-500">km</span></p>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 text-center">
                    <p className="text-gray-500 text-sm font-medium mb-1">Est. Travel Time</p>
                    {scheduleRoute.travel_time_available ? (
                      <p className="text-2xl font-bold text-white">{scheduleRoute.estimated_duration_min} <span className="text-sm font-normal text-gray-500">min</span></p>
                    ) : (
                      <p className="text-sm text-gray-500 mt-2 italic flex items-center justify-center"><Info size={14} className="mr-1"/> N/A (Haversine)</p>
                    )}
                  </div>
                  <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 text-center">
                    <p className="text-gray-500 text-sm font-medium mb-1">Method</p>
                    <p className="text-sm font-bold text-blue-400 mt-2">{scheduleRoute.optimization_metadata?.method || 'Unknown'}</p>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 text-center">
                    <p className="text-gray-500 text-sm font-medium mb-1">Stops</p>
                    <p className="text-2xl font-bold text-white">{scheduleRoute.optimized_order?.length || 0}</p>
                  </div>
                </div>

                {/* Sequence Display */}
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 overflow-x-auto whitespace-nowrap hide-scrollbar">
                  <div className="flex items-center space-x-2 min-w-max px-2">
                    <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-bold border border-blue-500/30">
                      {scheduleRoute.start_location} (Depot)
                    </span>
                    {scheduleRoute.optimized_order && scheduleRoute.optimized_order.map((binId, idx) => {
                      const record = scheduleRoute.records?.find(r => r.bin_id === binId || r.bin === binId);
                      const statusColor = record ? (
                        record.status === 'COLLECTED' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                        record.status === 'UNABLE_TO_COLLECT' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        record.status === 'ARRIVED' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                        'bg-slate-800 text-gray-300 border-slate-700'
                      ) : 'bg-slate-800 text-gray-300 border-slate-700';
                      
                      return (
                        <div key={idx} className="flex items-center space-x-2">
                          <span className="text-gray-600">&rarr;</span>
                          <span className={`px-3 py-1 rounded-full text-sm border flex flex-col items-center ${statusColor}`}>
                            <span>{typeof binId === 'object' ? binId.bin_id : binId}</span>
                            {record && <span className="text-[10px] mt-0.5 leading-none uppercase">{record.status.replace(/_/g, ' ')}</span>}
                          </span>
                        </div>
                      );
                    })}
                    <span className="text-gray-600 ml-2">&rarr;</span>
                    <span className="bg-blue-500/20 text-blue-400 px-3 py-1 ml-2 rounded-full text-sm font-bold border border-blue-500/30">
                      {scheduleRoute.end_location} (Depot)
                    </span>
                  </div>
                </div>

                {/* Map */}
                <div className="h-96 rounded-lg overflow-hidden border border-slate-700 mt-4 relative z-0">
                  {scheduleRoute.bins && scheduleRoute.bins.length > 0 && (
                    <MapContainer 
                      center={[scheduleRoute.bins[0].lat, scheduleRoute.bins[0].lng]} 
                      zoom={12} 
                      style={{ height: '100%', width: '100%', background: '#0f172a' }}
                    >
                      <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                      />
                      {scheduleRoute.bins.map((bin, i) => (
                        <Marker key={i} position={[bin.lat, bin.lng]}>
                          <Popup className="bg-slate-800 border-slate-700 text-white">
                            <div className="text-gray-900 font-bold">{bin.bin_id}</div>
                            <div className="text-gray-600">Fill Level: {bin.latest_pct}%</div>
                          </Popup>
                        </Marker>
                      ))}
                      <Polyline 
                        positions={scheduleRoute.bins.map(b => [b.lat, b.lng])} 
                        color="#3b82f6" 
                        weight={3} 
                        dashArray="10, 10"
                      />
                    </MapContainer>
                  )}
                  {!scheduleRoute.travel_time_available && (
                    <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur border border-slate-700 text-xs text-gray-400 px-3 py-1.5 rounded-md z-[1000] shadow-lg flex items-center">
                      <Info size={12} className="mr-1 text-blue-400"/>
                      Haversine straight-line polyline (Estimation)
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>
          )}

        </div>
      )}

    </div>
  );
}
