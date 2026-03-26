/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, CheckCircle, AlertTriangle, Clock, Filter, Download, Mail } from 'lucide-react';
import {
  invoiceAPI, supplierAPI, taxAPI
} from '../services/api';
import { useLoading } from '../context/LoadingContext';
import { toast } from 'react-toastify';

const PaymentTracker: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'overdue' | 'due_soon'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days' | 'year' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [upcomingAlerts, setUpcomingAlerts] = useState<any[]>([]);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailStartDate, setEmailStartDate] = useState('');
  const [emailEndDate, setEmailEndDate] = useState('');
  const [emailList, setEmailList] = useState('');
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_name: '',
    supplier_id: '',
    amount: '',
    tax_id: '',
    invoice_date: '',
    due_date: '',
    notes: ''
  });
  const { showLoading, hideLoading } = useLoading();

  useEffect(() => {
    fetchInvoices();
    fetchSuppliers();
    fetchUpcomingAlerts();
    fetchTaxes();
  }, [filter, dateFilter, customStartDate, customEndDate]);

  const fetchTaxes = async () => {
    try {
      const response = await taxAPI.getTaxes();
      setTaxes(response.data);
    } catch (error) {
      console.error('Error fetching taxes:', error);
    }
  };

  const fetchInvoices = async () => {
    showLoading('Loading invoices...');
    try {
      const params: any = { type: "purchase" };
      if (filter === 'due_soon') {
        params.status = 'pending';
      } else if (filter !== 'all') {
        params.status = filter;
      }
      
      const response = await invoiceAPI.getAllInvoices(params);
      let filteredInvoices = response.data;
      
      // Apply date filter
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dateFilter === 'today') {
        filteredInvoices = filteredInvoices.filter((inv: any) => {
          const invDate = new Date(inv.invoiceDate);
          invDate.setHours(0, 0, 0, 0);
          return invDate.getTime() === today.getTime();
        });
      } else if (dateFilter === '7days') {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        filteredInvoices = filteredInvoices.filter((inv: any) => {
          const invDate = new Date(inv.invoiceDate);
          return invDate >= sevenDaysAgo && invDate <= today;
        });
      } else if (dateFilter === '30days') {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        filteredInvoices = filteredInvoices.filter((inv: any) => {
          const invDate = new Date(inv.invoiceDate);
          return invDate >= thirtyDaysAgo && invDate <= today;
        });
      } else if (dateFilter === 'year') {
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(today.getFullYear() - 1);
        filteredInvoices = filteredInvoices.filter((inv: any) => {
          const invDate = new Date(inv.invoiceDate);
          return invDate >= oneYearAgo && invDate <= today;
        });
      } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        filteredInvoices = filteredInvoices.filter((inv: any) => {
          const invDate = new Date(inv.invoiceDate);
          return invDate >= start && invDate <= end;
        });
      }
      
      if (filter === 'due_soon') {
        const threeDaysLater = new Date();
        threeDaysLater.setDate(today.getDate() + 3);
        filteredInvoices = filteredInvoices.filter((inv: any) => {
          const dueDate = new Date(inv.dueDate);
          return dueDate >= today && dueDate <= threeDaysLater;
        });
      }
      
      filteredInvoices.sort((a: any, b: any) => {
        const aDays = getDaysUntilDue(a.dueDate);
        const bDays = getDaysUntilDue(b.dueDate);
        if (a.status === 'paid' && b.status !== 'paid') return 1;
        if (a.status !== 'paid' && b.status === 'paid') return -1;
        if (aDays <= 3 && bDays > 3) return -1;
        if (aDays > 3 && bDays <= 3) return 1;
        return aDays - bDays;
      });
      
      setInvoices(filteredInvoices);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load invoices');
    } finally {
      hideLoading();
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await supplierAPI.getSuppliers();
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchUpcomingAlerts = async () => {
    try {
      const response = await invoiceAPI.getUpcomingAlerts({type:'purchase'});
      if (response.data.length > 0) {
        setUpcomingAlerts(response.data);
        setShowAlertModal(true);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    showLoading(editingInvoice ? 'Updating invoice...' : 'Creating invoice...');
    try {
      const totalAmount = parseFloat(formData.amount);
      const selectedTax = taxes.find((t) => t.taxId === formData.tax_id);
      const taxPercent = selectedTax ? parseFloat(selectedTax.taxPercentage) : 0;
      const baseAmount = taxPercent > 0 ? totalAmount / (1 + taxPercent / 100) : totalAmount;
      const taxAmount = totalAmount - baseAmount;

      const data = {
        ...formData,
        amount: parseFloat(baseAmount.toFixed(2)),
        tax_id: formData.tax_id || null,
        tax_percent: taxPercent || null,
        tax_amount: taxPercent > 0 ? parseFloat(taxAmount.toFixed(2)) : null,
        type: "purchase"
      };

      if (editingInvoice) {
        await invoiceAPI.updateInvoice(editingInvoice.invoiceId, data);
        toast.success('Invoice updated successfully');
      } else {
        await invoiceAPI.createInvoice(data);
        toast.success('Invoice created successfully');
      }
      fetchInvoices();
      closeModal();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save invoice');
    } finally {
      hideLoading();
    }
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setPaymentMode('');
    setShowPaymentModal(true);
  };

  const submitPayment = async () => {
    if (!paymentMode) {
      toast.error('Please select payment mode');
      return;
    }
    showLoading('Updating status...');
    try {
      await invoiceAPI.markAsPaid(selectedInvoiceId, { payment_mode: paymentMode });
      toast.success('Invoice marked as paid');
      setShowPaymentModal(false);
      fetchInvoices();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      hideLoading();
    }
  };

  const handleDelete = async (invoiceId: string) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      showLoading('Deleting invoice...');
      try {
        await invoiceAPI.deleteInvoice(invoiceId);
        toast.success('Invoice deleted successfully');
        fetchInvoices();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete invoice');
      } finally {
        hideLoading();
      }
    }
  };

  const openModal = (invoice?: any) => {
    if (invoice) {
      setEditingInvoice(invoice);
      setFormData({
        invoice_number: invoice.invoiceNumber,
        invoice_name: invoice.invoiceName,
        supplier_id: invoice.supplierId || '',
        amount: invoice.amount.toString(),
        tax_id: invoice.taxId || '',
        invoice_date: new Date(invoice.invoiceDate).toISOString().split('T')[0],
        due_date: new Date(invoice.dueDate).toISOString().split('T')[0],
        notes: invoice.notes || ''
      });
    } else {
      setEditingInvoice(null);
      setFormData({
        invoice_number: '',
        invoice_name: '',
        supplier_id: '',
        amount: '',
        tax_id: '',
        invoice_date: '',
        due_date: '',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingInvoice(null);
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const downloadCSV = () => {
    if (invoices.length === 0) {
      toast.error('No data to download');
      return;
    }

    const data = invoices.map(invoice => ({
      'Invoice Number': invoice.invoiceNumber,
      'Invoice Name': invoice.invoiceName,
      'Supplier': suppliers.find(s => s.supplierId === invoice.supplierId)?.supplierName || '-',
      'Amount': invoice.amount,
      'Invoice Date': new Date(invoice.invoiceDate).toLocaleDateString(),
      'Due Date': new Date(invoice.dueDate).toLocaleDateString(),
      'Days Until Due': getDaysUntilDue(invoice.dueDate)>0?getDaysUntilDue(invoice.dueDate):"Due Over",
      'Status': invoice.status === 'paid' ? 'Paid' : getDaysUntilDue(invoice.dueDate) < 0 ? 'Overdue' : getDaysUntilDue(invoice.dueDate) <= 3 ? 'Due Soon' : 'Pending',
      'Payment Mode': invoice.paymentMode || '-',
      'Paid Date': invoice.paidDate ? new Date(invoice.paidDate).toLocaleDateString() : '-',
      'Notes': invoice.notes || '-'
    }));

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-tracker-${filter}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV downloaded successfully');
  };

  const getStatusBadge = (invoice: any) => {
    const daysUntilDue = getDaysUntilDue(invoice.dueDate);
    
    if (invoice.status === 'paid') {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Paid</span>;
    } else if (daysUntilDue < 0) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Overdue</span>;
    } else if (daysUntilDue <= 3) {
      return <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700">Due Soon</span>;
    } else {
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">Pending</span>;
    }
  };

  const handleSendEmail = async () => {
    if (!emailStartDate || !emailEndDate) {
      toast.error('Please select date range');
      return;
    }
    if (!emailList.trim()) {
      toast.error('Please enter email addresses');
      return;
    }
    showLoading('Sending email...');
    try {
      await invoiceAPI.sendInvoiceEmail({
        emails: emailList,
        start_date: emailStartDate,
        end_date: emailEndDate,
        type: 'purchase'
      });
      toast.success('Email sent successfully');
      setShowEmailModal(false);
      setEmailList('');
      setEmailStartDate('');
      setEmailEndDate('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send email');
    } finally {
      hideLoading();
    }
  };

  return (
    <div className="">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payment Tracker</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowEmailModal(true)} className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
            <Mail size={20} />
            Send Email
          </button>
          <button onClick={downloadCSV} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
            <Download size={20} />
            Download CSV
          </button>
          <button onClick={() => openModal()} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
            <Plus size={20} />
            Add Invoice
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg transition-colors ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
              All
            </button>
            <button onClick={() => setFilter('due_soon')} className={`px-4 py-2 rounded-lg transition-colors ${filter === 'due_soon' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
              Due Soon
            </button>
            <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-lg transition-colors ${filter === 'pending' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
              To Be Paid
            </button>
            <button onClick={() => setFilter('paid')} className={`px-4 py-2 rounded-lg transition-colors ${filter === 'paid' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
              Paid
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as any)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="year">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
            {dateFilter === 'custom' && (
              <>
                <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Start Date" />
                <span className="text-gray-500">to</span>
                <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="End Date" />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Mode</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.invoiceId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{invoice.invoiceNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{invoice.invoiceName}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    €{parseFloat(invoice.amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-orange-600">
                    {invoice.taxAmount ? `€${parseFloat(invoice.taxAmount).toFixed(2)}` : "-"}
                    {invoice.taxPercent ? <span className="block text-xs text-gray-400">{parseFloat(invoice.taxPercent).toFixed(0)}%</span> : null}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    €{(parseFloat(invoice.amount) + parseFloat(invoice.taxAmount || 0)).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4">{getStatusBadge(invoice)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {invoice.paidDate ? new Date(invoice.paidDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {invoice.paymentMode || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <div className="flex justify-end gap-2">
                      {invoice.status === 'pending' && (
                        <button onClick={() => handleMarkAsPaid(invoice.invoiceId)} className="text-green-600 hover:text-green-800" title="Mark as Paid">
                          <CheckCircle size={18} />
                        </button>
                      )}
                      <button onClick={() => openModal(invoice)} className="text-blue-600 hover:text-blue-800">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(invoice.invoiceId)} className="text-red-600 hover:text-red-800">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingInvoice ? 'Edit Invoice' : 'Add Invoice'}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number *</label>
                  <input type="text" required value={formData.invoice_number} onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Name *</label>
                  <input type="text" required value={formData.invoice_name} onChange={(e) => setFormData({ ...formData, invoice_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <select value={formData.supplier_id} onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Select Supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.supplierId} value={supplier.supplierId}>{supplier.supplierName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (incl. tax) *</label>
                  <input type="number" step="0.01" required value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax</label>
                  <select value={formData.tax_id} onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">No Tax</option>
                    {taxes.map((tax) => (
                      <option key={tax.taxId} value={tax.taxId}>{tax.tax_name} ({tax.taxPercentage}%)</option>
                    ))}
                  </select>
                  {formData.tax_id && formData.amount && (() => {
                    const total = parseFloat(formData.amount);
                    const taxPct = parseFloat(taxes.find(t => t.taxId === formData.tax_id)?.taxPercentage || 0);
                    const base = total / (1 + taxPct / 100);
                    const tax = total - base;
                    return <p className="text-xs text-gray-500 mt-1">Base: €{base.toFixed(2)} + Tax: €{tax.toFixed(2)}</p>;
                  })()}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date *</label>
                  <input type="date" required value={formData.invoice_date} onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                  <input type="date" required value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                  {editingInvoice ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Mark as Paid</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode *</label>
                <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Select Payment Mode</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={submitPayment} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                  Confirm Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {showAlertModal && upcomingAlerts.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-orange-500" size={32} />
              <h2 className="text-xl font-bold text-gray-900">Payment Alerts</h2>
            </div>
            <p className="text-gray-600 mb-4">The following invoices are due within 3 days:</p>
            <div className="space-y-3 mb-6">
              {upcomingAlerts.map((invoice) => (
                <div key={invoice.invoiceId} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">{invoice.invoiceName}</p>
                      <p className="text-sm text-gray-600">Invoice: {invoice.invoiceNumber}</p>
                      <p className="text-sm text-gray-600">Amount: €{parseFloat(invoice.amount).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-orange-600">
                        <Clock size={14} className="inline mr-1" />
                        {getDaysUntilDue(invoice.dueDate)} days
                      </p>
                      <p className="text-xs text-gray-500">{new Date(invoice.dueDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowAlertModal(false)} className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600">
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Send Invoice Report</h2>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                <input type="date" value={emailStartDate} onChange={(e) => setEmailStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                <input type="date" value={emailEndDate} onChange={(e) => setEmailEndDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Addresses * (comma separated)</label>
                <textarea value={emailList} onChange={(e) => setEmailList(e.target.value)} rows={3} placeholder="email1@example.com, email2@example.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowEmailModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={handleSendEmail} className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
                  Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentTracker;
