import React, { useState } from 'react';
import {
  Building2,
  Search,
  Filter,
  ArrowDownToLine,
  ArrowUpFromLine,
  MapPin,
  User,
  Phone,
  Boxes,
  Edit2,
  Check,
  X,
  Mail,
  ShieldCheck
} from 'lucide-react';
import { Warehouse, Item, InventoryRecord, User as UserType } from '../types/erp';

interface SimpleStoreInventoryProps {
  warehouses: Warehouse[];
  items: Item[];
  inventory: InventoryRecord[];
  selectedStoreId: string;
  onSelectStore: (storeId: string) => void;
  onOpenReceiveForStore: (storeId: string) => void;
  onOpenDispatchForStore: (storeId: string) => void;
  onUpdateBinLocation: (invId: string, newBin: string) => Promise<void>;
  currentUser: UserType;
}

export const SimpleStoreInventory: React.FC<SimpleStoreInventoryProps> = ({
  warehouses,
  items,
  inventory,
  selectedStoreId,
  onSelectStore,
  onOpenReceiveForStore,
  onOpenDispatchForStore,
  onUpdateBinLocation,
  currentUser
}) => {
  const isAdmin = currentUser.role === 'Admin';
  const initialWhId = (!isAdmin && currentUser.assignedWarehouseId)
    ? currentUser.assignedWarehouseId
    : (selectedStoreId !== 'ALL' ? selectedStoreId : warehouses[0]?.id || 'WH-001');

  const [activeWhId, setActiveWhId] = useState<string>(initialWhId);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingInvId, setEditingInvId] = useState<string | null>(null);
  const [newBinValue, setNewBinValue] = useState('');

  const currentWh = warehouses.find(w => w.id === activeWhId) || warehouses[0];

  // Inventory records in this specific warehouse
  const storeInventory = inventory.filter(inv => inv.warehouseId === currentWh?.id);

  // Filtered by search
  const filtered = storeInventory.filter(inv => {
    const itm = items.find(i => i.id === inv.itemId);
    if (!itm) return false;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      itm.oemPartNumber.toLowerCase().includes(q) ||
      itm.brand.toLowerCase().includes(q) ||
      itm.description.toLowerCase().includes(q) ||
      inv.binLocation.toLowerCase().includes(q);
    return matchesSearch;
  });

  const totalUnitsInStore = storeInventory.reduce((acc, i) => acc + i.physicalStock, 0);
  const totalValueInStore = storeInventory.reduce((acc, i) => {
    const itm = items.find(it => it.id === i.itemId);
    return acc + (i.physicalStock * (itm?.costPriceUSD || 0));
  }, 0);

  const handleStartEdit = (inv: InventoryRecord) => {
    setEditingInvId(inv.id);
    setNewBinValue(inv.binLocation);
  };

  const handleSaveBin = async (invId: string) => {
    if (!newBinValue.trim()) return;
    await onUpdateBinLocation(invId, newBinValue.trim());
    setEditingInvId(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Store Selector Tabs / Dropdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-700" />
              Store by Store Inventory (Individual Warehouses)
            </h2>
            <p className="text-xs text-slate-500">
              Select any of the 9 warehouse facilities to inspect bins, shelf storage, and local stock balances.
            </p>
          </div>

          {/* Quick Dropdown for mobile */}
          <div className="sm:hidden">
            <select
              value={activeWhId}
              onChange={(e) => {
                setActiveWhId(e.target.value);
                onSelectStore(e.target.value);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 rounded-lg p-2"
            >
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>
                  {w.id}: {w.name} ({w.location})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 9 Warehouse Tabs */}
        <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
          {warehouses.map((w) => {
            const isActive = w.id === activeWhId;
            const isAssigned = currentUser.assignedWarehouseId === w.id;
            return (
              <button
                key={w.id}
                onClick={() => {
                  if (isAdmin || isAssigned) {
                    setActiveWhId(w.id);
                    onSelectStore(w.id);
                  }
                }}
                disabled={!isAdmin && !isAssigned}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors shrink-0 flex items-center gap-1.5 border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>{w.id}</span>
                <span className={`text-[10px] font-normal ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                  ({w.location.split(',')[0]})
                </span>
                {isAssigned && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Your Assigned Store" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Store Information Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
              {currentWh.id}
            </span>
            <h3 className="text-lg font-bold text-slate-900">{currentWh.name}</h3>
            <span className="text-xs text-slate-500 font-medium">({currentWh.location})</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Manager: <strong className="text-slate-800">{currentWh.managerName}</strong></span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentWh.address}</span>
            </div>
            <div className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentWh.contactPhone}</span>
            </div>
          </div>
        </div>

        {/* Store Balances & Quick Actions */}
        <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-5">
          <div className="text-right">
            <div className="text-xs text-slate-500 font-semibold">Store Stock Balance</div>
            <div className="text-xl font-bold text-slate-900">{totalUnitsInStore} <span className="text-xs font-normal text-slate-500">units</span></div>
            <div className="text-xs text-slate-500">${totalValueInStore.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</div>
          </div>

          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => onOpenReceiveForStore(currentWh.id)}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Receive Here</span>
            </button>
            <button
              onClick={() => onOpenDispatchForStore(currentWh.id)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1"
            >
              <ArrowUpFromLine className="w-3.5 h-3.5" />
              <span>Dispatch Here</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex items-center justify-between">
        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search inventory in ${currentWh.id}...`}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-400"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing {filtered.length} parts in this store
        </div>
      </div>

      {/* Store Inventory Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">OEM Part Number &amp; Brand</th>
                <th className="py-3 px-4">Item Description</th>
                <th className="py-3 px-4">Shelf / Bin Location</th>
                <th className="py-3 px-4 text-right">Physical Stock</th>
                <th className="py-3 px-4 text-right">Reserved</th>
                <th className="py-3 px-4 text-right font-bold text-slate-900">Available Stock</th>
                <th className="py-3 px-4 text-right">Unit Cost</th>
                <th className="py-3 px-4 text-right">Store Value</th>
                <th className="py-3 px-4">Last Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 text-xs">
                    No items currently recorded in {currentWh.name}. Click "+ Receive Here" to receive stock into this warehouse.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => {
                  const itm = items.find(i => i.id === inv.itemId);
                  if (!itm) return null;
                  const isEditing = editingInvId === inv.id;
                  const storeValue = inv.physicalStock * itm.costPriceUSD;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{itm.oemPartNumber}</div>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                          {itm.brand}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-[11px] text-slate-600 line-clamp-1">{itm.description}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={newBinValue}
                              onChange={(e) => setNewBinValue(e.target.value)}
                              className="px-2 py-1 text-xs border border-slate-300 rounded bg-white w-28 text-slate-900 font-mono"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveBin(inv.id)}
                              className="p-1 text-emerald-700 hover:text-emerald-800"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingInvId(null)}
                              className="p-1 text-slate-400 hover:text-slate-600"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-700 font-medium">{inv.binLocation || 'Unassigned'}</span>
                            <button
                              onClick={() => handleStartEdit(inv)}
                              className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                              title="Edit Bin Location"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-800">
                        {inv.physicalStock}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500">
                        {inv.reservedStock}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {inv.availableStock}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 whitespace-nowrap">
                        ${itm.costPriceUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                        ${storeValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        {inv.lastCountDate}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
