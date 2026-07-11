/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/immutability */
import React, { useState, useEffect, useMemo } from "react";
import { ArrowDownCircle, Printer, X, Trash2, ShoppingCart, AlertTriangle } from "lucide-react";
import { itemAPI, productAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "../context/LocationContext";
import { useLoading } from "../context/LoadingContext";
import { toast } from "react-toastify";
import { calcPricing, isPriceChanged } from "../utils/pricing";
import FinalizeCheckinModal from "../components/FinalizeCheckinModal";
import ItemSearchAutocomplete, { SearchableItem } from "../components/ItemSearchAutocomplete";

interface ItemMaster {
  itemId: string;
  itemCode: string;
  itemName: string;
  purchasePrice: number;
  taxPercent: number;
  totalAmount: number;
  currentQty: number;
  packQty: number;
  quantityType: string;
  defaultIncrease: number;
  barcode?: string;
  tax?: { taxPercentage: number };
}

interface ScannedItem extends ItemMaster {
  quantity: number;
  rate: number;          // editable purchase price
  originalRate: number;  // locked at scan time
  applyNewPrice: boolean;
  notes: string;
}

const CheckIn: React.FC = () => {
  const [allItems, setAllItems] = useState<ItemMaster[]>([]);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [showBill, setShowBill] = useState(false);
  const [billData, setBillData] = useState<any>(null);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [todayStats, setTodayStats] = useState({ checkInCount: 0, checkOutCount: 0 });

  useAuth();
  useLocation();
  // showLoading/hideLoading kept for future use
  const { showLoading: _sl, hideLoading: _hl } = useLoading();

  useEffect(() => { fetchTodayStats(); fetchAllItems(); }, []);

  const fetchAllItems = async () => {
    try {
      const res = await itemAPI.getItems();
      setAllItems(res.data);
    } catch { /* silent */ }
  };

  const fetchTodayStats = async () => {
    try {
      const res = await productAPI.getTodayStats();
      setTodayStats(res.data);
    } catch { /* silent */ }
  };

  const handleSelectItem = (item: ItemMaster | SearchableItem) => {
    addItemToBatch(item);
    toast.success("Item added");
  };

  const addItemToBatch = (item: ItemMaster) => {
    const existing = scannedItems.find(i => i.itemId === item.itemId);
    const rate = Number(item.purchasePrice);
    const taxPct = Number(item.tax?.taxPercentage ?? item.taxPercent ?? 0);
    if (existing) {
      setScannedItems(prev => prev.map(i =>
        i.itemId === item.itemId
          ? { ...i, quantity: i.quantity + Number(item.defaultIncrease || 1) }
          : i
      ));
    } else {
      setScannedItems(prev => [...prev, {
        ...item,
        quantity: Number(item.defaultIncrease || 1),
        rate,
        originalRate: rate,
        taxPercent: taxPct,
        applyNewPrice: true,
        notes: "",
      }]);
    }
  };

  const updateItem = (itemId: string, patch: Partial<ScannedItem>) => {
    setScannedItems(prev => prev.map(i => i.itemId === itemId ? { ...i, ...patch } : i));
  };

  const removeItem = (itemId: string) => setScannedItems(prev => prev.filter(i => i.itemId !== itemId));

  const grandTotal = useMemo(() =>
    scannedItems.reduce((sum, item) => {
      const { totalPrice } = calcPricing(item.rate, item.taxPercent);
      return sum + totalPrice * item.quantity;
    }, 0),
    [scannedItems]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (scannedItems.length === 0) { toast.error("Please add items first"); return; }
    const invalid = scannedItems.find(i => i.rate <= 0);
    if (invalid) { toast.error(`Rate must be > 0 for "${invalid.itemName}"`); return; }
    setShowFinalizeModal(true);
  };

  const handleFinalizeSuccess = () => {
    setShowFinalizeModal(false);
    setScannedItems([]);
    fetchTodayStats();
    fetchAllItems();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ArrowDownCircle className="text-green-500" size={32} /> Check-In
        </h1>
        <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-200">
          <p className="text-xs text-green-600">Today's Check-In</p>
          <p className="text-xl font-bold text-green-700">{todayStats.checkInCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Scan / Search Item</h2>
          <ItemSearchAutocomplete items={allItems} onSelect={handleSelectItem} color="green" />
          <p className="mt-2 text-xs text-gray-400">Scan a barcode, or type an item code / name and pick from the list.</p>

          {/* Grand total summary */}
          {scannedItems.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Items</span><span>{scannedItems.length}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal (excl. tax)</span>
                <span>€{scannedItems.reduce((s, i) => s + i.rate * i.quantity, 0).toFixed(3)}</span>
              </div>
              {/* Tax groups */}
              {(() => {
                const groups: Record<number, number> = {};
                scannedItems.forEach(i => {
                  const { taxAmount } = calcPricing(i.rate, i.taxPercent);
                  const pct = i.taxPercent;
                  groups[pct] = (groups[pct] || 0) + taxAmount * i.quantity;
                });
                return Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b)).map(([pct, amt]) => (
                  <div key={pct} className="flex justify-between text-xs text-orange-500 pl-2">
                    <span>Tax {pct}%</span>
                    <span>€{amt.toFixed(3)}</span>
                  </div>
                ));
              })()}
              <div className="flex justify-between text-sm text-orange-600 font-medium">
                <span>Total Tax</span>
                <span>€{scannedItems.reduce((s, i) => {
                  const { taxAmount } = calcPricing(i.rate, i.taxPercent);
                  return s + taxAmount * i.quantity;
                }, 0).toFixed(3)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 border-t pt-2">
                <span>Grand Total</span><span>€{grandTotal.toFixed(3)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Items list */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Items ({scannedItems.length})</h2>
            {scannedItems.length > 0 && (
              <button onClick={() => setScannedItems([])} className="text-red-600 hover:text-red-800 text-sm">
                Clear All
              </button>
            )}
          </div>

          {scannedItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No items added yet</p>
              <p className="text-sm">Scan or search to add items</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {scannedItems.map(item => {
                const { taxAmount, totalPrice } = calcPricing(item.rate, item.taxPercent);
                const priceModified = isPriceChanged(item.originalRate, item.rate);

                return (
                  <div key={item.itemId} className={`border rounded-xl p-4 ${priceModified ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}>
                    {/* Item header */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{item.itemName}</h3>
                        <p className="text-sm text-gray-500">{item.itemCode}</p>
                        <p className="text-xs text-gray-400">Stock: <span className="text-xl font-bold text-red-500">{item.currentQty} unit</span></p>
                      </div>
                      <button onClick={() => removeItem(item.itemId)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/* Price-changed warning */}
                    {priceModified && (
                      <div className="flex items-center gap-2 text-amber-700 bg-amber-100 rounded-lg px-3 py-2 mb-3 text-xs">
                        <AlertTriangle size={14} />
                        <span>Price modified from original €{item.originalRate.toFixed(3)}</span>
                        <label className="ml-auto flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.applyNewPrice}
                            onChange={e => updateItem(item.itemId, { applyNewPrice: e.target.checked })}
                            disabled
                            className="accent-amber-600"

                          />
                          Apply to item master
                        </label>
                      </div>
                    )}

                    {/* Quantity + Rate row */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">
                          Qty (pack) &nbsp;
                          <span className="text-gray-400">
                            {item.quantity} × {item.packQty} = {(item.quantity * item.packQty).toFixed(3)} {item.quantityType}
                          </span>
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => updateItem(item.itemId, { quantity: Number(e.target.value) })}
                          min="0.001" step="0.001"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Rate (€) *</label>
                        <input
                          type="number"
                          value={item.rate}
                          onChange={e => updateItem(item.itemId, { rate: Number(e.target.value) })}
                          min="0.001" step="0.001"
                          className={`w-full px-2 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-green-400 ${
                            priceModified ? 'border-amber-400 bg-white font-semibold' : 'border-gray-300'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Pricing breakdown */}
                    <div className="bg-white rounded-lg border border-gray-100 px-3 py-2 grid grid-cols-4 gap-2 text-xs text-center">
                      <div>
                        <p className="text-gray-400">Base Price</p>
                        <p className="font-semibold text-gray-800">€{item.rate.toFixed(3)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Tax %</p>
                        <p className="font-semibold text-gray-800">{item.taxPercent}%</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Tax Amt</p>
                        <p className="font-semibold text-orange-600">€{taxAmount.toFixed(3)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Unit Total</p>
                        <p className="font-bold text-green-700">€{totalPrice.toFixed(3)}</p>
                      </div>
                    </div>

                    {/* Line total */}
                    <div className="flex justify-between items-center mt-2 text-sm">
                      <span className="text-gray-500">Line Total ({item.quantity} × €{totalPrice.toFixed(3)})</span>
                      <span className="font-bold text-gray-900">€{(totalPrice * item.quantity).toFixed(3)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {scannedItems.length > 0 && (
            <button
              onClick={handleSubmit}
              className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              Submit Check-In ({scannedItems.length} items) — €{grandTotal.toFixed(3)}
            </button>
          )}
        </div>
      </div>

      {/* Finalize Check-In Modal */}
      {showFinalizeModal && (
        <FinalizeCheckinModal
          scannedItems={scannedItems}
          onSuccess={handleFinalizeSuccess}
          onCancel={() => setShowFinalizeModal(false)}
        />
      )}

      {/* Bill modal */}
      {showBill && billData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Check-In Bill</h2>
              <button onClick={() => { setShowBill(false); setBillData(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="inline-block px-4 py-1.5 rounded-lg font-semibold bg-green-100 text-green-700 mb-4">CHECK-IN</div>

            <div className="space-y-2 mb-4">
              {billData.items?.map((item: any, idx: number) => {
                const { taxAmount, totalPrice } = calcPricing(Number(item.price), Number(item.taxPercent || 0));
                return (
                  <div key={idx} className="text-sm border-b pb-2">
                    <div className="flex justify-between font-medium">
                      <span>{item.itemName} ×{item.quantity}</span>
                      <span>€{(totalPrice * Number(item.quantity)).toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400 text-xs mt-0.5">
                      <span>€{Number(item.price).toFixed(3)} + {item.taxPercent ?? 0}% tax (€{taxAmount.toFixed(3)})</span>
                      {item.priceChanged && (
                        <span className="text-amber-600 font-medium">price updated</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between font-bold text-base">
                <span>Total</span><span>€{billData.totalAmount.toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-gray-500"><span>Location</span><span>{billData.location}</span></div>
              <div className="flex justify-between text-gray-500"><span>User</span><span>{billData.user}</span></div>
              <div className="flex justify-between text-gray-500"><span>Date</span><span>{billData.timestamp}</span></div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => window.print()} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center gap-2">
                <Printer size={18} /> Print
              </button>
              <button onClick={() => { setShowBill(false); setBillData(null); }} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckIn;
