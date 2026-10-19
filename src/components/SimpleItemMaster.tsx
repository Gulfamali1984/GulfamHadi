import React, { useState } from 'react';
import {
  Package,
  Plus,
  UploadCloud,
  Search,
  Filter,
  Download,
  Edit2,
  DollarSign,
  Barcode,
  Layers,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  Truck
} from 'lucide-react';
import { Item, Warehouse, User, InventoryRecord, ConsolidatedInventoryItem, ItemCondition, Supplier } from '../types/erp';
import { api } from '../services/api';

interface SimpleItemMasterProps {
  items: Item[];
  warehouses: Warehouse[];
  inventory: InventoryRecord[];
  consolidatedInventory: ConsolidatedInventoryItem[];
  currentUser: User;
  suppliers?: Supplier[];
  onOpenCreateItem?: () => void;
  onOpenBulkUpload?: () => void;
  onEditItem?: (item: Item) => void;
  onRefreshData?: () => Promise<void>;
}

export const SimpleItemMaster: React.FC<SimpleItemMasterProps> = ({
  items,
  warehouses,
  inventory,
  consolidatedInventory,
  currentUser,
  suppliers = [],
  onOpenCreateItem,
  onOpenBulkUpload,
  onEditItem,
  onRefreshData
}) => {
  const isOperator = currentUser.role !== 'Admin';
  const assignedStoreId = currentUser.assignedWarehouseId;

  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Inline Item Entry Form State
  const [showItemForm, setShowItemForm] = useState(true);
  const [partNumber, setPartNumber] = useState('');
  const [brand, setBrand] = useState('Siemens');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('PLC Systems');
  const [condition, setCondition] = useState<ItemCondition>('Factory Sealed New');
  const [unit, setUnit] = useState('PCS');
  const [costPriceUSD, setCostPriceUSD] = useState<number>(0);
  const [sellingPriceUSD, setSellingPriceUSD] = useState<number>(0);
  const [minSafetyStock, setMinSafetyStock] = useState<number>(2);
  const [reorderPoint, setReorderPoint] = useState<number>(4);
  const [targetStoreId, setTargetStoreId] = useState(
    isOperator && assignedStoreId ? assignedStoreId : (warehouses[0]?.id || 'WH-001')
  );
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [binLocation, setBinLocation] = useState('Shelf A-01');
  const [supplier, setSupplier] = useState(suppliers[0]?.name || 'Direct Supplier Consignment');
  const [serialNumber, setSerialNumber] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit item state
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editPartNumber, setEditPartNumber] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCondition, setEditCondition] = useState<ItemCondition>('Factory Sealed New');
  const [editCostPrice, setEditCostPrice] = useState<number>(0);
  const [editSellingPrice, setEditSellingPrice] = useState<number>(0);
  const [editMinStock, setEditMinStock] = useState<number>(2);
  const [isUpdating, setIsUpdating] = useState(false);

  const brands = Array.from(new Set(items.map(i => i.brand))).filter(Boolean);
  const categories = Array.from(new Set(items.map(i => i.category))).filter(Boolean);

  const filteredItems = items.filter(item => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      item.oemPartNumber.toLowerCase().includes(q) ||
      item.brand.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q);

    const matchesBrand = brandFilter === 'ALL' || item.brand === brandFilter;
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;

    return matchesSearch && matchesBrand && matchesCategory;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partNumber.trim()) {
      setStatusMessage({ type: 'error', text: 'Part Number / OEM Code is required.' });
      return;
    }
    if (!description.trim()) {
      setStatusMessage({ type: 'error', text: 'Item Description is required.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const created = await api.createItem({
        oemPartNumber: partNumber.trim().toUpperCase(),
        brand: brand.trim(),
        description: description.trim(),
        category: category.trim(),
        condition,
        unit,
        costPriceUSD: Number(costPriceUSD) || 0,
        sellingPriceUSD: Number(sellingPriceUSD) || (Number(costPriceUSD) * 1.35),
        minSafetyStock: Number(minSafetyStock) || 2,
        reorderPoint: Number(reorderPoint) || 4,
        weightKg: 1.0,
        hsCode: '8537.10.91',
        countryOfOrigin: 'USA'
      }, currentUser);

      // If opening balance entered, set closing balance immediately AND record incoming stock transaction
      if (openingBalance > 0 && targetStoreId) {
        await api.setClosingBalance({
          warehouseId: targetStoreId,
          itemId: created.id,
          closingBalance: Number(openingBalance),
          binLocation: binLocation || 'Shelf A-01',
          notes: 'Opening balance entered during item registration',
          currentUser
        }).catch(console.error);

        // Also record as incoming stock transaction so it shows in incoming history & shipment tracking
        await api.createIncomingTransaction({
          date: new Date().toISOString().slice(0, 10),
          trackingNo: `INIT-${created.oemPartNumber}-${Date.now().toString(36).toUpperCase().slice(-5)}`,
          itemCode: created.oemPartNumber,
          serialNumber: serialNumber.trim(),
          warehouseId: targetStoreId,
          supplier: supplier.trim() || 'Initial Stock Registration',
          quantityReceived: Number(openingBalance),
          itemDescription: created.description,
          unitCost: Number(costPriceUSD) || 0
        }, currentUser).catch(console.error);
      }

      const wh = warehouses.find(w => w.id === targetStoreId);
      setStatusMessage({
        type: 'success',
        text: `Successfully registered "${created.oemPartNumber}" in Master Catalog${openingBalance > 0 ? ` with ${openingBalance} units stocked in ${wh?.name || targetStoreId}` : ''}!`
      });

      // Reset form
      setPartNumber('');
      setDescription('');
      setCostPriceUSD(0);
      setSellingPriceUSD(0);
      setOpeningBalance(0);
      setSerialNumber('');

      if (onRefreshData) {
        await onRefreshData();
      }
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to create item' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (item: Item) => {
    setEditingItem(item);
    setEditPartNumber(item.oemPartNumber);
    setEditBrand(item.brand);
    setEditDescription(item.description);
    setEditCategory(item.category);
    setEditCondition(item.condition);
    setEditCostPrice(item.costPriceUSD);
    setEditSellingPrice(item.sellingPriceUSD);
    setEditMinStock(item.minSafetyStock);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsUpdating(true);
    try {
      await api.updateItem(editingItem.id, {
        oemPartNumber: editPartNumber.trim().toUpperCase(),
        brand: editBrand.trim(),
        description: editDescription.trim(),
        category: editCategory.trim(),
        condition: editCondition,
        costPriceUSD: Number(editCostPrice),
        sellingPriceUSD: Number(editSellingPrice),
        minSafetyStock: Number(editMinStock)
      }, currentUser);

      setStatusMessage({
        type: 'success',
        text: `Successfully updated item "${editPartNumber}".`
      });
      setEditingItem(null);
      if (onRefreshData) {
        await onRefreshData();
      }
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update item' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Item ID',
      'OEM Part Number',
      'Brand',
      'Description',
      'Category',
      'Condition',
      'Cost Price USD',
      'Selling Price USD',
      'Min Safety Stock',
      'Reorder Point',
      'Unit',
      'Total Physical Stock'
    ];

    const rows = filteredItems.map(item => {
      const ci = consolidatedInventory.find(c => c.item.id === item.id);
      const totalPhysical = ci ? ci.totalPhysical : 0;

      return [
        `"${item.id}"`,
        `"${item.oemPartNumber}"`,
        `"${item.brand}"`,
        `"${item.description.replace(/"/g, '""')}"`,
        `"${item.category}"`,
        `"${item.condition}"`,
        item.costPriceUSD,
        item.sellingPriceUSD,
        item.minSafetyStock,
        item.reorderPoint,
        `"${item.unit}"`,
        totalPhysical
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RealDeals_Item_Master_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Top Banner & Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-slate-700" />
              Items Master Catalog &amp; Registration
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-bold">
              {items.length.toLocaleString()} Total Items
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Create new items, set opening/closing balances, modify pricing, and bulk import 2,000+ spare parts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {onOpenBulkUpload && (
            <button
              type="button"
              onClick={onOpenBulkUpload}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Upload thousands of items with their closing balances from CSV or Google Sheets"
            >
              <UploadCloud className="w-4 h-4 text-emerald-300" />
              <span>+ Bulk Upload 2,000+ Items</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowItemForm(!showItemForm)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{showItemForm ? 'Hide Item Form' : '+ Add New Item'}</span>
            {showItemForm ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* INLINE ITEM ENTRY FORM (Just like Incoming Stock form requested by user) */}
      {showItemForm && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden animate-in fade-in duration-150">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center">
                <Plus className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">
                Register New Item / Spare Part to Master Catalog
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">
              Fill details below to add directly into database and Google Sheets
            </span>
          </div>

          <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  OEM Part Number / Code *:
                </label>
                <input
                  type="text"
                  required
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. 6ES7315-2EH14-0AB0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Brand / Manufacturer *:
                </label>
                <input
                  type="text"
                  required
                  list="itemBrandList"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Siemens, ABB, Schneider"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
                <datalist id="itemBrandList">
                  <option value="Siemens" />
                  <option value="ABB" />
                  <option value="Schneider Electric" />
                  <option value="Allen-Bradley" />
                  <option value="Omron" />
                  <option value="Fanuc" />
                  <option value="Mitsubishi" />
                  <option value="Eaton" />
                </datalist>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Category:
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="PLC Systems">PLC Systems</option>
                  <option value="VFD & Inverters">VFD &amp; Inverters</option>
                  <option value="HMI Panels">HMI Panels</option>
                  <option value="Motors & Drives">Motors &amp; Drives</option>
                  <option value="Power & Switching">Power &amp; Switching</option>
                  <option value="Sensors & Instrumentation">Sensors &amp; Instrumentation</option>
                  <option value="Circuit Breakers">Circuit Breakers</option>
                  <option value="Spare Parts">Spare Parts</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Item Description *:
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. SIMATIC S7-300 Compact CPU with Integrated I/O 24V DC"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Cost Price (USD) *:
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={costPriceUSD}
                    onChange={(e) => {
                      const c = parseFloat(e.target.value) || 0;
                      setCostPriceUSD(c);
                      if (!sellingPriceUSD || sellingPriceUSD === 0) {
                        setSellingPriceUSD(parseFloat((c * 1.35).toFixed(2)));
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-6 pr-2.5 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Selling Price (USD):
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sellingPriceUSD}
                    onChange={(e) => setSellingPriceUSD(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-6 pr-2.5 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Condition:
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as ItemCondition)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="Factory Sealed New">Factory Sealed New</option>
                  <option value="New Open Box">New Open Box</option>
                  <option value="Used Tested">Used Tested</option>
                  <option value="Refurbished">Refurbished</option>
                  <option value="Core / Defective">Core / Defective</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Unit:
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value.toUpperCase())}
                  placeholder="PCS"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Initial Warehouse & Closing Balance Section (Like Incoming Stock) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-bold text-slate-900">Initial Store Stock &amp; Receiving (Like Incoming Stock)</span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {openingBalance > 0 ? `Will record +${openingBalance} units into inventory` : 'Leave 0 if catalog registration only'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Enter initial stock to immediately record on-hand inventory, set bin location, and log an incoming transaction for your store.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Target Warehouse *:</label>
                  <select
                    value={targetStoreId}
                    onChange={(e) => setTargetStoreId(e.target.value)}
                    disabled={isOperator && Boolean(assignedStoreId)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-900 focus:outline-none disabled:bg-slate-100 disabled:text-slate-600"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.code} - {w.name} ({w.location})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Supplier / Vendor:</label>
                  <input
                    type="text"
                    list="itemSupplierList"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="e.g. Siemens AG or Direct"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                  <datalist id="itemSupplierList">
                    {suppliers.map(s => (
                      <option key={s.id} value={s.name} />
                    ))}
                    <option value="Direct Supplier Consignment" />
                    <option value="Factory Direct" />
                    <option value="OEM Distributor" />
                  </datalist>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Opening Stock (Units):</label>
                  <input
                    type="number"
                    min="0"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    placeholder="0"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Serial Number(s):</label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="e.g. SN-8849102"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Bin / Shelf Location:</label>
                  <input
                    type="text"
                    value={binLocation}
                    onChange={(e) => setBinLocation(e.target.value)}
                    placeholder="e.g. Shelf A-02"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setPartNumber('');
                  setDescription('');
                  setCostPriceUSD(0);
                  setSellingPriceUSD(0);
                  setOpeningBalance(0);
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-semibold"
              >
                Clear Form
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <Package className="w-4 h-4 text-emerald-400" />
                <span>{isSubmitting ? 'Registering...' : 'Save & Register Item to Master'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-96 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search part #, brand, description, category..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Brand Filter */}
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-slate-400"
          >
            <option value="ALL">All Brands ({brands.length})</option>
            {brands.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-slate-400"
          >
            <option value="ALL">All Categories ({categories.length})</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Items Master Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Part / OEM Code</th>
                <th className="py-3 px-4">Brand</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Cost (USD)</th>
                <th className="py-3 px-4 text-right">Selling (USD)</th>
                <th className="py-3 px-4 text-center">Safety Stock</th>
                <th className="py-3 px-4 text-right">Total On-Hand</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold">No spare parts match your filter.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Use the form above to add an item or click &quot;+ Bulk Upload&quot; to import your catalog.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const ci = consolidatedInventory.find(c => c.item.id === item.id);
                  const totalPhysical = ci ? ci.totalPhysical : 0;
                  const isLow = totalPhysical <= item.minSafetyStock;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900">{item.oemPartNumber}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{item.id}</span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {item.brand}
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-slate-800 font-medium line-clamp-1">{item.description}</div>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                          {item.condition}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {item.category}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-slate-800 font-semibold">
                        ${item.costPriceUSD.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        ${item.sellingPriceUSD.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="text-slate-700 font-medium">{item.minSafetyStock} min / {item.reorderPoint} ROP</span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-xs ${
                          isLow
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {totalPhysical} {item.unit}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3 text-slate-500" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full my-8 overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">Edit Item: {editingItem.oemPartNumber}</h3>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">OEM Part Number:</label>
                  <input
                    type="text"
                    required
                    value={editPartNumber}
                    onChange={(e) => setEditPartNumber(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Brand:</label>
                  <input
                    type="text"
                    required
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Description:</label>
                <input
                  type="text"
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Cost Price (USD):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editCostPrice}
                    onChange={(e) => setEditCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Selling Price (USD):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editSellingPrice}
                    onChange={(e) => setEditSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save Item Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
