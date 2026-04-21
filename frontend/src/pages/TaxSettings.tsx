import React, { useState, useEffect } from 'react';
import { Calculator, Plus, Edit2, Trash2, X, Eye, Search, Upload } from 'lucide-react';
import { taxAPI } from '../services/api';
import { useLoading } from '../context/LoadingContext';
import { toast } from 'react-toastify';
import SimpleBulkUploadModal from '../components/SimpleBulkUploadModal';
import { parseTaxFile, downloadTaxTemplate } from '../utils/excelParser';

interface Tax {
  taxId: string;
  tax_name: string;
  taxPercentage: number;
  description?: string;
}

const TaxSettings: React.FC = () => {
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingTax, setViewingTax] = useState<Tax | null>(null);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);
  const [formData, setFormData] = useState({ tax_name: '', taxPercentage: '', description: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const { showLoading, hideLoading } = useLoading();

  const filteredTaxes = taxes
    .filter((t) => t.tax_name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.tax_name.localeCompare(b.tax_name));

  useEffect(() => {
    fetchTaxes();
  }, []);

  const fetchTaxes = async () => {
    try {
      const response = await taxAPI.getTaxes();
      setTaxes(response.data);
    } catch (error) {
      console.error('Error fetching taxes:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    showLoading(editingTax ? 'Updating tax...' : 'Creating tax...');
    try {
      const data = { ...formData, taxPercentage: parseFloat(formData.taxPercentage) };
      if (editingTax) {
        await taxAPI.updateTax(editingTax.taxId, data);
        toast.success('Tax updated successfully');
      } else {
        await taxAPI.createTax(data);
        toast.success('Tax created successfully');
      }
      await fetchTaxes();
      closeModal();
    } catch (error) {
      console.error('Error saving tax:', error);
      toast.error('Failed to save tax');
    } finally {
      hideLoading();
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this tax?')) {
      showLoading('Deleting tax...');
      try {
        await taxAPI.deleteTax(id);
        await fetchTaxes();
        toast.success('Tax deleted successfully');
      } catch (error) {
        console.error('Error deleting tax:', error);
        toast.error('Failed to delete tax');
      } finally {
        hideLoading();
      }
    }
  };

  const openModal = (tax?: Tax) => {
    if (tax) {
      setEditingTax(tax);
      setFormData({ tax_name: tax.tax_name, taxPercentage: tax.taxPercentage.toString(), description: tax.description || '' });
    } else {
      setEditingTax(null);
      setFormData({ tax_name: '', taxPercentage: '', description: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTax(null);
    setFormData({ tax_name: '', taxPercentage: '', description: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tax Settings</h1>
        <div className="flex gap-2">
          <button onClick={() => setIsBulkModalOpen(true)} className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
            <Upload size={20} />
            <span>Bulk Upload</span>
          </button>
          <button onClick={() => openModal()} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
            <Plus size={20} />
            <span>Add Tax Rate</span>
          </button>
        </div>
      </div>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by tax name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {taxes.length === 0 ? (
          <div className="p-8 text-center">
            <Calculator className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Tax Rates Yet</h2>
            <p className="text-gray-600">Add your first tax rate to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax Percentage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTaxes.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">No taxes match your search.</td></tr>
                ) : filteredTaxes.map((tax) => (
                  <tr key={tax.taxId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{tax.tax_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{tax.taxPercentage}%</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{tax.description || '-'}</td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setViewingTax(tax)} className="text-green-600 hover:text-green-800 inline-flex items-center">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => openModal(tax)} className="text-blue-600 hover:text-blue-800 inline-flex items-center">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(tax.taxId)} className="text-red-600 hover:text-red-800 inline-flex items-center">
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

      {viewingTax && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Tax Details</h2>
              <button onClick={() => setViewingTax(null)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Tax Name</label>
                <p className="text-gray-900 font-medium">{viewingTax.tax_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Tax Percentage</label>
                <p className="text-gray-900">{viewingTax.taxPercentage}%</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
                <p className="text-gray-900">{viewingTax.description || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingTax ? 'Edit Tax' : 'Add Tax'}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Name *</label>
                <input type="text" required value={formData.tax_name} onChange={(e) => setFormData({ ...formData, tax_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Percentage *</label>
                <input type="number" step="0.01" required value={formData.taxPercentage} onChange={(e) => setFormData({ ...formData, taxPercentage: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent" rows={3} />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                  {editingTax ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isBulkModalOpen && (
        <SimpleBulkUploadModal
          title="Bulk Upload Taxes"
          previewColumns={[
            { key: 'tax_name', label: 'Tax Name' },
            { key: 'taxPercentage', label: 'Percentage' },
            { key: 'description', label: 'Description' },
          ]}
          onClose={() => setIsBulkModalOpen(false)}
          onSuccess={() => { setIsBulkModalOpen(false); fetchTaxes(); }}
          parseFile={parseTaxFile}
          uploadData={(rows) => taxAPI.bulkUpload(rows)}
          downloadTemplate={downloadTaxTemplate}
        />
      )}
    </div>
  );
};

export default TaxSettings;