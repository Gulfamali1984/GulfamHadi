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
  User,
  AuditLog,
  GoodsReceiptNote,
  OutgoingOrder
} from '../types/erp';

const BASE_URL = '/api';

export const api = {
  // System Health & Diagnostics
  getHealth: async () => {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error('Failed to fetch health');
    return res.json();
  },

  // Authentication & Login
  login: async (email: string, password?: string): Promise<{ success: boolean; user?: User; message?: string }> => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  },

  // User Management
  getUsers: async (): Promise<User[]> => {
    const res = await fetch(`${BASE_URL}/users`);
    return res.json();
  },

  createUser: async (user: Partial<User>, currentUser?: User): Promise<User> => {
    const res = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...user, currentUser })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create user');
    }
    return res.json();
  },

  updateUser: async (id: string, data: Partial<User>, currentUser?: User): Promise<User> => {
    const res = await fetch(`${BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, currentUser })
    });
    if (!res.ok) throw new Error('Failed to update user');
    return res.json();
  },

  updateUserPassword: async (id: string, newPassword: string, currentUser?: User) => {
    const res = await fetch(`${BASE_URL}/users/${id}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword, currentUser })
    });
    return res.json();
  },

  toggleUserStatus: async (id: string, active: boolean, currentUser?: User) => {
    const res = await fetch(`${BASE_URL}/users/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active, currentUser })
    });
    return res.json();
  },

  // Warehouses
  getWarehouses: async (): Promise<Warehouse[]> => {
    const res = await fetch(`${BASE_URL}/warehouses`);
    return res.json();
  },

  updateWarehouse: async (id: string, data: Partial<Warehouse>): Promise<Warehouse> => {
    const res = await fetch(`${BASE_URL}/warehouses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Items Catalog
  getItems: async (): Promise<Item[]> => {
    const res = await fetch(`${BASE_URL}/items`);
    return res.json();
  },

  createItem: async (item: Partial<Item>, currentUser?: User): Promise<Item> => {
    const res = await fetch(`${BASE_URL}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, currentUser })
    });
    return res.json();
  },

  // Inventory
  getInventory: async (warehouseId?: string): Promise<InventoryRecord[]> => {
    const url = warehouseId && warehouseId !== 'ALL'
      ? `${BASE_URL}/inventory?warehouseId=${encodeURIComponent(warehouseId)}`
      : `${BASE_URL}/inventory`;
    const res = await fetch(url);
    return res.json();
  },

  getConsolidatedInventory: async (): Promise<ConsolidatedInventoryItem[]> => {
    const res = await fetch(`${BASE_URL}/inventory/consolidated`);
    return res.json();
  },

  updateInventoryRecord: async (id: string, updates: Partial<InventoryRecord>): Promise<InventoryRecord> => {
    const res = await fetch(`${BASE_URL}/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  // 4. Incoming Stock Transactions
  getIncomingTransactions: async (): Promise<IncomingStockTransaction[]> => {
    const res = await fetch(`${BASE_URL}/incoming`);
    return res.json();
  },

  createIncomingTransaction: async (data: {
    date: string;
    trackingNo: string;
    itemCode: string;
    serialNumber: string;
    warehouseId: string;
    supplier: string;
    quantityReceived: number;
    itemDescription: string;
    unitCost: number;
  }, currentUser?: User): Promise<{ success: boolean; transaction: IncomingStockTransaction; inventory: InventoryRecord }> => {
    const res = await fetch(`${BASE_URL}/incoming`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, currentUser })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to record incoming stock');
    }
    return res.json();
  },

  // 5. Outgoing Stock Transactions
  getOutgoingTransactions: async (): Promise<OutgoingStockTransaction[]> => {
    const res = await fetch(`${BASE_URL}/outgoing`);
    return res.json();
  },

  createOutgoingTransaction: async (data: {
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
  }, currentUser?: User): Promise<{ success: boolean; transaction: OutgoingStockTransaction; inventory: InventoryRecord }> => {
    const res = await fetch(`${BASE_URL}/outgoing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, currentUser })
    });
    if (!res.ok) {
      const err = await res.json();
      const error: any = new Error(err.message || err.error || 'Failed to record outgoing stock');
      error.status = res.status;
      error.details = err;
      throw error;
    }
    return res.json();
  },

  // 6. Shipment Tracker
  getShipments: async (): Promise<ShipmentRecord[]> => {
    const res = await fetch(`${BASE_URL}/shipments`);
    return res.json();
  },

  updateShipmentStatus: async (id: string, status: string, notes?: string, updatedBy?: string): Promise<ShipmentRecord> => {
    const res = await fetch(`${BASE_URL}/shipments/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes, updatedBy })
    });
    return res.json();
  },

  // Suppliers & Customers
  getSuppliers: async (): Promise<Supplier[]> => {
    const res = await fetch(`${BASE_URL}/suppliers`);
    return res.json();
  },

  getCustomers: async (): Promise<Customer[]> => {
    const res = await fetch(`${BASE_URL}/customers`);
    return res.json();
  },

  // Legacy GRN & Outgoing Order methods for backwards compatibility
  getGRNList: async (): Promise<GoodsReceiptNote[]> => {
    const res = await fetch(`${BASE_URL}/grn`);
    return res.json();
  },

  createGRN: async (grn: any, currentUser?: User) => {
    // Map to incoming
    const item = grn.items?.[0];
    return api.createIncomingTransaction({
      date: grn.receivedDate || new Date().toISOString().slice(0, 10),
      trackingNo: grn.deliveryDocketNumber || grn.trackingNumber || `TRK-IN-${Date.now()}`,
      itemCode: item?.oemPartNumber || item?.sku || 'GENERIC-PART',
      serialNumber: Array.isArray(item?.serialNumbers) ? item.serialNumbers.join(', ') : '',
      warehouseId: grn.warehouseId,
      supplier: grn.supplierName || 'Direct Supplier',
      quantityReceived: item?.quantityReceived || 1,
      itemDescription: item?.inspectionNotes || item?.oemPartNumber || 'Spare Part',
      unitCost: item?.unitCost || 0
    }, currentUser);
  },

  getOutgoingOrders: async (): Promise<OutgoingOrder[]> => {
    const res = await fetch(`${BASE_URL}/outgoing-orders`);
    return res.json();
  },

  createOutgoingOrder: async (order: any, currentUser?: User) => {
    const item = order.items?.[0];
    return api.createOutgoingTransaction({
      dateIssued: order.orderDate || new Date().toISOString().slice(0, 10),
      itemCode: item?.oemPartNumber || item?.sku || 'GENERIC-PART',
      trackingNo: order.trackingNumber || `TRK-OUT-${Date.now()}`,
      serialNumber: Array.isArray(item?.dispatchedSerialNumbers) ? item.dispatchedSerialNumbers.join(', ') : '',
      warehouseId: order.warehouseId,
      customerOrWarehouse: order.customerName || 'Customer Order',
      quantityIssued: item?.quantity || 1,
      poNumber: order.poNumber || 'PO-DIRECT',
      itemDescription: item?.brand ? `${item.brand} ${item.oemPartNumber}` : (item?.oemPartNumber || 'Spare Part'),
      isAdminOverride: false
    }, currentUser);
  },

  // Google Sheets Management
  testGoogleSheets: async (payload: { spreadsheetId: string; serviceAccountEmail: string; privateKey: string }) => {
    const res = await fetch(`${BASE_URL}/database/test-google-sheets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  setupGoogleSheetsSchema: async (payload?: { spreadsheetId?: string; serviceAccountEmail?: string; privateKey?: string }) => {
    const res = await fetch(`${BASE_URL}/database/setup-sheets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    return res.json();
  },

  syncToGoogleSheets: async (payload?: { spreadsheetId?: string; serviceAccountEmail?: string; privateKey?: string }) => {
    const res = await fetch(`${BASE_URL}/database/sync-to-sheets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    return res.json();
  },

  getAppsScriptCode: async () => {
    const res = await fetch(`${BASE_URL}/database/apps-script-code`);
    return res.json();
  },

  getGoogleSheetsConfig: async () => {
    const res = await fetch(`${BASE_URL}/database/config`);
    return res.json();
  },

  saveGoogleSheetsConfig: async (config: any) => {
    const res = await fetch(`${BASE_URL}/database/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return res.json();
  },

  getAuditLogs: async (): Promise<AuditLog[]> => {
    const res = await fetch(`${BASE_URL}/audit-logs`);
    return res.json();
  },

  resetDemoData: async () => {
    const res = await fetch(`${BASE_URL}/database/reset-seed`, { method: 'POST' });
    return res.json();
  },

  restoreBackupJson: async (backupData: any) => {
    const res = await fetch(`${BASE_URL}/database/import-json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backupData)
    });
    return res.json();
  }
};
