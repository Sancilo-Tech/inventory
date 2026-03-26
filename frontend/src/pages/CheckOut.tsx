/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Search, ArrowUpCircle, Printer, X, Trash2, ShoppingCart } from 'lucide-react';
import { itemAPI, productAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { useLoading } from '../context/LoadingContext';
import { toast } from 'react-toastify';
 
const CheckOut: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [showBill, setShowBill] = useState(false);
  const [billData, setBillData] = useState<any>(null);
  const [todayStats, setTodayStats] = useState({ checkInCount: 0, checkOutCount: 0 });
  
  const { user } = useAuth();
  const { selectedLocation } = useLocation();
  const { showLoading, hideLoading } = useLoading();

  useEffect(() => {
    fetchTodayStats();
  }, []);

  const fetchTodayStats = async () => {
    try {
      const response = await productAPI.getTodayStats();
      setTodayStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      toast.error('Please enter item code or barcode');
      return;
    }

    showLoading('Searching item...');
    try {
      let response;
      if (searchValue.startsWith('INV') || searchValue.length > 10) {
        response = await itemAPI.getItemByBarcode(searchValue);
      } else {
        response = await itemAPI.getItemByCode(searchValue);
      }

      const item = response.data;
      
      if (item) {
        addItemToBatch(item);
        setSearchValue('');
        toast.success('Item added');
      } else {
        toast.error('Item not found');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Item not found');
    } finally {
      hideLoading();
      setSearchValue('');
    }
  };

  const addItemToBatch = (item: any) => {
    const existing = scannedItems.find(i => i.itemId === item.itemId);
    if (existing) {
      setScannedItems(scannedItems.map(i => 
        i.itemId === item.itemId 
          ? { ...i, quantity: i.quantity + parseFloat(item.defaultDecrease || '1') }
          : i
      ));
    } else {
      setScannedItems([...scannedItems, { 
        ...item, 
        quantity: parseFloat(item.defaultDecrease || '1'), 
        price: item.purchasePrice,
        notes: ''
      }]);
    }
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    setScannedItems(scannedItems.map(i => 
      i.itemId === itemId ? { ...i, quantity } : i
    ));
  };

  const removeItem = (itemId: string) => {
    setScannedItems(scannedItems.filter(i => i.itemId !== itemId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (scannedItems.length === 0) {
      toast.error('Please add items first');
      return;
    }

    showLoading('Processing check-out...');
    try {
      const items = scannedItems.map(item => ({
        item_id: item.itemId,
        quantity: Number(item.quantity),
        quantityType: item.quantityType,
        price: Number(item.price),
        notes: item.notes
      }));

      const response = await productAPI.batchCheckOut({ items });

      let totalAmount = 0;
      response.data.items.forEach((item: any) => {
        const taxAmount = (item.price * item.quantity * (item.taxPercent || 0)) / 100;
        totalAmount += (item.price * item.quantity) + taxAmount;
      });

      setBillData({
        items: response.data.items,
        count: response.data.count,
        errors: response.data.errors || [],
        totalAmount,
        user: user?.full_name,
        location: selectedLocation?.locationName,
        timestamp: new Date().toLocaleString()
      });

      setShowBill(true);
      toast.success(`${response.data.count} items checked out successfully`);
      
      if (response.data.errors?.length > 0) {
        toast.warning(`${response.data.errors.length} items failed`);
      }
      
      setScannedItems([]);
      fetchTodayStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Check-out failed');
    } finally {
      hideLoading();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const closeBill = () => {
    setShowBill(false);
    setBillData(null);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ArrowUpCircle className="text-red-500" size={32} />
            Check-Out
          </h1>
        </div>
        <div className="bg-red-50 px-4 py-2 rounded-lg border border-red-200">
          <p className="text-xs text-red-600">Today's Check-Out</p>
          <p className="text-xl font-bold text-red-700">{todayStats.checkOutCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Scan / Search Item</h2>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter Item Code or Barcode"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                autoFocus
              />
              {/* <button
                onClick={() => setShowScanner(true)}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Scan size={20} />
              </button> */}
            </div>
            <button
              onClick={handleSearch}
              className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Search size={20} />
              Search
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Items ({scannedItems.length})</h2>
            {scannedItems.length > 0 && (
              <button
                onClick={() => setScannedItems([])}
                className="text-red-600 hover:text-red-800 text-sm"
              >
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
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {scannedItems.map((item) => (
                <div key={item.itemId} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.itemName}</h3>
                      <p className="text-sm text-gray-600">{item.itemCode}</p>
                      <p className="text-xs text-gray-500">Stock: {item.currentQty} {item.quantityType || 'unit'}</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.itemId)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                   <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-600">Quantity pack<br/>
                      <div>
                        {`${item.quantity}* ${item.packQty}= ${item.quantity*item.packQty}${item.quantityType || 'pack'}`}
                      </div>
                      </label>

                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(item.itemId, Number(e.target.value))}
                        min="0.01"
                        step="0.01"
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Current Stock <br/>
                         <div>
                        {`${item.currentQty}* ${item.packQty}= ${item.currentQty*item.packQty}${item.quantityType || 'pack'}`}
                      </div>
                      </label>

                      <div className="px-2 py-1 bg-gray-100 rounded text-sm font-medium">
                        {item.currentQty} pack
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {scannedItems.length > 0 && (
            <button
              onClick={handleSubmit}
              className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              Submit Check-Out ({scannedItems.length} items)
            </button>
          )}
        </div>
      </div>

      {showBill && billData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-md print:shadow-none">
            <div className="flex justify-between items-center mb-6 print:mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Check-Out Bill</h2>
              <button onClick={closeBill} className="text-gray-500 hover:text-gray-700 print:hidden">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="border-b pb-4">
                <div className="inline-block px-4 py-2 rounded-lg font-semibold bg-red-100 text-red-700">
                  CHECK-OUT
                </div>
              </div>

              <div className="space-y-2">
                {billData.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.itemName} x{item.quantity}</span>
                    <span>€{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Items:</span>
                  <span className="font-medium">{billData.count}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>€{billData.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t pt-4 space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Location:</span>
                  <span>{billData.location}</span>
                </div>
                <div className="flex justify-between">
                  <span>User:</span>
                  <span>{billData.user}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date & Time:</span>
                  <span>{billData.timestamp}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 print:hidden">
              <button
                onClick={handlePrint}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Printer size={20} />
                Print Bill
              </button>
              <button
                onClick={closeBill}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg transition-colors"
              >
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
