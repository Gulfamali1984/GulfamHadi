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
  INITIAL_PURCHASE_ORDERS,
  INITIAL_GRN,
  INITIAL_OUTGOING_ORDERS
} from './src/data/mockData';
import {
  Item,
  Warehouse,
  Supplier,
  Customer,
  InventoryRecord,
  IncomingStockTransaction,
  OutgoingStockTransaction,
  ShipmentRecord,
  User,
  AuditLog,
  PurchaseOrder,
  GoodsReceiptNote,
  OutgoingOrder
} from './src/types/erp';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = IS_SERVERLESS
  ? path.resolve('/tmp', 'data')
  : path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('Could not create DATA_DIR:', err);
  }
}

const DB_FILE = path.join(DATA_DIR, 'erp_database.json');
const CONFIG_FILE = path.join(DATA_DIR, 'google_sheets_config.json');

// If running in serverless and /tmp DB_FILE does not exist yet, copy from repo data
if (IS_SERVERLESS && !fs.existsSync(DB_FILE)) {
  const repoDbFile = path.resolve(process.cwd(), 'data', 'erp_database.json');
  if (fs.existsSync(repoDbFile)) {
    try {
      fs.copyFileSync(repoDbFile, DB_FILE);
    } catch {}
  }
}

interface DatabaseState {
  items: Item[];
  warehouses: Warehouse[];
  suppliers: Supplier[];
  customers: Customer[];
  inventory: InventoryRecord[];
  incomingTransactions: IncomingStockTransaction[];
  outgoingTransactions: OutgoingStockTransaction[];
  shipments: ShipmentRecord[];
  users: User[];
  auditLogs: AuditLog[];
  purchaseOrders: PurchaseOrder[];
  grn: GoodsReceiptNote[];
  outgoingOrders: OutgoingOrder[];
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
    purchaseOrders: JSON.parse(JSON.stringify(INITIAL_PURCHASE_ORDERS)),
    grn: JSON.parse(JSON.stringify(INITIAL_GRN)),
    outgoingOrders: JSON.parse(JSON.stringify(INITIAL_OUTGOING_ORDERS))
  };
}

let db: DatabaseState;

try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.warehouses || parsed.warehouses.length < 9) {
      db = loadInitialState();
      saveDatabase();
    } else {
      db = {
        ...loadInitialState(),
        ...parsed
      };
      if (!db.incomingTransactions) db.incomingTransactions = JSON.parse(JSON.stringify(INITIAL_INCOMING_TRANSACTIONS));
      if (!db.outgoingTransactions) db.outgoingTransactions = JSON.parse(JSON.stringify(INITIAL_OUTGOING_TRANSACTIONS));
      if (!db.users || db.users.length < INITIAL_USERS.length) {
        INITIAL_USERS.forEach(initU => {
          if (!db.users.some(u => u.email.toLowerCase() === initU.email.toLowerCase())) {
            db.users.push(initU);
          }
        });
        saveDatabase();
      }
      const adminU = db.users.find(u => u.email.toLowerCase() === 'dawoodzafar1984@gmail.com');
      if (adminU && adminU.password !== 'gulfam12345') {
        adminU.password = 'gulfam12345';
        saveDatabase();
      }
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

function normalizePrivateKey(key: string): string {
  if (!key) return '';
  let cleaned = key.trim();
  while ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    try {
      cleaned = JSON.parse(cleaned);
    } catch {
      cleaned = cleaned.slice(1, -1).trim();
    }
  }
  return cleaned.replace(/\\n/g, '\n').replace(/\\n/g, '\n');
}

const envEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.AUTHORIZED_SERVICE_ACCOUNT_EMAIL || '';
const envKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || '';
const envSpreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || '';

let gSheetsConfig: GoogleSheetsSettings = {
  spreadsheetId: envSpreadsheetId,
  serviceAccountEmail: envEmail,
  privateKey: envKey,
  autoSync: true
};

if (fs.existsSync(CONFIG_FILE)) {
  try {
    const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    gSheetsConfig = {
      ...gSheetsConfig,
      ...saved,
      // If environment variables exist, prefer them for credentials
      spreadsheetId: saved.spreadsheetId || envSpreadsheetId,
      serviceAccountEmail: saved.serviceAccountEmail || envEmail,
      privateKey: saved.privateKey || envKey
    };
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
function logAudit(
  action: string,
  module: string,
  entityType: string,
  entityId: string,
  entityCode: string,
  details: string,
  user?: { id?: string; name?: string; role?: string }
) {
  const newLog: AuditLog = {
    id: `LOG-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    userId: user?.id || 'SYS',
    userName: user?.name || 'System User',
    userRole: (user?.role as any) || 'Admin',
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

const REQUIRED_SHEETS_TABS = [
  'Consolidated Inventory',
  'Incoming Stock',
  'Outgoing Stock',
  'Shipment Tracker',
  'Warehouse Inventory',
  'Warehouses',
  'Items Master',
  'Suppliers & Customers',
  'Users',
  'Audit Log'
];

function getEffectiveSheetsConfig(): GoogleSheetsSettings {
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL || process.env.AUTHORIZED_SERVICE_ACCOUNT_EMAIL || process.env.CLIENT_EMAIL || gSheetsConfig.serviceAccountEmail || '';
  let key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || process.env.PRIVATE_KEY || gSheetsConfig.privateKey || '';
  let spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || process.env.GOOGLE_SHEET_ID || process.env.SPREADSHEET_ID || gSheetsConfig.spreadsheetId || '';

  const rawJsonCandidate = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || process.env.SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS || '';
  if (rawJsonCandidate && (!email || !key)) {
    try {
      const parsed = JSON.parse(rawJsonCandidate);
      if (parsed.client_email) email = parsed.client_email;
      if (parsed.private_key) key = parsed.private_key;
    } catch {}
  }

  return {
    spreadsheetId: spreadsheetId.trim(),
    serviceAccountEmail: email.trim(),
    privateKey: key,
    autoSync: true,
    lastSyncTime: gSheetsConfig.lastSyncTime
  };
}

// Google Sheets Client via Service Account
async function getGoogleSheetsClient(email: string, privateKey: string) {
  const cleanedKey = normalizePrivateKey(privateKey);
  const client = new JWT({
    email,
    key: cleanedKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  await client.authorize();
  return client;
}

// Ensure all required tabs exist in Google Sheets; create missing ones automatically and format them
async function ensureAllGoogleSheetsTabs(token: string, spreadsheetId: string) {
  try {
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const meta = await metaRes.json();
    if (!meta || !meta.sheets) {
      console.warn('[Google Sheets] Metadata lookup warning:', meta?.error?.message || meta);
      return;
    }

    const existingSheetTitles = meta.sheets.map((s: any) => s.properties.title);
    const existingSet = new Set(existingSheetTitles);
    const missingTabs = REQUIRED_SHEETS_TABS.filter(t => !existingSet.has(t));

    const requests: any[] = [];

    if (missingTabs.length > 0) {
      console.log(`[Google Sheets] Automatically creating ${missingTabs.length} missing tabs in spreadsheet:`, missingTabs);
      missingTabs.forEach(title => {
        requests.push({
          addSheet: {
            properties: {
              title,
              gridProperties: {
                rowCount: 2000,
                columnCount: 26,
                frozenRowCount: 1
              }
            }
          }
        });
      });
    }

    // Clean up empty default "Sheet1" if user has actual ERP tabs
    const defaultSheet = meta.sheets.find((s: any) => s.properties.title === 'Sheet1');
    if (defaultSheet && meta.sheets.length > 1) {
      requests.push({
        deleteSheet: { sheetId: defaultSheet.properties.sheetId }
      });
    }

    if (requests.length > 0) {
      const addRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests })
      });
      const addData = await addRes.json();
      if (addData.error) {
        console.warn('[Google Sheets] Warning when updating tabs:', addData.error.message);
      } else {
        console.log(`[Google Sheets] Tab structure verified & updated successfully!`);
      }
    }

    // Apply executive enterprise styling (Dark header bar #0F172A, white bold text, freeze row 1)
    try {
      const refreshedMetaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const refreshedMeta = await refreshedMetaRes.json();
      if (refreshedMeta && refreshedMeta.sheets) {
        const styleRequests: any[] = [];
        for (const s of refreshedMeta.sheets) {
          const sheetId = s.properties.sheetId;
          styleRequests.push({
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 26
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 15 / 255, green: 23 / 255, blue: 42 / 255 },
                  textFormat: {
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                    bold: true,
                    fontSize: 10
                  },
                  horizontalAlignment: 'LEFT'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
            }
          });
          styleRequests.push({
            updateSheetProperties: {
              properties: {
                sheetId,
                gridProperties: {
                  frozenRowCount: 1
                }
              },
              fields: 'gridProperties.frozenRowCount'
            }
          });
        }
        if (styleRequests.length > 0) {
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ requests: styleRequests })
          });
        }
      }
    } catch (styleErr: any) {
      console.warn('[Google Sheets] Styling notice:', styleErr.message);
    }
  } catch (err: any) {
    console.warn('[Google Sheets] Exception during ensureAllGoogleSheetsTabs:', err.message);
  }
}

// Background sync helper - automatically ensures tabs exist and syncs all ERP data
async function syncAllToGoogleSheets() {
  const cfg = getEffectiveSheetsConfig();
  const sId = cfg.spreadsheetId;
  const email = cfg.serviceAccountEmail;
  const key = cfg.privateKey;
  if (!sId || !email || !key) {
    return;
  }

  try {
    const authClient = await getGoogleSheetsClient(email, key);
    const token = await authClient.getAccessToken();
    if (!token.token) {
      console.warn('[Google Sheets] Unable to acquire access token');
      return;
    }

    // 0. Automatically create any missing tabs in the Google Spreadsheet
    await ensureAllGoogleSheetsTabs(token.token, sId);

    // 1. Consolidated Inventory
    const consolidatedHeader = ['Price (USD)', 'Last Updated', 'Sr. No.', 'Formula Total', 'OEM Part Number', 'Physical Stock Total', 'Brand / Make', 'Condition', 'TLS Store', 'TOLL Store', 'BFLO Store', 'NMK Store', 'PAK Store', 'KSA Store', 'SNT Store', 'USA Store', 'Ajman Store'];
    const consolidatedRows = db.items.map((item, idx) => {
      const invs = db.inventory.filter(i => i.itemId === item.id);
      const total = invs.reduce((s, i) => s + i.physicalStock, 0);
      const getQty = (code: string) => {
        const wh = db.warehouses.find(w => w.code.toLowerCase().includes(code.toLowerCase()) || w.location.toLowerCase().includes(code.toLowerCase()));
        if (!wh) return 0;
        const inv = invs.find(i => i.warehouseId === wh.id);
        return inv ? inv.physicalStock : 0;
      };
      return [
        item.costPriceUSD,
        item.updatedAt,
        idx + 1,
        `=SUM(I${idx + 2}:Q${idx + 2})`,
        item.oemPartNumber,
        total,
        item.brand,
        item.condition,
        getQty('TLS'),
        getQty('TOLL'),
        getQty('BFLO'),
        getQty('NMK'),
        getQty('PAK'),
        getQty('KSA'),
        getQty('SNT'),
        getQty('USA'),
        getQty('AJMAN')
      ];
    });

    // 2. Incoming Stock
    const incomingData = [
      ['Date', 'Tracking No.', 'OEM Part Code', 'Serial Number', 'Warehouse', 'Supplier', 'Quantity Received', 'Item Description', 'Unit Cost (USD)', 'Total Cost (USD)', 'Recorded By'],
      ...db.incomingTransactions.map(inc => [
        inc.date, inc.trackingNo, inc.itemCode, inc.serialNumber, inc.warehouseName, inc.supplier, inc.quantityReceived, inc.itemDescription, inc.unitCost, inc.totalCostUSD, inc.createdByUser
      ])
    ];

    // 3. Outgoing Stock
    const outgoingData = [
      ['Date Issued', 'OEM Part Code', 'Tracking No.', 'Serial Number', 'Warehouse', 'Recipient Customer / Warehouse', 'Quantity Issued', 'PO Number', 'Item Description', 'Total Price (USD)', 'Recorded By'],
      ...db.outgoingTransactions.map(out => [
        out.dateIssued, out.itemCode, out.trackingNo, out.serialNumber, out.warehouseName, out.customerOrWarehouse, out.quantityIssued, out.poNumber, out.itemDescription, out.totalPriceUSD, out.createdByUser
      ])
    ];

    // 4. Shipment Tracker
    const shipmentsData = [
      ['Tracking No.', 'Type', 'Date', 'Warehouse', 'Item Code', 'Item Name', 'Serial Number', 'Quantity', 'Supplier / Customer', 'PO / Ref', 'Carrier', 'Status', 'Recorded By'],
      ...db.shipments.map(s => [s.trackingNumber, s.type, s.date, s.warehouseCode, s.itemCode, s.itemName, s.serialNumber, s.quantity, s.party, s.poOrRef, s.carrier, s.status, s.recordedBy])
    ];

    // 5. Warehouse Inventory
    const whInventoryData = [
      ['Warehouse', 'Item Code', 'Current Stock', 'Out Date', 'Adjustment', 'Opening Stock', 'Total Incoming', 'Total Outgoing', 'Reorder Status'],
      ...db.inventory.map(inv => {
        const item = db.items.find(i => i.id === inv.itemId);
        const wh = db.warehouses.find(w => w.id === inv.warehouseId);
        const itemCode = item?.oemPartNumber || '';
        const incTotal = db.incomingTransactions.filter(t => t.warehouseId === inv.warehouseId && t.itemCode === itemCode).reduce((s, t) => s + t.quantityReceived, 0);
        const outTotal = db.outgoingTransactions.filter(t => t.warehouseId === inv.warehouseId && t.itemCode === itemCode).reduce((s, t) => s + t.quantityIssued, 0);
        const opening = 0;
        const current = inv.physicalStock;
        const adj = current - (opening + incTotal - outTotal);
        const reorderStatus = current === 0 ? 'Out of Stock' : (current <= (item?.minSafetyStock || 3) ? 'Low Stock' : 'In Stock');
        return [
          wh ? `${wh.name} (${wh.code})` : inv.warehouseId,
          itemCode,
          current,
          inv.updatedAt,
          adj,
          opening,
          incTotal,
          outTotal,
          reorderStatus
        ];
      })
    ];

    // 6. Warehouses
    const warehousesData = [
      ['Warehouse ID', 'Warehouse Code', 'Warehouse Name', 'Location', 'City', 'Country', 'Manager', 'Status'],
      ...db.warehouses.map(w => [w.id, w.code, w.name, w.location, w.city, w.country, w.managerName, w.active ? 'Active' : 'Inactive'])
    ];

    // 7. Items Master
    const itemsData = [
      ['Item Code', 'Brand / Make', 'Description', 'Category', 'Condition', 'Price (USD)', 'Selling Price (USD)', 'Reorder Level', 'Min Safety Stock'],
      ...db.items.map(i => [i.oemPartNumber, i.brand, i.description, i.category || 'General', i.condition, i.costPriceUSD, i.sellingPriceUSD, i.reorderPoint || i.minSafetyStock, i.minSafetyStock])
    ];

    // 8. Suppliers & Customers
    const contactsData = [
      ['Type', 'Company Name', 'Contact Person', 'Email', 'Phone', 'Address / Country', 'Payment Terms', 'Currency'],
      ...db.suppliers.map(s => ['Supplier', s.name, s.contactPerson, s.email, s.phone, s.country, s.paymentTerms, s.currency]),
      ...db.customers.map(c => ['Customer', c.companyName, c.contactPerson, c.email, c.phone, c.shippingAddress || c.country, c.paymentTerms, c.currency])
    ];

    // 9. Users
    const usersData = [
      ['User ID', 'Name', 'Email', 'Role', 'Assigned Warehouse', 'Department', 'Status', 'Last Login'],
      ...db.users.map(u => [u.id, u.name, u.email, u.role, u.assignedWarehouseId || 'All Stores', u.department || 'Operations', u.active ? 'Active' : 'Inactive', u.lastLogin || ''])
    ];

    // 10. Audit Log
    const auditData = [
      ['Timestamp', 'User', 'Role', 'Action', 'Module', 'Entity Code', 'Details'],
      ...db.auditLogs.slice(0, 200).map(a => [a.timestamp, a.userName, a.userRole, a.action, a.module, a.entityCode, a.details])
    ];

    // Clear existing ranges to avoid orphaned/stale rows
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sId)}/values:batchClear`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ranges: REQUIRED_SHEETS_TABS.map(t => `'${t}'!A1:Z5000`)
        })
      });
    } catch (clearErr: any) {
      console.warn('[Google Sheets] Non-fatal batchClear warning:', clearErr.message);
    }

    // Write freshly populated data to all 10 tabs
    const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sId)}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: "'Consolidated Inventory'!A1", values: [consolidatedHeader, ...consolidatedRows] },
          { range: "'Incoming Stock'!A1", values: incomingData },
          { range: "'Outgoing Stock'!A1", values: outgoingData },
          { range: "'Shipment Tracker'!A1", values: shipmentsData },
          { range: "'Warehouse Inventory'!A1", values: whInventoryData },
          { range: "'Warehouses'!A1", values: warehousesData },
          { range: "'Items Master'!A1", values: itemsData },
          { range: "'Suppliers & Customers'!A1", values: contactsData },
          { range: "'Users'!A1", values: usersData },
          { range: "'Audit Log'!A1", values: auditData }
        ]
      })
    });

    const updateData = await updateRes.json();
    if (updateData.error) {
      console.warn('[Google Sheets] batchUpdate error:', updateData.error.message);
    } else {
      gSheetsConfig.lastSyncTime = new Date().toISOString();
      saveGSheetsConfig(gSheetsConfig);
      console.log('[Google Sheets] All 10 tabs successfully synchronized at', gSheetsConfig.lastSyncTime);
    }
  } catch (err: any) {
    console.warn('[Google Sheets] Background sync warning:', err.message);
  }
}

// Trigger initial sync on startup
setTimeout(() => {
  syncAllToGoogleSheets().catch(() => {});
}, 2000);

// ==========================================
// SYSTEM & HEALTH
// ==========================================
app.get('/api/health', (req: Request, res: Response) => {
  const effCfg = getEffectiveSheetsConfig();
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
    googleSheetsConnected: Boolean(effCfg.spreadsheetId && effCfg.serviceAccountEmail && effCfg.privateKey)
  });
});

// ==========================================
// AUTHENTICATION & LOGIN
// ==========================================
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email address is required' });
  }

  const user = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email address. Access denied.' });
  }

  if (!user.active) {
    return res.status(403).json({ success: false, message: 'This user account has been deactivated. Please contact an Administrator.' });
  }

  if (user.password) {
    if (!password || user.password !== password) {
      return res.status(401).json({ success: false, message: 'Incorrect password. Please enter the valid password.' });
    }
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
      assignedWarehouseIds: user.assignedWarehouseIds,
      assignedResponsibilities: user.assignedResponsibilities,
      permissions: user.permissions,
      department: user.department,
      active: user.active
    }
  });
});

// ==========================================
// USER MANAGEMENT (ADMIN ONLY)
// ==========================================
app.get('/api/users', (req: Request, res: Response) => {
  const safeUsers = db.users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    department: u.department,
    assignedWarehouseId: u.assignedWarehouseId,
    active: u.active,
    lastLogin: u.lastLogin,
    password: u.password
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
    role: role as any,
    password: password || 'password',
    assignedWarehouseId: role === 'Admin' ? undefined : assignedWarehouseId,
    department: department || (role === 'Admin' ? 'Management' : 'Warehouse Operations'),
    active: true,
    lastLogin: 'Never'
  };

  db.users.push(newUser);
  saveDatabase();

  logAudit('CREATE_USER', 'User Management', 'User', newUser.id, newUser.email, `Created user ${newUser.name} with role ${newUser.role} (Assigned: ${newUser.assignedWarehouseId || 'All'})`, currentUser || { id: 'SYS', name: 'Admin', role: 'Admin' });

  syncAllToGoogleSheets().catch(() => {});

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
  const { name, email, role, assignedWarehouseId, department, active, password, currentUser } = req.body;
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });

  const u = db.users[idx];
  if (name !== undefined) u.name = name;
  if (email !== undefined) u.email = email;
  if (role !== undefined) {
    u.role = role;
    if (role === 'Admin') u.assignedWarehouseId = undefined;
  }
  if (assignedWarehouseId !== undefined) u.assignedWarehouseId = assignedWarehouseId;
  if (department !== undefined) u.department = department;
  if (active !== undefined) u.active = active;
  if (password) u.password = password;

  saveDatabase();

  logAudit('UPDATE_USER', 'User Management', 'User', u.id, u.email, `Updated user details for ${u.name}`, currentUser || { id: 'SYS', name: 'Admin', role: 'Admin' });

  syncAllToGoogleSheets().catch(() => {});

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
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });

  db.users[idx].password = newPassword;
  saveDatabase();

  logAudit('CHANGE_PASSWORD', 'User Management', 'User', db.users[idx].id, db.users[idx].email, `Password changed for user ${db.users[idx].name}`, currentUser || { id: 'SYS', name: 'Admin', role: 'Admin' });

  res.json({ success: true, message: 'Password updated successfully' });
});

app.put('/api/users/:id/status', (req: Request, res: Response) => {
  const { active, currentUser } = req.body;
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });

  db.users[idx].active = Boolean(active);
  saveDatabase();

  logAudit('USER_STATUS', 'User Management', 'User', db.users[idx].id, db.users[idx].email, `${active ? 'Activated' : 'Deactivated'} user account`, currentUser || { id: 'SYS', name: 'Admin', role: 'Admin' });

  syncAllToGoogleSheets().catch(() => {});

  res.json({ success: true, active: db.users[idx].active });
});

// ==========================================
// 7. WAREHOUSE STORES MANAGEMENT (ADD & EDIT)
// ==========================================
app.get('/api/warehouses', (req: Request, res: Response) => {
  res.json(db.warehouses);
});

// Add New Store
app.post('/api/warehouses', (req: Request, res: Response) => {
  const { name, code, location, managerName, contactPhone, contactEmail, address, country, city, currentUser } = req.body;
  if (!name || !location) {
    return res.status(400).json({ error: 'Store Name and Location are required.' });
  }

  const nextNum = db.warehouses.length + 1;
  const newWhId = req.body.id || `WH-${nextNum.toString().padStart(3, '0')}`;
  const whCode = (code || name.substring(0, 4)).toUpperCase().replace(/[^A-Z0-9]/g, '');

  const newWh: Warehouse = {
    id: newWhId,
    code: whCode,
    name: name.trim(),
    country: country || 'USA',
    city: city || location.split(',')[0].trim(),
    location: location.trim(),
    address: address || `${location} Facility`,
    managerName: managerName || 'Unassigned',
    contactEmail: contactEmail || `ops.${whCode.toLowerCase()}@realdeals-automation.com`,
    contactPhone: contactPhone || '+1 (555) 000-0000',
    totalCapacitySqM: Number(req.body.totalCapacitySqM) || 1000,
    active: true
  };

  db.warehouses.push(newWh);

  // Initialize zero inventory for all items in this store
  db.items.forEach(itm => {
    const existing = db.inventory.find(inv => inv.itemId === itm.id && inv.warehouseId === newWh.id);
    if (!existing) {
      db.inventory.push({
        id: `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900)}`,
        itemId: itm.id,
        warehouseId: newWh.id,
        binLocation: 'Shelf A-01',
        physicalStock: 0,
        reservedStock: 0,
        availableStock: 0,
        inTransitStock: 0,
        quarantinedStock: 0,
        lastCountDate: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString().slice(0, 10)
      });
    }
  });

  saveDatabase();

  logAudit('ADD_WAREHOUSE', 'Warehouses', 'Warehouse', newWh.id, newWh.code, `Added store ${newWh.name} (${newWh.location}), Manager: ${newWh.managerName}`, currentUser || { id: 'SYS', name: 'Admin', role: 'Admin' });

  syncAllToGoogleSheets().catch(() => {});

  res.json(newWh);
});

// Edit Existing Store
app.put('/api/warehouses/:id', (req: Request, res: Response) => {
  const idx = db.warehouses.findIndex(w => w.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Warehouse not found' });

  const oldWh = db.warehouses[idx];
  const { name, code, location, managerName, contactPhone, contactEmail, address, active, currentUser } = req.body;

  db.warehouses[idx] = {
    ...oldWh,
    name: name !== undefined ? name.trim() : oldWh.name,
    code: code !== undefined ? code.trim().toUpperCase() : oldWh.code,
    location: location !== undefined ? location.trim() : oldWh.location,
    managerName: managerName !== undefined ? managerName.trim() : oldWh.managerName,
    contactPhone: contactPhone !== undefined ? contactPhone.trim() : oldWh.contactPhone,
    contactEmail: contactEmail !== undefined ? contactEmail.trim() : oldWh.contactEmail,
    address: address !== undefined ? address.trim() : oldWh.address,
    active: active !== undefined ? Boolean(active) : oldWh.active
  };

  const updatedWh = db.warehouses[idx];
  saveDatabase();

  logAudit('EDIT_WAREHOUSE', 'Warehouses', 'Warehouse', updatedWh.id, updatedWh.code, `Modified store ${updatedWh.name} (${updatedWh.location})`, currentUser || { id: 'SYS', name: 'Admin', role: 'Admin' });

  syncAllToGoogleSheets().catch(() => {});

  res.json(updatedWh);
});

// ==========================================
// ITEMS CATALOG (ADD & EDIT)
// ==========================================
app.get('/api/items', (req: Request, res: Response) => {
  res.json(db.items);
});

app.post('/api/items', (req: Request, res: Response) => {
  const { oemPartNumber, brand, description, category, condition, costPriceUSD, sellingPriceUSD, minSafetyStock, currentUser } = req.body;
  if (!oemPartNumber) {
    return res.status(400).json({ error: 'Item Code / Part Number is required' });
  }

  const existing = db.items.find(i => i.oemPartNumber.toLowerCase() === oemPartNumber.trim().toLowerCase());
  if (existing) {
    return res.status(400).json({ error: `Item code ${oemPartNumber} already exists in master catalog.` });
  }

  const cost = Number(costPriceUSD) || 0;
  const newItem: Item = {
    id: `ITEM-${(db.items.length + 1).toString().padStart(3, '0')}`,
    sku: oemPartNumber.trim(),
    oemPartNumber: oemPartNumber.trim(),
    brand: brand || 'Industrial Spare',
    description: description || oemPartNumber.trim(),
    category: category || 'Spare Parts',
    condition: condition || 'Factory Sealed New',
    unit: 'PCS',
    costPriceUSD: cost,
    sellingPriceUSD: Number(sellingPriceUSD) || (cost * 1.4),
    weightKg: 1.0,
    hsCode: '8537.10.91',
    countryOfOrigin: 'USA',
    minSafetyStock: Number(minSafetyStock) || 2,
    reorderPoint: (Number(minSafetyStock) || 2) * 2,
    targetStockLevel: (Number(minSafetyStock) || 2) * 5,
    defaultLeadTimeDays: 14,
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
  logAudit('CREATE_ITEM', 'Items', 'Item', newItem.id, newItem.oemPartNumber, `Added spare part ${newItem.oemPartNumber} (${newItem.brand})`, currentUser || { id: 'SYS', name: 'Admin', role: 'Admin' });

  syncAllToGoogleSheets().catch(() => {});

  res.json(newItem);
});

// Edit existing item
app.put('/api/items/:id', (req: Request, res: Response) => {
  const idx = db.items.findIndex(i => i.id === req.params.id || i.oemPartNumber === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });

  const itm = db.items[idx];
  const { oemPartNumber, brand, description, condition, costPriceUSD, sellingPriceUSD, minSafetyStock, currentUser } = req.body;

  if (oemPartNumber) itm.oemPartNumber = oemPartNumber.trim();
  if (brand) itm.brand = brand.trim();
  if (description) itm.description = description.trim();
  if (condition) itm.condition = condition;
  if (costPriceUSD !== undefined) itm.costPriceUSD = Number(costPriceUSD);
  if (sellingPriceUSD !== undefined) itm.sellingPriceUSD = Number(sellingPriceUSD);
  if (minSafetyStock !== undefined) itm.minSafetyStock = Number(minSafetyStock);
  itm.updatedAt = new Date().toISOString().slice(0, 10);

  saveDatabase();
  logAudit('EDIT_ITEM', 'Items', 'Item', itm.id, itm.oemPartNumber, `Updated item master details for ${itm.oemPartNumber}`, currentUser || { id: 'SYS', name: 'Admin', role: 'Admin' });

  syncAllToGoogleSheets().catch(() => {});

  res.json(itm);
});

// ==========================================
// INVENTORY & CLOSING BALANCE ADJUSTMENT
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

// Consolidated Inventory across warehouses
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
      isLowStock: totalPhysical <= item.minSafetyStock
    };
  });

  res.json(consolidated);
});

// SET CLOSING BALANCE / PHYSICAL COUNT FOR TRANSITIONING FROM GOOGLE SHEETS
app.post('/api/inventory/set-closing-balance', (req: Request, res: Response) => {
  const { warehouseId, itemId, closingBalance, binLocation, notes, currentUser } = req.body;
  if (!warehouseId || !itemId || closingBalance === undefined) {
    return res.status(400).json({ error: 'Warehouse ID, Item ID, and Closing Balance are required.' });
  }

  const wh = db.warehouses.find(w => w.id === warehouseId || w.code === warehouseId);
  if (!wh) return res.status(404).json({ error: 'Warehouse not found' });

  const itm = db.items.find(i => i.id === itemId || i.oemPartNumber === itemId);
  if (!itm) return res.status(404).json({ error: 'Item not found' });

  let inv = db.inventory.find(i => i.warehouseId === wh.id && i.itemId === itm.id);
  const newBalance = Math.max(0, Number(closingBalance));
  const oldBalance = inv ? inv.physicalStock : 0;
  const adjDifference = newBalance - oldBalance;

  if (!inv) {
    inv = {
      id: `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900)}`,
      itemId: itm.id,
      warehouseId: wh.id,
      binLocation: binLocation || 'Shelf A-01',
      physicalStock: newBalance,
      reservedStock: 0,
      availableStock: newBalance,
      inTransitStock: 0,
      quarantinedStock: 0,
      lastCountDate: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10)
    };
    db.inventory.push(inv);
  } else {
    inv.physicalStock = newBalance;
    inv.availableStock = Math.max(0, newBalance - inv.reservedStock - inv.quarantinedStock);
    if (binLocation) inv.binLocation = binLocation;
    inv.lastCountDate = new Date().toISOString().slice(0, 10);
    inv.updatedAt = new Date().toISOString().slice(0, 10);
  }

  saveDatabase();

  logAudit(
    'SET_CLOSING_BALANCE',
    'Inventory',
    'InventoryRecord',
    inv.id,
    itm.oemPartNumber,
    `Set closing balance for ${itm.oemPartNumber} at ${wh.name} to ${newBalance} (Previous: ${oldBalance}, Adj: ${adjDifference >= 0 ? '+' : ''}${adjDifference}). Notes: ${notes || 'Google Sheet data transition'}`,
    currentUser || { id: 'SYS', name: 'Admin', role: 'Admin' }
  );

  syncAllToGoogleSheets().catch(() => {});

  res.json({
    success: true,
    message: `Updated closing balance for ${itm.oemPartNumber} at ${wh.name} to ${newBalance}`,
    inventory: inv,
    adjustmentDifference: adjDifference
  });
});

// BULK SET CLOSING BALANCES
app.post('/api/inventory/bulk-closing-balances', (req: Request, res: Response) => {
  const { warehouseId, balances, notes, currentUser } = req.body;
  if (!warehouseId || !Array.isArray(balances)) {
    return res.status(400).json({ error: 'Warehouse ID and balances array are required.' });
  }

  const wh = db.warehouses.find(w => w.id === warehouseId || w.code === warehouseId);
  if (!wh) return res.status(404).json({ error: 'Warehouse not found' });

  let updatedCount = 0;
  const today = new Date().toISOString().slice(0, 10);

  balances.forEach(({ itemId, closingBalance, binLocation }: { itemId: string; closingBalance: number; binLocation?: string }) => {
    const itm = db.items.find(i => i.id === itemId || i.oemPartNumber === itemId);
    if (!itm) return;

    const newBal = Math.max(0, Number(closingBalance));
    let inv = db.inventory.find(i => i.warehouseId === wh.id && i.itemId === itm.id);

    if (!inv) {
      inv = {
        id: `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900)}`,
        itemId: itm.id,
        warehouseId: wh.id,
        binLocation: binLocation || 'Shelf A-01',
        physicalStock: newBal,
        reservedStock: 0,
        availableStock: newBal,
        inTransitStock: 0,
        quarantinedStock: 0,
        lastCountDate: today,
        updatedAt: today
      };
      db.inventory.push(inv);
    } else {
      inv.physicalStock = newBal;
      inv.availableStock = Math.max(0, newBal - inv.reservedStock - inv.quarantinedStock);
      if (binLocation) inv.binLocation = binLocation;
      inv.lastCountDate = today;
      inv.updatedAt = today;
    }
    updatedCount++;
  });

  saveDatabase();

  logAudit(
    'BULK_CLOSING_BALANCES',
    'Inventory',
    'Warehouse',
    wh.id,
    wh.code,
    `Bulk updated closing balances for ${updatedCount} items at ${wh.name}. Notes: ${notes || 'Google Sheet data migration'}`,
    currentUser || { id: 'SYS', name: 'Admin', role: 'Admin' }
  );

  syncAllToGoogleSheets().catch(() => {});

  res.json({
    success: true,
    message: `Updated closing balances for ${updatedCount} items at ${wh.name}`,
    warehouseId: wh.id
  });
});

// BULK UPLOAD COMPLETE ITEMS & CLOSING BALANCES (Supports 2,000+ items from CSV / Excel / Sheet Migration)
app.post('/api/inventory/bulk-upload-complete', (req: Request, res: Response) => {
  const { itemsWithBalances, defaultWarehouseId, currentUser } = req.body;
  if (!Array.isArray(itemsWithBalances) || itemsWithBalances.length === 0) {
    return res.status(400).json({ error: 'Array of itemsWithBalances is required' });
  }

  const today = new Date().toISOString().slice(0, 10);
  let newItemsCreated = 0;
  let existingItemsUpdated = 0;
  let balancesSet = 0;

  // Pre-index existing items by oemPartNumber (lowercase) and sku
  const itemMap = new Map<string, Item>();
  db.items.forEach(i => {
    itemMap.set(i.oemPartNumber.toLowerCase().trim(), i);
    if (i.sku) itemMap.set(i.sku.toLowerCase().trim(), i);
  });

  // Pre-index warehouses
  const warehouseMap = new Map<string, Warehouse>();
  db.warehouses.forEach(w => {
    warehouseMap.set(w.id.toLowerCase(), w);
    warehouseMap.set(w.code.toLowerCase(), w);
    warehouseMap.set(w.name.toLowerCase(), w);
  });

  const defaultWh = db.warehouses.find(w => w.id === defaultWarehouseId) || db.warehouses[0];

  for (let idx = 0; idx < itemsWithBalances.length; idx++) {
    const entry = itemsWithBalances[idx];
    const partNum = (entry.oemPartNumber || entry.itemCode || entry.partNumber || entry.sku || '').toString().trim();
    if (!partNum) continue;

    let targetItem = itemMap.get(partNum.toLowerCase());

    if (!targetItem) {
      // Create new Item in Master Catalog
      const cost = Number(entry.costPriceUSD || entry.cost || entry.unitCost) || 0;
      const brand = (entry.brand || 'Industrial Spare').toString().trim();
      const desc = (entry.description || entry.desc || partNum).toString().trim();
      const cat = (entry.category || 'Automation & Controls').toString().trim();
      const unit = (entry.unit || 'PCS').toString().trim();
      const cond = entry.condition || 'Factory Sealed New';
      const minStock = Number(entry.minSafetyStock) || 2;
      const rop = Number(entry.reorderPoint) || (minStock * 2);
      const targetStock = Number(entry.targetStockLevel) || (minStock * 5);

      targetItem = {
        id: `ITEM-${(db.items.length + 1).toString().padStart(4, '0')}`,
        sku: partNum,
        oemPartNumber: partNum,
        brand: brand || 'Industrial Spare',
        description: desc || partNum,
        category: cat || 'Spare Parts',
        condition: cond,
        unit: unit || 'PCS',
        costPriceUSD: cost,
        sellingPriceUSD: Number(entry.sellingPriceUSD) || (cost * 1.35),
        weightKg: Number(entry.weightKg) || 1.0,
        hsCode: entry.hsCode || '8537.10.91',
        countryOfOrigin: entry.countryOfOrigin || 'USA',
        minSafetyStock: minStock,
        reorderPoint: rop,
        targetStockLevel: targetStock,
        defaultLeadTimeDays: Number(entry.defaultLeadTimeDays) || 14,
        createdAt: today,
        updatedAt: today
      };

      db.items.push(targetItem);
      itemMap.set(partNum.toLowerCase(), targetItem);
      newItemsCreated++;

      // Initialize inventory records across all warehouses with 0
      for (const wh of db.warehouses) {
        db.inventory.push({
          id: `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000)}-${idx}`,
          itemId: targetItem.id,
          warehouseId: wh.id,
          binLocation: 'Shelf A-01',
          physicalStock: 0,
          reservedStock: 0,
          availableStock: 0,
          inTransitStock: 0,
          quarantinedStock: 0,
          lastCountDate: today,
          updatedAt: today
        });
      }
    } else {
      // Update item if additional metadata provided
      let changed = false;
      if (entry.description && (targetItem.description === targetItem.oemPartNumber || !targetItem.description)) {
        targetItem.description = entry.description.toString().trim();
        changed = true;
      }
      if (entry.brand && targetItem.brand === 'Industrial Spare') {
        targetItem.brand = entry.brand.toString().trim();
        changed = true;
      }
      if (entry.costPriceUSD !== undefined && targetItem.costPriceUSD === 0) {
        targetItem.costPriceUSD = Number(entry.costPriceUSD);
        changed = true;
      }
      if (changed) existingItemsUpdated++;
    }

    // Determine target warehouse for closing balance
    const rawWh = (entry.warehouseCode || entry.warehouseId || entry.warehouse || entry.store || '').toString().trim().toLowerCase();
    const targetWh = warehouseMap.get(rawWh) || defaultWh;

    // Set closing balance
    const rawBal = entry.closingBalance !== undefined ? entry.closingBalance : (entry.physicalStock !== undefined ? entry.physicalStock : entry.qty);
    if (rawBal !== undefined && rawBal !== null && rawBal !== '') {
      const closingQty = Math.max(0, Number(rawBal) || 0);
      let inv = db.inventory.find(i => i.warehouseId === targetWh.id && i.itemId === targetItem!.id);

      if (!inv) {
        inv = {
          id: `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000)}-${idx}`,
          itemId: targetItem.id,
          warehouseId: targetWh.id,
          binLocation: entry.binLocation || 'Shelf A-01',
          physicalStock: closingQty,
          reservedStock: 0,
          availableStock: closingQty,
          inTransitStock: 0,
          quarantinedStock: 0,
          lastCountDate: today,
          updatedAt: today
        };
        db.inventory.push(inv);
      } else {
        inv.physicalStock = closingQty;
        inv.availableStock = Math.max(0, closingQty - inv.reservedStock - inv.quarantinedStock);
        if (entry.binLocation) inv.binLocation = entry.binLocation;
        inv.lastCountDate = today;
        inv.updatedAt = today;
      }
      balancesSet++;
    }
  }

  saveDatabase();

  logAudit(
    'BULK_INVENTORY_UPLOAD',
    'Inventory',
    'ItemMaster',
    'BULK',
    'BULK-UPLOAD',
    `Bulk uploaded ${itemsWithBalances.length} records. Created ${newItemsCreated} new catalog items, updated ${existingItemsUpdated} items, and set ${balancesSet} warehouse closing balances.`,
    currentUser || { id: 'SYS', name: 'Admin', role: 'Admin' }
  );

  syncAllToGoogleSheets().catch(() => {});

  res.json({
    success: true,
    totalReceived: itemsWithBalances.length,
    newItemsCreated,
    existingItemsUpdated,
    balancesSet,
    message: `Successfully processed ${itemsWithBalances.length} records. Added ${newItemsCreated} new items to master catalog and updated ${balancesSet} store closing balances.`
  });
});

// Update bin location or specific inventory record
app.put('/api/inventory/:id', (req: Request, res: Response) => {
  const idx = db.inventory.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Inventory record not found' });

  db.inventory[idx] = {
    ...db.inventory[idx],
    ...req.body,
    updatedAt: new Date().toISOString().slice(0, 10)
  };
  saveDatabase();

  syncAllToGoogleSheets().catch(() => {});

  res.json(db.inventory[idx]);
});

// Warehouse-to-Warehouse Transfer
app.post('/api/inventory/transfer', (req: Request, res: Response) => {
  const { sourceWarehouseId, destWarehouseId, itemId, quantity, notes, currentUser } = req.body;
  const qty = Number(quantity);

  if (!sourceWarehouseId || !destWarehouseId || !itemId || !qty || qty <= 0) {
    return res.status(400).json({ error: 'Source, destination, item, and positive quantity are required.' });
  }

  if (sourceWarehouseId === destWarehouseId) {
    return res.status(400).json({ error: 'Source and destination warehouses cannot be the same.' });
  }

  const srcWh = db.warehouses.find(w => w.id === sourceWarehouseId);
  const dstWh = db.warehouses.find(w => w.id === destWarehouseId);
  const itm = db.items.find(i => i.id === itemId || i.oemPartNumber === itemId);

  if (!srcWh || !dstWh || !itm) {
    return res.status(404).json({ error: 'Warehouse or Item not found.' });
  }

  const srcInv = db.inventory.find(i => i.warehouseId === srcWh.id && i.itemId === itm.id);
  if (!srcInv || srcInv.availableStock < qty) {
    return res.status(400).json({
      error: `Insufficient stock in ${srcWh.name}. Available: ${srcInv?.availableStock || 0}, Requested: ${qty}`
    });
  }

  let dstInv = db.inventory.find(i => i.warehouseId === dstWh.id && i.itemId === itm.id);
  if (!dstInv) {
    dstInv = {
      id: `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900)}`,
      itemId: itm.id,
      warehouseId: dstWh.id,
      binLocation: 'Shelf A-01',
      physicalStock: 0,
      reservedStock: 0,
      availableStock: 0,
      inTransitStock: 0,
      quarantinedStock: 0,
      lastCountDate: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10)
    };
    db.inventory.push(dstInv);
  }

  // Deduct from source
  srcInv.physicalStock -= qty;
  srcInv.availableStock -= qty;
  srcInv.updatedAt = new Date().toISOString().slice(0, 10);

  // Add to destination
  dstInv.physicalStock += qty;
  dstInv.availableStock += qty;
  dstInv.updatedAt = new Date().toISOString().slice(0, 10);

  // Add shipment tracker record
  const trkNo = `TRK-XFER-${Date.now().toString(36).toUpperCase()}`;
  db.shipments.unshift({
    id: `SHP-${Date.now().toString(36).toUpperCase()}`,
    trackingNumber: trkNo,
    type: 'Inter-Warehouse Transfer' as any,
    warehouseId: dstWh.id,
    warehouseCode: dstWh.code,
    itemCode: itm.oemPartNumber,
    itemName: itm.description,
    serialNumber: '',
    quantity: qty,
    party: `From ${srcWh.name} to ${dstWh.name}`,
    poOrRef: 'WH-TRANSFER',
    date: new Date().toISOString().slice(0, 10),
    carrier: 'Internal Fleet Transfer',
    status: 'In Transit',
    notes: notes || `Transferred from ${srcWh.name} to ${dstWh.name}`,
    recordedBy: currentUser?.name || 'Warehouse Staff',
    updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
  });

  saveDatabase();

  logAudit(
    'STOCK_TRANSFER',
    'Inventory',
    'Transfer',
    trkNo,
    itm.oemPartNumber,
    `Transferred ${qty} units of ${itm.oemPartNumber} from ${srcWh.name} to ${dstWh.name}`,
    currentUser || { id: 'SYS', name: 'Admin', role: 'Admin' }
  );

  syncAllToGoogleSheets().catch(() => {});

  res.json({
    success: true,
    message: `Successfully transferred ${qty} units of ${itm.oemPartNumber} from ${srcWh.name} to ${dstWh.name}`,
    sourceInventory: srcInv,
    destInventory: dstInv
  });
});

// ==========================================
// 4. INCOMING STOCK (CREATE & EDIT)
// ==========================================
app.get('/api/incoming', (req: Request, res: Response) => {
  const { warehouseId } = req.query;
  if (warehouseId && warehouseId !== 'ALL') {
    return res.json(db.incomingTransactions.filter(t => t.warehouseId === warehouseId));
  }
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
    return res.status(400).json({ error: 'Item Code, Warehouse, and Quantity Received (>0) are required.' });
  }

  const wh = db.warehouses.find(w => w.id === warehouseId || w.code === warehouseId);
  if (!wh) {
    return res.status(400).json({ error: `Warehouse '${warehouseId}' not found.` });
  }

  let itm = db.items.find(i => i.oemPartNumber.toLowerCase() === itemCode.toLowerCase() || i.sku.toLowerCase() === itemCode.toLowerCase());

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

  const transaction: IncomingStockTransaction = {
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
  const newShipment: ShipmentRecord = {
    id: `SHP-${Date.now().toString(36).toUpperCase()}`,
    trackingNumber: transaction.trackingNo,
    type: 'Incoming',
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
    status: 'Delivered',
    notes: `Received at ${wh.name} by ${userName}`,
    recordedBy: userName,
    updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
  };
  db.shipments.unshift(newShipment);

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

  syncAllToGoogleSheets().catch(() => {});

  res.json({
    success: true,
    transaction,
    inventory: inv
  });
});

// EDIT INCOMING TRANSACTION (Modify quantity, cost, supplier, etc. with inventory recalculation)
app.put('/api/incoming/:id', (req: Request, res: Response) => {
  const idx = db.incomingTransactions.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Incoming transaction not found' });

  const tx = db.incomingTransactions[idx];
  const oldQty = tx.quantityReceived;
  const newQty = req.body.quantityReceived !== undefined ? Number(req.body.quantityReceived) : oldQty;
  const qtyDiff = newQty - oldQty;

  const wh = db.warehouses.find(w => w.id === tx.warehouseId);
  const itm = db.items.find(i => i.oemPartNumber === tx.itemCode);

  // Recalculate inventory
  let inv: InventoryRecord | undefined;
  if (wh && itm) {
    inv = db.inventory.find(i => i.warehouseId === wh.id && i.itemId === itm.id);
    if (inv) {
      inv.physicalStock = Math.max(0, inv.physicalStock + qtyDiff);
      inv.availableStock = Math.max(0, inv.physicalStock - inv.reservedStock - inv.quarantinedStock);
      inv.updatedAt = new Date().toISOString().slice(0, 10);
    }
  }

  // Update transaction fields
  tx.quantityReceived = newQty;
  if (req.body.unitCost !== undefined) tx.unitCost = Number(req.body.unitCost);
  tx.totalCostUSD = tx.quantityReceived * tx.unitCost;
  if (req.body.supplier) tx.supplier = req.body.supplier.trim();
  if (req.body.trackingNo) tx.trackingNo = req.body.trackingNo.trim();
  if (req.body.serialNumber !== undefined) tx.serialNumber = req.body.serialNumber.trim();
  if (req.body.date) tx.date = req.body.date;
  if (req.body.itemDescription) tx.itemDescription = req.body.itemDescription.trim();

  // Update corresponding shipment
  const shp = db.shipments.find(s => s.trackingNumber === tx.trackingNo || s.poOrRef === tx.id);
  if (shp) {
    shp.quantity = newQty;
    shp.party = tx.supplier;
    shp.serialNumber = tx.serialNumber;
    shp.date = tx.date;
    shp.updatedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
  }

  saveDatabase();

  logAudit(
    'EDIT_INCOMING',
    'Incoming Stock',
    'IncomingTransaction',
    tx.id,
    tx.trackingNo,
    `Edited incoming stock: Qty changed from ${oldQty} to ${newQty} (Diff: ${qtyDiff >= 0 ? '+' : ''}${qtyDiff}). Unit Cost: $${tx.unitCost}`,
    req.body.currentUser || { id: 'SYS', name: 'Admin', role: 'Admin' }
  );

  syncAllToGoogleSheets().catch(() => {});

  res.json({
    success: true,
    message: 'Incoming transaction updated and stock adjusted successfully.',
    transaction: tx,
    inventory: inv
  });
});

// ==========================================
// 5. OUTGOING STOCK (CREATE & EDIT)
// ==========================================
app.get('/api/outgoing', (req: Request, res: Response) => {
  const { warehouseId } = req.query;
  if (warehouseId && warehouseId !== 'ALL') {
    return res.json(db.outgoingTransactions.filter(t => t.warehouseId === warehouseId));
  }
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
    return res.status(400).json({ error: 'Item Code, Warehouse, and Quantity Issued (>0) are required.' });
  }

  const wh = db.warehouses.find(w => w.id === warehouseId || w.code === warehouseId);
  if (!wh) {
    return res.status(400).json({ error: `Warehouse '${warehouseId}' not found.` });
  }

  const itm = db.items.find(i => i.oemPartNumber.toLowerCase() === itemCode.toLowerCase() || i.sku.toLowerCase() === itemCode.toLowerCase());
  if (!itm) {
    return res.status(400).json({ error: `Item '${itemCode}' does not exist in master catalog.` });
  }

  const qty = Number(quantityIssued);
  const inv = db.inventory.find(i => i.itemId === itm.id && i.warehouseId === wh.id);
  const availableStock = inv ? inv.availableStock : 0;

  // Negative stock validation
  if (qty > availableStock && !isAdminOverride) {
    return res.status(409).json({
      error: 'NEGATIVE_STOCK_PREVENTED',
      message: `Cannot issue ${qty} units. Only ${availableStock} available in warehouse ${wh.name} (${wh.code}).`,
      availableStock,
      requestedQuantity: qty,
      warehouseName: wh.name
    });
  }

  const count = db.outgoingTransactions.length + 1;
  const outId = `OUT-2026-${count.toString().padStart(4, '0')}`;
  const userName = currentUser?.name || 'Warehouse Staff';

  const transaction: OutgoingStockTransaction = {
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
  const newShipment: ShipmentRecord = {
    id: `SHP-${Date.now().toString(36).toUpperCase()}`,
    trackingNumber: transaction.trackingNo,
    type: 'Outgoing',
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
    status: 'In Transit',
    notes: `Dispatched from ${wh.name} by ${userName}`,
    recordedBy: userName,
    updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
  };
  db.shipments.unshift(newShipment);

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

  syncAllToGoogleSheets().catch(() => {});

  res.json({
    success: true,
    transaction,
    inventory: inv
  });
});

// EDIT OUTGOING TRANSACTION (Modify quantity, customer, PO, tracking with inventory adjustment)
app.put('/api/outgoing/:id', (req: Request, res: Response) => {
  const idx = db.outgoingTransactions.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Outgoing transaction not found' });

  const tx = db.outgoingTransactions[idx];
  const oldQty = tx.quantityIssued;
  const newQty = req.body.quantityIssued !== undefined ? Number(req.body.quantityIssued) : oldQty;
  const qtyDiff = newQty - oldQty; // positive means we are issuing MORE items

  const wh = db.warehouses.find(w => w.id === tx.warehouseId);
  const itm = db.items.find(i => i.oemPartNumber === tx.itemCode);

  let inv: InventoryRecord | undefined;
  if (wh && itm) {
    inv = db.inventory.find(i => i.warehouseId === wh.id && i.itemId === itm.id);
    if (inv) {
      if (qtyDiff > 0 && inv.availableStock < qtyDiff && !req.body.isAdminOverride) {
        return res.status(409).json({
          error: 'NEGATIVE_STOCK_PREVENTED',
          message: `Cannot increase dispatch by ${qtyDiff} units. Only ${inv.availableStock} available.`
        });
      }
      inv.physicalStock = Math.max(0, inv.physicalStock - qtyDiff);
      inv.availableStock = Math.max(0, inv.physicalStock - inv.reservedStock - inv.quarantinedStock);
      inv.updatedAt = new Date().toISOString().slice(0, 10);
    }
  }

  tx.quantityIssued = newQty;
  tx.totalPriceUSD = tx.quantityIssued * tx.unitPriceUSD;
  if (req.body.customerOrWarehouse) tx.customerOrWarehouse = req.body.customerOrWarehouse.trim();
  if (req.body.trackingNo) tx.trackingNo = req.body.trackingNo.trim();
  if (req.body.serialNumber !== undefined) tx.serialNumber = req.body.serialNumber.trim();
  if (req.body.poNumber) tx.poNumber = req.body.poNumber.trim();
  if (req.body.dateIssued) tx.dateIssued = req.body.dateIssued;
  if (req.body.itemDescription) tx.itemDescription = req.body.itemDescription.trim();

  // Update corresponding shipment
  const shp = db.shipments.find(s => s.trackingNumber === tx.trackingNo || s.poOrRef === tx.poNumber);
  if (shp) {
    shp.quantity = newQty;
    shp.party = tx.customerOrWarehouse;
    shp.serialNumber = tx.serialNumber;
    shp.date = tx.dateIssued;
    shp.updatedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
  }

  saveDatabase();

  logAudit(
    'EDIT_OUTGOING',
    'Outgoing Stock',
    'OutgoingTransaction',
    tx.id,
    tx.trackingNo,
    `Edited outgoing stock: Qty changed from ${oldQty} to ${newQty} (Diff: ${qtyDiff >= 0 ? '+' : ''}${qtyDiff})`,
    req.body.currentUser || { id: 'SYS', name: 'Admin', role: 'Admin' }
  );

  syncAllToGoogleSheets().catch(() => {});

  res.json({
    success: true,
    message: 'Outgoing transaction updated and stock adjusted successfully.',
    transaction: tx,
    inventory: inv
  });
});

// ==========================================
// 6. SHIPMENT TRACKER (GET & EDIT)
// ==========================================
app.get('/api/shipments', (req: Request, res: Response) => {
  const { warehouseId } = req.query;
  if (warehouseId && warehouseId !== 'ALL') {
    return res.json(db.shipments.filter(s => s.warehouseId === warehouseId));
  }
  res.json(db.shipments);
});

app.put('/api/shipments/:id', (req: Request, res: Response) => {
  const idx = db.shipments.findIndex(s => s.id === req.params.id || s.trackingNumber === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Shipment not found' });

  const shp = db.shipments[idx];
  const { status, notes, carrier, trackingNumber, party, updatedBy } = req.body;

  if (status) shp.status = status;
  if (notes !== undefined) shp.notes = notes;
  if (carrier) shp.carrier = carrier;
  if (trackingNumber) shp.trackingNumber = trackingNumber;
  if (party) shp.party = party;
  shp.updatedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
  if (updatedBy) shp.recordedBy = updatedBy;

  saveDatabase();
  logAudit('UPDATE_SHIPMENT', 'Shipment Tracker', 'Shipment', shp.id, shp.trackingNumber, `Updated shipment status to ${shp.status}`, { id: 'USR', name: updatedBy || 'Staff', role: 'Staff' });

  syncAllToGoogleSheets().catch(() => {});

  res.json(shp);
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

  syncAllToGoogleSheets().catch(() => {});

  res.json(shp);
});

// ==========================================
// SUPPLIERS & CUSTOMERS (ADD & EDIT)
// ==========================================
app.get('/api/suppliers', (req: Request, res: Response) => {
  res.json(db.suppliers);
});

app.post('/api/suppliers', (req: Request, res: Response) => {
  const { name, contactPerson, email, phone, country, paymentTerms, currentUser } = req.body;
  if (!name) return res.status(400).json({ error: 'Supplier Name is required' });

  const newSup: Supplier = {
    id: `SUP-${(db.suppliers.length + 1).toString().padStart(3, '0')}`,
    code: name.substring(0, 4).toUpperCase(),
    name: name.trim(),
    contactPerson: contactPerson || 'Procurement Agent',
    email: email || 'orders@supplier.com',
    phone: phone || '',
    country: country || 'USA',
    city: 'Direct',
    paymentTerms: paymentTerms || 'Net 30 Days',
    currency: 'USD',
    specialtyBrands: ['Spare Parts'],
    active: true
  };

  db.suppliers.push(newSup);
  saveDatabase();
  logAudit('ADD_SUPPLIER', 'Suppliers', 'Supplier', newSup.id, newSup.name, `Added supplier ${newSup.name}`, currentUser);

  syncAllToGoogleSheets().catch(() => {});

  res.json(newSup);
});

app.post('/api/suppliers/bulk', (req: Request, res: Response) => {
  const { suppliers, currentUser } = req.body;
  if (!Array.isArray(suppliers) || suppliers.length === 0) {
    return res.status(400).json({ error: 'Array of suppliers is required' });
  }

  let createdCount = 0;
  suppliers.forEach((s: any) => {
    const name = (s.name || s.supplierName || s.companyName || '').toString().trim();
    if (!name) return;

    // Check if supplier already exists by name
    const existing = db.suppliers.find(sup => sup.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (s.contactPerson) existing.contactPerson = s.contactPerson;
      if (s.email) existing.email = s.email;
      if (s.phone) existing.phone = s.phone;
      if (s.country) existing.country = s.country;
      if (s.paymentTerms) existing.paymentTerms = s.paymentTerms;
      return;
    }

    const newSup: Supplier = {
      id: `SUP-${(db.suppliers.length + 1).toString().padStart(3, '0')}`,
      code: (s.code || name.substring(0, 4)).toUpperCase(),
      name,
      contactPerson: s.contactPerson || 'Procurement Agent',
      email: s.email || 'orders@supplier.com',
      phone: s.phone || '',
      country: s.country || 'USA',
      city: s.city || 'Direct',
      address: s.address || '',
      paymentTerms: s.paymentTerms || 'Net 30 Days',
      currency: s.currency || 'USD',
      specialtyBrands: s.specialtyBrands || ['Industrial Equipment'],
      active: true
    };
    db.suppliers.push(newSup);
    createdCount++;
  });

  saveDatabase();
  logAudit('BULK_ADD_SUPPLIERS', 'Suppliers', 'Supplier', 'BULK', 'MULTIPLE', `Bulk imported ${createdCount} suppliers into directory`, currentUser);
  syncAllToGoogleSheets().catch(() => {});

  res.json({
    success: true,
    createdCount,
    totalSuppliers: db.suppliers.length,
    message: `Successfully processed supplier list (${createdCount} new suppliers added).`
  });
});

app.put('/api/suppliers/:id', (req: Request, res: Response) => {
  const idx = db.suppliers.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Supplier not found' });

  db.suppliers[idx] = { ...db.suppliers[idx], ...req.body };
  saveDatabase();
  logAudit('EDIT_SUPPLIER', 'Suppliers', 'Supplier', db.suppliers[idx].id, db.suppliers[idx].name, `Updated supplier ${db.suppliers[idx].name}`, req.body.currentUser);

  syncAllToGoogleSheets().catch(() => {});

  res.json(db.suppliers[idx]);
});

app.get('/api/customers', (req: Request, res: Response) => {
  res.json(db.customers);
});

app.post('/api/customers', (req: Request, res: Response) => {
  const { companyName, contactPerson, email, phone, shippingAddress, country, city, paymentTerms, currency, currentUser } = req.body;
  if (!companyName) return res.status(400).json({ error: 'Customer Name is required' });

  const newCust: Customer = {
    id: `CUST-${(db.customers.length + 1).toString().padStart(3, '0')}`,
    code: companyName.substring(0, 4).toUpperCase(),
    companyName: companyName.trim(),
    contactPerson: contactPerson || 'Procurement Contact',
    email: email || 'purchasing@client.com',
    phone: phone || '',
    country: country || 'USA',
    city: city || 'Direct',
    shippingAddress: shippingAddress || 'Client Receiving Dock',
    paymentTerms: paymentTerms || 'Net 30 Days',
    currency: currency || 'USD',
    active: true
  };

  db.customers.push(newCust);
  saveDatabase();
  logAudit('ADD_CUSTOMER', 'Customers', 'Customer', newCust.id, newCust.companyName, `Added customer ${newCust.companyName}`, currentUser);

  syncAllToGoogleSheets().catch(() => {});

  res.json(newCust);
});

app.post('/api/customers/bulk', (req: Request, res: Response) => {
  const { customers, currentUser } = req.body;
  if (!Array.isArray(customers) || customers.length === 0) {
    return res.status(400).json({ error: 'Array of customers is required' });
  }

  let createdCount = 0;
  customers.forEach((c: any) => {
    const name = (c.companyName || c.name || c.customerName || '').toString().trim();
    if (!name) return;

    // Check if customer already exists by companyName
    const existing = db.customers.find(cust => cust.companyName.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (c.contactPerson) existing.contactPerson = c.contactPerson;
      if (c.email) existing.email = c.email;
      if (c.phone) existing.phone = c.phone;
      if (c.country) existing.country = c.country;
      if (c.shippingAddress) existing.shippingAddress = c.shippingAddress;
      if (c.paymentTerms) existing.paymentTerms = c.paymentTerms;
      return;
    }

    const newCust: Customer = {
      id: `CUST-${(db.customers.length + 1).toString().padStart(3, '0')}`,
      code: (c.code || name.substring(0, 4)).toUpperCase(),
      companyName: name,
      contactPerson: c.contactPerson || 'Procurement Contact',
      email: c.email || 'purchasing@client.com',
      phone: c.phone || '',
      country: c.country || 'USA',
      city: c.city || 'Direct',
      shippingAddress: c.shippingAddress || c.address || 'Client Receiving Dock',
      paymentTerms: c.paymentTerms || 'Net 30 Days',
      currency: c.currency || 'USD',
      active: true
    };
    db.customers.push(newCust);
    createdCount++;
  });

  saveDatabase();
  logAudit('BULK_ADD_CUSTOMERS', 'Customers', 'Customer', 'BULK', 'MULTIPLE', `Bulk imported ${createdCount} customers into directory`, currentUser);
  syncAllToGoogleSheets().catch(() => {});

  res.json({
    success: true,
    createdCount,
    totalCustomers: db.customers.length,
    message: `Successfully processed customer list (${createdCount} new customers added).`
  });
});

app.put('/api/customers/:id', (req: Request, res: Response) => {
  const idx = db.customers.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Customer not found' });

  db.customers[idx] = { ...db.customers[idx], ...req.body };
  saveDatabase();
  logAudit('EDIT_CUSTOMER', 'Customers', 'Customer', db.customers[idx].id, db.customers[idx].companyName, `Updated customer ${db.customers[idx].companyName}`, req.body.currentUser);

  syncAllToGoogleSheets().catch(() => {});

  res.json(db.customers[idx]);
});

// Audit Logs
app.get('/api/audit', (req: Request, res: Response) => {
  res.json(db.auditLogs);
});

// ==========================================
// GOOGLE SHEETS SETUP & SYNC
// ==========================================
app.get('/api/database/config', (req: Request, res: Response) => {
  const effCfg = getEffectiveSheetsConfig();
  res.json({
    spreadsheetId: effCfg.spreadsheetId,
    serviceAccountEmail: effCfg.serviceAccountEmail,
    autoSync: effCfg.autoSync,
    lastSyncTime: effCfg.lastSyncTime || gSheetsConfig.lastSyncTime,
    hasPrivateKey: Boolean(effCfg.privateKey)
  });
});

app.post('/api/database/sync-to-sheets', async (req: Request, res: Response) => {
  try {
    await syncAllToGoogleSheets();
    return res.json({
      success: true,
      message: 'Successfully synchronized ERP database to Google Sheets!',
      syncTime: gSheetsConfig.lastSyncTime
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: `Sync failed: ${err.message}` });
  }
});

// Vite middleware mounted in dev mode
if (!process.env.VERCEL) {
  if (process.env.NODE_ENV !== 'production') {
    import('vite').then(({ createServer }) => {
      createServer({
        server: { middlewareMode: true },
        appType: 'spa'
      }).then(vite => {
        app.use(vite.middlewares);
        app.listen(PORT, () => {
          console.log(`Real Deals ERP running on http://localhost:${PORT}`);
        });
      });
    });
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    app.listen(PORT, () => {
      console.log(`Real Deals ERP running on http://localhost:${PORT}`);
    });
  }
}

export default app;
