import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Database, Plus, Trash2, ShieldAlert } from 'lucide-react';
import api from '../api';

const DemoSimulation = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/demo/status/');
      setStatus(response.data);
    } catch (err) {
      setError('Failed to load demo status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleGenerate = async () => {
    try {
      setActionLoading(true);
      setError('');
      await api.post('/demo/generate/');
      await fetchStatus();
    } catch (err) {
      setError(err.response?.data?.error || 'Generation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to delete all simulated records?")) return;
    try {
      setActionLoading(true);
      setError('');
      await api.delete('/demo/reset/');
      await fetchStatus();
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading demo status...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Demo & Simulation</h1>
        <p className="text-gray-500">Manage the system's simulated demo dataset</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">Demo Environment Status</h2>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white border rounded-lg p-4">
              <p className="text-sm text-gray-500 font-medium">Simulator Engine</p>
              <p className={`text-xl font-bold mt-1 ${status?.is_enabled ? 'text-green-600' : 'text-red-600'}`}>
                {status?.is_enabled ? 'ENABLED' : 'DISABLED'}
              </p>
            </div>
            <div className="bg-white border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium">Real Physical Bins</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{status?.counts?.real_bins || 0}</p>
            </div>
            <div className="bg-white border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-600 font-medium">Simulated Bins</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{status?.counts?.simulated_bins || 0}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                Hardware Protection Active
              </h3>
              <p className="text-sm text-blue-700">
                Generating or resetting demo data will NEVER affect real physical hardware devices, 
                their telemetry readings, or API credentials.
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={handleGenerate}
                disabled={actionLoading || !status?.is_enabled || status?.has_dataset}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-colors
                  ${status?.has_dataset || !status?.is_enabled
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700'}`}
              >
                <Plus className="w-4 h-4" />
                {actionLoading ? 'Processing...' : 'Generate Demo Data'}
              </button>

              <button
                onClick={handleReset}
                disabled={actionLoading || !status?.is_enabled || !status?.has_dataset}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                  ${!status?.has_dataset || !status?.is_enabled
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'}`}
              >
                <Trash2 className="w-4 h-4" />
                Reset Demo Data
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemoSimulation;
