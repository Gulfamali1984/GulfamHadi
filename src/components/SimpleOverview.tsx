import React from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Layers,
  Building2,
  Package,
  Boxes,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import {
  Item,
  Warehouse,
  ConsolidatedInventoryItem,
  IncomingStockTransaction,
  OutgoingStockTransaction,
  User
} from '../types/erp';
import { SimpleTab } from './SimpleHeader';

interface SimpleOverviewProps {
  items: Item[];
  warehouses: Warehouse[];
  consolidatedInventory: ConsolidatedInventoryItem[];
  incomingTransactions: IncomingStockTransaction[];
  outgoingTransactions: OutgoingStockTransaction[];
  onSelectTab: (tab: SimpleTab) => void;
  onOpenReceive: () => void;
  onOpenDispatch: () => void;
  onSelectSpecificStore: (storeId: string) => void;
  currentUser: User;
}

export const SimpleOverview: React.FC<SimpleOverviewProps> = ({
  items,
  warehouses,
  consolidatedInventory,
  incomingTransactions,
  outgoingTransactions,
  onSelectTab,
  onOpenReceive,
  onOpenDispatch,
  onSelectSpecificStore,
  currentUser
}) => {
  const isAdmin = currentUser.role === 'Admin';
  const assignedWhId = currentUser.assignedWarehouseId;

  // Filter for store operator isolation
  const scopedIncoming = !isAdmin && assignedWhId
    ? incomingTransactions.filter(inc => inc.warehouseId === assignedWhId)
    : incomingTransactions;

  const scopedOutgoing = !isAdmin && assignedWhId
    ? outgoingTransactions.filter(out => out.warehouseId === assignedWhId)
    : outgoingTransactions;

  const scopedWarehouses = !isAdmin && assignedWhId
    ? warehouses.filter(w => w.id === assignedWhId)
    : warehouses;

  // Calculations scoped by role
  const totalItemsCount = items.length;
  const totalPhysicalUnits = !isAdmin && assignedWhId
    ? consolidatedInventory.reduce((acc, c) => {
        const b = c.warehouseBreakdown.find(wb => wb.warehouseId === assignedWhId);
        return acc + (b?.physical || 0);
      }, 0)
    : consolidatedInventory.reduce((acc, c) => acc + c.totalPhysical, 0);

  const totalIncomingUnits = scopedIncoming.reduce((acc, c) => acc + c.quantityReceived, 0);
  const totalOutgoingUnits = scopedOutgoing.reduce((acc, c) => acc + c.quantityIssued, 0);

  const totalValuationUSD = !isAdmin && assignedWhId
    ? consolidatedInventory.reduce((acc, c) => {
        const b = c.warehouseBreakdown.find(wb => wb.warehouseId === assignedWhId);
        return acc + ((b?.physical || 0) * c.item.costPriceUSD);
      }, 0)
    : consolidatedInventory.reduce((acc, c) => acc + c.totalValuationUSD, 0);

  // Low stock / Out of stock items
  const lowStockItems = !isAdmin && assignedWhId
    ? consolidatedInventory.filter(ci => {
        const b = ci.warehouseBreakdown.find(wb => wb.warehouseId === assignedWhId);
        return b && (b.available <= 0 || b.physical <= ci.item.minSafetyStock);
      })
    : consolidatedInventory.filter(ci => ci.isLowStock || ci.totalAvailable <= 0);

  // Combined recent transactions (last 8)
  const combinedRecent = [
    ...scopedIncoming.map(inc => ({
      id: inc.id,
      type: 'INCOMING' as const,
      date: inc.date,
      trackingNo: inc.trackingNo,
      itemCode: inc.itemCode,
      itemDescription: inc.itemDescription,
      warehouseCode: inc.warehouseCode,
      warehouseName: inc.warehouseName,
      quantity: inc.quantityReceived,
      party: inc.supplier,
      user: inc.createdByUser,
      timestamp: inc.createdAt
    })),
    ...scopedOutgoing.map(out => ({
      id: out.id,
      type: 'OUTGOING' as const,
      date: out.dateIssued,
      trackingNo: out.trackingNo,
      itemCode: out.itemCode,
      itemDescription: out.itemDescription,
      warehouseCode: out.warehouseCode,
      warehouseName: out.warehouseName,
      quantity: out.quantityIssued,
      party: out.customerOrWarehouse,
      user: out.createdByUser,
      timestamp: out.createdAt
    }))
  ].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">
              Procurement &amp; Logistics Overview
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              Real Deals Automation &amp; Control
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Real-time multi-warehouse stock control, incoming receipts, outgoing dispatches, and inventory valuation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenReceive}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>+ Receive Stock</span>
          </button>

          <button
            onClick={onOpenDispatch}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <ArrowUpFromLine className="w-4 h-4" />
            <span>− Dispatch Stock</span>
          </button>
        </div>
      </div>

      {/* 4 Core KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Inventory Items */}
        <div
          onClick={() => onSelectTab('consolidated')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Inventory Items</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {totalItemsCount} <span className="text-xs font-normal text-slate-500">active parts</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            PLCs, Drives, I/O Modules &amp; Relays
          </div>
        </div>

        {/* KPI 2: Total Stock Across All Warehouses */}
        <div
          onClick={() => onSelectTab('consolidated')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Stock On Hand</span>
            <Boxes className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {totalPhysicalUnits} <span className="text-xs font-normal text-slate-500">units</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            ${totalValuationUSD.toLocaleString()} USD inventory value
          </div>
        </div>

        {/* KPI 3: Incoming Stock */}
        <div
          onClick={() => onSelectTab('incoming')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold">
            <span>Incoming Stock (Received)</span>
            <ArrowDownToLine className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {totalIncomingUnits} <span className="text-xs font-normal text-slate-500">units</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {incomingTransactions.length} recorded supplier receipts
          </div>
        </div>

        {/* KPI 4: Outgoing Stock */}
        <div
          onClick={() => onSelectTab('outgoing')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-700 text-xs font-semibold">
            <span>Outgoing Stock (Issued)</span>
            <ArrowUpFromLine className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {totalOutgoingUnits} <span className="text-xs font-normal text-slate-500">units</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {outgoingTransactions.length} customer dispatches recorded
          </div>
        </div>
      </div>

      {/* Warehouse-Wise Stock (9 Warehouses Grid) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-700" />
              Warehouse-Wise Stock Breakdown (9 Locations)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Current inventory balances and dedicated managers for each Real Deals store.
            </p>
          </div>
          <button
            onClick={() => onSelectTab('store_by_store')}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
          >
            <span>{isAdmin ? 'View All Stores' : 'Go to My Store'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {scopedWarehouses.map((wh) => {
            // Calculate total units in this warehouse
            const whUnits = consolidatedInventory.reduce((acc, ci) => {
              const b = ci.warehouseBreakdown.find(wb => wb.warehouseId === wh.id);
              return acc + (b?.physical || 0);
            }, 0);

            return (
              <div
                key={wh.id}
                onClick={() => {
                  onSelectSpecificStore(wh.id);
                  onSelectTab('store_by_store');
                }}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{wh.id}: {wh.name}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                      {wh.location}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Manager: <span className="font-medium text-slate-700">{wh.managerName}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-500">On-Hand Stock</span>
                  <span className="text-sm font-bold text-slate-900">{whUnits} units</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Low Stock & Out of Stock | Recent Stock Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low-stock & Out-of-stock items */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Low-Stock &amp; Out-of-Stock Items
            </h3>
            <span className="text-xs text-slate-500">
              {lowStockItems.length} items flagged
            </span>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
              All spare parts are within safe inventory thresholds.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {lowStockItems.slice(0, 5).map((ci) => (
                <div key={ci.item.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{ci.item.oemPartNumber}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                        {ci.item.brand}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {ci.item.description}
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-4">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      ci.totalAvailable <= 0
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {ci.totalAvailable} avail / {ci.item.reorderPoint} ROP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Stock Transactions Feed */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-700" />
              Recent Stock Transactions
            </h3>
            <span className="text-xs text-slate-500">
              Combined Incoming &amp; Outgoing
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="pb-2">Date / Type</th>
                  <th className="pb-2">Tracking / Part</th>
                  <th className="pb-2">Warehouse</th>
                  <th className="pb-2 text-right">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {combinedRecent.map((tx) => (
                  <tr key={`${tx.type}-${tx.id}`} className="hover:bg-slate-50/60">
                    <td className="py-2">
                      <div className="font-semibold text-slate-900">{tx.date}</div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded inline-block mt-0.5 ${
                        tx.type === 'INCOMING'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-800 border border-slate-200'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="font-bold text-slate-800">{tx.itemCode}</div>
                      <div className="text-[11px] text-slate-500">{tx.trackingNo}</div>
                    </td>
                    <td className="py-2">
                      <span className="text-slate-700 font-medium">{tx.warehouseCode}</span>
                      <div className="text-[10px] text-slate-400">By {tx.user}</div>
                    </td>
                    <td className="py-2 text-right font-bold text-slate-900">
                      {tx.type === 'INCOMING' ? `+${tx.quantity}` : `-${tx.quantity}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
