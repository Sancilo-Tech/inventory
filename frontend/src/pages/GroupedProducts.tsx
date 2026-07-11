/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo } from "react";
import { Package, ChevronDown, ChevronUp, Download, DollarSign, Search } from "lucide-react";
import { reportAPI } from "../services/api";
import { useLoading } from "../context/LoadingContext";
import { toast } from "react-toastify";
import Pagination from "../components/Pagination";

interface GroupedItem {
  groupId: string;
  groupName: string;
  totalQty: number;
  qtyType: string;
  totalWorth: number;
  items: any[];
}

const GroupedProducts: React.FC = () => {
  const [groupedItems, setGroupedItems] = useState<GroupedItem[]>([]);
  const [totalInventoryWorth, setTotalInventoryWorth] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { showLoading, hideLoading } = useLoading();

  useEffect(() => {
    fetchGroupedProducts();
  }, []);

  // Filter and paginate the groups in the browser (the full-set worth total below is unaffected).
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return q ? groupedItems.filter(g => g.groupName.toLowerCase().includes(q)) : groupedItems;
  }, [groupedItems, searchQuery]);

  useEffect(() => { setPage(1); }, [searchQuery, pageSize]);

  const paginatedGroups = useMemo(
    () => filteredGroups.slice((page - 1) * pageSize, page * pageSize),
    [filteredGroups, page, pageSize]
  );

  const fetchGroupedProducts = async () => {
    showLoading("Loading grouped products...");
    try {
      const response = await reportAPI.getGroupedProducts();
      const groups = response.data.groups || [];
      setGroupedItems(groups);
      const total = groups.reduce((sum: number, g: any) =>
        sum + g.items.reduce((s: number, item: any) => s + item.currentQty * item.purchasePrice, 0), 0
      );
      setTotalInventoryWorth(total);
    } catch (error) {
      console.error("Error fetching grouped products:", error);
      toast.error("Failed to load grouped products");
    } finally {
      hideLoading();
    }
  };

  const convertToBaseUnit = (quantity: number, unit: string): { value: number; unit: string } => {
    const lowerUnit = unit.toLowerCase();
    
    if (lowerUnit === 'gram' || lowerUnit === 'grams') {
      return { value: quantity / 1000, unit: 'kg' };
    } else if (lowerUnit === 'kilogram' || lowerUnit === 'kg') {
      return { value: quantity, unit: 'kg' };
    } else if (lowerUnit === 'milliliter' || lowerUnit === 'ml') {
      return { value: quantity / 1000, unit: 'L' };
    } else if (lowerUnit === 'liter' || lowerUnit === 'l') {
      return { value: quantity, unit: 'L' };
    }
    
    return { value: quantity, unit: unit };
  };

  const formatQuantity = (quantity: number, unit: string): string => {
    return `${quantity.toFixed(2)} ${unit}`;
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  const downloadCSV = () => {
    if (groupedItems.length === 0) {
      toast.error("No data to download");
      return;
    }

    let csvContent = `"Total Inventory Worth","€${totalInventoryWorth.toFixed(2)}"\n\n`;

    groupedItems.forEach((group) => {
      csvContent += `"${group.groupName}","Total: ${formatQuantity(group.totalQty, group.qtyType)}","Worth: €${group.totalWorth.toFixed(2)}","${group.items.length} items"\n`;
      csvContent += "Item Code,Item Name,Pack Qty,Current Qty,Total Quantity,Purchase Price,Item Worth,Supplier,Category\n";
      
      group.items.forEach((item: any) => {
        const converted = convertToBaseUnit(item.totalQty, item.quantityType);
        const itemTotal = item.currentQty * item.purchasePrice;
        csvContent += `"${item.itemCode}","${item.itemName}","${item.packQty}","${item.currentQty} units","${converted.value.toFixed(2)} ${converted.unit}","€${item.purchasePrice.toFixed(2)}","€${itemTotal.toFixed(2)}","${item.supplier || '-'}","${item.category || '-'}"\n`;
      });
      
      csvContent += "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `grouped-products-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV downloaded successfully");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grouped Products</h1>
          <div className="flex items-center gap-2 mt-2">
            <DollarSign className="text-green-600" size={20} />
            <p className="text-lg font-semibold text-green-600">
              Total Inventory Worth: €{totalInventoryWorth.toFixed(2)}
            </p>
          </div>
        </div>
        <button
          onClick={downloadCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <Download size={20} />
          Download CSV
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by group name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {filteredGroups.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery.trim() ? 'No matching groups' : 'No Grouped Products Yet'}
            </h2>
            <p className="text-gray-600">{searchQuery.trim() ? 'Try a different search term.' : 'Add items with groups to see grouped products.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Group Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Group Worth
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Items
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedGroups.map((group) => (
                  <React.Fragment key={group.groupId || group.groupName}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {group.groupName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatQuantity(group.totalQty, group.qtyType)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-600">
                        €{group.items.reduce((sum: number, item: any) => sum + item.currentQty * item.purchasePrice, 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {group.items.length} item(s)
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleGroup(group.groupName)}
                          className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                        >
                          {expandedGroups.has(group.groupName) ? (
                            <>
                              <ChevronUp size={16} />
                              <span className="text-xs">Hide</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown size={16} />
                              <span className="text-xs">Show</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedGroups.has(group.groupName) && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Items in this group:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {group.items.map((item: any) => (
                                <div
                                  key={item.itemId}
                                  className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">{item.itemName}</p>
                                      <p className="text-xs text-gray-500">{item.itemCode}</p>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-600">Total Quantity:</span>
                                      <span className="font-medium text-gray-900">
                                        {(() => {
                                          const converted = convertToBaseUnit(item.totalQty, item.quantityType);
                                          return `${converted.value.toFixed(2)} ${converted.unit}`;
                                        })()}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-600">Pack Qty:</span>
                                      <span className="font-medium text-gray-900">{item.packQty} &nbsp;<span className="semi-bold capitalize">{item.qtyType}</span></span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-600">Current Qty:</span>
                                      <span className="font-medium text-gray-900">{item.currentQty} units</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-600">Price/Unit:</span>
                                      <span className="font-medium text-gray-900">€{item.purchasePrice.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs border-t pt-1">
                                      <span className="text-gray-600 font-semibold">Item Worth:</span>
                                      <span className="font-semibold text-green-600">€{(item.currentQty * item.purchasePrice).toFixed(2)}</span>
                                    </div>
                                    {item.supplier && (
                                      <div className="flex justify-between text-xs">
                                        <span className="text-gray-600">Supplier:</span>
                                        <span className="font-medium text-gray-900">{item.supplier}</span>
                                      </div>
                                    )}
                                    {item.category && (
                                      <div className="flex justify-between text-xs">
                                        <span className="text-gray-600">Category:</span>
                                        <span className="font-medium text-gray-900">{item.category}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredGroups.length > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={filteredGroups.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            label="groups"
          />
        )}
      </div>
    </div>
  );
};

export default GroupedProducts;
