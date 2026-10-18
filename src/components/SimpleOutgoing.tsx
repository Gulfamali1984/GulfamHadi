import React, { useState } from 'react';
import {
  ArrowUpFromLine,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Building2,
  Package,
  Calendar,
  AlertTriangle,
  Download,
  X,
  ShieldAlert,
  Send,
  Edit2,
  AlertCircle,
  Lock
} from 'lucide-react';
import { OutgoingStockTransaction, Warehouse, Customer, Item, User, InventoryRecord } from '../types/erp';
import { api } from '../services/api';

interface SimpleOutgoingProps {
  outgoingTransactions: OutgoingStockTransaction[];
  warehouses: Warehouse[];
  customers: Customer[];
  items: Item[];
  inventory: InventoryRecord[];
  currentUser: User;
  onDispatchGoods: (data: {
    dateIssued: string;
    itemCode: string;
    trackingNo: string;
    serialNumber: string;
    warehouseId: string;
    customerOrWarehouse: string;
    quantityIssued: number;
    poNumber: string;
    itemDescription: string;
    isAdminOverride?: boolean;
  }) => Promise<void>;
  onRefreshData?: () => Promise<void>;
  prefillStoreId?: string;
}

export const SimpleOutgoing: React.FC<SimpleOutgoingProps> = ({
  outgoingTransactions,
  warehouses,
  customers,
  items,
  inventory,
  currentUser,
  onDispatchGoods,
  onRefreshData,
  prefillStoreId
}) => {
  const isAdmin = currentUser.role === 'Admin';
  const isOperator = currentUser.role !== 'Admin';
  const assignedStoreId = currentUser.assignedWarehouseId;

  const [searchTerm, setSearchTerm] = useState('');
  const [storeFilter, setStoreFilter] = useState(isOperator && assignedStoreId ? assignedStoreId : 'ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit State
  const [editingTransaction, setEditingTransaction] = useState<OutgoingStockTransaction | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editDateIssued, setEditDateIssued] = useState('');
  const [editTrackingNo, setEditTrackingNo] = useState('');
  const [editSerialNumber, setEditSerialNumber] = useState('');
  const [editCustomer, setEditCustomer] = useState('');
  const [editPoNumber, setEditPoNumber] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State (Exact 9 fields requested by user)
  const defaultWhId = isOperator && assignedStoreId
    ? assignedStoreId
    : (prefillStoreId || warehouses[0]?.id || 'WH-001');

  const [dateIssued, setDateIssued] = useState(new Date().toISOString().slice(0, 10));
  const [itemCode, setItemCode] = useState(items[0]?.oemPartNumber || '');
  const [trackingNo, setTrackingNo] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [warehouseId, setWarehouseId] = useState(defaultWhId);
  const [customerOrWarehouse, setCustomerOrWarehouse] = useState(customers[0]?.companyName || 'Direct Customer Order');
  const [quantityIssued, setQuantityIssued] = useState<number>(1);
  const [poNumber, setPoNumber] = useState('');
  const [itemDescription, setItemDescription] = useState(items[0]?.description || '');

  // Negative Stock Override State
  const [stockShortageError, setStockShortageError] = useState<{
    available: number;
    requested: number;
    whName: string;
  } | null>(null);
  const [adminOverrideChecked, setAdminOverrideChecked] = useState(false);

  // Current available stock in selected warehouse for the chosen item
  const selectedItemObj = items.find(i => i.oemPartNumber === itemCode || i.sku === itemCode);
  const currentInv = inventory.find(i => i.itemId === selectedItemObj?.id && i.warehouseId === warehouseId);
  const currentAvailable = currentInv ? currentInv.availableStock : 0;

  const handleOpenDispatchModal = () => {
    setDateIssued(new Date().toISOString().slice(0, 10));
    setTrackingNo(`TRK-OUT-${Date.now().toString(36).toUpperCase()}`);
    setPoNumber(`PO-2026-${Math.floor(Math.random() * 8999 + 1000)}`);
    const firstItm = items[0];
    if (firstItm) {
      setItemCode(firstItm.oemPartNumber);
      setItemDescription(firstItm.description);
    }
    setSerialNumber('');
    setQuantityIssued(1);
    setWarehouseId(defaultWhId);
    setStockShortageError(null);
    setAdminOverrideChecked(false);
    setShowAddModal(true);
  };

  const handleItemSelect = (selectedCode: string) => {
    setItemCode(selectedCode);
    const matched = items.find(i => i.oemPartNumber === selectedCode || i.sku === selectedCode);
    if (matched) {
      setItemDescription(matched.description);
    }
    setStockShortageError(null);
  };

  const handleOpenEditModal = (tx: OutgoingStockTransaction) => {
    setEditingTransaction(tx);
    setEditQuantity(tx.quantityIssued);
    setEditDateIssued(tx.dateIssued);
    setEditTrackingNo(tx.trackingNo);
    setEditSerialNumber(tx.serialNumber || '');
    setEditCustomer(tx.customerOrWarehouse);
    setEditPoNumber(tx.poNumber);
    setEditDescription(tx.itemDescription);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    if (editQuantity <= 0) {
      alert('Quantity issued must be greater than 0.');
      return;
    }

    setIsUpdating(true);
    try {
      await api.updateOutgoingTransaction(editingTransaction.id, {
        quantityIssued: editQuantity,
        dateIssued: editDateIssued,
        trackingNo: editTrackingNo,
        serialNumber: editSerialNumber,
        customerOrWarehouse: editCustomer,
        poNumber: editPoNumber,
        itemDescription: editDescription,
        isAdminOverride: isAdmin,
        currentUser
      });

      setStatusMessage({
        type: 'success',
        text: `Updated dispatch entry ${editingTransaction.id}. Warehouse stock adjusted automatically.`
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemCode.trim() || !warehouseId || quantityIssued <= 0) {
      alert('Please fill in Item Code, Warehouse, and positive Quantity.');
      return;
    }

    // Check negative stock
    if (quantityIssued > currentAvailable) {
      const selectedWh = warehouses.find(w => w.id === warehouseId);
      if (!isAdmin) {
        setStockShortageError({
          available: currentAvailable,
          requested: quantityIssued,
          whName: selectedWh?.name || 'Selected Warehouse'
        });
        return;
      } else if (!adminOverrideChecked) {
        setStockShortageError({
          available: currentAvailable,
          requested: quantityIssued,
          whName: selectedWh?.name || 'Selected Warehouse'
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onDispatchGoods({
        dateIssued,
        itemCode: itemCode.trim(),
        trackingNo: trackingNo.trim() || `TRK-OUT-${Date.now().toString(36).toUpperCase()}`,
        serialNumber: serialNumber.trim(),
        warehouseId,
        customerOrWarehouse: customerOrWarehouse.trim(),
        quantityIssued: Number(quantityIssued),
        poNumber: poNumber.trim() || 'PO-DIRECT',
        itemDescription: itemDescription.trim() || itemCode,
        isAdminOverride: Boolean(isAdmin && adminOverrideChecked)
      });
      setShowAddModal(false);
      setStatusMessage({
        type: 'success',
        text: `Dispatched ${quantityIssued} units of ${itemCode}. Stock updated automatically.`
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to record outgoing stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter transactions: by default shows assigned store, or all stores if selected
  const filteredTransactions = outgoingTransactions.filter(t => {
    if (storeFilter !== 'ALL' && t.warehouseId !== storeFilter) {
      return false;
    }
    const q = searchTerm.toLowerCase();
    return (
      t.trackingNo.toLowerCase().includes(q) ||
      t.itemCode.toLowerCase().includes(q) ||
      t.itemDescription.toLowerCase().includes(q) ||
      t.customerOrWarehouse.toLowerCase().includes(q) ||
      t.poNumber.toLowerCase().includes(q) ||
      t.serialNumber.toLowerCase().includes(q) ||
      t.warehouseName.toLowerCase().includes(q)
    );
  });

  const assignedWarehouse = warehouses.find(w => w.id === assignedStoreId);

  // CSV Export
  const exportToCSV = () => {
    const headers = ['Date Issued', 'Item Code', 'Tracking No', 'Serial Number', 'Warehouse', 'Customer / Warehouse', 'Quantity Issued', 'PO Number', 'Item Description', 'Total Price USD', 'Recorded By'];
    const rows = filteredTransactions.map(t => [
      t.dateIssued,
      t.itemCode,
      t.trackingNo,
      t.serialNumber,
      t.warehouseName,
      `"${t.customerOrWarehouse.replace(/"/g, '""')}"`,
      t.quantityIssued,
      t.poNumber,
      `"${t.itemDescription.replace(/"/g, '""')}"`,
      t.totalPriceUSD,
      t.createdByUser
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `outgoing-stock-${new Date().toISOString().slice(0, 10)}.csv`;
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
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Outgoing Stock Register</h2>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                {filteredTransactions.length} Dispatches
              </span>
              {isOperator && assignedWarehouse && (
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-medium text-[11px]">
                  Assigned Store: {assignedWarehouse.name} ({assignedWarehouse.code})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Issue goods with automatic inventory reduction, edit dispatched quantities, and prevent negative stock.
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
              onClick={handleOpenDispatchModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>− Dispatch Outgoing Stock</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Tracking No, Item Code, PO, Customer, Warehouse..."
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

      {/* Dispatches Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3.5">Date Issued</th>
                <th className="py-3 px-3.5">Tracking No.</th>
                <th className="py-3 px-3.5">Item Code</th>
                <th className="py-3 px-3.5">Description</th>
                <th className="py-3 px-3.5">Warehouse</th>
                <th className="py-3 px-3.5">Customer / Dest</th>
                <th className="py-3 px-3.5">PO Number</th>
                <th className="py-3 px-3.5 text-right">Qty Issued</th>
                <th className="py-3 px-3.5">Serial No.</th>
                <th className="py-3 px-3.5">Issued By</th>
                <th className="py-3 px-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-xs text-slate-600">No outgoing transactions found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click &quot;− Dispatch Outgoing Stock&quot; to issue inventory.</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5 font-medium text-slate-900 whitespace-nowrap">{tx.dateIssued}</td>
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
                    <td className="py-3 px-3.5 max-w-[140px] truncate" title={tx.customerOrWarehouse}>
                      {tx.customerOrWarehouse}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                      {tx.poNumber}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-rose-700 whitespace-nowrap">
                      −{tx.quantityIssued}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {tx.serialNumber || '—'}
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                      <span className="text-[11px] font-medium">{tx.createdByUser}</span>
                    </td>
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      {(!isOperator || tx.warehouseId === assignedStoreId) ? (
                        <button
                          onClick={() => handleOpenEditModal(tx)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
                          title="Edit quantity or details of this dispatch"
                        >
                          <Edit2 className="w-3 h-3 text-slate-600" />
                          <span>Edit</span>
                        </button>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed"
                          title="Read-only view: You can only edit dispatches in your assigned store."
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

      {/* NEW DISPATCH MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white">
                  <ArrowUpFromLine className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Dispatch Outgoing Stock</h3>
                  <p className="text-[11px] text-slate-500">All 9 fields with negative stock validation</p>
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
              {/* Negative Stock Warning */}
              {stockShortageError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Insufficient Stock Warning</p>
                      <p className="text-[11px] text-rose-700 mt-0.5">
                        Only <span className="font-bold underline">{stockShortageError.available}</span> units available in {stockShortageError.whName}.
                        Attempting to issue <span className="font-bold">{stockShortageError.requested}</span> units.
                      </p>
                    </div>
                  </div>

                  {isAdmin ? (
                    <label className="flex items-center gap-2 mt-2 pt-2 border-t border-rose-200/80 cursor-pointer text-slate-900 font-semibold">
                      <input
                        type="checkbox"
                        checked={adminOverrideChecked}
                        onChange={e => setAdminOverrideChecked(e.target.checked)}
                        className="rounded border-rose-300 text-slate-900 focus:ring-slate-900"
                      />
                      <span>Administrator Override: Authorize negative stock dispatch</span>
                    </label>
                  ) : (
                    <p className="text-[11px] font-semibold text-rose-800">
                      Standard users cannot issue negative stock. Please contact an Administrator to authorize or adjust inventory.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Date Issued */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    1. Date Issued *
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="date"
                      required
                      value={dateIssued}
                      onChange={e => setDateIssued(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* 2. Item Code */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    2. Item Code *
                  </label>
                  <select
                    value={itemCode}
                    onChange={e => handleItemSelect(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                  >
                    {items.map(i => (
                      <option key={i.id} value={i.oemPartNumber}>
                        {i.oemPartNumber} — {i.brand} ({i.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Tracking No */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    3. Tracking No. *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TRK-OUT-482910"
                    value={trackingNo}
                    onChange={e => setTrackingNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>

                {/* 4. Serial Number */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    4. Serial Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SN-8849102-A"
                    value={serialNumber}
                    onChange={e => setSerialNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                  />
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
                      onChange={e => {
                        setWarehouseId(e.target.value);
                        setStockShortageError(null);
                      }}
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

                {/* 6. Customer / Warehouse */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    6. Customer / Warehouse *
                  </label>
                  <select
                    value={customerOrWarehouse}
                    onChange={e => setCustomerOrWarehouse(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.companyName}>
                        {c.companyName} ({c.city})
                      </option>
                    ))}
                    {warehouses.map(w => (
                      <option key={w.id} value={`Warehouse Transfer: ${w.name}`}>
                        Warehouse Transfer: {w.name} ({w.code})
                      </option>
                    ))}
                    <option value="Direct Customer Order">Direct Customer Order</option>
                  </select>
                </div>

                {/* 7. Quantity Issued */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase">
                      7. Quantity Issued *
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Available: <strong className="text-slate-900">{currentAvailable}</strong>
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantityIssued}
                    onChange={e => {
                      setQuantityIssued(Math.max(1, parseInt(e.target.value) || 1));
                      setStockShortageError(null);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>

                {/* 8. PO */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    8. PO (Purchase / Client Order Ref) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PO-8849-CORP"
                    value={poNumber}
                    onChange={e => setPoNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* 9. Item Name / Description */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  9. Item Name / Description *
                </label>
                <input
                  type="text"
                  required
                  value={itemDescription}
                  onChange={e => setItemDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                />
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
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Processing Dispatch...' : 'Issue Stock'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DISPATCH MODAL */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Outgoing Dispatch</h3>
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
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-800">
                <p className="font-semibold">Automatic Stock Adjustment:</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Currently recorded as {editingTransaction.quantityIssued} units issued. Adjusting this quantity will
                  recalculate physical stock in warehouse {editingTransaction.warehouseCode || editingTransaction.warehouseName}.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Quantity Issued *
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
                    Date Issued
                  </label>
                  <input
                    type="date"
                    required
                    value={editDateIssued}
                    onChange={e => setEditDateIssued(e.target.value)}
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

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    PO Number
                  </label>
                  <input
                    type="text"
                    value={editPoNumber}
                    onChange={e => setEditPoNumber(e.target.value)}
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
                  Customer / Destination
                </label>
                <input
                  type="text"
                  value={editCustomer}
                  onChange={e => setEditCustomer(e.target.value)}
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
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
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
