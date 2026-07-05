import React, { useState, useEffect, useMemo } from 'react';
import { X, FileText, AlertCircle } from 'lucide-react';
import { invoiceAPI, supplierAPI } from '../services/api';
import { calcPricing } from '../utils/pricing';
import { toast } from 'react-toastify';

interface ScannedItem {
  itemId: string;
  itemName: string;
  itemCode: string;
  quantity: number;
  rate: number;
  taxPercent: number;
  applyNewPrice: boolean;
  quantityType: string;
  notes: string;
}

interface Supplier {
  supplierId: string;
  supplierName: string;
}

interface Props {
  scannedItems: ScannedItem[];
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormState {
  invoiceNumber: string;
  supplierId: string;
  invoiceDate: string;
}

interface FormErrors {
  invoiceNumber?: string;
  supplierId?: string;
  invoiceDate?: string;
}

const FinalizeCheckinModal: React.FC<Props> = ({ scannedItems, onSuccess, onCancel }) => {
  const [form, setForm] = useState<FormState>({
    invoiceNumber: '',
    supplierId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supplierAPI.getSuppliers().then(r => setSuppliers(r.data)).catch(() => {});
  }, []);

  const totals = useMemo(() => {
    let totalQty = 0, totalAmount = 0, totalTax = 0;
    const taxGroups: Record<number, number> = {};
    scannedItems.forEach(item => {
      const { taxAmount, totalPrice } = calcPricing(item.rate, item.taxPercent);
      totalQty += item.quantity;
      totalAmount += item.rate * item.quantity;
      const itemTax = taxAmount * item.quantity;
      totalTax += itemTax;
      void totalPrice;
      if (item.taxPercent > 0) {
        taxGroups[item.taxPercent] = (taxGroups[item.taxPercent] || 0) + itemTax;
      }
    });
    return {
      totalQty: parseFloat(totalQty.toFixed(3)),
      totalAmount: parseFloat(totalAmount.toFixed(3)),
      totalTax: parseFloat(totalTax.toFixed(3)),
      grandTotal: parseFloat((totalAmount + totalTax).toFixed(3)),
      taxGroups,
    };
  }, [scannedItems]);

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.invoiceNumber.trim()) e.invoiceNumber = 'Invoice number is required';
    if (!form.supplierId) e.supplierId = 'Supplier is required';
    if (!form.invoiceDate) e.invoiceDate = 'Invoice date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await invoiceAPI.finalizeCheckin({
        invoice_number: form.invoiceNumber.trim(),
        supplier_id: form.supplierId,
        invoice_date: form.invoiceDate,
        items: scannedItems.map(i => ({
          item_id: i.itemId,
          quantity: i.quantity,
          rate: i.rate,
          tax_percent: i.taxPercent,
          applyNewPrice: i.applyNewPrice,
          quantityType: i.quantityType,
          notes: i.notes,
        })),
      });
      toast.success(`Check-in finalized — Invoice ${form.invoiceNumber}`);
      onSuccess();
    } catch (err: any) {
      toast.error("Failed to check in");
    } finally {
      setSubmitting(false);
    }
  };

  const field = (label: string, error?: string, children: React.ReactNode = null) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="text-green-600" size={22} />
            <h2 className="text-xl font-bold text-gray-900">Finalize Check-In</h2>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Invoice Number */}
          {field('Invoice Number *', errors.invoiceNumber,
            <input
              type="text"
              value={form.invoiceNumber}
              onChange={e => { setForm(p => ({ ...p, invoiceNumber: e.target.value })); setErrors(p => ({ ...p, invoiceNumber: undefined })); }}
              placeholder="e.g. INV-2024-001"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 ${errors.invoiceNumber ? 'border-red-400' : 'border-gray-300'}`}
            />
          )}

          {/* Supplier */}
          {field('Supplier *', errors.supplierId,
            <select
              value={form.supplierId}
              onChange={e => { setForm(p => ({ ...p, supplierId: e.target.value })); setErrors(p => ({ ...p, supplierId: undefined })); }}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 ${errors.supplierId ? 'border-red-400' : 'border-gray-300'}`}
            >
              <option value="">Select supplier...</option>
              {suppliers.map(s => (
                <option key={s.supplierId} value={s.supplierId}>{s.supplierName}</option>
              ))}
            </select>
          )}

          {/* Invoice Date */}
          {field('Invoice Date *', errors.invoiceDate,
            <input
              type="date"
              value={form.invoiceDate}
              onChange={e => { setForm(p => ({ ...p, invoiceDate: e.target.value })); setErrors(p => ({ ...p, invoiceDate: undefined })); }}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 ${errors.invoiceDate ? 'border-red-400' : 'border-gray-300'}`}
            />
          )}

          {/* Items summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
            <p className="font-semibold text-gray-700 mb-2">Summary ({scannedItems.length} items)</p>
            <div className="max-h-32 overflow-y-auto space-y-1 mb-2">
              {scannedItems.map(i => (
                <div key={i.itemId} className="flex justify-between text-xs text-gray-600">
                  <span>{i.itemName} × {i.quantity}</span>
                  <span>€{(calcPricing(i.rate, i.taxPercent).totalPrice * i.quantity).toFixed(3)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 space-y-1">
              <div className="flex justify-between text-gray-600"><span>Total Qty</span><span>{totals.totalQty}</span></div>
              <div className="flex justify-between text-gray-600"><span>Amount (excl. tax)</span><span>€{totals.totalAmount.toFixed(3)}</span></div>
              {Object.entries(totals.taxGroups).sort(([a],[b]) => parseFloat(a)-parseFloat(b)).map(([pct, amt]) => (
                <div key={pct} className="flex justify-between text-orange-500 text-xs"><span>Tax {pct}%</span><span>€{(amt as number).toFixed(3)}</span></div>
              ))}
              <div className="flex justify-between text-orange-600 font-medium"><span>Total Tax</span><span>€{totals.totalTax.toFixed(3)}</span></div>
              <div className="flex justify-between font-bold text-gray-900 text-base border-t pt-1"><span>Grand Total</span><span>€{totals.grandTotal.toFixed(3)}</span></div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Confirm Check-In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FinalizeCheckinModal;
