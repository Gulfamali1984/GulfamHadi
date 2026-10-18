import React, { useState, useEffect } from 'react';
import { SimpleHeader, SimpleTab } from './components/SimpleHeader';
import { SimpleOverview } from './components/SimpleOverview';
import { SimpleIncoming } from './components/SimpleIncoming';
import { SimpleOutgoing } from './components/SimpleOutgoing';
import { SimpleConsolidated } from './components/SimpleConsolidated';
import { SimpleStoreInventory } from './components/SimpleStoreInventory';
import { SimpleShipmentTracker } from './components/SimpleShipmentTracker';
import { SimpleUserManagement } from './components/SimpleUserManagement';
import { SimpleSheetsSettings } from './components/SimpleSheetsSettings';
import { SimpleLoginModal } from './components/SimpleLoginModal';
import { api } from './services/api';
import {
  Item,
  Warehouse,
  Supplier,
  Customer,
  InventoryRecord,
  ConsolidatedInventoryItem,
  IncomingStockTransaction,
  OutgoingStockTransaction,
  ShipmentRecord,
  User
} from './types/erp';
import {
  INITIAL_ITEMS,
  INITIAL_WAREHOUSES,
  INITIAL_SUPPLIERS,
  INITIAL_CUSTOMERS,
  INITIAL_INVENTORY,
  INITIAL_INCOMING_TRANSACTIONS,
  INITIAL_OUTGOING_TRANSACTIONS,
  INITIAL_SHIPMENTS,
  INITIAL_USERS
} from './data/mockData';
import { ArrowDownToLine, ArrowUpFromLine, X, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<SimpleTab>('overview');
  const [selectedStoreId, setSelectedStoreId] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Authentication & Current User
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Core Data
  const [warehouses, setWarehouses] = useState<Warehouse[]>(INITIAL_WAREHOUSES);
  const [items, setItems] = useState<Item[]>(INITIAL_ITEMS);
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [inventory, setInventory] = useState<InventoryRecord[]>(INITIAL_INVENTORY);
  const [consolidatedInventory, setConsolidatedInventory] = useState<ConsolidatedInventoryItem[]>([]);
  const [incomingTransactions, setIncomingTransactions] = useState<IncomingStockTransaction[]>(INITIAL_INCOMING_TRANSACTIONS);
  const [outgoingTransactions, setOutgoingTransactions] = useState<OutgoingStockTransaction[]>(INITIAL_OUTGOING_TRANSACTIONS);
  const [shipments, setShipments] = useState<ShipmentRecord[]>(INITIAL_SHIPMENTS);

  // Sync state
  const [googleSheetsConnected, setGoogleSheetsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Quick modals for header buttons
  const [showQuickReceive, setShowQuickReceive] = useState(false);
  const [showQuickDispatch, setShowQuickDispatch] = useState(false);

  // Quick Receive Form State
  const [quickRecvStoreId, setQuickRecvStoreId] = useState('');
  const [quickRecvItemCode, setQuickRecvItemCode] = useState('');
  const [quickRecvTracking, setQuickRecvTracking] = useState('');
  const [quickRecvSerial, setQuickRecvSerial] = useState('');
  const [quickRecvSupplier, setQuickRecvSupplier] = useState('');
  const [quickRecvQty, setQuickRecvQty] = useState(1);
  const [quickRecvDesc, setQuickRecvDesc] = useState('');
  const [quickRecvUnitCost, setQuickRecvUnitCost] = useState(0);

  // Quick Dispatch Form State
  const [quickDispStoreId, setQuickDispStoreId] = useState('');
  const [quickDispItemCode, setQuickDispItemCode] = useState('');
  const [quickDispTracking, setQuickDispTracking] = useState('');
  const [quickDispSerial, setQuickDispSerial] = useState('');
  const [quickDispCustomer, setQuickDispCustomer] = useState('');
  const [quickDispQty, setQuickDispQty] = useState(1);
  const [quickDispPO, setQuickDispPO] = useState('');
  const [quickDispDesc, setQuickDispDesc] = useState('');
  const [quickDispAdminOverride, setQuickDispAdminOverride] = useState(false);
  const [quickDispError, setQuickDispError] = useState('');

  const refreshAllData = async () => {
    try {
      const [
        itemsData,
        whData,
        supData,
        custData,
        invData,
        consData,
        incData,
        outData,
        shipData,
        usersData,
        healthData
      ] = await Promise.all([
        api.getItems().catch(() => INITIAL_ITEMS),
        api.getWarehouses().catch(() => INITIAL_WAREHOUSES),
        api.getSuppliers().catch(() => INITIAL_SUPPLIERS),
        api.getCustomers().catch(() => INITIAL_CUSTOMERS),
        api.getInventory().catch(() => INITIAL_INVENTORY),
        api.getConsolidatedInventory().catch(() => []),
        api.getIncomingTransactions().catch(() => INITIAL_INCOMING_TRANSACTIONS),
        api.getOutgoingTransactions().catch(() => INITIAL_OUTGOING_TRANSACTIONS),
        api.getShipments().catch(() => INITIAL_SHIPMENTS),
        api.getUsers().catch(() => INITIAL_USERS),
        api.getHealth().catch(() => null)
      ]);

      if (itemsData && itemsData.length) setItems(itemsData);
      if (whData && whData.length) setWarehouses(whData);
      if (supData && supData.length) setSuppliers(supData);
      if (custData && custData.length) setCustomers(custData);
      if (invData && invData.length) setInventory(invData);
      if (incData && incData.length) setIncomingTransactions(incData);
      if (outData && outData.length) setOutgoingTransactions(outData);
      if (shipData && shipData.length) setShipments(shipData);
      if (usersData && usersData.length) setUsers(usersData);

      if (consData && consData.length > 0) {
        setConsolidatedInventory(consData);
      } else {
        computeConsolidated(itemsData || INITIAL_ITEMS, invData || INITIAL_INVENTORY, whData || INITIAL_WAREHOUSES);
      }

      if (healthData) {
        setGoogleSheetsConnected(healthData.googleSheetsConnected);
      }
    } catch (err) {
      console.error('Error refreshing ERP data:', err);
      computeConsolidated(INITIAL_ITEMS, INITIAL_INVENTORY, INITIAL_WAREHOUSES);
    }
  };

  const computeConsolidated = (currentItems: Item[], currentInv: InventoryRecord[], currentWh: Warehouse[]) => {
    const list: ConsolidatedInventoryItem[] = currentItems.map(item => {
      const invRecords = currentInv.filter(i => i.itemId === item.id);
      const totalPhysical = invRecords.reduce((acc, curr) => acc + curr.physicalStock, 0);
      const totalReserved = invRecords.reduce((acc, curr) => acc + curr.reservedStock, 0);
      const totalAvailable = invRecords.reduce((acc, curr) => acc + curr.availableStock, 0);
      const totalInTransit = invRecords.reduce((acc, curr) => acc + curr.inTransitStock, 0);
      const totalQuarantined = invRecords.reduce((acc, curr) => acc + curr.quarantinedStock, 0);
      const totalValuationUSD = totalPhysical * item.costPriceUSD;

      const warehouseBreakdown = currentWh.map(wh => {
        const inv = invRecords.find(i => i.warehouseId === wh.id);
        return {
          warehouseId: wh.id,
          warehouseCode: wh.code,
          warehouseName: wh.name,
          location: wh.location,
          physical: inv?.physicalStock || 0,
          reserved: inv?.reservedStock || 0,
          available: inv?.availableStock || 0,
          inTransit: inv?.inTransitStock || 0,
          quarantined: inv?.quarantinedStock || 0,
          binLocation: inv?.binLocation || 'Shelf A-01'
        };
      });

      return {
        item,
        totalPhysical,
        totalReserved,
        totalAvailable,
        totalInTransit,
        totalQuarantined,
        totalValuationUSD,
        warehouseBreakdown,
        isLowStock: totalAvailable <= item.reorderPoint
      };
    });
    setConsolidatedInventory(list);
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // Sync to Google Sheets
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await api.syncToGoogleSheets();
      if (res.success) {
        setGoogleSheetsConnected(true);
        await refreshAllData();
      } else {
        setActiveTab('sheets_sync');
      }
    } catch (e) {
      setActiveTab('sheets_sync');
    } finally {
      setIsSyncing(false);
    }
  };

  // Login handler
  const handleLoginWithCredentials = async (email: string, password?: string) => {
    const res = await api.login(email, password);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      if (res.user.role !== 'Admin' && res.user.assignedWarehouseId) {
        setSelectedStoreId(res.user.assignedWarehouseId);
      }
      return true;
    }
    return false;
  };

  // Open Quick Receive
  const handleOpenQuickReceive = () => {
    const defaultWh = (!currentUser.role.includes('Admin') && currentUser.assignedWarehouseId)
      ? currentUser.assignedWarehouseId
      : (selectedStoreId !== 'ALL' ? selectedStoreId : warehouses[0]?.id || 'WH-001');
    const firstItm = items[0];

    setQuickRecvStoreId(defaultWh);
    setQuickRecvItemCode(firstItm?.oemPartNumber || '');
    setQuickRecvDesc(firstItm?.description || '');
    setQuickRecvUnitCost(firstItm?.costPriceUSD || 0);
    setQuickRecvTracking(`TRK-IN-${Date.now().toString(36).toUpperCase()}`);
    setQuickRecvSerial('');
    setQuickRecvSupplier(suppliers[0]?.name || 'Supplier Consignment');
    setQuickRecvQty(1);
    setShowQuickReceive(true);
  };

  // Open Quick Dispatch
  const handleOpenQuickDispatch = () => {
    const defaultWh = (!currentUser.role.includes('Admin') && currentUser.assignedWarehouseId)
      ? currentUser.assignedWarehouseId
      : (selectedStoreId !== 'ALL' ? selectedStoreId : warehouses[0]?.id || 'WH-001');
    const firstItm = items[0];

    setQuickDispStoreId(defaultWh);
    setQuickDispItemCode(firstItm?.oemPartNumber || '');
    setQuickDispDesc(firstItm?.description || '');
    setQuickDispTracking(`TRK-OUT-${Date.now().toString(36).toUpperCase()}`);
    setQuickDispSerial('');
    setQuickDispCustomer(customers[0]?.companyName || 'Saudi Aramco Refinery Project');
    setQuickDispPO(`PO-ORD-${Math.floor(Math.random() * 8999 + 1000)}`);
    setQuickDispQty(1);
    setQuickDispAdminOverride(false);
    setQuickDispError('');
    setShowQuickDispatch(true);
  };

  const handleQuickReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createIncomingTransaction({
      date: new Date().toISOString().slice(0, 10),
      trackingNo: quickRecvTracking || `TRK-IN-${Date.now().toString(36).toUpperCase()}`,
      itemCode: quickRecvItemCode,
      serialNumber: quickRecvSerial,
      warehouseId: quickRecvStoreId,
      supplier: quickRecvSupplier,
      quantityReceived: Number(quickRecvQty),
      itemDescription: quickRecvDesc,
      unitCost: Number(quickRecvUnitCost)
    }, currentUser);

    setShowQuickReceive(false);
    await refreshAllData();
  };

  const handleQuickDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickDispError('');

    try {
      await api.createOutgoingTransaction({
        dateIssued: new Date().toISOString().slice(0, 10),
        itemCode: quickDispItemCode,
        trackingNo: quickDispTracking || `TRK-OUT-${Date.now().toString(36).toUpperCase()}`,
        serialNumber: quickDispSerial,
        warehouseId: quickDispStoreId,
        customerOrWarehouse: quickDispCustomer,
        quantityIssued: Number(quickDispQty),
        poNumber: quickDispPO,
        itemDescription: quickDispDesc,
        isAdminOverride: quickDispAdminOverride
      }, currentUser);

      setShowQuickDispatch(false);
      await refreshAllData();
    } catch (err: any) {
      setQuickDispError(err.message || 'Failed to dispatch stock');
    }
  };

  // Selected item in quick dispatch to check available stock
  const quickDispMatchedItem = items.find(i => i.oemPartNumber === quickDispItemCode || i.sku === quickDispItemCode);
  const quickDispInv = inventory.find(i => i.itemId === quickDispMatchedItem?.id && i.warehouseId === quickDispStoreId);
  const quickDispAvail = quickDispInv ? quickDispInv.availableStock : 0;
  const quickDispNegativeRisk = quickDispQty > quickDispAvail;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header */}
      <SimpleHeader
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setSearchTerm('');
        }}
        warehouses={warehouses}
        selectedStoreId={selectedStoreId}
        onSelectStore={(storeId) => {
          setSelectedStoreId(storeId);
          if (storeId !== 'ALL') {
            setActiveTab('store_by_store');
          }
        }}
        searchTerm={searchTerm}
        onSearchChange={(term) => setSearchTerm(term)}
        googleSheetsConnected={googleSheetsConnected}
        onSync={handleSync}
        isSyncing={isSyncing}
        onQuickReceive={handleOpenQuickReceive}
        onQuickDispatch={handleOpenQuickDispatch}
        currentUser={currentUser}
        onOpenLoginModal={() => setShowLoginModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Tab 1: Dashboard / Overview */}
        {activeTab === 'overview' && (
          <SimpleOverview
            items={items}
            warehouses={warehouses}
            consolidatedInventory={consolidatedInventory}
            incomingTransactions={incomingTransactions}
            outgoingTransactions={outgoingTransactions}
            onSelectTab={(tab) => setActiveTab(tab)}
            onOpenReceive={handleOpenQuickReceive}
            onOpenDispatch={handleOpenQuickDispatch}
            onSelectSpecificStore={(storeId) => {
              setSelectedStoreId(storeId);
            }}
            currentUser={currentUser}
          />
        )}

        {/* Tab 2: Incoming Stock (Receive) */}
        {activeTab === 'incoming' && (
          <SimpleIncoming
            incomingTransactions={incomingTransactions}
            warehouses={warehouses}
            suppliers={suppliers}
            items={items}
            currentUser={currentUser}
            onReceiveGoods={async (data) => {
              await api.createIncomingTransaction(data, currentUser);
              await refreshAllData();
            }}
            prefillStoreId={selectedStoreId !== 'ALL' ? selectedStoreId : undefined}
          />
        )}

        {/* Tab 3: Outgoing Stock (Dispatch) */}
        {activeTab === 'outgoing' && (
          <SimpleOutgoing
            outgoingTransactions={outgoingTransactions}
            warehouses={warehouses}
            customers={customers}
            items={items}
            inventory={inventory}
            currentUser={currentUser}
            onDispatchGoods={async (data) => {
              await api.createOutgoingTransaction(data, currentUser);
              await refreshAllData();
            }}
            prefillStoreId={selectedStoreId !== 'ALL' ? selectedStoreId : undefined}
          />
        )}

        {/* Tab 4: Consolidated Inventory (All 9 Stores Combined) */}
        {activeTab === 'consolidated' && (
          <SimpleConsolidated
            consolidatedInventory={consolidatedInventory}
            warehouses={warehouses}
          />
        )}

        {/* Tab 5: Each Store Separately (9 Warehouses) */}
        {activeTab === 'store_by_store' && (
          <SimpleStoreInventory
            warehouses={warehouses}
            items={items}
            inventory={inventory}
            selectedStoreId={selectedStoreId}
            onSelectStore={(storeId) => setSelectedStoreId(storeId)}
            onOpenReceiveForStore={(storeId) => {
              setQuickRecvStoreId(storeId);
              setShowQuickReceive(true);
            }}
            onOpenDispatchForStore={(storeId) => {
              setQuickDispStoreId(storeId);
              setShowQuickDispatch(true);
            }}
            onUpdateBinLocation={async (invId, newBin) => {
              await api.updateInventoryRecord(invId, { binLocation: newBin });
              await refreshAllData();
            }}
            currentUser={currentUser}
          />
        )}

        {/* Tab 6: Shipment Tracker */}
        {activeTab === 'shipments' && (
          <SimpleShipmentTracker
            shipments={shipments}
            warehouses={warehouses}
            currentUser={currentUser}
            onUpdateShipmentStatus={async (id, status, notes, updatedBy) => {
              await api.updateShipmentStatus(id, status, notes, updatedBy);
              await refreshAllData();
            }}
          />
        )}

        {/* Tab 7: Users & Roles (Admin Only) */}
        {activeTab === 'users' && currentUser.role === 'Admin' && (
          <SimpleUserManagement
            users={users}
            warehouses={warehouses}
            currentUser={currentUser}
            onCreateUser={async (userData) => {
              await api.createUser(userData, currentUser);
              await refreshAllData();
            }}
            onUpdateUser={async (id, data) => {
              await api.updateUser(id, data, currentUser);
              await refreshAllData();
            }}
            onChangePassword={async (id, newPass) => {
              await api.updateUserPassword(id, newPass, currentUser);
              await refreshAllData();
            }}
            onToggleStatus={async (id, active) => {
              await api.toggleUserStatus(id, active, currentUser);
              await refreshAllData();
            }}
          />
        )}

        {/* Tab 8: Google Sheets Setup */}
        {activeTab === 'sheets_sync' && (
          <SimpleSheetsSettings
            onRefreshAllData={refreshAllData}
          />
        )}
      </main>

      {/* Global Quick Receive Modal */}
      {showQuickReceive && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 shadow-xl text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ArrowDownToLine className="w-4 h-4 text-emerald-700" />
                Quick Stock Receive (Incoming)
              </h3>
              <button
                onClick={() => setShowQuickReceive(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickReceiveSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Store (Warehouse):
                  </label>
                  <select
                    value={quickRecvStoreId}
                    onChange={(e) => setQuickRecvStoreId(e.target.value)}
                    disabled={currentUser.role !== 'Admin' && Boolean(currentUser.assignedWarehouseId)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-lg p-2 focus:bg-white focus:outline-none"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.id}: {w.name} ({w.location})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tracking No.:
                  </label>
                  <input
                    type="text"
                    required
                    value={quickRecvTracking}
                    onChange={(e) => setQuickRecvTracking(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 rounded-lg p-2 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Item Code:
                </label>
                <input
                  type="text"
                  required
                  list="quickRecvList"
                  value={quickRecvItemCode}
                  onChange={(e) => {
                    setQuickRecvItemCode(e.target.value);
                    const it = items.find(i => i.oemPartNumber === e.target.value || i.sku === e.target.value);
                    if (it) {
                      setQuickRecvDesc(it.description);
                      setQuickRecvUnitCost(it.costPriceUSD);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 rounded-lg p-2 focus:bg-white focus:outline-none"
                />
                <datalist id="quickRecvList">
                  {items.map(i => (
                    <option key={i.id} value={i.oemPartNumber}>{i.brand} - {i.description}</option>
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantity Received:
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quickRecvQty}
                    onChange={(e) => setQuickRecvQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 rounded-lg p-2 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit Cost (USD):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={quickRecvUnitCost}
                    onChange={(e) => setQuickRecvUnitCost(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-lg p-2 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supplier:
                  </label>
                  <input
                    type="text"
                    required
                    value={quickRecvSupplier}
                    onChange={(e) => setQuickRecvSupplier(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-lg p-2 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Serial Number(s):
                  </label>
                  <input
                    type="text"
                    value={quickRecvSerial}
                    onChange={(e) => setQuickRecvSerial(e.target.value)}
                    placeholder="e.g. S-SIE-88192"
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 rounded-lg p-2 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickReceive(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                >
                  Save &amp; Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Quick Dispatch Modal */}
      {showQuickDispatch && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 shadow-xl text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ArrowUpFromLine className="w-4 h-4 text-slate-800" />
                Quick Stock Dispatch (Outgoing)
              </h3>
              <button
                onClick={() => setShowQuickDispatch(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {quickDispError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg p-2.5">
                {quickDispError}
              </div>
            )}

            <form onSubmit={handleQuickDispatchSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Issuing Store:
                  </label>
                  <select
                    value={quickDispStoreId}
                    onChange={(e) => setQuickDispStoreId(e.target.value)}
                    disabled={currentUser.role !== 'Admin' && Boolean(currentUser.assignedWarehouseId)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-lg p-2 focus:bg-white focus:outline-none"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.id}: {w.name} ({w.location})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tracking No.:
                  </label>
                  <input
                    type="text"
                    required
                    value={quickDispTracking}
                    onChange={(e) => setQuickDispTracking(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 rounded-lg p-2 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Item Code:
                </label>
                <input
                  type="text"
                  required
                  list="quickDispList"
                  value={quickDispItemCode}
                  onChange={(e) => {
                    setQuickDispItemCode(e.target.value);
                    const it = items.find(i => i.oemPartNumber === e.target.value || i.sku === e.target.value);
                    if (it) setQuickDispDesc(it.description);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 rounded-lg p-2 focus:bg-white focus:outline-none"
                />
                <datalist id="quickDispList">
                  {items.map(i => (
                    <option key={i.id} value={i.oemPartNumber}>{i.brand} - {i.description}</option>
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Customer / Store:
                  </label>
                  <input
                    type="text"
                    required
                    value={quickDispCustomer}
                    onChange={(e) => setQuickDispCustomer(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-lg p-2 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PO Reference:
                  </label>
                  <input
                    type="text"
                    required
                    value={quickDispPO}
                    onChange={(e) => setQuickDispPO(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 rounded-lg p-2 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantity Issued:
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quickDispQty}
                    onChange={(e) => setQuickDispQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 rounded-lg p-2 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Serial Number(s):
                  </label>
                  <input
                    type="text"
                    value={quickDispSerial}
                    onChange={(e) => setQuickDispSerial(e.target.value)}
                    placeholder="e.g. S-SIE-88192"
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 rounded-lg p-2 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Stock Check Badge */}
              <div className={`p-2.5 rounded-lg text-xs flex items-center justify-between border ${
                quickDispNegativeRisk
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <span>Available Stock in Store:</span>
                <span className="font-bold">{quickDispAvail} units</span>
              </div>

              {/* Negative Stock Override Checkbox for Admin */}
              {quickDispNegativeRisk && (
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-300 text-xs text-amber-900">
                  <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Issue exceeds available stock ({quickDispQty} &gt; {quickDispAvail})</span>
                  </div>
                  {currentUser.role === 'Admin' ? (
                    <label className="flex items-center gap-2 pt-2 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={quickDispAdminOverride}
                        onChange={(e) => setQuickDispAdminOverride(e.target.checked)}
                        className="rounded border-amber-400 text-slate-900 focus:ring-amber-500 w-4 h-4"
                      />
                      <span>Authorize negative stock issuance as Administrator</span>
                    </label>
                  ) : (
                    <p className="text-[11px] text-rose-700 font-semibold pt-1">
                      Negative stock requires Administrator authorization. You are logged in as {currentUser.role}.
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickDispatch(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={(quickDispNegativeRisk && currentUser.role !== 'Admin') || (quickDispNegativeRisk && !quickDispAdminOverride)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs disabled:opacity-50"
                >
                  Save &amp; Issue Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Login & User Switcher Modal */}
      {showLoginModal && (
        <SimpleLoginModal
          currentUser={currentUser}
          users={users}
          warehouses={warehouses}
          onSelectUser={(u) => {
            setCurrentUser(u);
            if (u.role !== 'Admin' && u.assignedWarehouseId) {
              setSelectedStoreId(u.assignedWarehouseId);
            }
          }}
          onLoginWithCredentials={handleLoginWithCredentials}
          onClose={() => setShowLoginModal(false)}
        />
      )}
    </div>
  );
}
