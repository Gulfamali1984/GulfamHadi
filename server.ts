import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { JWT } from 'google-auth-library';
import {
  INITIAL_ITEMS,
  INITIAL_WAREHOUSES,
  INITIAL_SUPPLIERS,
  INITIAL_CUSTOMERS,
  INITIAL_INVENTORY,
  INITIAL_INCOMING_TRANSACTIONS,
  INITIAL_OUTGOING_TRANSACTIONS,
  INITIAL_SHIPMENTS,
  INITIAL_USERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_GRN,
  INITIAL_OUTGOING_ORDERS
} from './src/data/mockData.ts';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'erp_database.json');
const CONFIG_FILE = path.join(DATA_DIR, 'google_sheets_config.json');

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface DatabaseState {
  items: typeof INITIAL_ITEMS;
  warehouses: typeof INITIAL_WAREHOUSES;
  suppliers: typeof INITIAL_SUPPLIERS;
  customers: typeof INITIAL_CUSTOMERS;
  inventory: typeof INITIAL_INVENTORY;
  incomingTransactions: typeof INITIAL_INCOMING_TRANSACTIONS;
  outgoingTransactions: typeof INITIAL_OUTGOING_TRANSACTIONS;
  shipments: typeof INITIAL_SHIPMENTS;
  users: typeof INITIAL_USERS;
  auditLogs: typeof INITIAL_AUDIT_LOGS;
  grn: typeof INITIAL_GRN;
  outgoingOrders: typeof INITIAL_OUTGOING_ORDERS;
}

function loadInitialState(): DatabaseState {
  return {
    items: JSON.parse(JSON.stringify(INITIAL_ITEMS)),
    warehouses: JSON.parse(JSON.stringify(INITIAL_WAREHOUSES)),
    suppliers: JSON.parse(JSON.stringify(INITIAL_SUPPLIERS)),
    customers: JSON.parse(JSON.stringify(INITIAL_CUSTOMERS)),
    inventory: JSON.parse(JSON.stringify(INITIAL_INVENTORY)),
    incomingTransactions: JSON.parse(JSON.stringify(INITIAL_INCOMING_TRANSACTIONS)),
    outgoingTransactions: JSON.parse(JSON.stringify(INITIAL_OUTGOING_TRANSACTIONS)),
    shipments: JSON.parse(JSON.stringify(INITIAL_SHIPMENTS)),
    users: JSON.parse(JSON.stringify(INITIAL_USERS)),
    auditLogs: JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS)),
    grn: JSON.parse(JSON.stringify(INITIAL_GRN)),
    outgoingOrders: JSON.parse(JSON.stringify(INITIAL_OUTGOING_ORDERS))
  };
}

let db: DatabaseState;

try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    // If database doesn't have the 9 warehouses (WH-001 through WH-009), reset to fresh initial state
    if (!parsed.warehouses || parsed.warehouses.length < 9 || parsed.warehouses[0].id !== 'WH-001') {
      console.log('Refreshing database with official 9 warehouses & clean schema...');
      db = loadInitialState();
      saveDatabase();
    } else {
      db = {
        ...loadInitialState(),
        ...parsed
      };
      if (!db.incomingTransactions) db.incomingTransactions = JSON.parse(JSON.stringify(INITIAL_INCOMING_TRANSACTIONS));
      if (!db.outgoingTransactions) db.outgoingTransactions = JSON.parse(JSON.stringify(INITIAL_OUTGOING_TRANSACTIONS));
    }
  } else {
    db = loadInitialState();
    saveDatabase();
  }
} catch (e) {
  console.error('Error loading database file, initializing seed data:', e);
  db = loadInitialState();
  saveDatabase();
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save database file:', err);
  }
}

// Google Sheets Config
interface GoogleSheetsSettings {
  spreadsheetId: string;
  serviceAccountEmail: string;
  privateKey: string;
  autoSync: boolean;
  lastSyncTime?: string;
}

let gSheetsConfig: GoogleSheetsSettings = {
  spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || '',
  serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
  privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '',
  autoSync: false
};

if (fs.existsSync(CONFIG_FILE)) {
  try {
    gSheetsConfig = { ...gSheetsConfig, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) };
  } catch (e) {
    console.error('Failed to read google_sheets_config.json:', e);
  }
}

function saveGSheetsConfig(cfg: GoogleSheetsSettings) {
  gSheetsConfig = cfg;
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save sheets config:', err);
  }
}

// Append Audit Log
function logAudit(action: string, module: string, entityType: string, entityId: string, entityCode: string, details: string, user: { id?: string; name?: string; role?: string }) {
  const newLog = {
    id: `LOG-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    userId: user?.id || 'SYS',
    userName: user?.name || 'System User',
    userRole: user?.role || 'Admin',
    action,
    module,
    entityType,
    entityId,
    entityCode,
    details
  };
  db.auditLogs.unshift(newLog);
  if (db.auditLogs.length > 500) {
    db.auditLogs = db.auditLogs.slice(0, 500);
  }
  saveDatabase();
  return newLog;
}

// Google Sheets Client via Service Account
async function getGoogleSheetsClient(email: string, privateKey: string) {
  const cleanedKey = privateKey.replace(/\\n/g, '\n');
  const client = new JWT({
    email,
    key: cleanedKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  await client.authorize();
  return client;
}

// ==========================================
// SYSTEM & HEALTH
// ==========================================
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    system: 'Real Deals Procurement & Logistics Management ERP',
    timestamp: new Date().toISOString(),
    warehousesCount: db.warehouses.length,
    itemsCount: db.items.length,
    inventoryRecordsCount: db.inventory.length,
    incomingCount: db.incomingTransactions.length,
    outgoingCount: db.outgoingTransactions.length,
    shipmentsCount: db.shipments.length,
    usersCount: db.users.length,
    googleSheetsConnected: Boolean(gSheetsConfig.spreadsheetId && gSheetsConfig.serviceAccountEmail && gSheetsConfig.privateKey)
  });
});

// ==========================================
// AUTHENTICATION & LOGIN
// ==========================================
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  const user = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email address.' });
  }

  if (!user.active) {
    return res.status(403).json({ success: false, message: 'This user account has been deactivated. Please contact an Administrator.' });
  }

  // Check password if set on user
  if (user.password && password && user.password !== password) {
    return res.status(401).json({ success: false, message: 'Incorrect password.' });
  }

  user.lastLogin = new Date().toISOString().replace('T', ' ').slice(0, 16);
  saveDatabase();

  logAudit('USER_LOGIN', 'Authentication', 'User', user.id, user.email, `User ${user.name} logged in (${user.role})`, user);

  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      assignedWarehouseId: user.assignedWarehouseId,
      department: user.department,
      active: user.active
    }
  });
});

// ==========================================
// USER MANAGEMENT (ADMIN ONLY)
// ==========================================
app.get('/api/users', (req: Request, res: Response) => {
  // Strip passwords in output
  const safeUsers = db.users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    department: u.department,
    assignedWarehouseId: u.assignedWarehouseId,
    active: u.active,
    lastLogin: u.lastLogin
  }));
  res.json(safeUsers);
});

app.post('/api/users', (req: Request, res: Response) => {
  const { name, email, role, password, assignedWarehouseId, department, currentUser } = req.body;
  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Name, email, and role are required.' });
  }

  const existing = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'A user with this email address already exists.' });
  }

  const count = db.users.length + 1;
  const newUser = {
    id: `USR-${count.toString().padStart(3, '0')}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: role as 'Admin' | 'Warehouse Manager' | 'Staff',
    password: password || 'password',
    assignedWarehouseId: role === 'Admin' ? undefined : assignedWarehouseId,
    department: department || (role === 'Admin' ? 'Management' : 'Warehouse Operations'),
    active: true,
    lastLogin: 'Never'
  };

  db.users.push(newUser);
  saveDatabase();

  logAudit('CREATE_USER', 'User Management', 'User', newUser.id, newUser.email, `Created user ${newUser.name} with role ${newUser.role}`, currentUser || { id: 'SYS', name: 'Admin', role: 'Admin' });

  res.json({
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    department: newUser.department,
    assignedWarehouseId: newUser.assignedWarehouseId,
    active: newUser.active
  });
});

app.put('/api/users/:id', (req: Request, res: Response) => {
  const { name, email, role, assignedWarehouseId, department, active, currentUser } = req.body;
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });

  const u = db.users[idx];
  if (name !== undefined) u.name = name;
  if (email !== undefined) u.email = email;
  if (role !== undefined) {
    u.role = role;
    if (role === 'Admin') u.assignedWarehouseId = undefined;
  }
  if (assignedWarehouseId !== undefined && u.role !== 'Admin') u.assignedWarehouseId = assignedWarehouseId;
  if (department !== undefined) u.department = department;
  if (active !== undefined) u.active = active;

  saveDatabase();
  logAudit('UPDATE_USER', 'User Management', 'User', u.id, u.email, `Updated profile for user ${u.name}`, currentUser || { id: 'SYS', name: 'Admin', role: 'Admin' });

  res.json({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    department: u.department,
    assignedWarehouseId: u.assignedWarehouseId,
    active: u.active
  });
});

app.put('/api/users/:id/password', (req: Request, res: Response) => {
  const { newPassword, currentUser } = req.body;
  if (!newPassword) return res.status(400).json({ error: 'New password is required.' });

  const u = db.users.find(usr => usr.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found' });

  u.password = newPassword;
  saveDatabase();

  logAudit('CHANGE_PASSWORD', 'User Management', 'User', u.id, u.email, `Password changed for user ${u.name}`, currentUser || { id: 'SYS', name: 'Admin', role: 'Admin' });

  res.json({ success: true, message: 'Password updated successfully.' });
});

app.put('/api/users/:id/status', (req: Request, res: Response) => {
  const { active, currentUser } = req.body;
  const u = db.users.find(usr => usr.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found' });

  u.active = Boolean(active);
  saveDatabase();

  logAudit('USER_STATUS_TOGGLE', 'User Management', 'User', u.id, u.email, `User ${u.name} status set to ${u.active ? 'Active' : 'Deactivated'}`, currentUser || { id: 'SYS', name: 'Admin', role: 'Admin' });

  res.json({ success: true, active: u.active });
});

// ==========================================
// WAREHOUSES (9 WAREHOUSES)
// ==========================================
app.get('/api/warehouses', (req: Request, res: Response) => {
  res.json(db.warehouses);
});

app.put('/api/warehouses/:id', (req: Request, res: Response) => {
  const idx = db.warehouses.findIndex(w => w.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Warehouse not found' });
  db.warehouses[idx] = { ...db.warehouses[idx], ...req.body };
  saveDatabase();
  res.json(db.warehouses[idx]);
});

// ==========================================
// ITEMS CATALOG
// ==========================================
app.get('/api/items', (req: Request, res: Response) => {
  res.json(db.items);
});

app.post('/api/items', (req: Request, res: Response) => {
  const newItem = {
    ...req.body,
    id: `ITEM-${(db.items.length + 1).toString().padStart(3, '0')}`,
    createdAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10)
  };
  db.items.unshift(newItem);

  // Initialize zero inventory for each warehouse
  db.warehouses.forEach(wh => {
    db.inventory.push({
      id: `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900)}`,
      itemId: newItem.id,
      warehouseId: wh.id,
      binLocation: 'Shelf A-01',
      physicalStock: 0,
      reservedStock: 0,
      availableStock: 0,
      inTransitStock: 0,
      quarantinedStock: 0,
      lastCountDate: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10)
    });
  });

  saveDatabase();
  logAudit('CREATE_ITEM', 'Items', 'Item', newItem.id, newItem.oemPartNumber, `Added spare part ${newItem.oemPartNumber} (${newItem.brand})`, req.body.currentUser || { id: 'SYS', name: 'Admin', role: 'Admin' });
  res.json(newItem);
});

// ==========================================
// INVENTORY
// ==========================================
app.get('/api/inventory', (req: Request, res: Response) => {
  const { warehouseId, itemId } = req.query;
  let result = db.inventory;
  if (warehouseId && warehouseId !== 'ALL') {
    result = result.filter(i => i.warehouseId === warehouseId);
  }
  if (itemId) {
    result = result.filter(i => i.itemId === itemId);
  }
  res.json(result);
});

// Consolidated Inventory across all 9 warehouses
app.get('/api/inventory/consolidated', (req: Request, res: Response) => {
  const consolidated = db.items.map(item => {
    const invRecords = db.inventory.filter(i => i.itemId === item.id);
    const totalPhysical = invRecords.reduce((sum, i) => sum + i.physicalStock, 0);
    const totalReserved = invRecords.reduce((sum, i) => sum + i.reservedStock, 0);
    const totalAvailable = invRecords.reduce((sum, i) => sum + i.availableStock, 0);
    const totalInTransit = invRecords.reduce((sum, i) => sum + i.inTransitStock, 0);
    const totalQuarantined = invRecords.reduce((sum, i) => sum + i.quarantinedStock, 0);
    const totalValuationUSD = totalPhysical * item.costPriceUSD;

    const warehouseBreakdown = db.warehouses.map(wh => {
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

  res.json(consolidated);
});

app.put('/api/inventory/:id', (req: Request, res: Response) => {
  const idx = db.inventory.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Record not found' });
  const updated = {
    ...db.inventory[idx],
    ...req.body,
    updatedAt: new Date().toISOString().slice(0, 10)
  };
  updated.availableStock = updated.physicalStock - updated.reservedStock - updated.quarantinedStock;
  db.inventory[idx] = updated;
  saveDatabase();
  res.json(updated);
});

// ==========================================
// 4. INCOMING STOCK (EXACT 9 FIELDS)
// Fields: Date, Tracking No, Item Code, Serial Number, Warehouse, Supplier, Quantity Received, Item Name / Description, Unit Cost
// ==========================================
app.get('/api/incoming', (req: Request, res: Response) => {
  res.json(db.incomingTransactions);
});

app.post('/api/incoming', (req: Request, res: Response) => {
  const {
    date,
    trackingNo,
    itemCode,
    serialNumber,
    warehouseId,
    supplier,
    quantityReceived,
    itemDescription,
    unitCost,
    currentUser
  } = req.body;

  if (!itemCode || !warehouseId || !quantityReceived || Number(quantityReceived) <= 0) {
    return res.status(400).json({ error: 'Item Code, Warehouse, and positive Quantity Received are required.' });
  }

  const wh = db.warehouses.find(w => w.id === warehouseId) || db.warehouses[0];
  let itm = db.items.find(i => i.oemPartNumber.toLowerCase() === itemCode.toLowerCase() || i.sku.toLowerCase() === itemCode.toLowerCase());

  // If item doesn't exist, create it in catalog
  if (!itm) {
    itm = {
      id: `ITEM-${(db.items.length + 1).toString().padStart(3, '0')}`,
      sku: itemCode,
      oemPartNumber: itemCode,
      brand: 'Industrial Spare',
      description: itemDescription || itemCode,
      category: 'Spare Parts',
      condition: 'Factory Sealed New',
      unit: 'PCS',
      costPriceUSD: Number(unitCost) || 0,
      sellingPriceUSD: (Number(unitCost) || 0) * 1.5,
      weightKg: 1.0,
      hsCode: '8537.10.91',
      countryOfOrigin: 'USA',
      minSafetyStock: 2,
      reorderPoint: 4,
      targetStockLevel: 10,
      defaultLeadTimeDays: 14,
      createdAt: date || new Date().toISOString().slice(0, 10),
      updatedAt: date || new Date().toISOString().slice(0, 10)
    };
    db.items.push(itm);
  }

  const qty = Number(quantityReceived);
  const cost = Number(unitCost) || itm.costPriceUSD || 0;
  const count = db.incomingTransactions.length + 1;
  const incId = `INC-2026-${count.toString().padStart(4, '0')}`;
  const userName = currentUser?.name || 'Warehouse Staff';

  const transaction = {
    id: incId,
    date: date || new Date().toISOString().slice(0, 10),
    trackingNo: trackingNo || `TRK-IN-${Date.now().toString(36).toUpperCase()}`,
    itemCode: itm.oemPartNumber,
    serialNumber: serialNumber || '',
    warehouseId: wh.id,
    warehouseCode: wh.code,
    warehouseName: `${wh.name} (${wh.location})`,
    supplier: supplier || 'Supplier Direct Consignment',
    quantityReceived: qty,
    itemDescription: itemDescription || itm.description,
    unitCost: cost,
    totalCostUSD: qty * cost,
    createdByUser: userName,
    createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
  };

  db.incomingTransactions.unshift(transaction);

  // Automatically update inventory for this warehouse & item
  let inv = db.inventory.find(i => i.itemId === itm!.id && i.warehouseId === wh.id);
  if (!inv) {
    inv = {
      id: `INV-${Date.now().toString(36).toUpperCase()}`,
      itemId: itm.id,
      warehouseId: wh.id,
      binLocation: 'Shelf A-01',
      physicalStock: 0,
      reservedStock: 0,
      availableStock: 0,
      inTransitStock: 0,
      quarantinedStock: 0,
      lastCountDate: transaction.date,
      updatedAt: transaction.date
    };
    db.inventory.push(inv);
  }

  inv.physicalStock += qty;
  inv.availableStock = inv.physicalStock - inv.reservedStock - inv.quarantinedStock;
  inv.lastCountDate = transaction.date;
  inv.updatedAt = transaction.date;

  // Add / sync to Shipment Tracker
  const newShipment = {
    id: `SHP-${Date.now().toString(36).toUpperCase()}`,
    trackingNumber: transaction.trackingNo,
    type: 'Incoming' as const,
    warehouseId: wh.id,
    warehouseCode: wh.code,
    itemCode: transaction.itemCode,
    itemName: transaction.itemDescription,
    serialNumber: transaction.serialNumber,
    quantity: qty,
    party: transaction.supplier,
    poOrRef: transaction.id,
    date: transaction.date,
    carrier: 'Inbound Carrier',
    status: 'Delivered' as const,
    notes: `Received at ${wh.name} by ${userName}`,
    recordedBy: userName,
    updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
  };
  db.shipments.unshift(newShipment);

  // Maintain legacy GoodsReceiptNote for backward compatibility
  db.grn.unshift({
    id: transaction.id,
    grnNumber: transaction.id,
    supplierId: 'SUP-001',
    supplierName: transaction.supplier,
    warehouseId: wh.id,
    warehouseCode: wh.code,
    receivedDate: transaction.date,
    receivedBy: userName,
    status: 'Accepted',
    deliveryDocketNumber: transaction.trackingNo,
    carrier: 'Direct Freight',
    trackingNumber: transaction.trackingNo,
    items: [
      {
        id: `GRNI-${Date.now()}`,
        itemId: itm.id,
        sku: itm.sku,
        oemPartNumber: itm.oemPartNumber,
        quantityReceived: qty,
        quantityPassed: qty,
        quantityQuarantined: 0,
        binLocation: inv.binLocation,
        serialNumbers: serialNumber ? serialNumber.split(',').map((s: string) => s.trim()) : [],
        unitCost: cost
      }
    ]
  });

  saveDatabase();

  logAudit(
    'STOCK_INCOMING',
    'Incoming Stock',
    'IncomingTransaction',
    transaction.id,
    transaction.trackingNo,
    `Received ${qty} units of ${transaction.itemCode} into ${wh.name} (${wh.location}) from ${transaction.supplier}. Unit Cost: $${cost}`,
    currentUser || { id: 'USR', name: userName, role: 'Staff' }
  );

  res.json({
    success: true,
    transaction,
    inventory: inv
  });
});

// ==========================================
// 5. OUTGOING STOCK (EXACT 9 FIELDS & NEGATIVE STOCK CHECK)
// Fields: Date Issued, Item Code, Tracking No, Serial Number, Warehouse, Customer / Warehouse, Quantity Issued, PO, Item Name / Description
// ==========================================
app.get('/api/outgoing', (req: Request, res: Response) => {
  res.json(db.outgoingTransactions);
});

app.post('/api/outgoing', (req: Request, res: Response) => {
  const {
    dateIssued,
    itemCode,
    trackingNo,
    serialNumber,
    warehouseId,
    customerOrWarehouse,
    quantityIssued,
    poNumber,
    itemDescription,
    isAdminOverride,
    currentUser
  } = req.body;

  if (!itemCode || !warehouseId || !quantityIssued || Number(quantityIssued) <= 0) {
    return res.status(400).json({ error: 'Item Code, Warehouse, and positive Quantity Issued are required.' });
  }

  const wh = db.warehouses.find(w => w.id === warehouseId) || db.warehouses[0];
  const itm = db.items.find(i => i.oemPartNumber.toLowerCase() === itemCode.toLowerCase() || i.sku.toLowerCase() === itemCode.toLowerCase() || i.id === itemCode);

  if (!itm) {
    return res.status(404).json({ error: `Item with code "${itemCode}" not found in inventory catalog.` });
  }

  const qty = Number(quantityIssued);
  const inv = db.inventory.find(i => i.itemId === itm.id && i.warehouseId === wh.id);
  const currentAvailable = inv ? inv.availableStock : 0;

  // Stock check: Do not allow an issue that would result in negative stock unless authorized administrator permits it
  if (currentAvailable < qty) {
    const isUserAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';
    if (!isAdminOverride && !isUserAdmin) {
      return res.status(400).json({
        error: 'INSUFFICIENT_STOCK',
        message: `Cannot issue stock: Available stock in ${wh.name} is only ${currentAvailable} units (Requested: ${qty}). Issuing negative stock requires Administrator authorization.`,
        availableStock: currentAvailable,
        requestedQty: qty,
        requiresAdminOverride: true
      });
    }
  }

  const count = db.outgoingTransactions.length + 1;
  const outId = `OUT-2026-${count.toString().padStart(4, '0')}`;
  const userName = currentUser?.name || 'Warehouse Staff';

  const transaction = {
    id: outId,
    dateIssued: dateIssued || new Date().toISOString().slice(0, 10),
    itemCode: itm.oemPartNumber,
    trackingNo: trackingNo || `TRK-OUT-${Date.now().toString(36).toUpperCase()}`,
    serialNumber: serialNumber || '',
    warehouseId: wh.id,
    warehouseCode: wh.code,
    warehouseName: `${wh.name} (${wh.location})`,
    customerOrWarehouse: customerOrWarehouse || 'Direct Customer Order',
    quantityIssued: qty,
    poNumber: poNumber || 'PO-DIRECT',
    itemDescription: itemDescription || itm.description,
    unitPriceUSD: itm.sellingPriceUSD,
    totalPriceUSD: qty * itm.sellingPriceUSD,
    createdByUser: userName,
    isAdminOverride: Boolean(isAdminOverride),
    createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
  };

  db.outgoingTransactions.unshift(transaction);

  // Update inventory record
  if (inv) {
    inv.physicalStock = Math.max(0, inv.physicalStock - qty);
    inv.availableStock = inv.physicalStock - inv.reservedStock - inv.quarantinedStock;
    inv.lastCountDate = transaction.dateIssued;
    inv.updatedAt = transaction.dateIssued;
  }

  // Add / sync to Shipment Tracker
  const newShipment = {
    id: `SHP-${Date.now().toString(36).toUpperCase()}`,
    trackingNumber: transaction.trackingNo,
    type: 'Outgoing' as const,
    warehouseId: wh.id,
    warehouseCode: wh.code,
    itemCode: transaction.itemCode,
    itemName: transaction.itemDescription,
    serialNumber: transaction.serialNumber,
    quantity: qty,
    party: transaction.customerOrWarehouse,
    poOrRef: transaction.poNumber,
    date: transaction.dateIssued,
    carrier: 'Outbound Express',
    status: 'In Transit' as const,
    notes: `Dispatched from ${wh.name} by ${userName}`,
    recordedBy: userName,
    updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
  };
  db.shipments.unshift(newShipment);

  // Maintain legacy OutgoingOrder
  db.outgoingOrders.unshift({
    id: transaction.id,
    orderNumber: transaction.id,
    customerId: 'CUST-001',
    customerName: transaction.customerOrWarehouse,
    warehouseId: wh.id,
    warehouseCode: wh.code,
    orderDate: transaction.dateIssued,
    requiredDeliveryDate: transaction.dateIssued,
    status: 'Dispatched',
    shippingAddress: `${wh.city} Local Dispatch`,
    carrier: 'Outbound Express',
    trackingNumber: transaction.trackingNo,
    totalAmountUSD: transaction.totalPriceUSD,
    pickedBy: userName,
    packedBy: userName,
    poNumber: transaction.poNumber,
    items: [
      {
        id: `OLI-${Date.now()}`,
        itemId: itm.id,
        sku: itm.sku,
        oemPartNumber: itm.oemPartNumber,
        brand: itm.brand,
        condition: itm.condition,
        quantity: qty,
        unitPriceUSD: itm.sellingPriceUSD,
        lineTotalUSD: transaction.totalPriceUSD,
        dispatchedSerialNumbers: serialNumber ? serialNumber.split(',').map((s: string) => s.trim()) : [],
        allocatedBin: inv?.binLocation || 'Shelf A-01'
      }
    ]
  });

  saveDatabase();

  logAudit(
    'STOCK_OUTGOING',
    'Outgoing Stock',
    'OutgoingTransaction',
    transaction.id,
    transaction.trackingNo,
    `Issued ${qty} units of ${transaction.itemCode} from ${wh.name} to ${transaction.customerOrWarehouse} (PO: ${transaction.poNumber})${transaction.isAdminOverride ? ' [Admin Negative Stock Override]' : ''}`,
    currentUser || { id: 'USR', name: userName, role: 'Staff' }
  );

  res.json({
    success: true,
    transaction,
    inventory: inv
  });
});

// ==========================================
// 6. SHIPMENT TRACKER
// ==========================================
app.get('/api/shipments', (req: Request, res: Response) => {
  res.json(db.shipments);
});

app.put('/api/shipments/:id/status', (req: Request, res: Response) => {
  const { status, notes, updatedBy } = req.body;
  const idx = db.shipments.findIndex(s => s.id === req.params.id || s.trackingNumber === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Shipment not found' });

  const shp = db.shipments[idx];
  shp.status = status;
  if (notes) shp.notes = notes;
  shp.updatedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
  if (updatedBy) shp.recordedBy = updatedBy;

  saveDatabase();
  logAudit('UPDATE_SHIPMENT_STATUS', 'Shipment Tracker', 'Shipment', shp.id, shp.trackingNumber, `Updated status to ${status}`, { id: 'USR', name: updatedBy || 'Staff', role: 'Staff' });

  res.json(shp);
});

// ==========================================
// SUPPLIERS & CUSTOMERS
// ==========================================
app.get('/api/suppliers', (req: Request, res: Response) => {
  res.json(db.suppliers);
});

app.get('/api/customers', (req: Request, res: Response) => {
  res.json(db.customers);
});

// Legacy GRN & Outgoing orders
app.get('/api/grn', (req: Request, res: Response) => {
  res.json(db.grn);
});

app.get('/api/outgoing-orders', (req: Request, res: Response) => {
  res.json(db.outgoingOrders);
});

// ==========================================
// GOOGLE SHEETS SYNC & AUTOMATIC SCHEMA
// ==========================================
app.post('/api/database/test-google-sheets', async (req: Request, res: Response) => {
  const { spreadsheetId, serviceAccountEmail, privateKey } = req.body;
  const sId = spreadsheetId || gSheetsConfig.spreadsheetId;
  const email = serviceAccountEmail || gSheetsConfig.serviceAccountEmail;
  const key = privateKey || gSheetsConfig.privateKey;

  if (!sId || !email || !key) {
    return res.status(400).json({
      success: false,
      message: 'Spreadsheet ID, Service Account Email, and Private Key are required.'
    });
  }

  try {
    const authClient = await getGoogleSheetsClient(email, key);
    const token = await authClient.getAccessToken();

    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sId)}`, {
      headers: { Authorization: `Bearer ${token.token}` }
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({
        success: false,
        message: `Google Sheets Error: ${err.error?.message || response.statusText}`
      });
    }

    const metadata = await response.json();
    const sheetTitles = (metadata.sheets || []).map((s: any) => s.properties?.title);

    gSheetsConfig.spreadsheetId = sId;
    gSheetsConfig.serviceAccountEmail = email;
    gSheetsConfig.privateKey = key;
    gSheetsConfig.lastSyncTime = new Date().toISOString();
    saveGSheetsConfig(gSheetsConfig);

    return res.json({
      success: true,
      message: `Verified read/write access to "${metadata.properties?.title || 'Spreadsheet'}"!`,
      sheets: sheetTitles
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: `Failed to authenticate with Google Sheets: ${error.message || error}`
    });
  }
});

// Automatically setup required sheets: Incoming Stock, Outgoing Stock, Inventory, Warehouses, Shipments, Users, Audit Log
app.post('/api/database/setup-sheets', async (req: Request, res: Response) => {
  const { spreadsheetId, serviceAccountEmail, privateKey } = req.body;
  const sId = spreadsheetId || gSheetsConfig.spreadsheetId;
  const email = serviceAccountEmail || gSheetsConfig.serviceAccountEmail;
  const key = privateKey || gSheetsConfig.privateKey;

  if (!sId || !email || !key) {
    return res.status(400).json({ success: false, message: 'Google Sheets credentials are not configured.' });
  }

  const SCHEMA_TABS = [
    { title: 'Incoming Stock', headers: ['Date', 'Tracking No', 'Item Code', 'Serial Number', 'Warehouse', 'Supplier', 'Quantity Received', 'Item Description', 'Unit Cost (USD)', 'Total (USD)', 'Recorded By'] },
    { title: 'Outgoing Stock', headers: ['Date Issued', 'Item Code', 'Tracking No', 'Serial Number', 'Warehouse', 'Customer / Warehouse', 'Quantity Issued', 'PO Number', 'Item Description', 'Total Price (USD)', 'Recorded By'] },
    { title: 'Inventory', headers: ['Item Code', 'Brand', 'Item Description', 'Warehouse ID', 'Warehouse Location', 'Physical Stock', 'Available Stock', 'Bin Location', 'Unit Cost (USD)', 'Valuation (USD)'] },
    { title: 'Warehouses', headers: ['Warehouse ID', 'Warehouse Code', 'Warehouse Name', 'Location', 'Manager', 'Contact Phone', 'Capacity (SqM)', 'Status'] },
    { title: 'Shipments', headers: ['Tracking Number', 'Type', 'Warehouse', 'Item Code', 'Item Description', 'Quantity', 'Party', 'PO / Reference', 'Date', 'Carrier', 'Status', 'Recorded By'] },
    { title: 'Users', headers: ['User ID', 'Name', 'Email', 'Role', 'Assigned Warehouse', 'Status', 'Last Login'] },
    { title: 'Audit Log', headers: ['Timestamp', 'User', 'Role', 'Action', 'Module', 'Entity Code', 'Details'] }
  ];

  try {
    const authClient = await getGoogleSheetsClient(email, key);
    const token = await authClient.getAccessToken();

    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sId)}`, {
      headers: { Authorization: `Bearer ${token.token}` }
    });
    const meta = await metaRes.json();
    const existingTitles = (meta.sheets || []).map((s: any) => s.properties?.title);

    const addSheetRequests = SCHEMA_TABS
      .filter(t => !existingTitles.includes(t.title))
      .map(t => ({
        addSheet: { properties: { title: t.title } }
      }));

    if (addSheetRequests.length > 0) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sId)}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests: addSheetRequests })
      });
    }

    const valueUpdates = SCHEMA_TABS.map(tab => ({
      range: `${tab.title}!A1:${String.fromCharCode(64 + tab.headers.length)}1`,
      values: [tab.headers]
    }));

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sId)}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: valueUpdates
      })
    });

    return res.json({
      success: true,
      message: `Configured all ${SCHEMA_TABS.length} sheets in your Google Spreadsheet with formatted columns!`,
      sheets: SCHEMA_TABS.map(t => t.title)
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: `Failed to set up Google Sheets: ${err.message}` });
  }
});

// Full data sync to Google Sheets
app.post('/api/database/sync-to-sheets', async (req: Request, res: Response) => {
  const { spreadsheetId, serviceAccountEmail, privateKey } = req.body;
  const sId = spreadsheetId || gSheetsConfig.spreadsheetId;
  const email = serviceAccountEmail || gSheetsConfig.serviceAccountEmail;
  const key = privateKey || gSheetsConfig.privateKey;

  if (!sId || !email || !key) {
    return res.status(400).json({ success: false, message: 'Google Sheets credentials are required.' });
  }

  try {
    const authClient = await getGoogleSheetsClient(email, key);
    const token = await authClient.getAccessToken();

    const incomingData = [
      ['Date', 'Tracking No', 'Item Code', 'Serial Number', 'Warehouse', 'Supplier', 'Quantity Received', 'Item Description', 'Unit Cost (USD)', 'Total (USD)', 'Recorded By'],
      ...db.incomingTransactions.map(inc => [
        inc.date, inc.trackingNo, inc.itemCode, inc.serialNumber, inc.warehouseName, inc.supplier, inc.quantityReceived, inc.itemDescription, inc.unitCost, inc.totalCostUSD, inc.createdByUser
      ])
    ];

    const outgoingData = [
      ['Date Issued', 'Item Code', 'Tracking No', 'Serial Number', 'Warehouse', 'Customer / Warehouse', 'Quantity Issued', 'PO Number', 'Item Description', 'Total Price (USD)', 'Recorded By'],
      ...db.outgoingTransactions.map(out => [
        out.dateIssued, out.itemCode, out.trackingNo, out.serialNumber, out.warehouseName, out.customerOrWarehouse, out.quantityIssued, out.poNumber, out.itemDescription, out.totalPriceUSD, out.createdByUser
      ])
    ];

    const inventoryData = [
      ['Item Code', 'Brand', 'Item Description', 'Warehouse ID', 'Warehouse Location', 'Physical Stock', 'Available Stock', 'Bin Location', 'Unit Cost (USD)', 'Valuation (USD)'],
      ...db.inventory.map(inv => {
        const item = db.items.find(i => i.id === inv.itemId);
        const wh = db.warehouses.find(w => w.id === inv.warehouseId);
        return [
          item?.oemPartNumber || '', item?.brand || '', item?.description || '', wh?.id || '', wh?.location || '', inv.physicalStock, inv.availableStock, inv.binLocation, item?.costPriceUSD || 0, (inv.physicalStock * (item?.costPriceUSD || 0))
        ];
      })
    ];

    const warehousesData = [
      ['Warehouse ID', 'Warehouse Code', 'Warehouse Name', 'Location', 'Manager', 'Contact Phone', 'Capacity (SqM)', 'Status'],
      ...db.warehouses.map(w => [w.id, w.code, w.name, w.location, w.managerName, w.contactPhone, w.totalCapacitySqM, w.active ? 'Active' : 'Inactive'])
    ];

    const shipmentsData = [
      ['Tracking Number', 'Type', 'Warehouse', 'Item Code', 'Item Description', 'Quantity', 'Party', 'PO / Reference', 'Date', 'Carrier', 'Status', 'Recorded By'],
      ...db.shipments.map(s => [s.trackingNumber, s.type, s.warehouseCode, s.itemCode, s.itemName, s.quantity, s.party, s.poOrRef, s.date, s.carrier, s.status, s.recordedBy])
    ];

    const usersData = [
      ['User ID', 'Name', 'Email', 'Role', 'Assigned Warehouse', 'Status', 'Last Login'],
      ...db.users.map(u => [u.id, u.name, u.email, u.role, u.assignedWarehouseId || 'All Stores', u.active ? 'Active' : 'Inactive', u.lastLogin || ''])
    ];

    const auditData = [
      ['Timestamp', 'User', 'Role', 'Action', 'Module', 'Entity Code', 'Details'],
      ...db.auditLogs.map(a => [a.timestamp, a.userName, a.userRole, a.action, a.module, a.entityCode, a.details])
    ];

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sId)}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: 'Incoming Stock!A1', values: incomingData },
          { range: 'Outgoing Stock!A1', values: outgoingData },
          { range: 'Inventory!A1', values: inventoryData },
          { range: 'Warehouses!A1', values: warehousesData },
          { range: 'Shipments!A1', values: shipmentsData },
          { range: 'Users!A1', values: usersData },
          { range: 'Audit Log!A1', values: auditData }
        ]
      })
    });

    gSheetsConfig.lastSyncTime = new Date().toISOString();
    saveGSheetsConfig(gSheetsConfig);

    return res.json({
      success: true,
      message: 'Successfully synchronized ERP database to Google Sheets!',
      syncTime: gSheetsConfig.lastSyncTime
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: `Sync failed: ${err.message}` });
  }
});

// Google Apps Script generator
app.get('/api/database/apps-script-code', (req: Request, res: Response) => {
  const codeGs = `
/**
 * Real Deals Procurement & Logistics Management ERP
 * Google Apps Script Web App Connector
 */
const SHEET_NAMES = {
  INCOMING: 'Incoming Stock',
  OUTGOING: 'Outgoing Stock',
  INVENTORY: 'Inventory',
  WAREHOUSES: 'Warehouses',
  SHIPMENTS: 'Shipments',
  USERS: 'Users',
  AUDIT: 'Audit Log'
};

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const action = e.parameter ? e.parameter.action : 'health';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'getWarehouses') {
    const sheet = ss.getSheetByName(SHEET_NAMES.WAREHOUSES);
    const data = sheet.getDataRange().getValues();
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', system: 'Real Deals Google Apps Script ERP Backend' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function setupRealDealsDatabaseSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.values(SHEET_NAMES).forEach(name => {
    if (!ss.getSheetByName(name)) {
      ss.insertSheet(name);
    }
  });
  Logger.log('Real Deals ERP Sheets initialized.');
}
`;

  res.json({
    codeGs,
    instructions: [
      '1. Open your target Google Sheet.',
      '2. In the menu, click Extensions > Apps Script.',
      '3. Paste this code into Code.gs and save.',
      '4. Run "setupRealDealsDatabaseSheets" once to prepare all tabs.',
      '5. Click Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).',
      '6. Copy the Web App URL into ERP Settings.'
    ]
  });
});

// Database Config
app.post('/api/database/config', (req: Request, res: Response) => {
  const { spreadsheetId, serviceAccountEmail, privateKey, autoSync } = req.body;
  if (spreadsheetId !== undefined) gSheetsConfig.spreadsheetId = spreadsheetId;
  if (serviceAccountEmail !== undefined) gSheetsConfig.serviceAccountEmail = serviceAccountEmail;
  if (privateKey !== undefined) gSheetsConfig.privateKey = privateKey;
  if (autoSync !== undefined) gSheetsConfig.autoSync = autoSync;
  saveGSheetsConfig(gSheetsConfig);
  res.json({ success: true, message: 'Settings saved', config: gSheetsConfig });
});

app.get('/api/database/config', (req: Request, res: Response) => {
  res.json({
    spreadsheetId: gSheetsConfig.spreadsheetId,
    serviceAccountEmail: gSheetsConfig.serviceAccountEmail,
    autoSync: gSheetsConfig.autoSync,
    lastSyncTime: gSheetsConfig.lastSyncTime
  });
});

app.get('/api/audit-logs', (req: Request, res: Response) => {
  res.json(db.auditLogs);
});

// Reset seed
app.post('/api/database/reset-seed', (req: Request, res: Response) => {
  db = loadInitialState();
  saveDatabase();
  res.json({ success: true, message: 'Database reset to factory 9-warehouse seed dataset.' });
});

// ==========================================
// VITE SPA MIDDLEWARE / STATIC SERVER
// ==========================================
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Real Deals ERP Server listening on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start Real Deals ERP Server:', err);
  process.exit(1);
});
