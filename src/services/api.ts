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
  AuditLog
} from '../types/erp';

const BASE_URL = '/api';

export const api = {
  // System Health
  getHealth: async () => {
    const res = await fetch(`${BASE_URL}/health`);
    return res.json();
  },

  // Auth & Users
  login: async (email: string, password?: string): Promise<{ success: boolean; user?: User; message?: string }> => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  },

  getUsers: async (): Promise<User[]> => {
    const res = await fetch(`${BASE_URL}/users`);
    return res.json();
  },

  createUser: async (user: Partial<User> & { password?: string; currentUser?: User }): Promise<User> => {
    const res = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create user');
    }
    return res.json();
  },

  updateUser: async (id: string, updates: Partial<User> & { password?: string; currentUser?: User }): Promise<User> => {
    const res = await fetch(`${BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update user');
    }
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

  // Warehouses (Add & Edit)
  getWarehouses: async (): Promise<Warehouse[]> => {
    const res = await fetch(`${BASE_URL}/warehouses`);
    return res.json();
  },

  createWarehouse: async (wh: Partial<Warehouse> & { currentUser?: User }): Promise<Warehouse> => {
    const res = await fetch(`${BASE_URL}/warehouses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wh)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create store');
    }
    return res.json();
  },

  updateWarehouse: async (id: string, data: Partial<Warehouse> & { currentUser?: User }): Promise<Warehouse> => {
    const res = await fetch(`${BASE_URL}/warehouses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update store');
    }
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
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create item');
    }
    return res.json();
  },

  updateItem: async (id: string, data: Partial<Item>, currentUser?: User): Promise<Item> => {
    const res = await fetch(`${BASE_URL}/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, currentUser })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update item');
    }
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

  // Set Closing Balance (Stock Count for transitioning Google Sheet data)
  setClosingBalance: async (data: {
    warehouseId: string;
    itemId: string;
    closingBalance: number;
    binLocation?: string;
    notes?: string;
    currentUser?: User;
  }): Promise<{ success: boolean; message: string; inventory: InventoryRecord; adjustmentDifference: number }> => {
    const res = await fetch(`${BASE_URL}/inventory/set-closing-balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to set closing balance');
    }
    return res.json();
  },

  bulkSetClosingBalances: async (data: {
    warehouseId: string;
    balances: { itemId: string; closingBalance: number; binLocation?: string }[];
    notes?: string;
    currentUser?: User;
  }): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${BASE_URL}/inventory/bulk-closing-balances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to bulk update closing balances');
    }
    return res.json();
  },

  // Inter-warehouse transfer
  transferStock: async (data: {
    sourceWarehouseId: string;
    destWarehouseId: string;
    itemId: string;
    quantity: number;
    notes?: string;
    currentUser?: User;
  }) => {
    const res = await fetch(`${BASE_URL}/inventory/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to transfer stock');
    }
    return res.json();
  },

  // Incoming Stock Transactions (Create & Edit)
  getIncomingTransactions: async (warehouseId?: string): Promise<IncomingStockTransaction[]> => {
    const url = warehouseId && warehouseId !== 'ALL'
      ? `${BASE_URL}/incoming?warehouseId=${encodeURIComponent(warehouseId)}`
      : `${BASE_URL}/incoming`;
    const res = await fetch(url);
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

  updateIncomingTransaction: async (
    id: string,
    updates: Partial<IncomingStockTransaction> & { currentUser?: User }
  ): Promise<{ success: boolean; message: string; transaction: IncomingStockTransaction; inventory: InventoryRecord }> => {
    const res = await fetch(`${BASE_URL}/incoming/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update incoming stock');
    }
    return res.json();
  },

  // Outgoing Stock Transactions (Create & Edit)
  getOutgoingTransactions: async (warehouseId?: string): Promise<OutgoingStockTransaction[]> => {
    const url = warehouseId && warehouseId !== 'ALL'
      ? `${BASE_URL}/outgoing?warehouseId=${encodeURIComponent(warehouseId)}`
      : `${BASE_URL}/outgoing`;
    const res = await fetch(url);
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

  updateOutgoingTransaction: async (
    id: string,
    updates: Partial<OutgoingStockTransaction> & { isAdminOverride?: boolean; currentUser?: User }
  ): Promise<{ success: boolean; message: string; transaction: OutgoingStockTransaction; inventory: InventoryRecord }> => {
    const res = await fetch(`${BASE_URL}/outgoing/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json();
      const error: any = new Error(err.message || err.error || 'Failed to update outgoing stock');
      error.status = res.status;
      error.details = err;
      throw error;
    }
    return res.json();
  },

  // Shipment Tracker
  getShipments: async (warehouseId?: string): Promise<ShipmentRecord[]> => {
    const url = warehouseId && warehouseId !== 'ALL'
      ? `${BASE_URL}/shipments?warehouseId=${encodeURIComponent(warehouseId)}`
      : `${BASE_URL}/shipments`;
    const res = await fetch(url);
    return res.json();
  },

  updateShipment: async (id: string, data: Partial<ShipmentRecord> & { updatedBy?: string }): Promise<ShipmentRecord> => {
    const res = await fetch(`${BASE_URL}/shipments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update shipment');
    }
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

  createSupplier: async (data: Partial<Supplier>, currentUser?: User): Promise<Supplier> => {
    const res = await fetch(`${BASE_URL}/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, currentUser })
    });
    return res.json();
  },

  updateSupplier: async (id: string, data: Partial<Supplier>, currentUser?: User): Promise<Supplier> => {
    const res = await fetch(`${BASE_URL}/suppliers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, currentUser })
    });
    return res.json();
  },

  getCustomers: async (): Promise<Customer[]> => {
    const res = await fetch(`${BASE_URL}/customers`);
    return res.json();
  },

  createCustomer: async (data: Partial<Customer>, currentUser?: User): Promise<Customer> => {
    const res = await fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, currentUser })
    });
    return res.json();
  },

  updateCustomer: async (id: string, data: Partial<Customer>, currentUser?: User): Promise<Customer> => {
    const res = await fetch(`${BASE_URL}/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, currentUser })
    });
    return res.json();
  },

  getAuditLogs: async (): Promise<AuditLog[]> => {
    const res = await fetch(`${BASE_URL}/audit`);
    return res.json();
  },

  // Google Sheets
  getGoogleSheetsConfig: async () => {
    const res = await fetch(`${BASE_URL}/database/config`);
    return res.json();
  },

  syncToGoogleSheets: async () => {
    const res = await fetch(`${BASE_URL}/database/sync-to-sheets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  }
};
