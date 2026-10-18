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
} from '../types/erp';

// 1. Initial 9 Warehouses as specified in Master Prompt
export const INITIAL_WAREHOUSES: Warehouse[] = [
  {
    id: 'WH-001',
    code: 'TLS-USA',
    name: 'Main Warehouse',
    location: 'TLS, USA',
    country: 'United States',
    city: 'TLS, USA',
    address: '1040 Logistics Way, TLS, USA',
    managerName: 'Imtiaz',
    contactEmail: 'imtiaz.tls@realdeals.com',
    contactPhone: '+1 918 555 0101',
    totalCapacitySqM: 4500,
    active: true,
    binsCount: 480
  },
  {
    id: 'WH-002',
    code: 'TOLL-UAE',
    name: 'Secondary Warehouse',
    location: 'TOLL, UAE',
    country: 'United Arab Emirates',
    city: 'TOLL, UAE',
    address: 'Warehouse 12, Toll Logistics Zone, Dubai, UAE',
    managerName: 'Anoop',
    contactEmail: 'anoop.toll@realdeals.com',
    contactPhone: '+971 4 881 2233',
    totalCapacitySqM: 3200,
    active: true,
    binsCount: 360
  },
  {
    id: 'WH-003',
    code: 'SNT-UAE',
    name: 'Regional Warehouse',
    location: 'SNT, UAE',
    country: 'United Arab Emirates',
    city: 'SNT, UAE',
    address: 'Industrial Area 11, SNT, UAE',
    managerName: 'Santhosh',
    contactEmail: 'santhosh.snt@realdeals.com',
    contactPhone: '+971 6 543 9988',
    totalCapacitySqM: 2800,
    active: true,
    binsCount: 300
  },
  {
    id: 'WH-004',
    code: 'BFLO-USA',
    name: 'Regional Warehouse',
    location: 'BFLO, USA',
    country: 'United States',
    city: 'BFLO, USA',
    address: '450 Airport Commerce Blvd, Buffalo, NY, USA',
    managerName: 'Denial',
    contactEmail: 'denial.bflo@realdeals.com',
    contactPhone: '+1 716 555 3344',
    totalCapacitySqM: 2500,
    active: true,
    binsCount: 280
  },
  {
    id: 'WH-005',
    code: 'REG-USA',
    name: 'Regional Warehouse',
    location: 'USA',
    country: 'United States',
    city: 'Houston, TX, USA',
    address: '8820 Greens Rd, Houston, TX 77032, USA',
    managerName: 'Unassigned',
    contactEmail: 'usa.wh5@realdeals.com',
    contactPhone: '+1 713 555 8899',
    totalCapacitySqM: 2200,
    active: true,
    binsCount: 240
  },
  {
    id: 'WH-006',
    code: 'NMK-UAE',
    name: 'Regional Warehouse',
    location: 'NMK, UAE',
    country: 'United Arab Emirates',
    city: 'NMK, UAE',
    address: 'Plot 401, NMK Industrial Hub, UAE',
    managerName: 'Tariq',
    contactEmail: 'tariq.nmk@realdeals.com',
    contactPhone: '+971 4 332 7711',
    totalCapacitySqM: 2600,
    active: true,
    binsCount: 290
  },
  {
    id: 'WH-007',
    code: 'DXB-UAE',
    name: 'Regional Warehouse',
    location: 'DXB, UAE',
    country: 'United Arab Emirates',
    city: 'DXB, UAE',
    address: 'JAFZA South Zone 2, Warehouse 44-B, Dubai, UAE',
    managerName: 'Zafar',
    contactEmail: 'zafar.dxb@realdeals.com',
    contactPhone: '+971 4 881 9920',
    totalCapacitySqM: 3800,
    active: true,
    binsCount: 420
  },
  {
    id: 'WH-008',
    code: 'AUH-UAE',
    name: 'Regional Warehouse',
    location: 'AUH, UAE',
    country: 'United Arab Emirates',
    city: 'AUH, UAE',
    address: 'KIZAD Industrial Zone, Sector A, Abu Dhabi, UAE',
    managerName: 'Rashid',
    contactEmail: 'rashid.auh@realdeals.com',
    contactPhone: '+971 2 678 1144',
    totalCapacitySqM: 3000,
    active: true,
    binsCount: 340
  },
  {
    id: 'WH-009',
    code: 'GLOBAL-TRN',
    name: 'Central Transit Hub',
    location: 'Global Transit',
    country: 'Global',
    city: 'In-Transit Buffer',
    address: 'International Air Freight & Cross-Dock Hub',
    managerName: 'Operations Desk',
    contactEmail: 'transit@realdeals.com',
    contactPhone: '+1 800 555 0199',
    totalCapacitySqM: 1500,
    active: true,
    binsCount: 150
  }
];

// 2. Initial Users with Roles: Admin, Warehouse Manager, Staff
export const INITIAL_USERS: User[] = [
  {
    id: 'USR-001',
    name: 'Dawood Zafar',
    email: 'dawoodzafar1984@gmail.com',
    role: 'Admin',
    password: 'admin',
    department: 'Executive Operations',
    active: true,
    lastLogin: '2026-10-17 10:45'
  },
  {
    id: 'USR-002',
    name: 'Imtiaz',
    email: 'imtiaz.tls@realdeals.com',
    role: 'Warehouse Manager',
    password: 'password',
    department: 'TLS Warehouse Operations',
    assignedWarehouseId: 'WH-001',
    active: true,
    lastLogin: '2026-10-17 09:15'
  },
  {
    id: 'USR-003',
    name: 'Anoop',
    email: 'anoop.toll@realdeals.com',
    role: 'Warehouse Manager',
    password: 'password',
    department: 'TOLL Warehouse Operations',
    assignedWarehouseId: 'WH-002',
    active: true,
    lastLogin: '2026-10-17 08:30'
  },
  {
    id: 'USR-004',
    name: 'Santhosh',
    email: 'santhosh.snt@realdeals.com',
    role: 'Warehouse Manager',
    password: 'password',
    department: 'SNT Warehouse Operations',
    assignedWarehouseId: 'WH-003',
    active: true,
    lastLogin: '2026-10-17 09:50'
  },
  {
    id: 'USR-005',
    name: 'Denial',
    email: 'denial.bflo@realdeals.com',
    role: 'Warehouse Manager',
    password: 'password',
    department: 'BFLO Warehouse Operations',
    assignedWarehouseId: 'WH-004',
    active: true,
    lastLogin: '2026-10-16 17:20'
  },
  {
    id: 'USR-006',
    name: 'Tariq',
    email: 'tariq.nmk@realdeals.com',
    role: 'Staff',
    password: 'password',
    department: 'NMK Store Inventory',
    assignedWarehouseId: 'WH-006',
    active: true,
    lastLogin: '2026-10-17 08:00'
  }
];

// 3. Items (Real Deals Automation & Control spare parts)
export const INITIAL_ITEMS: Item[] = [
  {
    id: 'ITEM-001',
    sku: 'SIE-6ES7515-2AM02',
    oemPartNumber: '6ES7515-2AM02-0AB0',
    brand: 'Siemens',
    description: 'SIMATIC S7-1500 CPU 1515-2 PN Central Processing Unit 3MB Program/Data Memory',
    category: 'PLC CPU',
    condition: 'Factory Sealed New',
    unit: 'PCS',
    costPriceUSD: 2450.00,
    sellingPriceUSD: 3680.00,
    weightKg: 0.85,
    hsCode: '8537.10.91',
    countryOfOrigin: 'Germany',
    minSafetyStock: 3,
    reorderPoint: 5,
    targetStockLevel: 12,
    defaultLeadTimeDays: 14,
    createdAt: '2026-01-15',
    updatedAt: '2026-10-15'
  },
  {
    id: 'ITEM-002',
    sku: 'AB-1756-L83E',
    oemPartNumber: '1756-L83E',
    brand: 'Allen-Bradley',
    description: 'ControlLogix 5580 Controller with 10MB User Memory, 1Gbps Ethernet Port',
    category: 'PLC Controller',
    condition: 'Factory Sealed New',
    unit: 'PCS',
    costPriceUSD: 4200.00,
    sellingPriceUSD: 6150.00,
    weightKg: 0.68,
    hsCode: '8537.10.91',
    countryOfOrigin: 'United States',
    minSafetyStock: 2,
    reorderPoint: 4,
    targetStockLevel: 8,
    defaultLeadTimeDays: 21,
    createdAt: '2026-01-16',
    updatedAt: '2026-10-14'
  },
  {
    id: 'ITEM-003',
    sku: 'SIE-6SL3210-1PE21',
    oemPartNumber: '6SL3210-1PE21-8UL0',
    brand: 'Siemens',
    description: 'SINAMICS G120 Power Module PM240-2 Unfiltered with integrated brake chopper 7.5kW',
    category: 'VFD & Drives',
    condition: 'Factory Sealed New',
    unit: 'PCS',
    costPriceUSD: 1120.00,
    sellingPriceUSD: 1790.00,
    weightKg: 4.5,
    hsCode: '8504.40.88',
    countryOfOrigin: 'United Kingdom',
    minSafetyStock: 4,
    reorderPoint: 6,
    targetStockLevel: 15,
    defaultLeadTimeDays: 18,
    createdAt: '2026-02-01',
    updatedAt: '2026-10-12'
  },
  {
    id: 'ITEM-004',
    sku: 'SCH-ATV630D15N4',
    oemPartNumber: 'ATV630D15N4',
    brand: 'Schneider Electric',
    description: 'Altivar Process ATV630 Variable Speed Drive 15kW 400V 3-Phase IP21',
    category: 'VFD & Drives',
    condition: 'New Open Box',
    unit: 'PCS',
    costPriceUSD: 1680.00,
    sellingPriceUSD: 2450.00,
    weightKg: 13.5,
    hsCode: '8504.40.88',
    countryOfOrigin: 'France',
    minSafetyStock: 2,
    reorderPoint: 3,
    targetStockLevel: 6,
    defaultLeadTimeDays: 25,
    createdAt: '2026-02-10',
    updatedAt: '2026-10-16'
  },
  {
    id: 'ITEM-005',
    sku: 'AB-1756-IB16',
    oemPartNumber: '1756-IB16',
    brand: 'Allen-Bradley',
    description: 'ControlLogix 10-31 VDC 16-Point Digital Input Module Sink/Source',
    category: 'I/O Modules',
    condition: 'Factory Sealed New',
    unit: 'PCS',
    costPriceUSD: 410.00,
    sellingPriceUSD: 680.00,
    weightKg: 0.32,
    hsCode: '8538.90.99',
    countryOfOrigin: 'Mexico',
    minSafetyStock: 8,
    reorderPoint: 15,
    targetStockLevel: 30,
    defaultLeadTimeDays: 7,
    createdAt: '2026-02-15',
    updatedAt: '2026-10-10'
  },
  {
    id: 'ITEM-006',
    sku: 'SIE-6ES7134-6GD01',
    oemPartNumber: '6ES7134-6GD01-0BA1',
    brand: 'Siemens',
    description: 'SIMATIC ET 200SP Analog Input Module AI 4xI 2-/4-Wire Standard',
    category: 'I/O Modules',
    condition: 'Factory Sealed New',
    unit: 'PCS',
    costPriceUSD: 295.00,
    sellingPriceUSD: 485.00,
    weightKg: 0.18,
    hsCode: '8538.90.99',
    countryOfOrigin: 'Germany',
    minSafetyStock: 10,
    reorderPoint: 18,
    targetStockLevel: 40,
    defaultLeadTimeDays: 10,
    createdAt: '2026-03-01',
    updatedAt: '2026-10-11'
  },
  {
    id: 'ITEM-007',
    sku: 'ABB-REF615E',
    oemPartNumber: 'HBFNAEAGNDB1BNA11E',
    brand: 'ABB',
    description: 'Relion 615 Series Feeder Protection and Control Relay REF615 IEC61850',
    category: 'Protection Relays',
    condition: 'Refurbished',
    unit: 'PCS',
    costPriceUSD: 3100.00,
    sellingPriceUSD: 4800.00,
    weightKg: 5.2,
    hsCode: '8536.49.00',
    countryOfOrigin: 'Finland',
    minSafetyStock: 1,
    reorderPoint: 2,
    targetStockLevel: 5,
    defaultLeadTimeDays: 30,
    createdAt: '2026-03-12',
    updatedAt: '2026-10-08'
  },
  {
    id: 'ITEM-008',
    sku: 'OMR-CP1E-N40DR',
    oemPartNumber: 'CP1E-N40DR-A',
    brand: 'Omron',
    description: 'CP1E Programmable Controller 24 Inputs 16 Relay Outputs AC Power Supply',
    category: 'PLC CPU',
    condition: 'Factory Sealed New',
    unit: 'PCS',
    costPriceUSD: 380.00,
    sellingPriceUSD: 590.00,
    weightKg: 0.72,
    hsCode: '8537.10.91',
    countryOfOrigin: 'Japan',
    minSafetyStock: 5,
    reorderPoint: 8,
    targetStockLevel: 20,
    defaultLeadTimeDays: 14,
    createdAt: '2026-03-20',
    updatedAt: '2026-10-09'
  }
];

// 4. Initial Inventory distribution across the 9 warehouses
export const INITIAL_INVENTORY: InventoryRecord[] = [
  // ITEM-001 (Siemens CPU 1515)
  { id: 'INV-001', itemId: 'ITEM-001', warehouseId: 'WH-001', binLocation: 'Shelf A-01', physicalStock: 5, reservedStock: 1, availableStock: 4, inTransitStock: 0, quarantinedStock: 0, lastCountDate: '2026-10-15', updatedAt: '2026-10-15' },
  { id: 'INV-002', itemId: 'ITEM-001', warehouseId: 'WH-002', binLocation: 'Rack B-03', physicalStock: 4, reservedStock: 0, availableStock: 4, inTransitStock: 2, quarantinedStock: 0, lastCountDate: '2026-10-14', updatedAt: '2026-10-14' },
  { id: 'INV-003', itemId: 'ITEM-001', warehouseId: 'WH-003', binLocation: 'Bay 12-A', physicalStock: 2, reservedStock: 0, availableStock: 2, inTransitStock: 0, quarantinedStock: 0, lastCountDate: '2026-10-12', updatedAt: '2026-10-12' },
  { id: 'INV-004', itemId: 'ITEM-001', warehouseId: 'WH-004', binLocation: 'Sec 4-B', physicalStock: 3, reservedStock: 0, availableStock: 3, inTransitStock: 0, quarantinedStock: 0, lastCountDate: '2026-10-10', updatedAt: '2026-10-10' },
  { id: 'INV-005', itemId: 'ITEM-001', warehouseId: 'WH-007', binLocation: 'Row 02-C', physicalStock: 3, reservedStock: 1, availableStock: 2, inTransitStock: 0, quarantinedStock: 0, lastCountDate: '2026-10-11', updatedAt: '2026-10-11' },

  // ITEM-002 (ControlLogix 5580)
  { id: 'INV-006', itemId: 'ITEM-002', warehouseId: 'WH-001', binLocation: 'Safe Vault-01', physicalStock: 3, reservedStock: 0, availableStock: 3, inTransitStock: 1, quarantinedStock: 0, lastCountDate: '2026-10-15', updatedAt: '2026-10-15' },
  { id: 'INV-007', itemId: 'ITEM-002', warehouseId: 'WH-002', binLocation: 'Rack B-01', physicalStock: 2, reservedStock: 0, availableStock: 2, inTransitStock: 0, quarantinedStock: 0, lastCountDate: '2026-10-14', updatedAt: '2026-10-14' },
  { id: 'INV-008', itemId: 'ITEM-002', warehouseId: 'WH-004', binLocation: 'Sec 2-A', physicalStock: 1, reservedStock: 0, availableStock: 1, inTransitStock: 0, quarantinedStock: 0, lastCountDate: '2026-10-09', updatedAt: '2026-10-09' },
  { id: 'INV-009', itemId: 'ITEM-002', warehouseId: 'WH-006', binLocation: 'Shelf 01', physicalStock: 1, reservedStock: 0, availableStock: 1, inTransitStock: 0, quarantinedStock: 0, lastCountDate: '2026-10-13', updatedAt: '2026-10-13' },

  // ITEM-003 (Siemens G120 PM240-2)
  { id: 'INV-010', itemId: 'ITEM-003', warehouseId: 'WH-001', binLocation: 'Heavy Rack-A', physicalStock: 6, reservedStock: 2, availableStock: 4, inTransitStock: 0, quarantinedStock: 0, lastCountDate: '2026-10-14', updatedAt: '2026-10-14' },
  { id: 'INV-011', itemId: 'ITEM-003', warehouseId: 'WH-002', binLocation: 'Pallet 04', physicalStock: 4, reservedStock: 0, availableStock: 4, inTransitStock: 0, quarantinedStock: 0, lastCountDate: '2026-10-13', updatedAt: '2026-10-13' },
  { id: 'INV-012', itemId: 'ITEM-003', warehouseId: 'WH-003', binLocation: 'Rack D-02', physicalStock: 3, reservedStock: 0, availableStock: 3, inTransitStock: 0, quarantinedStock: 0, lastCountDate: '2026-10-11', updatedAt: '2026-10-11' },
  { id: 'INV-013', itemId: 'ITEM-003', warehouseId: 'WH-008', binLocation: 'Bay 03-C', physicalStock: 2, reservedStock: 0, availableStock: 2, inTransitStock: 0, quarantinedStock: 0, lastCountDate: '2026-10-10', updatedAt: '2026-10-10' },

  // ITEM-004 (Schneider ATV630)
  { id: 'INV-014', itemId: 'ITEM-004', warehouseId: 'WH-001', binLocation: 'Pallet 02', physicalStock: 2, reservedStock: 0, availableStock: 2, inTransitStock: 0, quarantinedStock: 0, lastCountDate: '2026-10-12', updatedAt: '2026-10-12' },
  { id: 'INV-015', itemId: 'ITEM-004', warehouseId: 'WH-002', binLocation: 'Zone C-04', physicalStock: 1, reservedStock: 0, availableStock: 1, inTransitStock: 0, quarantinedStock: 0, lastCountDate: '2026-10-11', updatedAt: '2026-10-11' },

  // ITEM-005 (Allen-Bradley 1756-IB16)
  { id: 'INV-016', itemId: 'ITEM-005', warehouseId: 'WH-001', binLocation: 'Bin C-12', physicalStock: 14, reservedStock: 2, availableStock: 12, inTransitStock: 0, quarantinedStock: 0, lastCountDate: '2026-10-15', updatedAt: '2026-10-15' },
  { id: 'INV-017', itemId: 'ITEM-005', warehouseId: 'WH-002', binLocation: 'Bin 08-A', physicalStock: 10, reservedStock: 0, availableStock: 10, inTransitStock: 0, quarantinedStock: 0, lastCountDate: '2026-10-14', updatedAt: '2026-10-14' },
  { id: 'INV-018', itemId: 'ITEM-005', warehouseId: 'WH-003', binLocation: 'Small Parts-1', physicalStock: 6, reservedStock: 0, availableStock: 6, inTransitStock: 0, quarantinedStock: 0, lastCountDate: '2026-10-12', updatedAt: '2026-10-12' },
  { id: 'INV-019', itemId: 'ITEM-005', warehouseId: 'WH-006', binLocation: 'Box 04', physicalStock: 4, reservedStock: 0, availableStock: 4, inTransitStock: 0, quarantinedStock: 0, lastCountDate: '2026-10-10', updatedAt: '2026-10-10' },

  // ITEM-006 (Siemens ET 200SP AI)
  { id: 'INV-020', itemId: 'ITEM-006', warehouseId: 'WH-001', binLocation: 'Drawer 02', physicalStock: 18, reservedStock: 3, availableStock: 15, inTransitStock: 0, quarantinedStock: 0, lastCountDate: '2026-10-15', updatedAt: '2026-10-15' },
  { id: 'INV-021', itemId: 'ITEM-006', warehouseId: 'WH-002', binLocation: 'Drawer 05', physicalStock: 12, reservedStock: 0, availableStock: 12, inTransitStock: 0, quarantinedStock: 0, lastCountDate: '2026-10-13', updatedAt: '2026-10-13' },
  { id: 'INV-022', itemId: 'ITEM-006', warehouseId: 'WH-007', binLocation: 'Cabinet A', physicalStock: 8, reservedStock: 0, availableStock: 8, inTransitStock: 0, quarantinedStock: 0, lastCountDate: '2026-10-11', updatedAt: '2026-10-11' },

  // ITEM-007 (ABB Protection Relay)
  { id: 'INV-023', itemId: 'ITEM-007', warehouseId: 'WH-002', binLocation: 'Secure Rack 01', physicalStock: 1, reservedStock: 0, availableStock: 1, inTransitStock: 0, quarantinedStock: 0, lastCountDate: '2026-10-09', updatedAt: '2026-10-09' },

  // ITEM-008 (Omron CP1E)
  { id: 'INV-024', itemId: 'ITEM-008', warehouseId: 'WH-001', binLocation: 'Shelf B-04', physicalStock: 7, reservedStock: 0, availableStock: 7, inTransitStock: 0, quarantinedStock: 0, lastCountDate: '2026-10-14', updatedAt: '2026-10-14' },
  { id: 'INV-025', itemId: 'ITEM-008', warehouseId: 'WH-003', binLocation: 'Shelf 03', physicalStock: 5, reservedStock: 0, availableStock: 5, inTransitStock: 0, quarantinedStock: 0, lastCountDate: '2026-10-12', updatedAt: '2026-10-12' },
  { id: 'INV-026', itemId: 'ITEM-008', warehouseId: 'WH-006', binLocation: 'Bin 12', physicalStock: 3, reservedStock: 0, availableStock: 3, inTransitStock: 0, quarantinedStock: 0, lastCountDate: '2026-10-10', updatedAt: '2026-10-10' }
];

// 5. Initial Incoming Stock Transactions (Exact 9 fields from user prompt)
export const INITIAL_INCOMING_TRANSACTIONS: IncomingStockTransaction[] = [
  {
    id: 'INC-2026-0001',
    date: '2026-10-15',
    trackingNo: 'TRK-DHL-9921827',
    itemCode: '6ES7515-2AM02-0AB0',
    serialNumber: 'S-SIE-884102, S-SIE-884103',
    warehouseId: 'WH-001',
    warehouseCode: 'TLS-USA',
    warehouseName: 'Main Warehouse (TLS, USA)',
    supplier: 'Hanseatic Automation GmbH',
    quantityReceived: 2,
    itemDescription: 'SIMATIC S7-1500 CPU 1515-2 PN Central Processing Unit',
    unitCost: 2450.00,
    totalCostUSD: 4900.00,
    createdByUser: 'Imtiaz',
    createdAt: '2026-10-15 14:22'
  },
  {
    id: 'INC-2026-0002',
    date: '2026-10-14',
    trackingNo: 'TRK-FDX-7738291',
    itemCode: '1756-L83E',
    serialNumber: 'AB-8837190',
    warehouseId: 'WH-002',
    warehouseCode: 'TOLL-UAE',
    warehouseName: 'Secondary Warehouse (TOLL, UAE)',
    supplier: 'Rockwell Direct Parts LLC',
    quantityReceived: 1,
    itemDescription: 'ControlLogix 5580 Controller 10MB User Memory',
    unitCost: 4200.00,
    totalCostUSD: 4200.00,
    createdByUser: 'Anoop',
    createdAt: '2026-10-14 11:05'
  },
  {
    id: 'INC-2026-0003',
    date: '2026-10-13',
    trackingNo: 'TRK-UPS-5519283',
    itemCode: '6SL3210-1PE21-8UL0',
    serialNumber: 'PM-993821, PM-993822, PM-993823',
    warehouseId: 'WH-003',
    warehouseCode: 'SNT-UAE',
    warehouseName: 'Regional Warehouse (SNT, UAE)',
    supplier: 'EuroTech Drives & Controls',
    quantityReceived: 3,
    itemDescription: 'SINAMICS G120 Power Module PM240-2 7.5kW',
    unitCost: 1120.00,
    totalCostUSD: 3360.00,
    createdByUser: 'Santhosh',
    createdAt: '2026-10-13 16:40'
  },
  {
    id: 'INC-2026-0004',
    date: '2026-10-12',
    trackingNo: 'TRK-ARX-4491028',
    itemCode: '1756-IB16',
    serialNumber: 'IB-10029, IB-10030, IB-10031, IB-10032',
    warehouseId: 'WH-006',
    warehouseCode: 'NMK-UAE',
    warehouseName: 'Regional Warehouse (NMK, UAE)',
    supplier: 'Industrial Components Asia',
    quantityReceived: 4,
    itemDescription: 'ControlLogix 10-31 VDC 16-Point Input Module',
    unitCost: 410.00,
    totalCostUSD: 1640.00,
    createdByUser: 'Tariq',
    createdAt: '2026-10-12 10:15'
  }
];

// 6. Initial Outgoing Stock Transactions (Exact 9 fields from user prompt)
export const INITIAL_OUTGOING_TRANSACTIONS: OutgoingStockTransaction[] = [
  {
    id: 'OUT-2026-0001',
    dateIssued: '2026-10-16',
    itemCode: '6ES7515-2AM02-0AB0',
    trackingNo: 'TRK-OUT-99120',
    serialNumber: 'S-SIE-884102',
    warehouseId: 'WH-001',
    warehouseCode: 'TLS-USA',
    warehouseName: 'Main Warehouse (TLS, USA)',
    customerOrWarehouse: 'Saudi Aramco Refinery Project',
    quantityIssued: 1,
    poNumber: 'PO-SAR-9921',
    itemDescription: 'SIMATIC S7-1500 CPU 1515-2 PN Central Processing Unit',
    unitPriceUSD: 3680.00,
    totalPriceUSD: 3680.00,
    createdByUser: 'Imtiaz',
    isAdminOverride: false,
    createdAt: '2026-10-16 11:30'
  },
  {
    id: 'OUT-2026-0002',
    dateIssued: '2026-10-15',
    itemCode: '1756-IB16',
    trackingNo: 'TRK-OUT-88231',
    serialNumber: 'IB-10029, IB-10030',
    warehouseId: 'WH-002',
    warehouseCode: 'TOLL-UAE',
    warehouseName: 'Secondary Warehouse (TOLL, UAE)',
    customerOrWarehouse: 'Emirates Global Aluminium (EGA)',
    quantityIssued: 2,
    poNumber: 'PO-EGA-4410',
    itemDescription: 'ControlLogix 10-31 VDC 16-Point Input Module',
    unitPriceUSD: 680.00,
    totalPriceUSD: 1360.00,
    createdByUser: 'Anoop',
    isAdminOverride: false,
    createdAt: '2026-10-15 15:45'
  },
  {
    id: 'OUT-2026-0003',
    dateIssued: '2026-10-14',
    itemCode: '6SL3210-1PE21-8UL0',
    trackingNo: 'TRK-OUT-77192',
    serialNumber: 'PM-993821',
    warehouseId: 'WH-003',
    warehouseCode: 'SNT-UAE',
    warehouseName: 'Regional Warehouse (SNT, UAE)',
    customerOrWarehouse: 'ADNOC Offshore Maintenance',
    quantityIssued: 1,
    poNumber: 'PO-ADN-2291',
    itemDescription: 'SINAMICS G120 Power Module PM240-2 7.5kW',
    unitPriceUSD: 1790.00,
    totalPriceUSD: 1790.00,
    createdByUser: 'Santhosh',
    isAdminOverride: false,
    createdAt: '2026-10-14 09:20'
  }
];

// 7. Initial Shipments (Incoming and Outgoing)
export const INITIAL_SHIPMENTS: ShipmentRecord[] = [
  {
    id: 'SHP-001',
    trackingNumber: 'TRK-DHL-9921827',
    type: 'Incoming',
    warehouseId: 'WH-001',
    warehouseCode: 'TLS-USA',
    itemCode: '6ES7515-2AM02-0AB0',
    itemName: 'SIMATIC S7-1500 CPU 1515-2 PN',
    serialNumber: 'S-SIE-884102, S-SIE-884103',
    quantity: 2,
    party: 'Hanseatic Automation GmbH',
    poOrRef: 'PO-2026-0012',
    date: '2026-10-15',
    carrier: 'DHL Express',
    status: 'Delivered',
    notes: 'Direct supplier delivery received and verified.',
    recordedBy: 'Imtiaz',
    updatedAt: '2026-10-15 14:30'
  },
  {
    id: 'SHP-002',
    trackingNumber: 'TRK-FDX-7738291',
    type: 'Incoming',
    warehouseId: 'WH-002',
    warehouseCode: 'TOLL-UAE',
    itemCode: '1756-L83E',
    itemName: 'ControlLogix 5580 Controller',
    serialNumber: 'AB-8837190',
    quantity: 1,
    party: 'Rockwell Direct Parts LLC',
    poOrRef: 'PO-2026-0014',
    date: '2026-10-14',
    carrier: 'FedEx Priority',
    status: 'Delivered',
    notes: 'Received in factory sealed box.',
    recordedBy: 'Anoop',
    updatedAt: '2026-10-14 11:15'
  },
  {
    id: 'SHP-003',
    trackingNumber: 'TRK-IN-339182',
    type: 'Incoming',
    warehouseId: 'WH-004',
    warehouseCode: 'BFLO-USA',
    itemCode: '1756-L83E',
    itemName: 'ControlLogix 5580 Controller',
    serialNumber: 'AB-9928172',
    quantity: 1,
    party: 'Rockwell Surplus Stock',
    poOrRef: 'PO-2026-0018',
    date: '2026-10-16',
    carrier: 'UPS Express',
    status: 'In Transit',
    notes: 'En route from Chicago distribution centre.',
    recordedBy: 'Denial',
    updatedAt: '2026-10-16 16:00'
  },
  {
    id: 'SHP-004',
    trackingNumber: 'TRK-OUT-99120',
    type: 'Outgoing',
    warehouseId: 'WH-001',
    warehouseCode: 'TLS-USA',
    itemCode: '6ES7515-2AM02-0AB0',
    itemName: 'SIMATIC S7-1500 CPU 1515-2 PN',
    serialNumber: 'S-SIE-884102',
    quantity: 1,
    party: 'Saudi Aramco Refinery Project',
    poOrRef: 'PO-SAR-9921',
    date: '2026-10-16',
    carrier: 'DHL Express Global',
    status: 'In Transit',
    notes: 'Dispatched with air waybill documentation.',
    recordedBy: 'Imtiaz',
    updatedAt: '2026-10-16 12:00'
  },
  {
    id: 'SHP-005',
    trackingNumber: 'TRK-OUT-88231',
    type: 'Outgoing',
    warehouseId: 'WH-002',
    warehouseCode: 'TOLL-UAE',
    itemCode: '1756-IB16',
    itemName: 'ControlLogix 10-31 VDC 16-Point Input Module',
    serialNumber: 'IB-10029, IB-10030',
    quantity: 2,
    party: 'Emirates Global Aluminium (EGA)',
    poOrRef: 'PO-EGA-4410',
    date: '2026-10-15',
    carrier: 'Aramex Domestic',
    status: 'Delivered',
    notes: 'Customer signed delivery receipt on file.',
    recordedBy: 'Anoop',
    updatedAt: '2026-10-15 17:00'
  }
];

// 8. Suppliers
export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'SUP-001',
    code: 'SUP-GER-01',
    name: 'Hanseatic Automation GmbH',
    contactPerson: 'Wolfgang Schmidt',
    email: 'orders@hanseatic-automation.de',
    phone: '+49 40 7654 3210',
    country: 'Germany',
    city: 'Hamburg',
    paymentTerms: 'Net 30 Days',
    currency: 'EUR',
    specialtyBrands: ['Siemens', 'Phoenix Contact', 'Beckhoff'],
    active: true
  },
  {
    id: 'SUP-002',
    code: 'SUP-USA-02',
    name: 'Rockwell Direct Parts LLC',
    contactPerson: 'Sarah Jenkins',
    email: 'sales@rockwelldirectparts.com',
    phone: '+1 414 555 0188',
    country: 'United States',
    city: 'Milwaukee, WI',
    paymentTerms: 'Net 15 Days',
    currency: 'USD',
    specialtyBrands: ['Allen-Bradley', 'Rockwell Automation'],
    active: true
  },
  {
    id: 'SUP-003',
    code: 'SUP-UAE-03',
    name: 'EuroTech Drives & Controls',
    contactPerson: 'Vikram Patel',
    email: 'supplies@eurotechdrives.ae',
    phone: '+971 4 338 9012',
    country: 'United Arab Emirates',
    city: 'Dubai',
    paymentTerms: 'Immediate / TT',
    currency: 'USD',
    specialtyBrands: ['Siemens', 'Schneider Electric', 'ABB'],
    active: true
  },
  {
    id: 'SUP-004',
    code: 'SUP-SGP-04',
    name: 'Industrial Components Asia',
    contactPerson: 'Kenji Sato',
    email: 'sales@ind-components.sg',
    phone: '+65 6789 0123',
    country: 'Singapore',
    city: 'Singapore',
    paymentTerms: 'Net 30 Days',
    currency: 'USD',
    specialtyBrands: ['Omron', 'Fanuc', 'Mitsubishi Electric'],
    active: true
  }
];

// 9. Customers
export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'CUST-001',
    code: 'CUST-SAU-01',
    companyName: 'Saudi Aramco Refinery Project',
    contactPerson: 'Eng. Khalid Al-Ghamdi',
    email: 'procurement@aramco-projects.com',
    phone: '+966 13 874 0122',
    country: 'Saudi Arabia',
    city: 'Dhahran',
    shippingAddress: 'Dhahran Main Plant, Gate 4 Warehouse, Dhahran 31311',
    paymentTerms: 'Net 60 Days',
    currency: 'USD',
    active: true
  },
  {
    id: 'CUST-002',
    code: 'CUST-UAE-02',
    companyName: 'Emirates Global Aluminium (EGA)',
    contactPerson: 'Rashid Al-Nuaimi',
    email: 'automation@ega.ae',
    phone: '+971 4 884 6666',
    country: 'United Arab Emirates',
    city: 'Dubai',
    shippingAddress: 'EGA Jebel Ali Smelter Plant, Automation Stores, Dubai',
    paymentTerms: 'Net 45 Days',
    currency: 'USD',
    active: true
  },
  {
    id: 'CUST-003',
    code: 'CUST-UAE-03',
    companyName: 'ADNOC Offshore Maintenance',
    contactPerson: 'Mansoor Al-Zaabi',
    email: 'stores@adnoc-offshore.ae',
    phone: '+971 2 604 0000',
    country: 'United Arab Emirates',
    city: 'Abu Dhabi',
    shippingAddress: 'Mussafah Supply Base, Berth 9, Abu Dhabi',
    paymentTerms: 'Net 30 Days',
    currency: 'USD',
    active: true
  },
  {
    id: 'CUST-004',
    code: 'CUST-USA-04',
    companyName: 'Dow Chemical Automation Systems',
    contactPerson: 'David Miller',
    email: 'miller.d@dowchemical-orders.com',
    phone: '+1 989 555 4321',
    country: 'United States',
    city: 'Midland, MI',
    shippingAddress: 'Plant Gate 8, Stores Bldg 44, Midland, MI 48674',
    paymentTerms: 'Net 30 Days',
    currency: 'USD',
    active: true
  }
];

// Compatibility definitions for legacy models
export const INITIAL_GRN: GoodsReceiptNote[] = INITIAL_INCOMING_TRANSACTIONS.map(inc => ({
  id: inc.id,
  grnNumber: inc.id,
  supplierId: 'SUP-001',
  supplierName: inc.supplier,
  warehouseId: inc.warehouseId,
  warehouseCode: inc.warehouseCode,
  receivedDate: inc.date,
  receivedBy: inc.createdByUser,
  status: 'Accepted',
  deliveryDocketNumber: inc.trackingNo,
  carrier: 'Direct Express',
  trackingNumber: inc.trackingNo,
  items: [
    {
      id: `ITEM-${inc.id}`,
      itemId: 'ITEM-001',
      sku: inc.itemCode,
      oemPartNumber: inc.itemCode,
      quantityReceived: inc.quantityReceived,
      quantityPassed: inc.quantityReceived,
      quantityQuarantined: 0,
      binLocation: 'Shelf A-01',
      serialNumbers: inc.serialNumber ? inc.serialNumber.split(',').map(s => s.trim()) : [],
      unitCost: inc.unitCost
    }
  ]
}));

export const INITIAL_OUTGOING_ORDERS: OutgoingOrder[] = INITIAL_OUTGOING_TRANSACTIONS.map(out => ({
  id: out.id,
  orderNumber: out.id,
  customerId: 'CUST-001',
  customerName: out.customerOrWarehouse,
  warehouseId: out.warehouseId,
  warehouseCode: out.warehouseCode,
  orderDate: out.dateIssued,
  requiredDeliveryDate: out.dateIssued,
  status: 'Dispatched',
  shippingAddress: out.customerOrWarehouse,
  carrier: 'Direct Freight',
  trackingNumber: out.trackingNo,
  totalAmountUSD: out.totalPriceUSD,
  pickedBy: out.createdByUser,
  packedBy: out.createdByUser,
  poNumber: out.poNumber,
  items: [
    {
      id: `ITEM-${out.id}`,
      itemId: 'ITEM-001',
      sku: out.itemCode,
      oemPartNumber: out.itemCode,
      brand: 'Industrial',
      condition: 'Factory Sealed New',
      quantity: out.quantityIssued,
      unitPriceUSD: out.unitPriceUSD,
      lineTotalUSD: out.totalPriceUSD,
      dispatchedSerialNumbers: out.serialNumber ? out.serialNumber.split(',').map(s => s.trim()) : [],
      allocatedBin: 'Shelf A-01'
    }
  ]
}));

export const INITIAL_SERIALS: any[] = [];
export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [];
export const INITIAL_TRANSFERS: any[] = [];
export const INITIAL_ADJUSTMENTS: any[] = [];
export const INITIAL_REQUISITIONS: any[] = [];
export const INITIAL_DOCUMENTS: any[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'LOG-001',
    timestamp: '2026-10-17 08:30:00',
    userId: 'USR-001',
    userName: 'Dawood Zafar',
    userRole: 'Admin',
    action: 'SYSTEM_START',
    module: 'System',
    entityType: 'ERP',
    entityId: 'SYSTEM',
    entityCode: 'REAL-DEALS-ERP',
    details: 'Real Deals Procurement & Logistics Management ERP initialized with 9 stores.'
  }
];
