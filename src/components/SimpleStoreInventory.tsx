import React, { useState } from 'react';
import {
  Building2,
  Search,
  Filter,
  ArrowDownToLine,
  ArrowUpFromLine,
  MapPin,
  User as UserIcon,
  Phone,
  Boxes,
  Edit2,
  Check,
  X,
  Mail,
  Plus,
  Scale,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Lock
} from 'lucide-react';
import { Warehouse, Item, InventoryRecord, User as UserType } from '../types/erp';
import { api } from '../services/api';

interface SimpleStoreInventoryProps {
  warehouses: Warehouse[];
  items: Item[];
  inventory: InventoryRecord[];
  selectedStoreId: string;
  onSelectStore: (storeId: string) => void;
  onOpenReceiveForStore: (storeId: string) => void;
  onOpenDispatchForStore: (storeId: string) => void;
  onUpdateBinLocation: (invId: string, newBin: string) => Promise<void>;
  onRefreshData?: () => Promise<void>;
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
  onRefreshData,
  currentUser
}) => {
  const isAdmin = currentUser.role === 'Admin';
  const isOperator = currentUser.role !== 'Admin';
  const assignedStoreId = currentUser.assignedWarehouseId;

  const initialWhId = isOperator && assignedStoreId
    ? assignedStoreId
    : (selectedStoreId !== 'ALL' ? selectedStoreId : warehouses[0]?.id || 'WH-001');

  const [activeWhId, setActiveWhId] = useState<string>(initialWhId);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingInvId, setEditingInvId] = useState<string | null>(null);
  const [newBinValue, setNewBinValue] = useState('');

  // Status message
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Store Add & Edit State
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [showEditStoreModal, setShowEditStoreModal] = useState(false);
  const [storeFormName, setStoreFormName] = useState('');
  const [storeFormCode, setStoreFormCode] = useState('');
  const [storeFormLocation, setStoreFormLocation] = useState('');
  const [storeFormManager, setStoreFormManager] = useState('');
  const [storeFormPhone, setStoreFormPhone] = useState('');
  const [storeFormEmail, setStoreFormEmail] = useState('');
  const [isStoreSubmitting, setIsStoreSubmitting] = useState(false);

  // Single Item Closing Balance Modal State
  const [closingBalanceItem, setClosingBalanceItem] = useState<{ item: Item; inv: InventoryRecord | undefined } | null>(null);
  const [newClosingBalance, setNewClosingBalance] = useState<number>(0);
  const [closingBalanceNotes, setClosingBalanceNotes] = useState('');
  const [isSavingBalance, setIsSavingBalance] = useState(false);

  // Bulk Closing Balances Modal State
  const [showBulkBalanceModal, setShowBulkBalanceModal] = useState(false);
  const [bulkBalances, setBulkBalances] = useState<{ [itemId: string]: number }>({});
  const [bulkNotes, setBulkNotes] = useState('Transitioning opening inventory from Google Sheet');
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  const currentWh = warehouses.find(w => w.id === activeWhId) || warehouses[0];

  // Inventory records in this specific warehouse
  const storeInventory = inventory.filter(inv => inv.warehouseId === currentWh?.id);

  // Filtered by search
  const filtered = storeInventory.filter(inv => {
    const itm = items.find(i => i.id === inv.itemId);
    if (!itm) return false;
    const q = searchTerm.toLowerCase();
    return (
      itm.oemPartNumber.toLowerCase().includes(q) ||
      itm.description.toLowerCase().includes(q) ||
      itm.brand.toLowerCase().includes(q) ||
      inv.binLocation.toLowerCase().includes(q)
    );
  });

  const totalStoreStock = storeInventory.reduce((sum, inv) => sum + inv.physicalStock, 0);
  const totalStoreAvailable = storeInventory.reduce((sum, inv) => sum + inv.availableStock, 0);
  const lowStockCount = storeInventory.filter(inv => {
    const itm = items.find(i => i.id === inv.itemId);
    return itm && inv.physicalStock <= itm.minSafetyStock;
  }).length;

  const handleSelectWarehouse = (whId: string) => {
    setActiveWhId(whId);
    onSelectStore(whId);
  };

  const handleStartEditBin = (inv: InventoryRecord) => {
    setEditingInvId(inv.id);
    setNewBinValue(inv.binLocation);
  };

  const handleSaveBin = async (invId: string) => {
    try {
      await onUpdateBinLocation(invId, newBinValue.trim());
      setEditingInvId(null);
    } catch {
      alert('Failed to update bin location');
    }
  };

  // Open Edit Store Modal
  const handleOpenEditStore = () => {
    if (!currentWh) return;
    setStoreFormName(currentWh.name);
    setStoreFormCode(currentWh.code);
    setStoreFormLocation(currentWh.location);
    setStoreFormManager(currentWh.managerName);
    setStoreFormPhone(currentWh.contactPhone || '');
    setStoreFormEmail(currentWh.contactEmail || '');
    setShowEditStoreModal(true);
  };

  // Open Add Store Modal
  const handleOpenAddStore = () => {
    setStoreFormName('');
    setStoreFormCode('');
    setStoreFormLocation('');
    setStoreFormManager('');
    setStoreFormPhone('');
    setStoreFormEmail('');
    setShowAddStoreModal(true);
  };

  const handleSaveStoreAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeFormName.trim() || !storeFormLocation.trim()) {
      alert('Store Name and Location are required.');
      return;
    }

    setIsStoreSubmitting(true);
    try {
      const created = await api.createWarehouse({
        name: storeFormName.trim(),
        code: storeFormCode.trim() || storeFormName.trim().substring(0, 4).toUpperCase(),
        location: storeFormLocation.trim(),
        managerName: storeFormManager.trim() || 'Unassigned',
        contactPhone: storeFormPhone.trim(),
        contactEmail: storeFormEmail.trim(),
        currentUser
      });

      setShowAddStoreModal(false);
      setStatusMessage({ type: 'success', text: `Store '${created.name}' created and added to database.` });
      if (onRefreshData) await onRefreshData();
      setActiveWhId(created.id);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to create store');
    } finally {
      setIsStoreSubmitting(false);
    }
  };

  const handleSaveStoreEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWh) return;

    setIsStoreSubmitting(true);
    try {
      const updated = await api.updateWarehouse(currentWh.id, {
        name: storeFormName.trim(),
        code: storeFormCode.trim().toUpperCase(),
        location: storeFormLocation.trim(),
        managerName: storeFormManager.trim(),
        contactPhone: storeFormPhone.trim(),
        contactEmail: storeFormEmail.trim(),
        currentUser
      });

      setShowEditStoreModal(false);
      setStatusMessage({ type: 'success', text: `Store '${updated.name}' modified successfully.` });
      if (onRefreshData) await onRefreshData();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update store');
    } finally {
      setIsStoreSubmitting(false);
    }
  };

  // Open Single Item Closing Balance
  const handleOpenClosingBalance = (itm: Item, inv: InventoryRecord | undefined) => {
    setClosingBalanceItem({ item: itm, inv });
    setNewClosingBalance(inv ? inv.physicalStock : 0);
    setClosingBalanceNotes('Google Sheet data transition');
  };

  const handleSaveClosingBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingBalanceItem || !currentWh) return;

    setIsSavingBalance(true);
    try {
      const res = await api.setClosingBalance({
        warehouseId: currentWh.id,
        itemId: closingBalanceItem.item.id,
        closingBalance: newClosingBalance,
        notes: closingBalanceNotes,
        currentUser
      });

      setStatusMessage({
        type: 'success',
        text: `Updated closing balance for ${closingBalanceItem.item.oemPartNumber} to ${newClosingBalance} (Adjustment: ${res.adjustmentDifference >= 0 ? '+' : ''}${res.adjustmentDifference}).`
      });
      setClosingBalanceItem(null);
      if (onRefreshData) await onRefreshData();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update closing balance');
    } finally {
      setIsSavingBalance(false);
    }
  };

  // Open Bulk Balances Modal
  const handleOpenBulkBalances = () => {
    const initial: { [itemId: string]: number } = {};
    items.forEach(itm => {
      const inv = storeInventory.find(i => i.itemId === itm.id);
      initial[itm.id] = inv ? inv.physicalStock : 0;
    });
    setBulkBalances(initial);
    setShowBulkBalanceModal(true);
  };

  const handleSaveBulkBalances = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWh) return;

    setIsSavingBulk(true);
    try {
      const balancesList = Object.entries(bulkBalances).map(([itemId, balance]) => ({
        itemId,
        closingBalance: Number(balance) || 0
      }));

      await api.bulkSetClosingBalances({
        warehouseId: currentWh.id,
        balances: balancesList,
        notes: bulkNotes,
        currentUser
      });

      setStatusMessage({
        type: 'success',
        text: `Successfully imported closing balances for ${balancesList.length} items into ${currentWh.name}!`
      });
      setShowBulkBalanceModal(false);
      if (onRefreshData) await onRefreshData();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save bulk closing balances');
    } finally {
      setIsSavingBulk(false);
    }
  };

  // Warehouses viewable with store operational restrictions
  const visibleWarehouses = warehouses;
  const isOwnStore = isAdmin || currentWh?.id === assignedStoreId;
  const assignedWarehouse = warehouses.find(w => w.id === assignedStoreId);

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

      {/* Warehouse Selector & Quick Store Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {visibleWarehouses.map(wh => {
              const isSelected = wh.id === activeWhId;
              return (
                <button
                  key={wh.id}
                  onClick={() => handleSelectWarehouse(wh.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                  }`}
                >
                  <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                  <span>{wh.code}</span>
                  <span className={`text-[10px] font-normal ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    ({wh.location})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Admin store management & bulk closing balance buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleOpenBulkBalances}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              title="Enter closing balances for all items when migrating from Google Sheets"
            >
              <Scale className="w-3.5 h-3.5 text-blue-600" />
              <span>Put Closing Balances</span>
            </button>

            {isAdmin && (
              <>
                <button
                  onClick={handleOpenEditStore}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  title="Modify store name, manager, location"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Edit Store</span>
                </button>

                <button
                  onClick={handleOpenAddStore}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                  title="Add a new warehouse / store"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add New Store</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Active Warehouse Overview Card */}
      {currentWh && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] font-bold text-slate-800">
                  {currentWh.id}
                </span>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  {currentWh.name} ({currentWh.code})
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active Store
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {currentWh.location} • {currentWh.address}
                </span>
                <span className="flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  Manager: <strong className="text-slate-800">{currentWh.managerName}</strong>
                </span>
                {currentWh.contactPhone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {currentWh.contactPhone}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenReceiveForStore(currentWh.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" />
                <span>Receive Here</span>
              </button>
              <button
                onClick={() => onOpenDispatchForStore(currentWh.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                <ArrowUpFromLine className="w-3.5 h-3.5 text-rose-600" />
                <span>Dispatch Here</span>
              </button>
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-[11px] font-medium text-slate-500">Physical Stock</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">{totalStoreStock} units</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-[11px] font-medium text-slate-500">Available Stock</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">{totalStoreAvailable} units</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-[11px] font-medium text-slate-500">Stocked SKU Types</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">{storeInventory.length} items</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-[11px] font-medium text-slate-500">Low Stock SKUs</p>
              <p className={`text-base font-bold mt-0.5 ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {lowStockCount} items
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stock Table & Search */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search store inventory by Item Code, Description, Brand, Bin..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-hidden text-slate-800"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Showing {filtered.length} of {storeInventory.length} items
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3.5">Item Code</th>
                <th className="py-3 px-3.5">Description</th>
                <th className="py-3 px-3.5">Make / Brand</th>
                <th className="py-3 px-3.5">Condition</th>
                <th className="py-3 px-3.5">Bin Location</th>
                <th className="py-3 px-3.5 text-right">Physical Stock</th>
                <th className="py-3 px-3.5 text-right">Available</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">Last Count Date</th>
                <th className="py-3 px-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    <Boxes className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-xs text-slate-600">No stock records found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Use &quot;Put Closing Balances&quot; to initialize opening counts.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(inv => {
                  const itm = items.find(i => i.id === inv.itemId);
                  if (!itm) return null;
                  const isLow = inv.physicalStock <= itm.minSafetyStock;
                  const isOut = inv.physicalStock === 0;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                        {itm.oemPartNumber}
                      </td>
                      <td className="py-3 px-3.5 max-w-xs truncate text-slate-600" title={itm.description}>
                        {itm.description}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">{itm.brand}</td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-500">{itm.condition}</td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {editingInvId === inv.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={newBinValue}
                              onChange={e => setNewBinValue(e.target.value)}
                              className="w-24 px-1.5 py-0.5 rounded border border-slate-300 text-xs font-mono"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveBin(inv.id)}
                              className="p-1 rounded bg-slate-900 text-white hover:bg-slate-800"
                              title="Save"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingInvId(null)}
                              className="p-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group">
                            <span className="font-mono text-[11px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                              {inv.binLocation || 'A-01'}
                            </span>
                            <button
                              onClick={() => handleStartEditBin(inv)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-slate-700 transition-opacity"
                              title="Edit Bin Location"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                        {inv.physicalStock}
                      </td>
                      <td className="py-3 px-3.5 text-right font-medium text-slate-700 whitespace-nowrap">
                        {inv.availableStock}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {isOut ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Low Stock (≤{itm.minSafetyStock})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {inv.lastCountDate || inv.updatedAt || '—'}
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleOpenClosingBalance(itm, inv)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition-colors cursor-pointer"
                          title="Set closing balance / opening physical count for this item"
                        >
                          <Scale className="w-3 h-3" />
                          <span>Set Balance</span>
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

      {/* SINGLE ITEM SET CLOSING BALANCE MODAL */}
      {closingBalanceItem && currentWh && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Set Closing Balance</h3>
                  <p className="text-[11px] text-slate-500">
                    {closingBalanceItem.item.oemPartNumber} @ {currentWh.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setClosingBalanceItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClosingBalance} className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <p className="font-semibold text-slate-900 mb-0.5">Google Sheet Switch-over Count</p>
                <p className="text-[11px] text-slate-500">
                  Current recorded stock is <strong>{closingBalanceItem.inv?.physicalStock || 0}</strong>. Enter the
                  exact closing balance from your Google Sheet to reconcile this item.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  New Closing Balance / Physical Count *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newClosingBalance}
                  onChange={e => setNewClosingBalance(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Count Notes / Reason
                </label>
                <input
                  type="text"
                  value={closingBalanceNotes}
                  onChange={e => setClosingBalanceNotes(e.target.value)}
                  placeholder="e.g. Switched over from Google Sheet opening inventory"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-hidden text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setClosingBalanceItem(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingBalance}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSavingBalance ? 'Updating...' : 'Save Closing Balance'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK SET CLOSING BALANCES MODAL (FOR SWITCHING OVER ALL ITEMS IN THIS STORE) */}
      {showBulkBalanceModal && currentWh && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Put Closing Balances — {currentWh.name}</h3>
                  <p className="text-[11px] text-slate-500">
                    Switch your Google Sheet closing balances to this warehouse in one go
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkBalanceModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBulkBalances} className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
                <p className="font-bold">Google Sheet Migration Assistant:</p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Type or review the closing balance for each item at {currentWh.name} ({currentWh.location}). Clicking
                  &quot;Apply All Closing Balances&quot; sets physical and available stock directly and synchronizes to Google Sheets.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Reason / Migration Reference
                </label>
                <input
                  type="text"
                  value={bulkNotes}
                  onChange={e => setBulkNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Item Code</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right w-36">Closing Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map(itm => {
                      const currentVal = bulkBalances[itm.id] !== undefined ? bulkBalances[itm.id] : 0;
                      return (
                        <tr key={itm.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-bold text-slate-900 whitespace-nowrap">{itm.oemPartNumber}</td>
                          <td className="py-2 px-3 text-slate-600 truncate max-w-xs">{itm.description}</td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              value={currentVal}
                              onChange={e => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setBulkBalances(prev => ({ ...prev, [itm.id]: val }));
                              }}
                              className="w-24 px-2 py-1 rounded border border-slate-300 text-xs font-bold text-right text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBulkBalanceModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingBulk}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSavingBulk ? 'Applying...' : 'Apply All Closing Balances'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW STORE MODAL */}
      {showAddStoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add New Store / Warehouse</h3>
                  <p className="text-[11px] text-slate-500">Configure new warehouse location and manager</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddStoreModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStoreAdd} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Store / Warehouse Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Central Hub Warehouse"
                    value={storeFormName}
                    onChange={e => setStoreFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Store Code (Short)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TLS, DUB, ORD"
                    value={storeFormCode}
                    onChange={e => setStoreFormCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono uppercase focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Location (City, Country) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TLS, USA or DOHA, QATAR"
                  value={storeFormLocation}
                  onChange={e => setStoreFormLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Manager Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tariq / Unassigned"
                    value={storeFormManager}
                    onChange={e => setStoreFormManager(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={storeFormPhone}
                    onChange={e => setStoreFormPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  placeholder="store.manager@realdeals.com"
                  value={storeFormEmail}
                  onChange={e => setStoreFormEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStoreModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isStoreSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isStoreSubmitting ? 'Creating...' : 'Create Store'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STORE MODAL */}
      {showEditStoreModal && currentWh && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Store — {currentWh.id}</h3>
                  <p className="text-[11px] text-slate-500">Change store name, location, or assigned manager</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditStoreModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStoreEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Store / Warehouse Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={storeFormName}
                    onChange={e => setStoreFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Store Code
                  </label>
                  <input
                    type="text"
                    value={storeFormCode}
                    onChange={e => setStoreFormCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono uppercase focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Location (City, Country) *
                </label>
                <input
                  type="text"
                  required
                  value={storeFormLocation}
                  onChange={e => setStoreFormLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Manager Name
                  </label>
                  <input
                    type="text"
                    value={storeFormManager}
                    onChange={e => setStoreFormManager(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={storeFormPhone}
                    onChange={e => setStoreFormPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={storeFormEmail}
                  onChange={e => setStoreFormEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditStoreModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isStoreSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isStoreSubmitting ? 'Saving...' : 'Save Store Details'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
