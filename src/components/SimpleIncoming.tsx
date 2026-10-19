import React, { useState } from 'react';
import {
  ArrowDownToLine,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Building2,
  Package,
  Calendar,
  Barcode,
  DollarSign,
  Download,
  X,
  Truck,
  Edit2,
  AlertCircle,
  Lock
} from 'lucide-react';
import { IncomingStockTransaction, Warehouse, Supplier, Item, User } from '../types/erp';
import { api } from '../services/api';

interface SimpleIncomingProps {
  incomingTransactions: IncomingStockTransaction[];
  warehouses: Warehouse[];
  suppliers: Supplier[];
  items: Item[];
  currentUser: User;
  onReceiveGoods: (data: {
    date: string;
    trackingNo: string;
    itemCode: string;
    serialNumber: string;
    warehouseId: string;
    supplier: string;
    quantityReceived: number;
    itemDescription: string;
    unitCost: number;
  }) => Promise<void>;
  onRefreshData?: () => Promise<void>;
  prefillStoreId?: string;
  onOpenCreateItem?: () => void;
  onOpenCreateSupplier?: () => void;
}

export const SimpleIncoming: React.FC<SimpleIncomingProps> = ({
  incomingTransactions,
  warehouses,
  suppliers,
  items,
  currentUser,
  onReceiveGoods,
  onRefreshData,
  prefillStoreId,
  onOpenCreateItem,
  onOpenCreateSupplier
}) => {
  const isOperator = currentUser.role !== 'Admin';
  const assignedStoreId = currentUser.assignedWarehouseId;

  const [searchTerm, setSearchTerm] = useState('');
  const [storeFilter, setStoreFilter] = useState(isOperator && assignedStoreId ? assignedStoreId : 'ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Transaction State
  const [editingTransaction, setEditingTransaction] = useState<IncomingStockTransaction | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editUnitCost, setEditUnitCost] = useState<number>(0);
  const [editDate, setEditDate] = useState('');
  const [editTrackingNo, setEditTrackingNo] = useState('');
  const [editSerialNumber, setEditSerialNumber] = useState('');
  const [editSupplier, setEditSupplier] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State (Exact 9 fields requested by user)
  const defaultWhId = isOperator && assignedStoreId
    ? assignedStoreId
    : (prefillStoreId || warehouses[0]?.id || 'WH-001');

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [trackingNo, setTrackingNo] = useState('');
  const [itemCode, setItemCode] = useState(items[0]?.oemPartNumber || '');
  const [serialNumber, setSerialNumber] = useState('');
  const [warehouseId, setWarehouseId] = useState(defaultWhId);
  const [supplier, setSupplier] = useState(suppliers[0]?.name || 'Direct Supplier Consignment');
  const [quantityReceived, setQuantityReceived] = useState<number>(1);
  const [itemDescription, setItemDescription] = useState(items[0]?.description || '');
  const [unitCost, setUnitCost] = useState<number>(items[0]?.costPriceUSD || 0);

  const handleOpenReceiveModal = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setTrackingNo(`TRK-IN-${Date.now().toString(36).toUpperCase()}`);
    const firstItm = items[0];
    if (firstItm) {
      setItemCode(firstItm.oemPartNumber);
      setItemDescription(firstItm.description);
      setUnitCost(firstItm.costPriceUSD);
    }
    setSerialNumber('');
    setQuantityReceived(1);
    setWarehouseId(defaultWhId);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (tx: IncomingStockTransaction) => {
    setEditingTransaction(tx);
    setEditQuantity(tx.quantityReceived);
    setEditUnitCost(tx.unitCost);
    setEditDate(tx.date);
    setEditTrackingNo(tx.trackingNo);
    setEditSerialNumber(tx.serialNumber || '');
    setEditSupplier(tx.supplier);
    setEditDescription(tx.itemDescription);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    if (editQuantity <= 0) {
      alert('Quantity received must be greater than 0.');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await api.updateIncomingTransaction(editingTransaction.id, {
        quantityReceived: editQuantity,
        unitCost: editUnitCost,
        date: editDate,
        trackingNo: editTrackingNo,
        serialNumber: editSerialNumber,
        supplier: editSupplier,
        itemDescription: editDescription,
        currentUser
      });

      setStatusMessage({
        type: 'success',
        text: `Successfully updated ${editingTransaction.itemCode}. Warehouse inventory adjusted automatically.`
      });
      setEditingTransaction(null);
      if (onRefreshData) {
        await onRefreshData();
      }
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update transaction' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleItemSelect = (selectedCode: string) => {
    setItemCode(selectedCode);
    const matched = items.find(i => i.oemPartNumber === selectedCode || i.sku === selectedCode);
    if (matched) {
      setItemDescription(matched.description);
      setUnitCost(matched.costPriceUSD);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemCode.trim() || !warehouseId || quantityReceived <= 0) {
      alert('Please fill in Item Code, Warehouse, and positive Quantity.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onReceiveGoods({
        date,
        trackingNo: trackingNo.trim() || `TRK-IN-${Date.now().toString(36).toUpperCase()}`,
        itemCode: itemCode.trim(),
        serialNumber: serialNumber.trim(),
        warehouseId,
        supplier: supplier.trim(),
        quantityReceived: Number(quantityReceived),
        itemDescription: itemDescription.trim() || itemCode,
        unitCost: Number(unitCost) || 0
      });
      setShowAddModal(false);
      setStatusMessage({
        type: 'success',
        text: `Recorded incoming shipment for ${itemCode}. Stock updated automatically.`
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to record incoming stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter transactions: by default show assigned store, or all stores if selected
  const filteredTransactions = incomingTransactions.filter(t => {
    if (storeFilter !== 'ALL' && t.warehouseId !== storeFilter) {
      return false;
    }
    const q = searchTerm.toLowerCase();
    return (
      t.trackingNo.toLowerCase().includes(q) ||
      t.itemCode.toLowerCase().includes(q) ||
      t.itemDescription.toLowerCase().includes(q) ||
      t.supplier.toLowerCase().includes(q) ||
      t.serialNumber.toLowerCase().includes(q) ||
      t.warehouseName.toLowerCase().includes(q)
    );
  });

  const assignedWarehouse = warehouses.find(w => w.id === assignedStoreId);

  // CSV Export
  const exportToCSV = () => {
    const headers = ['Date', 'Tracking No', 'Item Code', 'Serial Number', 'Warehouse', 'Supplier', 'Quantity Received', 'Item Description', 'Unit Cost USD', 'Total USD', 'Recorded By'];
    const rows = filteredTransactions.map(t => [
      t.date,
      t.trackingNo,
      t.itemCode,
      t.serialNumber,
      t.warehouseName,
      t.supplier,
      t.quantityReceived,
      `"${t.itemDescription.replace(/"/g, '""')}"`,
      t.unitCost,
      t.totalCostUSD,
      t.createdByUser
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incoming-stock-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Incoming Stock Register</h2>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                {filteredTransactions.length} Entries
              </span>
              {isOperator && assignedWarehouse && (
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-medium text-[11px]">
                  Assigned Store: {assignedWarehouse.name} ({assignedWarehouse.code})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Record supplier receipts, adjust wrong quantities, update serial numbers, and maintain Google Sheets sync.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleOpenReceiveModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Record Incoming Stock</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Tracking No, Item Code, Supplier, Serial No..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-hidden text-slate-800"
            />
          </div>

          {/* Warehouse Filter (with Store Operator read-only toggle) */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={storeFilter}
              onChange={e => setStoreFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-semibold"
            >
              {!isOperator ? (
                <>
                  <option value="ALL">All 9 Warehouses</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.code} - {w.name} ({w.location})
                    </option>
                  ))}
                </>
              ) : (
                <>
                  <option value={assignedStoreId || 'WH-001'}>
                    My Store: {assignedWarehouse?.name || 'Assigned Store'} ({assignedWarehouse?.code || 'Assigned'})
                  </option>
                  <option value="ALL">All Stores Working (Read-Only Mode)</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3.5">Date</th>
                <th className="py-3 px-3.5">Tracking No.</th>
                <th className="py-3 px-3.5">Item Code</th>
                <th className="py-3 px-3.5">Description</th>
                <th className="py-3 px-3.5">Warehouse</th>
                <th className="py-3 px-3.5">Supplier</th>
                <th className="py-3 px-3.5 text-right">Qty Received</th>
                <th className="py-3 px-3.5 text-right">Unit Cost</th>
                <th className="py-3 px-3.5 text-right">Total (USD)</th>
                <th className="py-3 px-3.5">Serial No.</th>
                <th className="py-3 px-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-xs text-slate-600">No incoming transactions found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click &quot;+ Record Incoming Stock&quot; to receive inventory.</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5 font-medium text-slate-900 whitespace-nowrap">{tx.date}</td>
                    <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {tx.trackingNo}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-slate-900 whitespace-nowrap">{tx.itemCode}</td>
                    <td className="py-3 px-3.5 max-w-xs truncate text-slate-600" title={tx.itemDescription}>
                      {tx.itemDescription}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {tx.warehouseCode || tx.warehouseName}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 max-w-[140px] truncate" title={tx.supplier}>
                      {tx.supplier}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                      +{tx.quantityReceived}
                    </td>
                    <td className="py-3 px-3.5 text-right text-slate-600 whitespace-nowrap">
                      ${tx.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3.5 text-right font-semibold text-slate-900 whitespace-nowrap">
                      ${tx.totalCostUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {tx.serialNumber || '—'}
                    </td>
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      {(!isOperator || tx.warehouseId === assignedStoreId) ? (
                        <button
                          onClick={() => handleOpenEditModal(tx)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
                          title="Edit quantity or details of this incoming transaction"
                        >
                          <Edit2 className="w-3 h-3 text-slate-600" />
                          <span>Edit</span>
                        </button>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed"
                          title="Read-only view: You can only edit incoming stock in your assigned store."
                        >
                          <Lock className="w-2.5 h-2.5" />
                          <span>Read Only</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW INCOMING STOCK MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white">
                  <ArrowDownToLine className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Record Incoming Stock</h3>
                  <p className="text-[11px] text-slate-500">All 9 fields required by Real Deals Procurement ERP</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Date */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    1. Date Received *
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* 2. Tracking No */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    2. Tracking No. *
                  </label>
                  <div className="relative">
                    <Truck className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. TRK-IN-884920"
                      value={trackingNo}
                      onChange={e => setTrackingNo(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* 3. Item Code */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    3. Item Code *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      list="incomingItemsDatalist"
                      placeholder="Type or select OEM Part Number..."
                      value={itemCode}
                      onChange={e => handleItemSelect(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                    />
                    <datalist id="incomingItemsDatalist">
                      {items.map(i => (
                        <option key={i.id} value={i.oemPartNumber}>
                          {i.oemPartNumber} — {i.brand} ({i.category})
                        </option>
                      ))}
                    </datalist>
                    {onOpenCreateItem && (
                      <button
                        type="button"
                        onClick={onOpenCreateItem}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Create new spare part item in catalog"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>+ New Item</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 4. Serial Number */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    4. Serial Number (Optional)
                  </label>
                  <div className="relative">
                    <Barcode className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. SN-8849102-A"
                      value={serialNumber}
                      onChange={e => setSerialNumber(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* 5. Warehouse */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    5. Warehouse *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <select
                      required
                      disabled={isOperator && Boolean(assignedStoreId)}
                      value={warehouseId}
                      onChange={e => setWarehouseId(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-hidden disabled:bg-slate-50 disabled:text-slate-500"
                    >
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.code} - {w.name} ({w.location})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 6. Supplier */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    6. Supplier *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      list="incomingSuppliersDatalist"
                      placeholder="Type or select supplier..."
                      value={supplier}
                      onChange={e => setSupplier(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                    />
                    <datalist id="incomingSuppliersDatalist">
                      {suppliers.map(s => (
                        <option key={s.id} value={s.name}>
                          {s.name} ({s.country})
                        </option>
                      ))}
                      <option value="Direct Supplier Consignment" />
                    </datalist>
                    {onOpenCreateSupplier && (
                      <button
                        type="button"
                        onClick={onOpenCreateSupplier}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold shrink-0 cursor-pointer flex items-center gap-1"
                        title="Add new supplier"
                      >
                        <Plus className="w-3 h-3 text-slate-500" />
                        <span>+ New</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 7. Quantity Received */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    7. Quantity Received *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantityReceived}
                    onChange={e => setQuantityReceived(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>

                {/* 9. Unit Cost */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    8. Unit Cost (USD) *
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={unitCost}
                      onChange={e => setUnitCost(parseFloat(e.target.value) || 0)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* 8. Item Name / Description */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  9. Item Name / Description *
                </label>
                <input
                  type="text"
                  required
                  value={itemDescription}
                  onChange={e => setItemDescription(e.target.value)}
                  placeholder="e.g. Allen Bradley 1756-L83E ControlLogix Processor"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              {/* Calculation Preview */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Total Receipt Value:</span>
                <span className="font-bold text-slate-900 text-sm">
                  ${(quantityReceived * unitCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Save & Update Stock'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT INCOMING STOCK MODAL (Allows modifying wrong quantities or receipt details) */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Incoming Stock Entry</h3>
                  <p className="text-[11px] text-slate-500">
                    Modifying {editingTransaction.id} ({editingTransaction.itemCode})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingTransaction(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
                <p className="font-semibold">Automatic Stock Adjustment:</p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Current stock in warehouse was based on {editingTransaction.quantityReceived} units. Changing quantity
                  here will automatically adjust warehouse physical stock by the difference (
                  {editQuantity - editingTransaction.quantityReceived >= 0 ? '+' : ''}
                  {editQuantity - editingTransaction.quantityReceived} units).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Correct Quantity Received *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editQuantity}
                    onChange={e => setEditQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Unit Cost (USD)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editUnitCost}
                      onChange={e => setEditUnitCost(parseFloat(e.target.value) || 0)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Date Received
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Tracking No.
                  </label>
                  <input
                    type="text"
                    value={editTrackingNo}
                    onChange={e => setEditTrackingNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Serial Number(s)
                </label>
                <input
                  type="text"
                  placeholder="e.g. SN-8849102-A"
                  value={editSerialNumber}
                  onChange={e => setEditSerialNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Supplier
                </label>
                <input
                  type="text"
                  value={editSupplier}
                  onChange={e => setEditSupplier(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Item Description
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTransaction(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isUpdating ? 'Updating...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
