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
  Send
} from 'lucide-react';
import { OutgoingStockTransaction, Warehouse, Customer, Item, User, InventoryRecord } from '../types/erp';

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
  prefillStoreId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [storeFilter, setStoreFilter] = useState('ALL');
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isAdmin = currentUser.role === 'Admin';
  const defaultWhId = !isAdmin && currentUser.assignedWarehouseId
    ? currentUser.assignedWarehouseId
    : (prefillStoreId || warehouses[0]?.id || 'WH-001');

  // Form State (Exact 9 fields requested by user)
  const [dateIssued, setDateIssued] = useState(new Date().toISOString().slice(0, 10));
  const [itemCode, setItemCode] = useState(items[0]?.oemPartNumber || '');
  const [trackingNo, setTrackingNo] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [warehouseId, setWarehouseId] = useState(defaultWhId);
  const [customerOrWarehouse, setCustomerOrWarehouse] = useState(customers[0]?.companyName || 'Saudi Aramco Refinery Project');
  const [quantityIssued, setQuantityIssued] = useState<number>(1);
  const [poNumber, setPoNumber] = useState('');
  const [itemDescription, setItemDescription] = useState(items[0]?.description || '');
  const [adminOverrideChecked, setAdminOverrideChecked] = useState(false);

  // Find chosen item and calculate available stock in this warehouse
  const matchedItem = items.find(i => i.oemPartNumber === itemCode || i.sku === itemCode);
  const invRecord = inventory.find(inv => inv.itemId === matchedItem?.id && inv.warehouseId === warehouseId);
  const availableStock = invRecord ? invRecord.availableStock : 0;
  const isNegativeRisk = quantityIssued > availableStock;

  const handleOpenDispatchModal = () => {
    setDateIssued(new Date().toISOString().slice(0, 10));
    setTrackingNo(`TRK-OUT-${Date.now().toString(36).toUpperCase()}`);
    setPoNumber(`PO-CUST-${Math.floor(Math.random() * 8999 + 1000)}`);
    const firstItm = items[0];
    if (firstItm) {
      setItemCode(firstItm.oemPartNumber);
      setItemDescription(firstItm.description);
    }
    setSerialNumber('');
    setQuantityIssued(1);
    setWarehouseId(defaultWhId);
    setAdminOverrideChecked(false);
    setErrorMsg('');
    setShowDispatchModal(true);
  };

  const handleItemSelect = (selectedCode: string) => {
    setItemCode(selectedCode);
    const matched = items.find(i => i.oemPartNumber === selectedCode || i.sku === selectedCode);
    if (matched) {
      setItemDescription(matched.description);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!itemCode.trim() || !warehouseId || quantityIssued <= 0) {
      setErrorMsg('Please enter Item Code, Warehouse, and positive Quantity.');
      return;
    }

    // Check Available Stock & Enforce Rule:
    // "Before issuing stock, check available stock in the selected warehouse.
    //  Do not allow an issue that would result in negative stock unless an authorized administrator permits it."
    if (isNegativeRisk) {
      if (!isAdmin) {
        setErrorMsg(
          `Cannot issue stock: Selected warehouse only has ${availableStock} units available on hand (Requested: ${quantityIssued}). Issuing negative stock requires Administrator authorization.`
        );
        return;
      }

      if (!adminOverrideChecked) {
        setErrorMsg(
          `Warning: Available stock is ${availableStock} units. As Administrator, you must confirm the "Negative Stock Override" checkbox to proceed.`
        );
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
        itemDescription: itemDescription.trim() || itemCode.trim(),
        isAdminOverride: isNegativeRisk && adminOverrideChecked
      });
      setShowDispatchModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTransactions = outgoingTransactions.filter(out => {
    const matchesStore = storeFilter === 'ALL' || out.warehouseId === storeFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      out.trackingNo.toLowerCase().includes(q) ||
      out.itemCode.toLowerCase().includes(q) ||
      out.serialNumber.toLowerCase().includes(q) ||
      out.customerOrWarehouse.toLowerCase().includes(q) ||
      out.poNumber.toLowerCase().includes(q) ||
      out.itemDescription.toLowerCase().includes(q) ||
      out.dateIssued.includes(q);
    return matchesStore && matchesSearch;
  });

  const handleExportCSV = () => {
    const headers = [
      'Date Issued',
      'Item Code',
      'Tracking No',
      'Serial Number',
      'Warehouse',
      'Customer / Warehouse',
      'Quantity Issued',
      'PO Number',
      'Item Description',
      'Total Price (USD)',
      'Recorded By',
      'Admin Override'
    ];
    const rows = filteredTransactions.map(t => [
      t.dateIssued,
      `"${t.itemCode}"`,
      `"${t.trackingNo}"`,
      `"${t.serialNumber}"`,
      `"${t.warehouseName}"`,
      `"${t.customerOrWarehouse}"`,
      t.quantityIssued,
      `"${t.poNumber}"`,
      `"${t.itemDescription.replace(/"/g, '""')}"`,
      t.totalPriceUSD,
      `"${t.createdByUser}"`,
      t.isAdminOverride ? 'Yes' : 'No'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RealDeals_Outgoing_Stock_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ArrowUpFromLine className="w-5 h-5 text-slate-800" />
            Outgoing Stock (Customer Dispatches &amp; Issues)
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Issue spare parts to customer orders with real-time stock validation, negative stock controls, and tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleOpenDispatchModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>− Dispatch Outgoing Stock</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tracking #, item code, serial, PO, customer..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Building2 className="w-4 h-4 text-slate-400" />
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-slate-400"
          >
            <option value="ALL">All 9 Warehouses</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>
                {w.id}: {w.code} ({w.location})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Outgoing Stock Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Date Issued</th>
                <th className="py-3 px-4">Item Code &amp; Description</th>
                <th className="py-3 px-4">Tracking No.</th>
                <th className="py-3 px-4">Serial Number</th>
                <th className="py-3 px-4">Warehouse</th>
                <th className="py-3 px-4">Customer / Destination</th>
                <th className="py-3 px-4">PO Ref</th>
                <th className="py-3 px-4 text-right">Qty Issued</th>
                <th className="py-3 px-4 text-right">Total Price</th>
                <th className="py-3 px-4">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400 text-xs">
                    No outgoing stock dispatches found matching your search criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-900">
                      {tx.dateIssued}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{tx.itemCode}</span>
                        {tx.isAdminOverride && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800" title="Admin Negative Stock Override">
                            Override
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{tx.itemDescription}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-700">
                      {tx.trackingNo}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {tx.serialNumber || '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800">
                      {tx.warehouseName}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-800 font-medium">
                      {tx.customerOrWarehouse}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600">
                      {tx.poNumber || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      -{tx.quantityIssued}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      ${tx.totalPriceUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      {tx.createdByUser}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Outgoing Stock Form (Exact 9 fields + Available Stock Validation) */}
      {showDispatchModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <ArrowUpFromLine className="w-5 h-5 text-slate-800" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Outgoing Stock Dispatch</h3>
                  <p className="text-xs text-slate-500">Form matching exact ERP specifications with stock checks</p>
                </div>
              </div>
              <button
                onClick={() => setShowDispatchModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg p-3 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>{errorMsg}</div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Date Issued */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    1. Date Issued:
                  </label>
                  <input
                    type="date"
                    required
                    value={dateIssued}
                    onChange={(e) => setDateIssued(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                {/* 3. Tracking No. */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    3. Tracking No.:
                  </label>
                  <input
                    type="text"
                    required
                    value={trackingNo}
                    onChange={(e) => setTrackingNo(e.target.value)}
                    placeholder="e.g. TRK-OUT-99120"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 2. Item Code */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    2. Item Code:
                  </label>
                  <input
                    type="text"
                    required
                    list="outgoingItemCodesList"
                    value={itemCode}
                    onChange={(e) => handleItemSelect(e.target.value)}
                    placeholder="Type or select OEM part #"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 font-bold"
                  />
                  <datalist id="outgoingItemCodesList">
                    {items.map(i => (
                      <option key={i.id} value={i.oemPartNumber}>
                        {i.brand} - {i.description}
                      </option>
                    ))}
                  </datalist>
                </div>

                {/* 4. Serial Number */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    4. Serial Number(s):
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="e.g. S-SIE-884102"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 5. Warehouse (Source Store) */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    5. Warehouse (Issuing Store):
                  </label>
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    disabled={!isAdmin && Boolean(currentUser.assignedWarehouseId)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-60"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.id}: {w.name} ({w.location})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 6. Customer / Warehouse */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    6. Customer / Warehouse:
                  </label>
                  <input
                    type="text"
                    required
                    list="customersList"
                    value={customerOrWarehouse}
                    onChange={(e) => setCustomerOrWarehouse(e.target.value)}
                    placeholder="Customer company name or store"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
                  />
                  <datalist id="customersList">
                    {customers.map(c => (
                      <option key={c.id} value={c.companyName}>
                        {c.city}, {c.country}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 7. Quantity Issued */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    7. Quantity Issued:
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantityIssued}
                    onChange={(e) => setQuantityIssued(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 font-bold"
                  />
                </div>

                {/* 8. PO (Customer Purchase Order) */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    8. PO (Purchase Order Reference):
                  </label>
                  <input
                    type="text"
                    required
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    placeholder="e.g. PO-SAR-9921"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 font-mono"
                  />
                </div>
              </div>

              {/* 9. Item Name / Description */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  9. Item Name / Description:
                </label>
                <textarea
                  rows={2}
                  required
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="Spare part item description"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {/* Live Stock Check Box */}
              <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                isNegativeRisk
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}>
                <div className="flex items-center gap-2">
                  {isNegativeRisk ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <div>
                    <span className="font-semibold block">Available Stock in Selected Store:</span>
                    <span className="text-slate-600">
                      Currently {availableStock} units available on hand (Issuing: {quantityIssued})
                    </span>
                  </div>
                </div>
                <div className="text-right font-bold text-sm">
                  {availableStock} units
                </div>
              </div>

              {/* Admin Negative Stock Override Option */}
              {isNegativeRisk && (
                <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-300 text-xs text-amber-900 space-y-2">
                  <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                    <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Insufficient Stock Alert</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    This issue exceeds the currently recorded stock by {quantityIssued - availableStock} units.
                    By system rules, negative stock is prevented unless authorized by an Administrator.
                  </p>

                  {isAdmin ? (
                    <label className="flex items-center gap-2 pt-1 font-semibold text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={adminOverrideChecked}
                        onChange={(e) => setAdminOverrideChecked(e.target.checked)}
                        className="rounded border-amber-400 text-slate-900 focus:ring-amber-500 w-4 h-4"
                      />
                      <span>I authorize this negative stock dispatch as Administrator</span>
                    </label>
                  ) : (
                    <div className="text-xs font-bold text-rose-700 bg-white/70 p-2 rounded border border-rose-200">
                      You are logged in as {currentUser.role}. Only Administrators can authorize negative stock.
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (isNegativeRisk && !isAdmin) || (isNegativeRisk && !adminOverrideChecked)}
                  className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Saving & Dispatching...' : 'Save & Issue Stock'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
