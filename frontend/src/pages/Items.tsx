/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  X,
  Eye,
  Download,
  Shuffle,
  FileDown,
} from "lucide-react";
import {
  itemAPI,
  supplierAPI,
  categoriesAPI,
  taxAPI,
  locationAPI,
} from "../services/api";
import { useLoading } from "../context/LoadingContext";
import { toast } from "react-toastify";
import BarcodeComponent from "../components/BarcodeComponent";
import { generateBarcodeSheet } from "../utils/BarcodeSheetGenerator";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JsBarcode from 'jsbarcode';

interface Item {
  itemId: string;
  itemCode: string;
  itemName: string;
  locationId: string;
  openingQty: number;
  currentQty: number;
  barcode?: string;
  supplierId?: string;
  typeId?: string;
  taxId?: string;
  purchasePrice: number;
  taxPercent: number;
  totalAmount: number;
  rol?: number;
  moq?: number;
  eoq?: number;
  quantityType?: string;
  defaultIncrease?: number;
  defaultDecrease?: number;
  packQty?: number;
  groupName?: string;
  supplier?: { supplierName: string };
  type?: { categoryName: string };
  tax?: { tax_name: string };
  location?: { locationName: string };
}

const Items: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [group, setGroup] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printItem, setPrintItem] = useState<Item | null>(null);
  const [printCount, setPrintCount] = useState("1");
  const [viewingItem, setViewingItem] = useState<Item | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [qtyType,setQtyType]=useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [formData, setFormData] = useState({
    item_code: "",
    item_name: "",
    barcode: "",
    supplier_id: "",
    type_id: "",
    tax_id: "",
    location_id: "",
    purchase_price: "",
    tax_percent: "",
    current_qty: "",
    rol: "",
    moq: "",
    eoq: "",
    quantityType: "gram",
    defaultIncrease: "1",
    defaultDecrease: "1",
    packQty: "",
    groupName: "",
  });
  const { showLoading, hideLoading } = useLoading();

 
  useEffect(() => {
    fetchItems();
    fetchSuppliers();
    fetchCategories();
    fetchTaxes();
    fetchLocations();
  }, []);

  useEffect(() => {
    setFilteredItems(items);
  }, [items]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    const query = q.trim().toLowerCase();
    if (!query) {
      setFilteredItems(items);
      return;
    }
    setFilteredItems(items.filter(item =>
      item.itemName.toLowerCase().includes(query) ||
      item.itemCode.toLowerCase().includes(query)
    ));
  };



  const fetchItems = async () => {
    showLoading("Loading items...");
    try {
      const response = await itemAPI.getItems();
      // console.log(response.data)
      setItems(response.data);
    } catch (error) {
      console.error("Error fetching items:", error);
      toast.error("Failed to load items");
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

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getTypeCategories("item");
      setCategories(response.data);
      const res = await categoriesAPI.getTypeCategories("group");
      setGroup(res.data);
      const resX=await categoriesAPI.getTypeCategories("quantityType");
      setQtyType(resX.data)
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

  const fetchLocations = async () => {
    try {
      const response = await locationAPI.getAllLocation();
      setLocations(response.data);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    showLoading(editingItem ? "Updating item..." : "Creating item...");
    try {
      const data = {
        ...formData,
        purchase_price: parseFloat(formData.purchase_price),
        tax_percent:
          parseFloat(
            taxes.find((s) => s.taxId == formData.tax_id)?.taxPercentage,
          ) || 0,
        current_qty: formData.current_qty ? parseFloat(formData.current_qty) : 0,
        rol: parseInt(formData.rol),
        moq: parseInt(formData.moq),
        eoq: parseInt(formData.eoq),
        defaultIncrease: parseFloat(formData.defaultIncrease),
        defaultDecrease: parseFloat(formData.defaultDecrease),
        packQty: formData.packQty ? parseFloat(formData.packQty) : undefined,
        groupName: formData.groupName || undefined,
      };
      console.log(data);
      if (editingItem) {
        await itemAPI.updateItem(editingItem.itemId, data);
        toast.success("Item updated successfully");
      } else {
        await itemAPI.createItem(data);
        toast.success("Item created successfully");
      }
      fetchItems();
      closeModal();
    } catch (error) {
      console.error("Error saving item:", error);
      toast.error("Failed to save item");
    } finally {
      hideLoading();
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      showLoading("Deleting item...");
      try {
        await itemAPI.deleteItem(id);
        fetchItems();
        toast.success("Item deleted successfully");
      } catch (error) {
        console.error("Error deleting item:", error);
        toast.error("Failed to delete item");
      } finally {
        hideLoading();
      }
    }
  };

  const openModal = (item?: Item) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        item_code: item.itemCode,
        item_name: item.itemName,
        barcode: item.barcode || "",
        supplier_id: item.supplierId || "",
        type_id: item.typeId || "",
        tax_id: item.taxId || "",
        location_id: item.locationId || "",
        purchase_price: item.purchasePrice.toString(),
        tax_percent: item.taxPercent.toString(),
        current_qty: item.currentQty?.toString() || "",
        rol: item.rol?.toString() || "",
        moq: item.moq?.toString() || "",
        eoq: item.eoq?.toString() || "",
        quantityType: item.quantityType || "gram",
        defaultIncrease: item.defaultIncrease?.toString() || "1",
        defaultDecrease: item.defaultDecrease?.toString() || "1",
        packQty: item.packQty?.toString() || "",
        groupName: item.groupName || "",
      });
    } else {
      setEditingItem(null);
      setFormData({
        item_code: "",
        item_name: "",
        barcode: "",
        supplier_id: "",
        type_id: "",
        tax_id: "",
        location_id: "",
        purchase_price: "",
        tax_percent: "",
        current_qty: "",
        rol: "",
        moq: "",
        eoq: "",
        quantityType: "gram",
        defaultIncrease: "1",
        defaultDecrease: "1",
        packQty: "",
        groupName: "",
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({
      item_code: "",
      item_name: "",
      barcode: "",
      supplier_id: "",
      type_id: "",
      tax_id: "",
      location_id: "",
      purchase_price: "",
      tax_percent: "",
      current_qty: "",
      rol: "",
      moq: "",
      eoq: "",
      quantityType: "gram",
      defaultIncrease: "1",
      defaultDecrease: "1",
      packQty: "",
      groupName: "",
    });
  };

  const handlePrintBarcode = (item: Item) => {
    setPrintItem(item);
    setIsPrintModalOpen(true);
  };

  const handleGenerateBarcodeSheet = () => {
    const count = parseInt(printCount);
    if (!printItem) return;

    generateBarcodeSheet({ item: printItem, count });
    setIsPrintModalOpen(false);
    setPrintCount("1");
  };

  const generateRandomBarcode = () => {
    const timestamp = Date.now().toString();
    const randomNum = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    const generatedBarcode = `INV${timestamp.slice(-6)}${randomNum}`;
    setFormData({ ...formData, barcode: generatedBarcode });
  };

  const exportToPDF = async () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Items List', 14, 20);
    
    const tableData = await Promise.all(items.map(async (item) => {
      if (item.barcode) {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, item.barcode, {
          format: 'CODE128',
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 12,
          margin: 5
        });
        return {
          itemCode: item.itemCode,
          itemName: item.itemName,
          barcodeImg: canvas.toDataURL('image/png')
        };
      }
      return {
        itemCode: item.itemCode,
        itemName: item.itemName,
        barcodeImg: null
      };
    }));
    
    autoTable(doc, {
      head: [['Item Code', 'Item Name', 'Barcode']],
      body: tableData.flatMap(item => [
        [item.itemCode, item.itemName, ''],
        [{ content: '', colSpan: 3 }]
      ]),
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], halign: 'center' },
      columnStyles: {
        0: { cellWidth: 35, halign: 'left' },
        1: { cellWidth: 75, halign: 'left' },
        2: { cellWidth: 70, halign: 'center' }
      },
      styles: {
        minCellHeight: 20
      },
      didParseCell: (data: any) => {
        if (data.row.index % 2 !== 0) {
          data.cell.styles.minCellHeight = 15;
        }
      },
      didDrawCell: (data: any) => {
        if (data.column.index === 2 && data.cell.section === 'body' && data.row.index % 2 === 0) {
          const rowData = tableData[Math.floor(data.row.index / 2)];
          if (rowData?.barcodeImg) {
            const imgWidth = 65;
            const imgHeight = 18;
            const xPos = data.cell.x + (data.cell.width - imgWidth) / 2;
            const yPos = data.cell.y + (data.cell.height - imgHeight) / 2;
            doc.addImage(rowData.barcodeImg, 'PNG', xPos, yPos, imgWidth, imgHeight);
          }
        }
      }
    });
    
    doc.save('items-with-barcodes.pdf');
    toast.success('PDF exported successfully');
  };

  return (
    <div className="">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Items Management</h1>
        <div className="flex gap-2">
          <button
            onClick={exportToPDF}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <FileDown size={20} />
            <span>Export PDF</span>
          </button>
          <button
            onClick={() => openModal()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            <span>Add New Item</span>
          </button>
        </div>
      </div>

      <div className="my-4">
        <input
          type="text"
          placeholder="Search by item name or code..."
          value={searchQuery}
          onChange={handleSearch}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Items Yet
            </h2>
            <p className="text-gray-600">Add your first item to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Item Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Item Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Barcode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Current Qty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ROL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    MOQ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    EOQ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.itemId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {item.itemCode}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.itemName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <BarcodeComponent
                        value={item.barcode || ""}
                        width={1}
                        height={25}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.currentQty}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                      {item.quantityType || "unit"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.rol || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.moq || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.eoq || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      €{item.totalAmount}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.supplier?.supplierName || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setViewingItem(item)}
                          className="text-green-600 hover:text-green-800 inline-flex items-center"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handlePrintBarcode(item)}
                          className="text-purple-600 hover:text-purple-800 inline-flex items-center"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => openModal(item)}
                          className="text-blue-600 hover:text-blue-800 inline-flex items-center"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.itemId)}
                          className="text-red-600 hover:text-red-800 inline-flex items-center"
                        >
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

      {viewingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Item Details</h2>
              <button
                onClick={() => setViewingItem(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Item Code
                </label>
                <p className="text-gray-900 font-medium">
                  {viewingItem.itemCode}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Item Name
                </label>
                <p className="text-gray-900">{viewingItem.itemName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Current Quantity
                  </label>
                  <p className="text-gray-900">{viewingItem.currentQty}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Unit Type
                  </label>
                  <p className="text-gray-900 capitalize">
                    {viewingItem.quantityType || "unit"}
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Purchase Price
                </label>
                <p className="text-gray-900">€{viewingItem.purchasePrice}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Default Check-In
                  </label>
                  <p className="text-gray-900">
                    {viewingItem.defaultIncrease || 1}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Default Check-Out
                  </label>
                  <p className="text-gray-900">
                    {viewingItem.defaultDecrease || 1}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    ROL
                  </label>
                  <p className="text-gray-900">{viewingItem.rol || "-"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    MOQ
                  </label>
                  <p className="text-gray-900">{viewingItem.moq || "-"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    EOQ
                  </label>
                  <p className="text-gray-900">{viewingItem.eoq || "-"}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Barcode
                </label>
                <BarcodeComponent
                  value={viewingItem.barcode || ""}
                  width={1}
                  height={35}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingItem ? "Edit Item" : "Add Item"}
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
                    Item Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.item_code}
                    onChange={(e) =>
                      setFormData({ ...formData, item_code: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.item_name}
                    onChange={(e) =>
                      setFormData({ ...formData, item_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
             

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group
                  </label>
                  <select
                    value={formData.groupName}
                    onChange={(e) =>
                      setFormData({ ...formData, groupName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Group</option>
                    {group.map((group) => (
                      <option key={group.typeId} value={group.typeId}>
                        {group.typeName}
                      </option>
                    ))}
                  </select>
                </div>
               

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Quantity
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.current_qty}
                    onChange={(e) =>
                      setFormData({ ...formData, current_qty: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pack Quantity
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.packQty}
                    onChange={(e) =>
                      setFormData({ ...formData, packQty: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                   <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity type*
                  </label>
                  <select
                    required
                    value={formData.quantityType}
                    onChange={(e) =>
                      setFormData({ ...formData, quantityType: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {qtyType.map((type) => (
                      <option key={type} value={type.typeName} className=" capitalize">
                        {type.typeName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Barcode
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) =>
                        setFormData({ ...formData, barcode: e.target.value })
                      }
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={generateRandomBarcode}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-green-600"
                    >
                      <Shuffle size={18} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier
                  </label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) =>
                      setFormData({ ...formData, supplier_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((supplier) => (
                      <option
                        key={supplier.supplierId}
                        value={supplier.supplierId}
                      >
                        {supplier.supplierName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.type_id}
                    onChange={(e) =>
                      setFormData({ ...formData, type_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.typeId} value={category.typeId}>
                        {category.typeName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <select
                    value={formData.location_id}
                    onChange={(e) =>
                      setFormData({ ...formData, location_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Location</option>
                    {locations.map((location) => (
                      <option
                        key={location.locationId}
                        value={location.locationId}
                      >
                        {location.locationName} ({location.locationCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax
                  </label>
                  <select
                    value={formData.tax_id}
                    onChange={(e) =>
                      setFormData({ ...formData, tax_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Tax</option>
                    {taxes.map((tax) => (
                      <option key={tax.taxId} value={tax.taxId}>
                        {tax.tax_name} ({tax.taxPercentage}%)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Price *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={formData.purchase_price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        purchase_price: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ROL
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.rol}
                    onChange={(e) =>
                      setFormData({ ...formData, rol: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    MOQ
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.moq}
                    onChange={(e) =>
                      setFormData({ ...formData, moq: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    EOQ
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.eoq}
                    onChange={(e) =>
                      setFormData({ ...formData, eoq: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Check-In
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.defaultIncrease}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        defaultIncrease: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Check-Out
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.defaultDecrease}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        defaultDecrease: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
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
                  {editingItem ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Print Barcodes</h2>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Item
                </label>
                <p className="text-gray-900 font-medium">
                  {printItem?.itemCode}- {printItem?.itemName}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Barcode
                </label>
                <p className="text-gray-900">{printItem?.barcode}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Barcodes *
                </label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={printCount}
                  onChange={(e) => setPrintCount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Will be arranged in 4×4 grid (max 16 per page)
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateBarcodeSheet}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                >
                  Print Barcodes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Items;
