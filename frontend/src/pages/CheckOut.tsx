import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ArrowUpCircle, Printer, X, Trash2, ShoppingCart } from 'lucide-react';
import { itemAPI, productAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { useLoading } from '../context/LoadingContext';
import { toast } from 'react-toastify';
import { calcPricing } from '../utils/pricing';

interface ItemMaster {
  itemId: string;
  itemCode: string;
  itemName: string;
  purchasePrice: number;
  taxPercent: number;
  currentQty: number;
  packQty: number;
  quantityType: string;
  defaultDecrease: number;
  barcode?: string;
  tax?: { taxPercentage: number };
}

interface ScannedItem extends ItemMaster {
  quantity: number;
  notes: string;
}

const CheckOut: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');
  const [allItems, setAllItems] = useState<ItemMaster[]>([]);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [showBill, setShowBill] = useState(false);
  const [billData, setBillData] = useState<any>(null);
  const [todayStats, setTodayStats] = useState({ checkInCount: 0, checkOutCount: 0 });
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const { selectedLocation } = useLocation();
  const { showLoading, hideLoading } = useLoading();

  useEffect(() => { fetchTodayStats(); fetchAllItems(); }, []);

  const fetchAllItems = async () => {
    try { const res = await itemAPI.getItems(); setAllItems(res.data); } catch { /* silent */ }
  };

  const fetchTodayStats = async () => {
    try { const res = await productAPI.getTodayStats(); setTodayStats(res.data); } catch { /* silent */ }
  };

  const handleSearch = (value?: string) => {
    const query = (value ?? searchValue).trim().toLowerCase();
    if (!query) { toast.error('Please enter item code or barcode'); return; }

    const item = allItems.find(
      i => i.itemCode.toLowerCase() === query || (i.barcode && i.barcode.toLowerCase() === query)
    );

    if (item) {
      if (item.currentQty <= 0) {
        toast.error(`"${item.itemName}" is not available (out of stock)`);
        setSearchValue('');
        searchInputRef.current?.focus();
        return;
      }
      addItemToBatch(item); setSearchValue(''); toast.success('Item added'); }
    else { toast.error('Item not found'); setSearchValue(''); }
    searchInputRef.current?.focus();
  };

  const addItemToBatch = (item: ItemMaster) => {
    const existing = scannedItems.find(i => i.itemId === item.itemId);
    const taxPct = Number(item.tax?.taxPercentage ?? item.taxPercent ?? 0);
    if (existing) {
      const newQty = existing.quantity + Number(item.defaultDecrease || 1);
      if (newQty > item.currentQty) {
        toast.error(`Quantity cannot exceed available stock (${item.currentQty} units) for "${item.itemName}"`);
        return;
      }
      setScannedItems(prev => prev.map(i =>
        i.itemId === item.itemId ? { ...i, quantity: newQty } : i
      ));
    } else {
      setScannedItems(prev => [...prev, {
        ...item,
        taxPercent: taxPct,
        quantity: Number(item.defaultDecrease || 1),
        notes: '',
      }]);
    }
  };

  const updateQty = (itemId: string, quantity: number) => {
    const item = scannedItems.find(i => i.itemId === itemId);
    if (item && quantity > item.currentQty) {
      toast.error(`Quantity cannot exceed available stock (${item.currentQty} units) for "${item.itemName}"`);
      return;
    }
    setScannedItems(prev => prev.map(i => i.itemId === itemId ? { ...i, quantity } : i));
  };

  const removeItem = (itemId: string) =>
    setScannedItems(prev => prev.filter(i => i.itemId !== itemId));

  const grandTotal = useMemo(() =>
    scannedItems.reduce((sum, item) => {
      const { totalPrice } = calcPricing(Number(item.purchasePrice), item.taxPercent);
      return sum + totalPrice * item.quantity;
    }, 0),
    [scannedItems]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (scannedItems.length === 0) { toast.error('Please add items first'); return; }
    const overStock = scannedItems.find(i => i.quantity > i.currentQty);
    if (overStock) { toast.error(`Quantity exceeds available stock (${overStock.currentQty} units) for "${overStock.itemName}"`); return; }

    showLoading('Processing check-out...');
    try {
      const items = scannedItems.map(item => ({
        item_id: item.itemId,
        quantity: Number(item.quantity),
        quantityType: item.quantityType,
        price: Number(item.purchasePrice),
        notes: item.notes,
      }));

      const response = await productAPI.batchCheckOut({ items });

      const totalAmount = response.data.items.reduce((sum: number, item: any) => {
        const { totalPrice } = calcPricing(Number(item.price), Number(item.taxPercent || 0));
        return sum + totalPrice * Number(item.quantity);
      }, 0);

      setBillData({
        items: response.data.items,
        count: response.data.count,
        errors: response.data.errors || [],
        totalAmount,
        user: user?.full_name,
        location: selectedLocation?.locationName,
        timestamp: new Date().toLocaleString(),
      });

      setShowBill(true);
      toast.success(`${response.data.count} items checked out`);
      if (response.data.errors?.length > 0) toast.warning(`${response.data.errors.length} items failed`);
      setScannedItems([]);
      fetchTodayStats();
      fetchAllItems();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Check-out failed');
    } finally {
      hideLoading();
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ArrowUpCircle className="text-red-500" size={32} /> Check-Out
        </h1>
        <div className="bg-red-50 px-4 py-2 rounded-lg border border-red-200">
          <p className="text-xs text-red-600">Today's Check-Out</p>
          <p className="text-xl font-bold text-red-700">{todayStats.checkOutCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Scan / Search Item</h2>
          <div className="space-y-3">
            <input
              ref={searchInputRef}
              type="text"
              value={searchValue}
              onChange={e => { const v = e.target.value; setSearchValue(v); if (v.length > 10) handleSearch(v); }}
              onKeyPress={e => e.key === 'Enter' && handleSearch()}
              placeholder="Enter Item Code or Barcode"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              autoFocus
            />
            <button
              onClick={() => handleSearch()}
              className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Search size={20} /> Search
            </button>
          </div>

          {/* Grand total summary */}
          {scannedItems.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Items</span><span>{scannedItems.length}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>€{scannedItems.reduce((s, i) => s + Number(i.purchasePrice) * i.quantity, 0).toFixed(2)}</span>
              </div>
              {/* Tax groups */}
              {(() => {
                const groups: Record<number, number> = {};
                scannedItems.forEach(i => {
                  const { taxAmount } = calcPricing(Number(i.purchasePrice), i.taxPercent);
                  const pct = i.taxPercent;
                  groups[pct] = (groups[pct] || 0) + taxAmount * i.quantity;
                });
                return Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b)).map(([pct, amt]) => (
                  <div key={pct} className="flex justify-between text-xs text-orange-500 pl-2">
                    <span>Tax {pct}%</span>
                    <span>€{amt.toFixed(2)}</span>
                  </div>
                ));
              })()}
              <div className="flex justify-between text-sm text-orange-600 font-medium">
                <span>Total Tax</span>
                <span>€{scannedItems.reduce((s, i) => {
                  const { taxAmount } = calcPricing(Number(i.purchasePrice), i.taxPercent);
                  return s + taxAmount * i.quantity;
                }, 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 border-t pt-2">
                <span>Grand Total</span><span>€{grandTotal.toFixed(2)}</span>
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
                const rate = Number(item.purchasePrice);
                const { taxAmount, totalPrice } = calcPricing(rate, item.taxPercent);
                return (
                  <div key={item.itemId} className="border border-gray-200 rounded-xl p-4">
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

                    {/* Quantity */}
                    <div className="mb-3">
                      <label className="text-xs text-gray-500 mb-1 block">
                        Qty (pack) &nbsp;
                        <span className="text-gray-400">
                          {item.quantity} × {item.packQty} = {(item.quantity * item.packQty).toFixed(2)} {item.quantityType}
                        </span>
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateQty(item.itemId, Number(e.target.value))}
                        min="1" step="1"
                        className={`w-full px-2 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-red-400 ${
                          item.quantity > item.currentQty ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                      />
                      {item.quantity > item.currentQty && (
                        <p className="text-xs text-red-600 mt-1">Exceeds available stock ({item.currentQty} units)</p>
                      )}
                    </div>

                    {/* Pricing breakdown (read-only) */}
                    <div className="bg-gray-50 rounded-lg border border-gray-100 px-3 py-2 grid grid-cols-4 gap-2 text-xs text-center">
                      <div>
                        <p className="text-gray-400">Base Price</p>
                        <p className="font-semibold text-gray-800">€{rate.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Tax %</p>
                        <p className="font-semibold text-gray-800">{item.taxPercent}%</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Tax Amt</p>
                        <p className="font-semibold text-orange-600">€{taxAmount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Unit Total</p>
                        <p className="font-bold text-red-600">€{totalPrice.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-2 text-sm">
                      <span className="text-gray-500">Line Total ({item.quantity} × €{totalPrice.toFixed(2)})</span>
                      <span className="font-bold text-gray-900">€{(totalPrice * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {scannedItems.length > 0 && (
            <button
              onClick={handleSubmit}
              className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              Submit Check-Out ({scannedItems.length} items) — €{grandTotal.toFixed(2)}
            </button>
          )}
        </div>
      </div>

      {/* Bill modal */}
      {showBill && billData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Check-Out Bill</h2>
              <button onClick={() => { setShowBill(false); setBillData(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="inline-block px-4 py-1.5 rounded-lg font-semibold bg-red-100 text-red-700 mb-4">CHECK-OUT</div>

            <div className="space-y-2 mb-4">
              {billData.items?.map((item: any, idx: number) => {
                const { taxAmount, totalPrice } = calcPricing(Number(item.price), Number(item.taxPercent || 0));
                return (
                  <div key={idx} className="text-sm border-b pb-2">
                    <div className="flex justify-between font-medium">
                      <span>{item.itemName} ×{item.quantity}</span>
                      <span>€{(totalPrice * Number(item.quantity)).toFixed(2)}</span>
                    </div>
                    <div className="text-gray-400 text-xs mt-0.5">
                      €{Number(item.price).toFixed(2)} + {item.taxPercent ?? 0}% tax (€{taxAmount.toFixed(2)})
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between font-bold text-base">
                <span>Total</span><span>€{billData.totalAmount.toFixed(2)}</span>
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

export default CheckOut;
