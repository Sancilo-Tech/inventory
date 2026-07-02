/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  AlertTriangle,
  Clock,
  Filter,
  Mail,
  RefreshCw,
  Download,
} from "lucide-react";
import { categoriesAPI, invoiceAPI, supplierAPI, taxAPI } from "../services/api";
import { useLoading } from "../context/LoadingContext";
import { toast } from "react-toastify";

const PaymentTrackerOffice: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"invoices" | "auto">("invoices");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [autoInvoices, setAutoInvoices] = useState<any[]>([]);
  const [_suppliers, setSuppliers] = useState<any[]>([]);
  const [filter, setFilter] = useState<
    "all" | "pending" | "paid" | "overdue" | "due_soon"
  >("due_soon");
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "last7days" | "last30days" | "lastyear" | "custom"
  >("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [upcomingAlerts, setUpcomingAlerts] = useState<any[]>([]);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState("");
  const [invoiceName, setInvoiceName] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailStartDate, setEmailStartDate] = useState("");
  const [emailEndDate, setEmailEndDate] = useState("");
  const [emailList, setEmailList] = useState("");
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);
  const [editingAutoInvoice, setEditingAutoInvoice] = useState<any>(null);
  const [payment, setPayment] = useState<any[]>([]);
  const [autoFormData, setAutoFormData] = useState({
    invoice_name: "",
    amount: "",
    frequency: "monthly",
    due_date: "",
    notes: "",
    tax_id: "",
  });
  const [formData, setFormData] = useState({
    invoice_number: "",
    invoice_name: "",
    supplier_id: "",
    amount: "",
    tax_id: "",
    amount2: "",
    tax2_id: "",
    invoice_date: "",
    due_date: "",
    notes: "",
    taxCount: "1",
  });
  const { showLoading, hideLoading } = useLoading();

  useEffect(() => {
    fetchInvoices();
    fetchSuppliers();
    fetchUpcomingAlerts();
    fetchName();
    fetchTaxes();
    fetchPayment();
  }, [filter, dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    if (activeTab == "invoices") fetchInvoices();
    if (activeTab === "auto") fetchAutoInvoices();
  }, [activeTab]);

  const fetchInvoices = async () => {
    showLoading("Loading invoices...");
    try {
      const params: any = { type: "general" };
      if (filter === "due_soon") {
        params.status = "pending";
      } else if (filter !== "all") {
        params.status = filter;
      }
      const response = await invoiceAPI.getAllInvoices(params);
      let filteredInvoices = response.data;

      if (filter === "due_soon") {
        const today = new Date();
        const threeDaysLater = new Date();
        threeDaysLater.setDate(today.getDate() + 3);
        filteredInvoices = filteredInvoices.filter((inv: any) => {
          const dueDate = new Date(inv.dueDate);
          return dueDate >= today && dueDate <= threeDaysLater;
        });
      }

      // Apply date filter
      if (dateFilter !== "all") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        filteredInvoices = filteredInvoices.filter((inv: any) => {
          const invoiceDate = new Date(inv.invoiceDate);
          invoiceDate.setHours(0, 0, 0, 0);

          if (dateFilter === "today") {
            return invoiceDate.getTime() === today.getTime();
          } else if (dateFilter === "last7days") {
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 7);
            return invoiceDate >= sevenDaysAgo && invoiceDate <= today;
          } else if (dateFilter === "last30days") {
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);
            return invoiceDate >= thirtyDaysAgo && invoiceDate <= today;
          } else if (dateFilter === "lastyear") {
            const oneYearAgo = new Date(today);
            oneYearAgo.setFullYear(today.getFullYear() - 1);
            return invoiceDate >= oneYearAgo && invoiceDate <= today;
          } else if (
            dateFilter === "custom" &&
            customStartDate &&
            customEndDate
          ) {
            const startDate = new Date(customStartDate);
            const endDate = new Date(customEndDate);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            return invoiceDate >= startDate && invoiceDate <= endDate;
          }
          return true;
        });
      }

      // Sort: due soon at top
      filteredInvoices.sort((a: any, b: any) => {
        const aDays = getDaysUntilDue(a.dueDate);
        const bDays = getDaysUntilDue(b.dueDate);
        if (a.status === "paid" && b.status !== "paid") return 1;
        if (a.status !== "paid" && b.status === "paid") return -1;
        if (aDays <= 3 && bDays > 3) return -1;
        if (aDays > 3 && bDays <= 3) return 1;
        return aDays - bDays;
      });

      setInvoices(filteredInvoices);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load invoices");
    } finally {
      hideLoading();
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await supplierAPI.getSuppliers();
      setSuppliers(response.data);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  const fetchUpcomingAlerts = async () => {
    try {
      const response = await invoiceAPI.getUpcomingAlerts({ type: "general" });
      if (response.data.length > 0) {
        setUpcomingAlerts(response.data);
        setShowAlertModal(true);
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  };
  const fetchName = async () => {
    try {
      const response = await categoriesAPI.getTypeCategories("financial");
      setInvoiceName(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchTaxes = async () => {
    try {
      const response = await taxAPI.getTaxes();
      setTaxes(response.data);
    } catch (error) {
      console.error("Error fetching taxes:", error);
    }
  };

  const fetchAutoInvoices = async () => {
    showLoading("Loading auto invoices...");
    try {
      const response = await invoiceAPI.getAllAutoInvoices();
      setAutoInvoices(response.data);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to load auto invoices",
      );
    } finally {
      hideLoading();
    }
  };
  const fetchPayment=async()=>{
    try {
      const response = await categoriesAPI.getTypeCategories("paymentType")
      setPayment(response.data)
    }catch(err){
      console.error("Error fetching payment types:", err)
    }
  }

  const handleToggleAutoInvoice = async (
    invoiceId: string,
    currentStatus: boolean,
  ) => {
    try {
      await invoiceAPI.updateAutoInvoiceStatus(invoiceId, {
        isDisable: !currentStatus,
      });
      setAutoInvoices((prev) =>
        prev.map((inv) =>
          inv.invoiceId === invoiceId
            ? { ...inv, isDisable: !currentStatus }
            : inv,
        ),
      );
      // fetchAutoInvoices()
      toast.success(`Auto invoice ${!currentStatus ? "disabled" : "enabled"}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const openAutoModal = (invoice?: any) => {
    if (invoice) {
      setEditingAutoInvoice(invoice);
      setAutoFormData({
        invoice_name: invoice.invoiceName,
        amount: (parseFloat(invoice.amount) + parseFloat(invoice.taxAmount || 0)).toString(),
        frequency: invoice.frequency || "monthly",
        due_date: invoice.dueDate || 0,
        notes: invoice.notes || "",
        tax_id: invoice.taxId || "",
      });
    } else {
      setEditingAutoInvoice(null);
      setAutoFormData({
        invoice_name: "",
        amount: "",
        frequency: "monthly",
        due_date: "",
        notes: "",
        tax_id: "",
      });
    }
    setIsAutoModalOpen(true);
  };

  const handleAutoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    showLoading(editingAutoInvoice ? "Updating..." : "Creating...");
    try {
      const totalAmount = parseFloat(autoFormData.amount);
      const selectedTax = taxes.find((t) => t.taxId === autoFormData.tax_id);
      const taxPercent = selectedTax ? parseFloat(selectedTax.taxPercentage) : 0;
      const baseAmount = taxPercent > 0 ? totalAmount / (1 + taxPercent / 100) : totalAmount;
      const taxAmount = totalAmount - baseAmount;

      const data = {
        ...autoFormData,
        amount: parseFloat(baseAmount.toFixed(3)),
        due_date: parseInt(autoFormData.due_date),
        tax_id: autoFormData.tax_id || null,
        tax_percent: taxPercent || null,
        tax_amount: taxPercent > 0 ? parseFloat(taxAmount.toFixed(3)) : null,
      };
      if (editingAutoInvoice) {
        await invoiceAPI.updateAutoInvoiceDetail(editingAutoInvoice.invoiceId, {
          ...data,
          invoiceType: "general",
        });
        toast.success("Auto invoice updated");
      } else {
        await invoiceAPI.createAutoInvoice({ ...data, invoiceType: "general" });
        toast.success("Auto invoice created");
      }
      setIsAutoModalOpen(false);
      fetchAutoInvoices();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save");
    } finally {
      hideLoading();
    }
  };

  const handleDeleteAutoInvoice = async (invoiceId: string) => {
    if (!window.confirm("Delete this auto invoice?")) return;
    showLoading("Deleting...");
    try {
      await invoiceAPI.deleteAutoInvoice(invoiceId);
      toast.success("Auto invoice deleted");
      fetchAutoInvoices();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete");
    } finally {
      hideLoading();
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    showLoading(editingInvoice ? "Updating invoice..." : "Creating invoice...");
    try {
      const calc = (amt: string, taxId: string) => {
        const total = parseFloat(amt);
        const pct = parseFloat(taxes.find((t) => t.taxId === taxId)?.taxPercentage) || 0;
        const base = pct > 0 ? total / (1 + pct / 100) : total;
        return { base: parseFloat(base.toFixed(3)), taxPct: pct, taxAmt: pct > 0 ? parseFloat((total - base).toFixed(3)) : null };
      };
      const t1 = calc(formData.amount, formData.tax_id);
      const t2 = formData.taxCount === '2' && formData.amount2 ? calc(formData.amount2, formData.tax2_id) : null;
      const data = {
        ...formData,
        amount: parseFloat((t1.base + (t2 ? t2.base : 0)).toFixed(3)),
        tax_id: formData.tax_id || null,
        tax_percent: t1.taxPct || null,
        tax_amount: t1.taxAmt,
        tax2_id: t2 ? (formData.tax2_id || null) : null,
        tax2_percent: t2 ? (t2.taxPct || null) : null,
        tax2_amount: t2 ? t2.taxAmt : null,
        type: "general",
      };
      if (editingInvoice) {
        await invoiceAPI.updateInvoice(editingInvoice.invoiceId, data);
        toast.success("Invoice updated successfully");
      } else {
        await invoiceAPI.createInvoice(data);
        toast.success("Invoice created successfully");
      }
      fetchInvoices();
      closeModal();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save invoice");
    } finally {
      hideLoading();
    }
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setPaymentMode("");
    setShowPaymentModal(true);
  };

  const submitPayment = async () => {
    if (!paymentMode) {
      toast.error("Please select payment mode");
      return;
    }
    showLoading("Updating status...");
    try {
      await invoiceAPI.markAsPaid(selectedInvoiceId, {
        payment_mode: paymentMode,
      });
      toast.success("Invoice marked as paid");
      setShowPaymentModal(false);
      fetchInvoices();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
    } finally {
      hideLoading();
    }
  };

  const handleDelete = async (invoiceId: string) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      showLoading("Deleting invoice...");
      try {
        await invoiceAPI.deleteInvoice(invoiceId);
        toast.success("Invoice deleted successfully");
        fetchInvoices();
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || "Failed to delete invoice",
        );
      } finally {
        hideLoading();
      }
    }
  };

  const openModal = (invoice?: any) => {
    if (invoice) {
      setEditingInvoice(invoice);
      const hasTwo = !!(invoice.tax2Id || invoice.tax2Amount);
      const t2Pct = parseFloat(invoice.tax2Percent || 0);
      const t2TaxAmt = parseFloat(invoice.tax2Amount || 0);
      const t2Base = t2Pct > 0 ? t2TaxAmt / (t2Pct / 100) : 0;
      const t2Total = hasTwo && t2Pct > 0 ? (t2Base + t2TaxAmt).toFixed(3) : '';
      const t1Pct = parseFloat(invoice.taxPercent || 0);
      const t1Base = t1Pct > 0 ? parseFloat(invoice.taxAmount || 0) / (t1Pct / 100) : parseFloat(invoice.amount || 0) - (hasTwo ? t2Base : 0);
      const t1Total = (t1Base + parseFloat(invoice.taxAmount || 0)).toFixed(3);
      setFormData({
        invoice_number: invoice.invoiceNumber?.startsWith('DRAFT-') ? '' : invoice.invoiceNumber,
        invoice_name: invoice.invoiceName,
        supplier_id: invoice.supplierId || "",
        amount: t1Total,
        tax_id: invoice.taxId || "",
        amount2: t2Total,
        tax2_id: invoice.tax2Id || '',
        invoice_date: new Date(invoice.invoiceDate).toISOString().split("T")[0],
        due_date: new Date(invoice.dueDate).toISOString().split("T")[0],
        notes: invoice.notes || "",
        taxCount: hasTwo ? '2' : '1',
      });
    } else {
      setEditingInvoice(null);
      setFormData({
        invoice_number: "",
        invoice_name: "",
        supplier_id: "",
        amount: "",
        tax_id: "",
        amount2: "",
        tax2_id: "",
        invoice_date: "",
        due_date: "",
        notes: "",
        taxCount: "1",
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

  const getStatusBadge = (invoice: any) => {
    const daysUntilDue = getDaysUntilDue(invoice.dueDate);

    if (invoice.status === "paid") {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
          Paid
        </span>
      );
    } else if (daysUntilDue < 0) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
          Overdue
        </span>
      );
    } else if (daysUntilDue <= 3) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700">
          Due
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
          Pending
        </span>
      );
    }
  };

  const downloadCSV = () => {
    if (invoices.length === 0) {
      toast.error('No data to download');
      return;
    }
    const data = invoices.map(invoice => ({
      'Invoice Number': invoice.invoiceNumber,
      'Invoice Name': invoice.invoiceName,
      'Amount': parseFloat(invoice.amount).toFixed(2),
      'Tax': invoice.taxAmount ? parseFloat(invoice.taxAmount).toFixed(2) : '0.00',
      'Total Amount': (parseFloat(invoice.amount) + parseFloat(invoice.taxAmount || 0)).toFixed(2),
      'Invoice Date': new Date(invoice.invoiceDate).toLocaleDateString(),
      'Due Date': new Date(invoice.dueDate).toLocaleDateString(),
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
    a.download = `office-payment-tracker-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV downloaded successfully');
  };

  const handleSendEmail = async () => {
    if (!emailStartDate || !emailEndDate) {
      toast.error("Please select date range");
      return;
    }
    if (!emailList.trim()) {
      toast.error("Please enter email addresses");
      return;
    }
    showLoading("Sending email...");
    try {
      await invoiceAPI.sendInvoiceEmail({
        emails: emailList,
        start_date: emailStartDate,
        end_date: emailEndDate,
        type: "general",
      });
      toast.success("Email sent successfully");
      setShowEmailModal(false);
      setEmailList("");
      setEmailStartDate("");
      setEmailEndDate("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send email");
    } finally {
      hideLoading();
    }
  };

  return (
    <div className="">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          In Office Payment Tracker
        </h1>
        <div className="flex gap-2">
          {activeTab === "invoices" && (
            <>
              <button
                onClick={downloadCSV}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Download size={20} />
                Download CSV
              </button>
              <button
                onClick={() => setShowEmailModal(true)}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Mail size={20} />
                Send Email
              </button>
              <button
                onClick={() => openModal()}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                Add Invoice
              </button>
            </>
          )}
          {activeTab === "auto" && (
            <button
              onClick={() => openAutoModal()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              Add Auto Invoice
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("invoices")}
          className={`px-5 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${activeTab === "invoices" ? "bg-blue-500 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}
        >
          <Filter size={16} /> Invoices
        </button>
        <button
          onClick={() => setActiveTab("auto")}
          className={`px-5 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${activeTab === "auto" ? "bg-blue-500 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}
        >
          <RefreshCw size={16} /> Auto Invoices
        </button>
      </div>

      {/* Filters */}
      {activeTab === "invoices" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-gray-500" />
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg transition-colors ${filter === "all" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700"}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("due_soon")}
              className={`px-4 py-2 rounded-lg transition-colors ${filter === "due_soon" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-700"}`}
            >
              Due Soon
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`px-4 py-2 rounded-lg transition-colors ${filter === "pending" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700"}`}
            >
              To Be Paid
            </button>
            <button
              onClick={() => setFilter("paid")}
              className={`px-4 py-2 rounded-lg transition-colors ${filter === "paid" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-700"}`}
            >
              Paid
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              Date Range:
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="lastyear">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
            {dateFilter === "custom" && (
              <>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Start Date"
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="End Date"
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Invoices Table */}
      {activeTab === "invoices" && (
        <>
          {invoices.length > 0 && (() => {
            const totalAmount = invoices.reduce((s, inv) => s + parseFloat(inv.amount || 0), 0);
            const totalTax = invoices.reduce((s, inv) => s + parseFloat(inv.taxAmount || 0), 0);
            const totalInclusive = totalAmount + totalTax;
            const taxGroups: Record<string, { amount: number; tax: number; total: number }> = {};
            invoices.forEach(inv => {
              if (inv.taxPercent) {
                const pct = parseFloat(inv.taxPercent).toFixed(0) + '%';
                if (!taxGroups[pct]) taxGroups[pct] = { amount: 0, tax: 0, total: 0 };
                taxGroups[pct].amount += parseFloat(inv.amount || 0);
                taxGroups[pct].tax += parseFloat(inv.taxAmount || 0);
                taxGroups[pct].total += parseFloat(inv.amount || 0) + parseFloat(inv.taxAmount || 0);
              }
            });
            return (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                <div className="flex flex-wrap gap-6 items-center">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 uppercase">Total Amount</span>
                    <span className="text-base font-bold text-gray-900">€{totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="w-px h-8 bg-gray-200" />
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 uppercase">Total Tax</span>
                    <span className="text-base font-bold text-orange-600">€{totalTax.toFixed(2)}</span>
                  </div>
                  <div className="w-px h-8 bg-gray-200" />
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 uppercase">Total (incl. Tax)</span>
                    <span className="text-base font-bold text-blue-700">€{totalInclusive.toFixed(2)}</span>
                  </div>
                  {Object.keys(taxGroups).length > 0 && <div className="w-px h-8 bg-gray-200" />}
                  {Object.entries(taxGroups).sort(([a], [b]) => parseFloat(a) - parseFloat(b)).map(([pct, vals]) => (
                    <div key={pct} className="flex flex-col bg-gray-50 rounded-lg px-3 py-1">
                      <span className="text-xs text-gray-500 uppercase">Tax {pct} Group</span>
                      <span className="text-sm text-gray-800">Total: €{vals.total.toFixed(2)}</span>
                      <span className="text-xs text-gray-500">Base: €{vals.amount.toFixed(2)} · Tax: <span className="font-bold text-orange-600 text-base bg-orange-50 px-1 rounded">€{vals.tax.toFixed(2)}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tax
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Invoice Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Paid Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Payment Mode
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.invoiceId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {invoice.invoiceNumber?.startsWith('DRAFT-') ? <span className="text-gray-400 italic">-</span> : invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {invoice.invoiceName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      €{parseFloat(invoice.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-orange-600">
                      {invoice.taxAmount ? `€${parseFloat(invoice.taxAmount).toFixed(2)}` : "-"}
                      {invoice.taxPercent ? <span className="block text-xs text-gray-400">{parseFloat(invoice.taxPercent).toFixed(0)}%</span> : null}
                      {invoice.tax2Amount ? <span className="block text-xs text-orange-400">+€{parseFloat(invoice.tax2Amount).toFixed(2)} ({parseFloat(invoice.tax2Percent).toFixed(0)}%)</span> : null}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      €{(parseFloat(invoice.amount) + parseFloat(invoice.taxAmount || 0) + parseFloat(invoice.tax2Amount || 0)).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(invoice.invoiceDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(invoice)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {invoice.paidDate
                        ? new Date(invoice.paidDate).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {invoice.paymentMode || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex justify-end gap-2">
                        {invoice.status === "pending" && (
                          <button
                            onClick={() => handleMarkAsPaid(invoice.invoiceId)}
                            className="text-green-600 hover:text-green-800"
                            title="Mark as Paid"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => openModal(invoice)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(invoice.invoiceId)}
                          className="text-red-600 hover:text-red-800"
                        >
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
        </>
      )}

      {/* Auto Invoices Tab */}
      {activeTab === "auto" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tax
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Frequency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Next Due
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {autoInvoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      <RefreshCw className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No auto invoices found</p>
                    </td>
                  </tr>
                ) : (
                  autoInvoices.map((inv: any) => (
                    <tr
                      key={inv.invoiceId}
                      className={`hover:bg-gray-50 ${inv.isDisable ? "opacity-50" : ""}`}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {inv.invoiceName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        €{parseFloat(inv.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-orange-600">
                        {inv.taxAmount ? `€${parseFloat(inv.taxAmount).toFixed(2)}` : "-"}
                        {inv.taxPercent ? <span className="block text-xs text-gray-400">{parseFloat(inv.taxPercent).toFixed(0)}%</span> : null}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        €{(parseFloat(inv.amount) + parseFloat(inv.taxAmount || 0)).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                        {inv.frequency}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {inv.dueDate ? inv.dueDate + " days" : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {inv.notes || "-"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() =>
                            handleToggleAutoInvoice(
                              inv.invoiceId,
                              inv.isDisable,
                            )
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                            inv.isDisable ? "bg-gray-300" : "bg-green-500"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                              inv.isDisable ? "translate-x-1" : "translate-x-6"
                            }`}
                          />
                        </button>
                        <p
                          className={`text-xs mt-1 font-medium ${inv.isDisable ? "text-gray-400" : "text-green-600"}`}
                        >
                          {inv.isDisable ? "Disabled" : "Active"}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openAutoModal(inv)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteAutoInvoice(inv.invoiceId)
                            }
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Auto Invoice Modal */}
      {isAutoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingAutoInvoice ? "Edit Auto Invoice" : "Add Auto Invoice"}
              </h2>
              <button
                onClick={() => setIsAutoModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAutoSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Name *
                  </label>
                  <select
                    required
                    value={autoFormData.invoice_name}
                    onChange={(e) =>
                      setAutoFormData({
                        ...autoFormData,
                        invoice_name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Name</option>
                    {invoiceName.map((name) => (
                      <option key={name.typeId} value={name.typeName}>
                        {name.typeName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (incl. tax) *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    required
                    value={autoFormData.amount}
                    onChange={(e) =>
                      setAutoFormData({
                        ...autoFormData,
                        amount: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax *
                  </label>
                  <select
                    required
                    value={autoFormData.tax_id}
                    onChange={(e) => setAutoFormData({ ...autoFormData, tax_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Tax</option>
                    {taxes.map((tax) => (
                      <option key={tax.taxId} value={tax.taxId}>
                        {tax.tax_name} ({tax.taxPercentage}%)
                      </option>
                    ))}
                  </select>
                  {autoFormData.tax_id && autoFormData.amount && (() => {
                    const total = parseFloat(autoFormData.amount);
                    const taxPct = parseFloat(taxes.find(t => t.taxId === autoFormData.tax_id)?.taxPercentage || 0);
                    if (!taxPct) return null;
                    const base = total / (1 + taxPct / 100);
                    const tax = total - base;
                    return <p className="text-xs text-gray-500 mt-1">Base: €{base.toFixed(3)} + Tax: €{tax.toFixed(3)}</p>;
                  })()}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency *
                  </label>
                  <select
                    required
                    value={autoFormData.frequency}
                    onChange={(e) =>
                      setAutoFormData({
                        ...autoFormData,
                        frequency: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due days *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={autoFormData.due_date}
                    onChange={(e) =>
                      setAutoFormData({
                        ...autoFormData,
                        due_date: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={autoFormData.notes}
                  onChange={(e) =>
                    setAutoFormData({ ...autoFormData, notes: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsAutoModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  {editingAutoInvoice ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingInvoice ? "Edit Invoice" : "Add Invoice"}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.invoice_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        invoice_number: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Name *
                  </label>
                  <select
                    required
                    value={formData.invoice_name}
                    onChange={(e) =>
                      setFormData({ ...formData, invoice_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Invoice Name</option>
                    {invoiceName.map((name) => (
                      <option key={name.typeId} value={name.typeName}>
                        {name.typeName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Count *</label>
                  <select value={formData.taxCount} onChange={(e) => setFormData({ ...formData, taxCount: e.target.value, amount2: '', tax2_id: '' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="1">1 Tax</option>
                    <option value="2">2 Tax</option>
                  </select>
                </div>
                {/* Tax 1 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount 1 (incl. tax) *</label>
                  <input type="number" step="0.001" min="0" required value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax 1 *</label>
                  <select required value={formData.tax_id} onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Select Tax</option>
                    {taxes.map((tax) => (
                      <option key={tax.taxId} value={tax.taxId}>{tax.tax_name} ({tax.taxPercentage}%)</option>
                    ))}
                  </select>
                  {formData.tax_id && formData.amount && (() => {
                    const total = parseFloat(formData.amount);
                    const taxPct = parseFloat(taxes.find((t: any) => t.taxId === formData.tax_id)?.taxPercentage || 0);
                    if (!taxPct) return null;
                    const base = total / (1 + taxPct / 100);
                    return <p className="text-xs text-gray-500 mt-1">Base: €{base.toFixed(3)} + Tax: €{(total-base).toFixed(3)}</p>;
                  })()}
                </div>
                {/* Tax 2 */}
                {formData.taxCount === '2' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount 2 (incl. tax) *</label>
                      <input type="number" step="0.001" min="0" required value={formData.amount2} onChange={(e) => setFormData({ ...formData, amount2: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tax 2 *</label>
                      <select required value={formData.tax2_id} onChange={(e) => setFormData({ ...formData, tax2_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="">Select Tax</option>
                        {taxes.map((tax) => (
                          <option key={tax.taxId} value={tax.taxId}>{tax.tax_name} ({tax.taxPercentage}%)</option>
                        ))}
                      </select>
                      {formData.tax2_id && formData.amount2 && (() => {
                        const total = parseFloat(formData.amount2);
                        const taxPct = parseFloat(taxes.find((t: any) => t.taxId === formData.tax2_id)?.taxPercentage || 0);
                        if (!taxPct) return null;
                        const base = total / (1 + taxPct / 100);
                        return <p className="text-xs text-gray-500 mt-1">Base: €{base.toFixed(3)} + Tax: €{(total-base).toFixed(3)}</p>;
                      })()}
                    </div>
                  </>
                )}
                {/* Summary preview */}
                {formData.amount && (() => {
                  const calc = (amt: string, taxId: string) => {
                    const total = parseFloat(amt) || 0;
                    const pct = parseFloat(taxes.find((t: any) => t.taxId === taxId)?.taxPercentage) || 0;
                    const base = pct > 0 ? total / (1 + pct / 100) : total;
                    return { base, tax: total - base, pct };
                  };
                  const t1 = calc(formData.amount, formData.tax_id);
                  const t2 = formData.taxCount === '2' && formData.amount2 ? calc(formData.amount2, formData.tax2_id) : null;
                  const grandTotal = t1.base + t1.tax + (t2 ? t2.base + t2.tax : 0);
                  return (
                    <div className="col-span-2 bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                      <div className="flex justify-between text-gray-600"><span>Base 1</span><span>€{t1.base.toFixed(3)}</span></div>
                      {t1.pct > 0 && <div className="flex justify-between text-orange-500"><span>Tax {t1.pct}%</span><span>€{t1.tax.toFixed(3)}</span></div>}
                      {t2 && <div className="flex justify-between text-gray-600"><span>Base 2</span><span>€{t2.base.toFixed(3)}</span></div>}
                      {t2 && t2.pct > 0 && <div className="flex justify-between text-orange-500"><span>Tax {t2.pct}%</span><span>€{t2.tax.toFixed(3)}</span></div>}
                      <div className="flex justify-between font-bold text-gray-900 border-t pt-1"><span>Grand Total</span><span>€{grandTotal.toFixed(3)}</span></div>
                    </div>
                  );
                })()}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.invoice_date}
                    onChange={(e) =>
                      setFormData({ ...formData, invoice_date: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.due_date}
                    onChange={(e) =>
                      setFormData({ ...formData, due_date: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  {editingInvoice ? "Update" : "Create"}
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
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Mode *
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Payment Mode</option>
                          {payment.map((p) => (
                    <option key={p.typeId} value={p.typeName}>{p.typeName}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitPayment}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
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
              <h2 className="text-xl font-bold text-gray-900">
                Payment Alerts
              </h2>
            </div>
            <p className="text-gray-600 mb-4">
              The following invoices are due within 3 days:
            </p>
            <div className="space-y-3 mb-6">
              {upcomingAlerts.map((invoice) => (
                <div
                  key={invoice.invoiceId}
                  className="bg-orange-50 border border-orange-200 rounded-lg p-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {invoice.invoiceName}
                      </p>
                      <p className="text-sm text-gray-600">
                        Invoice: {invoice.invoiceNumber}
                      </p>
                      <p className="text-sm text-gray-600">
                        Amount: €{parseFloat(invoice.amount).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-orange-600">
                        <Clock size={14} className="inline mr-1" />
                        {getDaysUntilDue(invoice.dueDate)} days
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowAlertModal(false)}
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
            >
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
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={emailStartDate}
                  onChange={(e) => setEmailStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  value={emailEndDate}
                  onChange={(e) => setEmailEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Addresses * (comma separated)
                </label>
                <textarea
                  value={emailList}
                  onChange={(e) => setEmailList(e.target.value)}
                  rows={3}
                  placeholder="email1@example.com, email2@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
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

export default PaymentTrackerOffice;
