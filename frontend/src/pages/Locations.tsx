import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Edit2, Trash2, X, Eye } from 'lucide-react';
import { locationAPI } from '../services/api';
import { useLoading } from '../context/LoadingContext';

interface Location {
  locationId: string;
  locationCode: string;
  locationName: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

const Locations: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingLocation, setViewingLocation] = useState<Location | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({ locationCode: '', locationName: '', address: '', city: '', state: '', country: '' });
  const [loading, setLoading] = useState(false);
  const { showLoading, hideLoading } = useLoading();

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await locationAPI.getAllLocation();
      setLocations(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    showLoading(editingLocation ? 'Updating location...' : 'Creating location...')
    try {
      if (editingLocation) {
        await locationAPI.updateLocation(editingLocation.locationId, formData);
      } else {
        await locationAPI.createLocation(formData);
      }
      await fetchLocations();
      closeModal();
    } catch (error) {
      console.error('Error saving location:', error);
    } finally {
      setLoading(false);
      hideLoading()
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this location?')) {
      showLoading('Deleting Location')
      try {
        await locationAPI.deleteLocation(id);
        await fetchLocations();
      } catch (error) {
        console.error('Error deleting location:', error);
      }
      finally{
        hideLoading()
      }
    }
  };

  const openModal = (location?: Location) => {
    if (location) {
      setEditingLocation(location);
      setFormData({ locationCode: location.locationCode, locationName: location.locationName, address: location.address || '', city: location.city || '', state: location.state || '', country: location.country || '' });
    } else {
      setEditingLocation(null);
      setFormData({ locationCode: '', locationName: '', address: '', city: '', state: '', country: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLocation(null);
    setFormData({ locationCode: '', locationName: '', address: '', city: '', state: '', country: '' });
  };

  return (
    <div className="">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
        <button onClick={() => openModal()} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
          <Plus size={20} />
          <span>Add Location</span>
        </button>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {locations.length === 0 ? (
          <div className="p-8 text-center">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Locations Yet</h2>
            <p className="text-gray-600">Add your first location to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {locations.map((location) => (
                  <tr key={location.locationId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{location.locationCode}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{location.locationName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{location.address || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{location.city || '-'}</td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setViewingLocation(location)} className="text-green-600 hover:text-green-800 inline-flex items-center">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => openModal(location)} className="text-blue-600 hover:text-blue-800 inline-flex items-center">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(location.locationId)} className="text-red-600 hover:text-red-800 inline-flex items-center">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewingLocation && (
        <div className="fixed h-full top-0 inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Location Details</h2>
              <button onClick={() => setViewingLocation(null)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Location Code</label>
                <p className="text-gray-900 font-medium">{viewingLocation.locationCode}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Location Name</label>
                <p className="text-gray-900 font-medium">{viewingLocation.locationName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                <p className="text-gray-900">{viewingLocation.address || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">City</label>
                <p className="text-gray-900">{viewingLocation.city || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">State</label>
                <p className="text-gray-900">{viewingLocation.state || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Country</label>
                <p className="text-gray-900">{viewingLocation.country || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingLocation ? 'Edit Location' : 'Add Location'}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location Code *</label>
                <input type="text" required value={formData.locationCode} onChange={(e) => setFormData({ ...formData, locationCode: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location Name *</label>
                <input type="text" required value={formData.locationName} onChange={(e) => setFormData({ ...formData, locationName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input type="text" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input type="text" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50">
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Locations;