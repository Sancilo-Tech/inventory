import React, { useState, useEffect } from 'react';
import { Truck, Plus, Edit2, Trash2, X, Eye, Search, Upload } from 'lucide-react';
import { supplierAPI } from '../services/api';
import { useLoading } from '../context/LoadingContext';
import { toast } from 'react-toastify';
import SimpleBulkUploadModal from '../components/SimpleBulkUploadModal';
import Pagination from '../components/Pagination';
import { parseSupplierFile, downloadSupplierTemplate } from '../utils/excelParser';

interface Supplier {
  supplierId: string;
  supplierName: string;
  contactPerson?: string;
  email?: string;
  secondaryEmail?: string;
  phone?: string;
  SecondaryPhone?: string;
  address?: string;
  vatId?: string;
  taxId?: string;
  ibanNumber?: string;
}

const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({ supplierName: '', contactPerson: '', email: '', secondaryEmail: '', phone: '', SecondaryPhone: '', address: '', vatId: '', taxId: '', ibanNumber: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const { showLoading, hideLoading } = useLoading();

  // Debounce the search box so we query the server at most once per pause.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => { setPage(1); }, [debouncedSearch, pageSize]);

  useEffect(() => {
    fetchSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch]);

  const fetchSuppliers = async () => {
    try {
      const response = await supplierAPI.getPaginatedSuppliers({
        page,
        limit: pageSize,
        search: debouncedSearch || undefined,
      });
      setSuppliers(response.data.suppliers);
      setTotal(response.data.pagination.total);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    showLoading(editingSupplier ? 'Updating supplier...' : 'Creating supplier...');
    try {
      if (editingSupplier) {
        await supplierAPI.updateSupplier(editingSupplier.supplierId, formData);
        toast.success('Supplier updated successfully');
      } else {
        await supplierAPI.createSupplier(formData);
        toast.success('Supplier created successfully');
      }
      await fetchSuppliers();
      closeModal();
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error('Failed to save supplier');
    } finally {
      hideLoading();
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      showLoading('Deleting supplier...');
      try {
        await supplierAPI.deleteSupplier(id);
        await fetchSuppliers();
        toast.success('Supplier deleted successfully');
      } catch (error) {
        console.error('Error deleting supplier:', error);
        toast.error('Failed to delete supplier');
      } finally {
        hideLoading();
      }
    }
  };

  const openModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({ 
        supplierName: supplier.supplierName, 
        contactPerson: supplier.contactPerson || '', 
        email: supplier.email || '', 
        secondaryEmail: supplier.secondaryEmail || '',
        phone: supplier.phone || '', 
        SecondaryPhone: supplier.SecondaryPhone || '',
        address: supplier.address || '',
        vatId: supplier.vatId || '',
        taxId: supplier.taxId || '',
        ibanNumber: supplier.ibanNumber || ''
      });
    } else {
      setEditingSupplier(null);
      setFormData({ supplierName: '', contactPerson: '', email: '', secondaryEmail: '', phone: '', SecondaryPhone: '', address: '', vatId: '', taxId: '', ibanNumber: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
    setFormData({ supplierName: '', contactPerson: '', email: '', secondaryEmail: '', phone: '', SecondaryPhone: '', address: '', vatId: '', taxId: '', ibanNumber: '' });
  };

  return (
    <div className="">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
        <div className="flex gap-2">
          <button onClick={() => setIsBulkModalOpen(true)} className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
            <Upload size={20} />
            <span>Bulk Upload</span>
          </button>
          <button onClick={() => openModal()} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
            <Plus size={20} />
            <span>Add Supplier</span>
          </button>
        </div>
      </div>
      <div className="relative my-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {suppliers.length === 0 ? (
          <div className="p-8 text-center">
            <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{debouncedSearch ? 'No matching suppliers' : 'No Suppliers Yet'}</h2>
            <p className="text-gray-600">{debouncedSearch ? 'Try a different search term.' : 'Add your first supplier to get started.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact Person</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">VAT ID</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {suppliers.map((supplier) => (
                  <tr key={supplier.supplierId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{supplier.supplierName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{supplier.contactPerson || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{supplier.email || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{supplier.phone || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{supplier.vatId || '-'}</td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setViewingSupplier(supplier)} className="text-green-600 hover:text-green-800 inline-flex items-center">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => openModal(supplier)} className="text-blue-600 hover:text-blue-800 inline-flex items-center">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(supplier.supplierId)} className="text-red-600 hover:text-red-800 inline-flex items-center">
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
        {total > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            label="suppliers"
          />
        )}
      </div>

      {viewingSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Supplier Details</h2>
              <button onClick={() => setViewingSupplier(null)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Supplier Name</label>
                <p className="text-gray-900 font-medium">{viewingSupplier.supplierName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Contact Person</label>
                <p className="text-gray-900">{viewingSupplier.contactPerson || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                <p className="text-gray-900">{viewingSupplier.email || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Secondary Email</label>
                <p className="text-gray-900">{viewingSupplier.secondaryEmail || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
                <p className="text-gray-900">{viewingSupplier.phone || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Secondary Phone</label>
                <p className="text-gray-900">{viewingSupplier.SecondaryPhone || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                <p className="text-gray-900">{viewingSupplier.address || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">VAT ID</label>
                <p className="text-gray-900">{viewingSupplier.vatId || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Tax ID</label>
                <p className="text-gray-900">{viewingSupplier.taxId || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">IBAN Number</label>
                <p className="text-gray-900">{viewingSupplier.ibanNumber || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
                  <input type="text" required value={formData.supplierName} onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                  <input type="text" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Email</label>
                  <input type="email" value={formData.secondaryEmail} onChange={(e) => setFormData({ ...formData, secondaryEmail: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Phone</label>
                  <input type="tel" value={formData.SecondaryPhone} onChange={(e) => setFormData({ ...formData, SecondaryPhone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VAT ID</label>
                  <input type="text" value={formData.vatId} onChange={(e) => setFormData({ ...formData, vatId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
                  <input type="text" value={formData.taxId} onChange={(e) => setFormData({ ...formData, taxId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IBAN Number</label>
                  <input type="text" value={formData.ibanNumber} onChange={(e) => setFormData({ ...formData, ibanNumber: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                </div>
                <div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" rows={3} />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                  {editingSupplier ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isBulkModalOpen && (
        <SimpleBulkUploadModal
          title="Bulk Upload Suppliers"
          previewColumns={[
            { key: 'supplierName', label: 'Supplier Name' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'contactPerson', label: 'Contact Person' },
          ]}
          onClose={() => setIsBulkModalOpen(false)}
          onSuccess={() => { setIsBulkModalOpen(false); fetchSuppliers(); }}
          parseFile={parseSupplierFile}
          uploadData={(rows) => supplierAPI.bulkUpload(rows)}
          downloadTemplate={downloadSupplierTemplate}
        />
      )}
    </div>
  );
};

export default Suppliers;