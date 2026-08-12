import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import api from '../api';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [zones, setZones] = useState([]);
  const [wards, setWards] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStaff, setCurrentStaff] = useState(null);
  const [formData, setFormData] = useState({
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
  });

  useEffect(() => {
    fetchStaff();
    fetchHierarchy();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await api.get('/staff/');
      setStaff(response.data);
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHierarchy = async () => {
    try {
      const [muniRes, zoneRes, wardRes] = await Promise.all([
        api.get('/municipalities/'),
        api.get('/zones/'),
        api.get('/wards/')
      ]);
      setMunicipalities(muniRes.data);
      setZones(zoneRes.data);
      setWards(wardRes.data);
    } catch (error) {
      console.error('Error fetching hierarchy:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openModal = (staffMember = null) => {
    if (staffMember) {
      setCurrentStaff(staffMember);
      setFormData({
        employee_id: staffMember.employee_id || '',
        first_name: '', // We don't get this back individually unless we parse name
        last_name: '',
        email: '',
        designation: staffMember.designation || '',
        role: staffMember.role || 'driver',
        employment_status: staffMember.employment_status || 'ACTIVE',
        phone: staffMember.phone || '',
        municipality: staffMember.municipality || '',
        zone: staffMember.zone || '',
        ward: staffMember.ward || ''
      });
    } else {
      setCurrentStaff(null);
      setFormData({
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
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentStaff(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Clean up empty fields
      const payload = { ...formData };
      if (!payload.zone) delete payload.zone;
      if (!payload.ward) delete payload.ward;
      
      if (currentStaff) {
        await api.patch(`/staff/${currentStaff.id}/`, payload);
      } else {
        await api.post('/staff/', payload);
      }
      closeModal();
      fetchStaff();
    } catch (error) {
      console.error('Error saving staff:', error.response?.data || error);
      alert('Error saving staff member. Check console for details.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to deactivate this staff member?')) {
      try {
        await api.delete(`/staff/${id}/`);
        fetchStaff();
      } catch (error) {
        console.error('Error deactivating staff:', error);
      }
    }
  };

  const filteredZones = formData.municipality 
    ? zones.filter(z => z.municipality === parseInt(formData.municipality))
    : [];

  const filteredWards = formData.zone
    ? wards.filter(w => w.zone === parseInt(formData.zone))
    : [];

  const columns = [
    { header: 'Emp ID', accessor: 'employee_id' },
    { header: 'Name', accessor: 'name' },
    { header: 'Role', accessor: 'role' },
    { header: 'Designation', accessor: 'designation' },
    { header: 'Municipality', accessor: 'municipality_name' },
    { header: 'Zone', accessor: 'zone_name' },
    {
      header: 'Status',
      accessor: 'employment_status',
      render: (value) => (
        <StatusBadge 
          status={value === 'ACTIVE' ? 'active' : value === 'ON_LEAVE' ? 'warning' : 'inactive'} 
          text={value} 
        />
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id, row) => (
        <div className="flex space-x-2">
          <button 
            onClick={() => openModal(row)}
            className="text-gray-400 hover:text-white transition-colors"
            title="Edit"
          >
            <Edit2 size={18} />
          </button>
          <button 
            onClick={() => handleDelete(id)}
            className="text-gray-400 hover:text-red-400 transition-colors"
            title="Deactivate"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Staff & Workforce</h1>
          <p className="text-gray-400 mt-1">Manage municipal personnel and assignments</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors font-medium shadow-lg shadow-blue-500/20"
        >
          <Plus size={18} />
          <span>Add Staff</span>
        </button>
      </div>

      <Card title="Personnel Directory">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading staff data...</div>
        ) : (
          <DataTable 
            columns={columns} 
            data={staff} 
            keyField="id" 
            emptyMessage="No staff members found."
          />
        )}
      </Card>

      {/* Staff Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1a1f2e] border border-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">
                {currentStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              {!currentStaff && (
                <>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">User Account</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">First Name</label>
                      <input 
                        type="text" 
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        className="w-full bg-[#0f1219] border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Last Name</label>
                      <input 
                        type="text" 
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        className="w-full bg-[#0f1219] border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                      <input 
                        type="email" 
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full bg-[#0f1219] border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                  <hr className="border-gray-800" />
                </>
              )}

              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Employment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Employee ID</label>
                  <input 
                    type="text" 
                    name="employee_id"
                    value={formData.employee_id}
                    onChange={handleInputChange}
                    className="w-full bg-[#0f1219] border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                  <select 
                    name="employment_status"
                    value={formData.employment_status}
                    onChange={handleInputChange}
                    className="w-full bg-[#0f1219] border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
                  <select 
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full bg-[#0f1219] border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="driver">Driver</option>
                    <option value="field_worker">Field Worker</option>
                    <option value="zone_supervisor">Zone Supervisor</option>
                    <option value="municipal_officer">Municipal Officer</option>
                    <option value="municipal_admin">Municipal Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Designation</label>
                  <input 
                    type="text" 
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    className="w-full bg-[#0f1219] border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                  <input 
                    type="text" 
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full bg-[#0f1219] border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">Geographic Scope</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Municipality</label>
                  <select 
                    name="municipality"
                    value={formData.municipality}
                    onChange={handleInputChange}
                    className="w-full bg-[#0f1219] border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  >
                    <option value="">Select Municipality</option>
                    {municipalities.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Zone</label>
                  <select 
                    name="zone"
                    value={formData.zone}
                    onChange={handleInputChange}
                    className="w-full bg-[#0f1219] border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    disabled={!formData.municipality}
                  >
                    <option value="">Select Zone</option>
                    {filteredZones.map(z => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Ward</label>
                  <select 
                    name="ward"
                    value={formData.ward}
                    onChange={handleInputChange}
                    className="w-full bg-[#0f1219] border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    disabled={!formData.zone}
                  >
                    <option value="">Select Ward</option>
                    {filteredWards.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
                >
                  <Save size={18} />
                  <span>{currentStaff ? 'Save Changes' : 'Create Staff Member'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
