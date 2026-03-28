import React, { useState, useEffect } from 'react';
import { Tags, Plus, Edit2, Trash2, X, Eye } from 'lucide-react';
import { categoriesAPI } from '../services/api';
import { useLoading } from '../context/LoadingContext';
import { toast } from 'react-toastify';

interface Category {
  typeId: string;
  typeName: string;
  description?: string;
  type: 'item' | 'financial' | 'group' | 'quantityType' | 'paymentType';
}

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<'item' | 'financial' | 'group' | 'quantityType' | 'paymentType'>('item');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingCategory, setViewingCategory] = useState<Category | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ typeName: '', description: '', type: 'item' as 'item' | 'financial' | 'group' | 'quantityType' | 'paymentType' });
  const { showLoading, hideLoading } = useLoading();

  useEffect(() => {
    fetchCategories();
  }, [activeTab]);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getTypeCategories(activeTab);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    showLoading(editingCategory ? 'Updating category...' : 'Creating category...');
    try {
      if (editingCategory) {
        await categoriesAPI.updateCategory(editingCategory.typeId, formData);
        toast.success('Category updated successfully');
      } else {
        await categoriesAPI.createCategory(formData);
        toast.success('Category created successfully');
      }
      fetchCategories();
      closeModal();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    } finally {
      hideLoading();
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      showLoading('Deleting category...');
      try {
        await categoriesAPI.deleteCategory(id);
        fetchCategories();
        toast.success('Category deleted successfully');
      } catch (error) {
        console.error('Error deleting category:', error);
        toast.error('Failed to delete category');
      } finally {
        hideLoading();
      }
    }
  };

  const openModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ typeName: category.typeName, description: category.description || '', type: category.type });
    } else {
      setEditingCategory(null);
      setFormData({ typeName: '', description: '', type: activeTab });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({ typeName: '', description: '', type: 'item' });
  };

  return (
    <div className="">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <button onClick={() => openModal()} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
          <Plus size={20} />
          <span>Add Category</span>
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('item')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'item'
              ? 'bg-indigo-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Item Categories
        </button>
        <button
          onClick={() => setActiveTab('financial')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'financial'
              ? 'bg-indigo-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Financial Categories
        </button>
        <button
          onClick={() => setActiveTab('group')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'group'
              ? 'bg-indigo-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Group Categories
        </button>
        <button
          onClick={() => setActiveTab('quantityType')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'quantityType'
              ? 'bg-indigo-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          QuantityType Categories
        </button>
        <button
          onClick={() => setActiveTab('paymentType')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'paymentType'
              ? 'bg-indigo-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Payment Type
        </button>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {categories.length === 0 ? (
          <div className="p-8 text-center">
            <Tags className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Categories Yet</h2>
            <p className="text-gray-600">Add your first category to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {categories.map((category) => (
                  <tr key={category.typeId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{category.typeName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{category.description || '-'}</td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setViewingCategory(category)} className="text-green-600 hover:text-green-800 inline-flex items-center">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => openModal(category)} className="text-blue-600 hover:text-blue-800 inline-flex items-center">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(category.typeId)} className="text-red-600 hover:text-red-800 inline-flex items-center">
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

      {viewingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Category Details</h2>
              <button onClick={() => setViewingCategory(null)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Category Name</label>
                <p className="text-gray-900 font-medium">{viewingCategory.typeName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
                <p className="text-gray-900">{viewingCategory.description || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
                <input type="text" required value={formData.typeName} onChange={(e) => setFormData({ ...formData, typeName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <input type="text" disabled value={formData.type} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 capitalize" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" rows={3} />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">
                  {editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;