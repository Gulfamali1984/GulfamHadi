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
  Truck
} from 'lucide-react';
import { IncomingStockTransaction, Warehouse, Supplier, Item, User } from '../types/erp';

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
  prefillStoreId?: string;
}

export const SimpleIncoming: React.FC<SimpleIncomingProps> = ({
  incomingTransactions,
  warehouses,
  suppliers,
  items,
  currentUser,
  onReceiveGoods,
  prefillStoreId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [storeFilter, setStoreFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State (Exact 9 fields requested by user)
  const defaultWhId = currentUser.role !== 'Admin' && currentUser.assignedWarehouseId
    ? currentUser.assignedWarehouseId
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
        itemDescription: itemDescription.trim() || itemCode.trim(),
        unitCost: Number(unitCost) || 0
      });
      setShowAddModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to receive stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTransactions = incomingTransactions.filter(inc => {
    const matchesStore = storeFilter === 'ALL' || inc.warehouseId === storeFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      inc.trackingNo.toLowerCase().includes(q) ||
      inc.itemCode.toLowerCase().includes(q) ||
      inc.serialNumber.toLowerCase().includes(q) ||
      inc.supplier.toLowerCase().includes(q) ||
      inc.itemDescription.toLowerCase().includes(q) ||
      inc.date.includes(q);
    return matchesStore && matchesSearch;
  });

  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Tracking No',
      'Item Code',
      'Serial Number',
      'Warehouse',
      'Supplier',
      'Quantity Received',
      'Item Description',
      'Unit Cost (USD)',
      'Total Cost (USD)',
      'Recorded By'
    ];
    const rows = filteredTransactions.map(t => [
      t.date,
      `"${t.trackingNo}"`,
      `"${t.itemCode}"`,
      `"${t.serialNumber}"`,
      `"${t.warehouseName}"`,
      `"${t.supplier}"`,
      t.quantityReceived,
      `"${t.itemDescription.replace(/"/g, '""')}"`,
      t.unitCost,
      t.totalCostUSD,
      `"${t.createdByUser}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RealDeals_Incoming_Stock_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <ArrowDownToLine className="w-5 h-5 text-emerald-700" />
            Incoming Stock (Receipts &amp; Put-Away)
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Record incoming supplier shipments, log serial numbers, update warehouse inventory, and sync to Google Sheets.
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
            onClick={handleOpenReceiveModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Receive Incoming Stock</span>
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
            placeholder="Search tracking #, item code, serial, supplier..."
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

      {/* Incoming Stock Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Tracking No.</th>
                <th className="py-3 px-4">Item Code &amp; Description</th>
                <th className="py-3 px-4">Serial Number</th>
                <th className="py-3 px-4">Warehouse</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4 text-right">Qty Received</th>
                <th className="py-3 px-4 text-right">Unit Cost</th>
                <th className="py-3 px-4 text-right">Total Cost</th>
                <th className="py-3 px-4">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400 text-xs">
                    No incoming stock transactions found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-900">
                      {tx.date}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-700">
                      {tx.trackingNo}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{tx.itemCode}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{tx.itemDescription}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {tx.serialNumber || '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800">
                      {tx.warehouseName}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                      {tx.supplier}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-800 whitespace-nowrap">
                      +{tx.quantityReceived}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 whitespace-nowrap">
                      ${tx.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      ${tx.totalCostUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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

      {/* Modal: Incoming Stock Form (Exact 9 fields) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <ArrowDownToLine className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Incoming Stock Entry</h3>
                  <p className="text-xs text-slate-500">Form matching exact ERP specifications</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Date */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    1. Date:
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                {/* 2. Tracking No. */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    2. Tracking No.:
                  </label>
                  <input
                    type="text"
                    required
                    value={trackingNo}
                    onChange={(e) => setTrackingNo(e.target.value)}
                    placeholder="e.g. TRK-DHL-9921827"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 3. Item Code */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    3. Item Code:
                  </label>
                  <input
                    type="text"
                    required
                    list="itemCodesList"
                    value={itemCode}
                    onChange={(e) => handleItemSelect(e.target.value)}
                    placeholder="Type or select OEM part #"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 font-bold"
                  />
                  <datalist id="itemCodesList">
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
                    placeholder="e.g. S-SIE-884102, S-SIE-884103"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 5. Warehouse (9 Warehouses) */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    5. Warehouse (Destination Store):
                  </label>
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    disabled={currentUser.role !== 'Admin' && Boolean(currentUser.assignedWarehouseId)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-60"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.id}: {w.name} ({w.location})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 6. Supplier */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    6. Supplier:
                  </label>
                  <input
                    type="text"
                    required
                    list="suppliersList"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Select or enter supplier name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  <datalist id="suppliersList">
                    {suppliers.map(s => (
                      <option key={s.id} value={s.name}>
                        {s.city}, {s.country}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 7. Quantity Received */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    7. Quantity Received:
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantityReceived}
                    onChange={(e) => setQuantityReceived(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 font-bold"
                  />
                </div>

                {/* 9. Unit Cost */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    9. Unit Cost (USD):
                  </label>
                  <div className="relative">
                    <span className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 text-xs">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={unitCost}
                      onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                      className="w-full pl-7 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* 8. Item Name / Description */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  8. Item Name / Description:
                </label>
                <textarea
                  rows={2}
                  required
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="Full spare part description or technical specifications"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {/* Summary of Total Cost */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Total Cost Valuation:</span>
                <span className="font-bold text-slate-900 text-sm">
                  ${((quantityReceived || 0) * (unitCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                </span>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving & Updating Stock...' : 'Save & Update Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
