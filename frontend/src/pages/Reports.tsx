/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Download, Printer, TrendingUp, TrendingDown, IndianRupee, Package, Calendar, FileText, AlertTriangle, Flame, Snowflake, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { reportAPI, supplierAPI, categoriesAPI, invoiceAPI } from '../services/api';
import { useLoading } from '../context/LoadingContext';
import { toast } from 'react-toastify';

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState('transactions');
  const [dateFilter, setDateFilter] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [charts, setCharts] = useState<any>(null);
  const [stockReport, setStockReport] = useState<any[]>([]);
  const [rolReport, setRolReport] = useState<any[]>([]);
  const [highConsumption, setHighConsumption] = useState<any[]>([]);
  const [lowConsumption, setLowConsumption] = useState<any[]>([]);
  const [priceComparison, setPriceComparison] = useState<any[]>([]);
  const [expandedPriceGroups, setExpandedPriceGroups] = useState<Set<string>>(new Set());
  const [seasonalAnalysis, setSeasonalAnalysis] = useState<any[]>([]);
  const [seasonalMonth, setSeasonalMonth] = useState('');
  const [seasonalCategory, setSeasonalCategory] = useState('');
  const [itemPriceAnalysis, setItemPriceAnalysis] = useState<any[]>([]);
  const [selectedItemForChart, setSelectedItemForChart] = useState<any>(null);
  const [itemPriceHistory, setItemPriceHistory] = useState<any[]>([]);
  const [checkinInvoices, setCheckinInvoices] = useState<any[]>([]);
  const [checkinInvoiceSupplier, setCheckinInvoiceSupplier] = useState('');
  const [checkinInvoiceDateFilter, setCheckinInvoiceDateFilter] = useState('last30days');
  const [expandedCheckinInvoice, setExpandedCheckinInvoice] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const { showLoading, hideLoading } = useLoading();

  useEffect(() => {
    fetchSuppliers();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchReports();
    } else if (activeTab === 'stock') {
      fetchStockReport();
    } else if (activeTab === 'rol') {
      fetchRolReport();
    } else if (activeTab === 'high') {
      fetchHighConsumption();
    } else if (activeTab === 'low') {
      fetchLowConsumption();
    } else if (activeTab === 'price') {
      fetchPriceComparison();
    } else if (activeTab === 'seasonal') {
      fetchSeasonalAnalysis();
    } else if (activeTab === 'priceHistory') {
      fetchItemPriceAnalysis();
    } else if (activeTab === 'checkinInvoices') {
      fetchCheckinInvoices();
    }
  }, [activeTab, dateFilter, pagination.page, supplierId, categoryId, seasonalMonth, seasonalCategory, checkinInvoiceDateFilter, checkinInvoiceSupplier]);

  const fetchSuppliers = async () => {
    try {
      const response = await supplierAPI.getSuppliers();
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getTypeCategories("item");
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date, endDate: Date;

    switch (dateFilter) {
      case 'today':
        startDate = new Date(now); startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now); endDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday': {
        const y = new Date(now); y.setDate(y.getDate() - 1);
        startDate = new Date(y); startDate.setHours(0, 0, 0, 0);
        endDate = new Date(y); endDate.setHours(23, 59, 59, 999);
        break;
      }
      case 'last7days':
        startDate = new Date(now); startDate.setDate(startDate.getDate() - 7); startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now); endDate.setHours(23, 59, 59, 999);
        break;
      case 'last30days':
        startDate = new Date(now); startDate.setDate(startDate.getDate() - 30); startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now); endDate.setHours(23, 59, 59, 999);
        break;
      case 'thisweek': {
        startDate = new Date(now); startDate.setDate(startDate.getDate() - startDate.getDay()); startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now); endDate.setHours(23, 59, 59, 999);
        break;
      }
      case 'thismonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        endDate = new Date(now); endDate.setHours(23, 59, 59, 999);
        break;
      case 'thisyear':
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        endDate = new Date(now); endDate.setHours(23, 59, 59, 999);
        break;
      case 'overall':
        startDate = new Date('2020-01-01T00:00:00.000Z');
        endDate = new Date(now); endDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        startDate = customStartDate ? new Date(customStartDate) : new Date('2020-01-01');
        startDate.setHours(0, 0, 0, 0);
        endDate = customEndDate ? new Date(customEndDate) : new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = new Date(now); startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now); endDate.setHours(23, 59, 59, 999);
    }

    return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
  };

  const fetchReports = async () => {
    showLoading('Loading reports...');
    try {
      const { startDate, endDate } = getDateRange();
      const params: any = { startDate, endDate, page: pagination.page, limit: pagination.limit };
      
      if (supplierId) params.supplierId = supplierId;
      if (categoryId) params.categoryId = categoryId;

      const [summaryRes, listRes, chartsRes] = await Promise.all([
        reportAPI.getSummary(params),
        reportAPI.getList(params),
        reportAPI.getCharts(params)
      ]);

      setSummary(summaryRes.data);
      setTransactions(listRes.data.transactions);
      setPagination(listRes.data.pagination);
      setCharts(chartsRes.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load reports');
    } finally {
      hideLoading();
    }
  };

  const fetchStockReport = async () => {
    showLoading('Loading stock report...');
    try {
      const params: any = {};
      if (supplierId) params.supplierId = supplierId;
      if (categoryId) params.categoryId = categoryId;
      const response = await reportAPI.getStockReport(params);
      setStockReport(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load');
    } finally {
      hideLoading();
    }
  };

  const fetchRolReport = async () => {
    showLoading('Loading ROL recommendations...');
    try {
      const response = await reportAPI.getROLRecommendations();
      setRolReport(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load');
    } finally {
      hideLoading();
    }
  };

  const fetchHighConsumption = async () => {
    showLoading('Loading high consumption...');
    try {
      // const { startDate, endDate } = getDateRange();
      const response = await reportAPI.getItemAnalysis();
      const sorted = response.data.sort((a: any, b: any) => b.totalCheckOut - a.totalCheckOut).slice(0, 20);
      setHighConsumption(sorted);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load');
    } finally {
      hideLoading();
    }
  };

  const fetchLowConsumption = async () => {
    showLoading('Loading low consumption...');
    try {
      const response = await reportAPI.getItemAnalysis();
      const sorted = response.data.sort((a: any, b: any) => a.totalCheckOut - b.totalCheckOut).slice(0, 20);
      setLowConsumption(sorted);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load');
    } finally {
      hideLoading();
    }
  };

  const fetchPriceComparison = async () => {
    showLoading('Loading price comparison...');
    try {
      const response = await reportAPI.getGroupPriceComparison();
      setPriceComparison(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load');
    } finally {
      hideLoading();
    }
  };

  const fetchSeasonalAnalysis = async () => {
    showLoading('Loading seasonal analysis...');
    try {
      const response = await reportAPI.getItemAnalysis();
      const monthlyData: any = {};
      
      response.data.forEach((item: any) => {
        if (item.lastTransaction) {
          const month = new Date(item.lastTransaction).getMonth() + 1;
          
          if (seasonalMonth && month !== parseInt(seasonalMonth)) return;
          if (seasonalCategory && item.category !== categories.find(c => c.typeId === seasonalCategory)?.typeName) return;
          
          const key = `${item.itemId}-${month}`;
          if (!monthlyData[key]) {
            monthlyData[key] = {
              itemCode: item.itemCode,
              itemName: item.itemName,
              month: month,
              monthName: new Date(2024, month - 1).toLocaleString('default', { month: 'long' }),
              totalCheckOut: item.totalCheckOut,
              totalCheckIn: item.totalCheckIn,
              category: item.category,
              supplier: item.supplier
            };
          }
        }
      });
      
      setSeasonalAnalysis(Object.values(monthlyData));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load');
    } finally {
      hideLoading();
    }
  };

  const fetchItemPriceAnalysis = async () => {
    showLoading('Loading item price analysis...');
    try {
      const response = await reportAPI.getAllItemPrices();
      setItemPriceAnalysis(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load');
    } finally {
      hideLoading();
    }
  };

  const fetchCheckinInvoices = async () => {
    showLoading('Loading check-in invoices...');
    try {
      const now = new Date();
      let startDate: string, endDate: string;
      if (checkinInvoiceDateFilter === 'last7days') {
        startDate = new Date(Date.now() - 7 * 86400000).toISOString();
        endDate = new Date().toISOString();
      } else if (checkinInvoiceDateFilter === 'last30days') {
        startDate = new Date(Date.now() - 30 * 86400000).toISOString();
        endDate = new Date().toISOString();
      } else if (checkinInvoiceDateFilter === 'thismonth') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        endDate = new Date().toISOString();
      } else {
        startDate = new Date('2020-01-01').toISOString();
        endDate = new Date().toISOString();
      }
      const params: any = { startDate, endDate };
      if (checkinInvoiceSupplier) params.supplierId = checkinInvoiceSupplier;
      const response = await invoiceAPI.getCheckinInvoices(params);
      setCheckinInvoices(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load check-in invoices');
    } finally {
      hideLoading();
    }
  };

  const fetchItemPriceHistory = async (itemId: string) => {
    showLoading('Loading price history...');
    try {
      const response = await reportAPI.getItemPriceStats(itemId);
      setItemPriceHistory(response.data.priceHistory);
      setSelectedItemForChart({ ...selectedItemForChart, stats: response.data });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load price history');
    } finally {
      hideLoading();
    }
  };

  const downloadCSV = () => {
    const headers = ['Date','Time', 'Item Name', 'Item Code', 'Type', 'Quantity', 'Price', 'Tax %', 'Tax Amount', 'Total Amount', 'Location', 'User'];
    const rows = transactions.map(t => [
      new Date(t.date).toLocaleString(),
      t.itemName,
      t.itemCode,
      t.type.toUpperCase(),
      `${t.quantity} ${t.quantityType}`,
      t.price.toFixed(2),
      t.taxPercent,
      t.taxAmount.toFixed(2),
      t.totalAmount.toFixed(2),
      t.location,
      t.takenBy || '-'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-report-${Date.now()}.csv`;
    a.click();
    toast.success('CSV downloaded');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 print:mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Reports & Analytics</h1>
        <div className="flex gap-2 print:hidden">
          <button onClick={downloadCSV} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
            <Download size={18} />
            CSV
          </button>
          <button onClick={handlePrint} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
            <Printer size={18} />
            Print
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setActiveTab('transactions')} className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'transactions' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            <FileText size={18} />
            Transactions
          </button>
          <button onClick={() => setActiveTab('stock')} className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'stock' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            <Package size={18} />
            Stock Report
          </button>
          <button onClick={() => setActiveTab('rol')} className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'rol' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            <AlertTriangle size={18} />
            RFQ/RFP (ROL/EOQ)
          </button>
          <button onClick={() => setActiveTab('high')} className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'high' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            <Flame size={18} />
            High Consumption
          </button>
          <button onClick={() => setActiveTab('low')} className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'low' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            <Snowflake size={18} />
            Low Consumption
          </button>
          <button onClick={() => setActiveTab('price')} className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'price' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            <DollarSign size={18} />
            Price Comparison
          </button>
          <button onClick={() => setActiveTab('seasonal')} className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'seasonal' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            <Calendar size={18} />
            Seasonal Analysis
          </button>
          <button onClick={() => setActiveTab('priceHistory')} className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'priceHistory' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            <TrendingUp size={18} />
            Price History
          </button>
          <button onClick={() => setActiveTab('checkinInvoices')} className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'checkinInvoices' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            <FileText size={18} />
            Check-In Invoices
          </button>
        </div>
      </div>

      {/* Date Filters - Only for transactions tab */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <Calendar className="text-gray-500" size={20} />
          <button onClick={() => setDateFilter('today')} className={`px-4 py-2 rounded-lg transition-colors ${dateFilter === 'today' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            Today
          </button>
          <button onClick={() => setDateFilter('yesterday')} className={`px-4 py-2 rounded-lg transition-colors ${dateFilter === 'yesterday' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            Yesterday
          </button>
          <button onClick={() => setDateFilter('last7days')} className={`px-4 py-2 rounded-lg transition-colors ${dateFilter === 'last7days' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            Last 7 Days
          </button>
          <button onClick={() => setDateFilter('last30days')} className={`px-4 py-2 rounded-lg transition-colors ${dateFilter === 'last30days' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            Last 30 Days
          </button>
          <button onClick={() => setDateFilter('thisweek')} className={`px-4 py-2 rounded-lg transition-colors ${dateFilter === 'thisweek' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            This Week
          </button>
          <button onClick={() => setDateFilter('thismonth')} className={`px-4 py-2 rounded-lg transition-colors ${dateFilter === 'thismonth' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            This Month
          </button>
          <button onClick={() => setDateFilter('thisyear')} className={`px-4 py-2 rounded-lg transition-colors ${dateFilter === 'thisyear' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            This Year
          </button>
          <button onClick={() => setDateFilter('overall')} className={`px-4 py-2 rounded-lg transition-colors ${dateFilter === 'overall' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            Overall
          </button>
          <button onClick={() => setDateFilter('custom')} className={`px-4 py-2 rounded-lg transition-colors ${dateFilter === 'custom' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            Custom
          </button>
          {dateFilter === 'custom' && (
            <>
              <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="px-3 py-2 border rounded-lg" />
              <span className="text-gray-500">to</span>
              <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="px-3 py-2 border rounded-lg" />
              <button onClick={fetchReports} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                Apply
              </button>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="">All Suppliers</option>
            {suppliers.map((supplier) => (
              <option key={supplier.supplierId} value={supplier.supplierId}>{supplier.supplierName}</option>
            ))}
          </select>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.typeId} value={category.typeId}>{category.typeName}</option>
            ))}
          </select>
          {(supplierId || categoryId) && (
            <button onClick={() => { setSupplierId(''); setCategoryId(''); }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
              Clear Filters
            </button>
          )}
        </div>
      </div>
      )}

      {/* Summary Cards - Only for transactions */}
      {activeTab === 'transactions' && summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Check-In</p>
                <p className="text-2xl font-bold text-green-600 mt-1">€{summary.totalCheckInAmount.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">{summary.totalCheckInQty} items</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Check-Out</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">€{summary.totalCheckOutAmount.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">{summary.totalCheckOutQty} items</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue (Profit)</p>
                <p className={`text-2xl font-bold mt-1 ${summary.revenue >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                  €{summary.revenue.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">CheckOut - CheckIn</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <IndianRupee className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalTransactions}</p>
                <p className="text-xs text-gray-500 mt-1">{summary.totalQuantity} total qty</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts - Only for transactions */}
      {activeTab === 'transactions' && charts && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Trend</h3>
            <div className="space-y-2">
              {charts.dailyTrend.slice(0, 10).map((day: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{new Date(day.date).toLocaleDateString()}</span>
                  <div className="flex gap-4">
                    <span className="text-green-600">In: €{day.checkIn.toFixed(2)}</span>
                    <span className="text-blue-600">Out: €{day.checkOut.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Check-In Products</h3>
            <div className="space-y-2">
              {charts.topCheckIn.map((product: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{product.name}</span>
                  <span className="text-sm font-semibold text-green-600">{product.quantity} pack</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Check-Out Products</h3>
            <div className="space-y-2">
              {charts.topCheckOut.map((product: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{product.name}</span>
                  <span className="text-sm font-semibold text-blue-600">{product.quantity} pack</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      {activeTab === 'transactions' && (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No transactions found for the selected filters</p>
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.transactionId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{t.itemName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{t.itemCode}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${t.type === 'checkin' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {t.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{`${String(t.quantity).padStart(2,'0')} pack`}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">€{t.price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{t.taxPercent}%</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">€{t.totalAmount.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} transactions
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Stock Report */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Stock Report</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stockReport.map((item: any) => (
                  <tr key={item.itemCode} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{item.itemCode}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.itemName}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.currentQty}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">€{parseFloat(item.purchasePrice || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.taxPercent ?? 0}%</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">€{(parseFloat(item.purchasePrice || 0) * (1 + parseFloat(item.taxPercent || 0) / 100)).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${item.status === 'Low Stock' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.supplier}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ROL/RFQ Report */}
      {activeTab === 'rol' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">RFQ/RFP Recommendations (Based on ROL & EOQ)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ROL</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recommended ROL</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MOQ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">EOQ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Daily Usage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days to Stockout</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rolReport.map((item: any) => (
                  <tr key={item.itemCode} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{item.itemCode}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.itemName}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.currentQty}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.currentROL}</td>
                    <td className="px-6 py-4 text-sm text-blue-600 font-semibold">{item.recommendedROL}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.moq}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.eoq}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.avgDailyUsage}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.daysUntilStockout}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.status === 'critical' ? 'bg-red-100 text-red-700' : 
                        item.status === 'warning' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-green-100 text-green-700'
                      }`}>
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* High Consumption Report */}
      {activeTab === 'high' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">High Consumption Items</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Check-Out</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Check-In</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Turnover Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {highConsumption.map((item: any, idx: number) => (
                  <tr key={item.itemCode} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{idx + 1}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.itemCode}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.itemName}</td>
                    <td className="px-6 py-4 text-sm text-red-600 font-semibold">{item.totalCheckOut}</td>
                    <td className="px-6 py-4 text-sm text-green-600">{item.totalCheckIn}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.turnoverRate}%</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.currentQty}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.supplier}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Low Consumption Report */}
      {activeTab === 'low' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Low Consumption Items</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Check-Out</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Check-In</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Turnover Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lowConsumption.map((item: any, idx: number) => (
                  <tr key={item.itemCode} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{idx + 1}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.itemCode}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.itemName}</td>
                    <td className="px-6 py-4 text-sm text-blue-600">{item.totalCheckOut}</td>
                    <td className="px-6 py-4 text-sm text-green-600">{item.totalCheckIn}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.turnoverRate}%</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.currentQty}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.supplier}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Price Comparison Report */}
      {activeTab === 'price' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Price Comparison by Group</h3>
            <p className="text-sm text-gray-600 mt-1">Items grouped by product group. </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Group Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Unit Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Unit Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Unit Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price Range %</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {priceComparison.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No price comparison data available</p>
                      <p className="text-xs mt-1">Assign items to a group with 2+ members to see comparisons</p>
                    </td>
                  </tr>
                ) : (
                  priceComparison.map((group: any) => (
                    <React.Fragment key={group.groupId}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{group.groupName}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{group.variantCount} item(s)</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">€{group.avgUnitPrice.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-green-600">€{group.minUnitPrice.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-red-600">€{group.maxUnitPrice.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm font-semibold">
                          <span className={group.priceRange > 20 ? 'text-red-600' : group.priceRange > 10 ? 'text-orange-600' : 'text-green-600'}>
                            {group.priceRange.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => {
                              setExpandedPriceGroups(prev => {
                                const next = new Set(prev);
                                next.has(group.groupId) ? next.delete(group.groupId) : next.add(group.groupId);
                                return next;
                              });
                            }}
                            className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                          >
                            {expandedPriceGroups.has(group.groupId) ? <><ChevronUp size={16} /><span className="text-xs">Hide</span></> : <><ChevronDown size={16} /><span className="text-xs">Compare</span></>}
                          </button>
                        </td>
                      </tr>
                      {expandedPriceGroups.has(group.groupId) && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 bg-gray-50">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Unit Price Breakdown — {group.groupName}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {group.items.map((item: any) => (
                                <div key={item.itemId} className={`bg-white p-4 rounded-lg border-2 shadow-sm ${
                                  item.priceStatus === 'low' ? 'border-green-300' :
                                  item.priceStatus === 'high' ? 'border-red-300' : 'border-gray-200'
                                }`}>
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-900">{item.itemName}</p>
                                      <p className="text-xs text-gray-500">{item.itemCode}</p>
                                    </div>
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      item.priceStatus === 'high' ? 'bg-red-100 text-red-700' :
                                      item.priceStatus === 'low' ? 'bg-green-100 text-green-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>{item.priceStatus.toUpperCase()}</span>
                                  </div>
                                  <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Pack Price:</span>
                                      <span className="font-semibold">€{item.purchasePrice.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Pack Qty:</span>
                                      <span>{item.packQty}</span>
                                    </div>
                                    <div className="flex justify-between border-t pt-1">
                                      <span className="text-gray-500">Unit Price:</span>
                                      <span className="font-bold text-gray-900">€{item.unitPrice.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">vs Avg:</span>
                                      <span className={`font-semibold ${
                                        item.priceDiffPercent > 0 ? 'text-red-600' : item.priceDiffPercent < 0 ? 'text-green-600' : 'text-gray-500'
                                      }`}>
                                        {item.priceDiffPercent > 0 ? '+' : ''}{item.priceDiffPercent.toFixed(2)}%
                                      </span>
                                    </div>
                                    {item.supplier !== '-' && (
                                      <div className="flex justify-between pt-1 border-t">
                                        <span className="text-gray-500">Supplier:</span>
                                        <span className="font-medium text-gray-900">{item.supplier}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Seasonal Analysis Report */}
      {activeTab === 'seasonal' && (
        <>
        {/* Seasonal Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-wrap gap-2 items-center">
            <select value={seasonalMonth} onChange={(e) => setSeasonalMonth(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">All Months</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
            <select value={seasonalCategory} onChange={(e) => setSeasonalCategory(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.typeId} value={category.typeId}>{category.typeName}</option>
              ))}
            </select>
            {(seasonalMonth || seasonalCategory) && (
              <button onClick={() => { setSeasonalMonth(''); setSeasonalCategory(''); }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                Clear Filters
              </button>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Seasonal Analysis - Monthly Consumption Patterns</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Check-Out</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Check-In</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {seasonalAnalysis.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No seasonal data available</p>
                    </td>
                  </tr>
                ) : (
                  seasonalAnalysis.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{item.itemCode}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.itemName}</td>
                      <td className="px-6 py-4 text-sm text-blue-600 font-semibold">{item.monthName}</td>
                      <td className="px-6 py-4 text-sm text-red-600">{item.totalCheckOut}</td>
                      <td className="px-6 py-4 text-sm text-green-600">{item.totalCheckIn}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.category}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.supplier}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {/* Item Price History Analysis */}
      {activeTab === 'priceHistory' && (
        <div className="space-y-6">
          {!selectedItemForChart ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Item Price History Analysis</h3>
                <p className="text-sm text-gray-600 mt-1">Click on any item to view its price history chart</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {itemPriceAnalysis.map((item: any) => (
                      <tr key={item.itemId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{item.itemCode}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.itemName}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">€{item.currentPrice.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.category}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.supplier}</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedItemForChart(item);
                              fetchItemPriceHistory(item.itemId);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View History
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedItemForChart.itemName}</h3>
                    <p className="text-sm text-gray-600">Code: {selectedItemForChart.itemCode}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedItemForChart(null);
                      setItemPriceHistory([]);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Back to List
                  </button>
                </div>

                {/* Price Chart */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Price Trend Chart</h4>
                  <div className="relative">
                    <div className="relative h-80 border-b-2 border-l-2 border-gray-400 mb-12">
                      {itemPriceHistory.length > 0 ? (
                        <svg className="w-full h-full" viewBox="0 0 800 320" preserveAspectRatio="none">
                          {(() => {
                            const data = itemPriceHistory.slice(0, 15).reverse();
                            const maxPrice = Math.max(...data.map((r: any) => parseFloat(r.price)));
                            const minPrice = Math.min(...data.map((r: any) => parseFloat(r.price)));
                            const priceRange = maxPrice - minPrice || 1;
                            const padding = 40;
                            const chartHeight = 280;
                            const chartWidth = 760;
                            const stepX = chartWidth / (data.length - 1 || 1);

                            const points = data.map((record: any, idx: number) => {
                              const x = padding + idx * stepX;
                              const price = parseFloat(record.price);
                              const y = chartHeight - ((price - minPrice) / priceRange) * (chartHeight - padding) + 20;
                              return { x, y, price, date: record.createdAt };
                            });

                            const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                            return (
                              <>
                                {/* Grid lines */}
                                {[0, 1, 2, 3, 4].map((i) => {
                                  const y = 20 + (chartHeight - padding) * (i / 4);
                                  return (
                                    <line key={i} x1={padding} y1={y} x2={chartWidth + padding} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4" />
                                  );
                                })}

                                {/* Line path */}
                                <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                                {/* Data points with hover */}
                                {points.map((point, idx) => (
                                  <g key={idx}>
                                    <circle 
                                      cx={point.x} 
                                      cy={point.y} 
                                      r="6" 
                                      fill="#3b82f6" 
                                      stroke="#fff" 
                                      strokeWidth="2"
                                      className="cursor-pointer hover:r-8 transition-all"
                                      data-price={point.price.toFixed(2)}
                                      data-date={new Date(point.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    >
                                      <title>€{point.price.toFixed(2)} - {new Date(point.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</title>
                                    </circle>
                                  </g>
                                ))}
                              </>
                            );
                          })()}
                        </svg>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          No price history available
                        </div>
                      )}
                    </div>
                    {/* Date labels below chart */}
                    {itemPriceHistory.length > 0 && (
                      <div className="flex justify-around px-10">
                        {itemPriceHistory.slice(0, 15).reverse().map((record: any, idx: number) => (
                          <div key={idx} className="text-xs text-gray-600 text-center" style={{ minWidth: '60px' }}>
                            {new Date(record.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Price History Table */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="p-4 border-b border-gray-200">
                    <h4 className="text-md font-semibold text-gray-900">Price Change History</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {itemPriceHistory.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                              No price history records found
                            </td>
                          </tr>
                        ) : (
                          (() => {
                            // API returns desc (newest first); reverse to get asc (oldest first = top row)
                            const asc = [...itemPriceHistory].sort(
                              (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                            );
                            return asc.map((record: any, idx: number) => {
                              const prevPrice = idx > 0 ? parseFloat(asc[idx - 1].price) : null;
                              const currentPrice = parseFloat(record.price);
                              const changePct = prevPrice !== null
                                ? parseFloat(((currentPrice - prevPrice) / prevPrice * 100).toFixed(2))
                                : null;
                              return (
                                <tr key={record.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 text-sm text-gray-900">
                                    {new Date(record.createdAt).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                    €{currentPrice.toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 text-sm">
                                    {changePct !== null ? (
                                      <span className={`inline-flex items-center gap-1 font-semibold ${
                                        changePct > 0 ? 'text-red-600' : changePct < 0 ? 'text-green-600' : 'text-gray-500'
                                      }`}>
                                        {changePct > 0 ? '▲' : changePct < 0 ? '▼' : '='}
                                        {changePct > 0 ? '+' : ''}{changePct.toFixed(2)}%
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 text-xs italic">Initial price</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            });
                          })()
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Check-In Invoices Report */}
      {activeTab === 'checkinInvoices' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
            <select
              value={checkinInvoiceDateFilter}
              onChange={e => setCheckinInvoiceDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="thismonth">This Month</option>
              <option value="overall">All Time</option>
            </select>
            <select
              value={checkinInvoiceSupplier}
              onChange={e => setCheckinInvoiceSupplier(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Suppliers</option>
              {suppliers.map(s => (
                <option key={s.supplierId} value={s.supplierId}>{s.supplierName}</option>
              ))}
            </select>
            {checkinInvoiceSupplier && (
              <button onClick={() => setCheckinInvoiceSupplier('')} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">Clear</button>
            )}
            <span className="ml-auto text-sm text-gray-500">{checkinInvoices.length} invoice(s)</span>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Check-In Invoices</h3>
              <p className="text-sm text-gray-500 mt-0.5">Supplier invoices recorded during check-in</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Qty</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tax</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Grand Total</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {checkinInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-gray-400">
                        <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                        <p>No check-in invoices found</p>
                      </td>
                    </tr>
                  ) : (
                    checkinInvoices.map((inv: any) => (
                      <React.Fragment key={inv.invoiceId}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-5 py-3 text-sm font-medium text-gray-900">{inv.invoiceNumber}</td>
                          <td className="px-5 py-3 text-sm text-gray-600">{inv.supplierName}</td>
                          <td className="px-5 py-3 text-sm text-gray-600">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                          <td className="px-5 py-3 text-sm text-right text-gray-900">{inv.totalQuantity}</td>
                          <td className="px-5 py-3 text-sm text-right text-gray-900">€{Number(inv.totalAmount).toFixed(2)}</td>
                          <td className="px-5 py-3 text-sm text-right text-orange-600">€{Number(inv.totalTax).toFixed(2)}</td>
                          <td className="px-5 py-3 text-sm text-right font-bold text-gray-900">€{Number(inv.grandTotal).toFixed(2)}</td>
                          <td className="px-5 py-3 text-center">
                            <button
                              onClick={() => setExpandedCheckinInvoice(expandedCheckinInvoice === inv.invoiceId ? null : inv.invoiceId)}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                            >
                              {expandedCheckinInvoice === inv.invoiceId ? 'Hide' : 'View Items'}
                            </button>
                          </td>
                        </tr>
                        {expandedCheckinInvoice === inv.invoiceId && (
                          <tr>
                            <td colSpan={8} className="px-5 py-3 bg-blue-50">
                              <p className="text-xs font-semibold text-gray-600 mb-2">Items in this invoice:</p>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-gray-500">
                                    <th className="text-left pb-1">Item</th>
                                    <th className="text-left pb-1">Code</th>
                                    <th className="text-right pb-1">Qty</th>
                                    <th className="text-right pb-1">Rate</th>
                                    <th className="text-right pb-1">Tax %</th>
                                    <th className="text-right pb-1">Tax Amt</th>
                                    <th className="text-right pb-1">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-blue-100">
                                  {inv.lineItems.map((li: any, idx: number) => (
                                    <tr key={idx}>
                                      <td className="py-1 text-gray-900">{li.itemName}</td>
                                      <td className="py-1 text-gray-500">{li.itemCode}</td>
                                      <td className="py-1 text-right">{li.quantity}</td>
                                      <td className="py-1 text-right">€{Number(li.rate).toFixed(2)}</td>
                                      <td className="py-1 text-right">{li.taxPercent}%</td>
                                      <td className="py-1 text-right text-orange-600">€{Number(li.taxAmount).toFixed(2)}</td>
                                      <td className="py-1 text-right font-semibold">€{Number(li.totalAmount).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;

