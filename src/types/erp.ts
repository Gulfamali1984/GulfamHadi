export type ItemCondition = 'Factory Sealed New' | 'New Open Box' | 'Used Tested' | 'Refurbished' | 'Core / Defective';

export type UserRole =
  | 'Admin'
  | 'Warehouse Manager'
  | 'Staff'
  | 'Super Admin'
  | 'Procurement Manager'
  | 'Warehouse Supervisor'
  | 'Logistics Coordinator'
  | 'Quality Inspector'
  | 'Auditor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  department?: string;
  assignedWarehouseId?: string; // e.g. 'WH-001' or undefined for Admin
  active: boolean;
  lastLogin?: string;
}

export interface Item {
  id: string;
  sku: string;
  oemPartNumber: string;
  brand: string;
  description: string;
  category: string;
  condition: ItemCondition;
  unit: string;
  costPriceUSD: number;
  sellingPriceUSD: number;
  weightKg: number;
  hsCode: string;
  countryOfOrigin: string;
  minSafetyStock: number;
  reorderPoint: number;
  targetStockLevel: number;
  defaultLeadTimeDays: number;
  notes?: string;
  imageUrl?: string;
  dimensionsCm?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Warehouse {
  id: string; // WH-001 to WH-009
  code: string;
  name: string;
  country: string;
  city: string;
  location: string; // e.g. 'TLS, USA', 'TOLL, UAE'
  address: string;
  managerName: string;
  contactEmail: string;
  contactPhone: string;
  totalCapacitySqM: number;
  active: boolean;
  zones?: string[];
  binsCount?: number;
}

export interface InventoryRecord {
  id: string;
  itemId: string;
  warehouseId: string; // WH-001 to WH-009
  binLocation: string;
  physicalStock: number;
  reservedStock: number;
  availableStock: number; // physical - reserved - quarantined
  inTransitStock: number;
  quarantinedStock: number;
  lastCountDate: string;
  updatedAt: string;
}

export interface ConsolidatedInventoryItem {
  item: Item;
  totalPhysical: number;
  totalReserved: number;
  totalAvailable: number;
  totalInTransit: number;
  totalQuarantined: number;
  totalValuationUSD: number;
  warehouseBreakdown: {
    warehouseId: string;
    warehouseCode: string;
    warehouseName: string;
    location: string;
    physical: number;
    reserved: number;
    available: number;
    inTransit: number;
    quarantined: number;
    binLocation: string;
  }[];
  isLowStock: boolean;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  address?: string;
  paymentTerms: string;
  currency: string;
  ratingScore?: number;
  notes?: string;
  specialtyBrands: string[];
  active: boolean;
}

export interface Customer {
  id: string;
  code: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  shippingAddress: string;
  paymentTerms: string;
  currency: string;
  taxNumber?: string;
  creditLimitUSD?: number;
  active: boolean;
}

// 4. Incoming Stock Transaction (Exact fields required by user prompt)
export interface IncomingStockTransaction {
  id: string;
  date: string;
  trackingNo: string;
  itemCode: string;
  serialNumber: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  supplier: string;
  quantityReceived: number;
  itemDescription: string;
  unitCost: number;
  totalCostUSD: number;
  createdByUser: string;
  createdAt: string;
}

// 5. Outgoing Stock Transaction (Exact fields required by user prompt)
export interface OutgoingStockTransaction {
  id: string;
  dateIssued: string;
  itemCode: string;
  trackingNo: string;
  serialNumber: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  customerOrWarehouse: string;
  quantityIssued: number;
  poNumber: string;
  itemDescription: string;
  unitPriceUSD: number;
  totalPriceUSD: number;
  createdByUser: string;
  isAdminOverride?: boolean;
  createdAt: string;
}

// 6. Shipment Tracker
export type ShipmentType = 'Incoming' | 'Outgoing' | 'Inbound' | 'Outbound' | 'Inter-Warehouse Transfer';
export type SimpleShipmentStatus = 'Booked' | 'In Transit' | 'Customs Clearance' | 'Out for Delivery' | 'Delivered' | 'Exception';
export type ShipmentStatus = SimpleShipmentStatus;
export type ShipmentCarrier = 'DHL Express' | 'FedEx' | 'UPS' | 'Aramex' | 'DB Schenker' | 'Direct Freight' | 'Air Cargo';

export interface ShipmentRecord {
  id: string;
  trackingNumber: string;
  type: ShipmentType;
  warehouseId: string;
  warehouseCode: string;
  itemCode: string;
  itemName: string;
  serialNumber: string;
  quantity: number;
  party: string; // Supplier (for incoming) or Customer (for outgoing)
  poOrRef: string; // PO number or Delivery Docket
  date: string;
  carrier: string;
  status: SimpleShipmentStatus;
  notes?: string;
  recordedBy: string;
  updatedAt: string;

  // Optional legacy fields
  shipmentNumber?: string;
  origin?: string;
  destination?: string;
  eta?: string;
  etd?: string;
  customsStatus?: string;
  events?: any[];
  weightKg?: number;
  totalPieces?: number;
  freightCostUSD?: number;
  referenceId?: string;
}

export type Shipment = ShipmentRecord;

// Serial Numbers
export type SerialStatus = 'In Stock' | 'Reserved' | 'Dispatched' | 'Delivered' | 'Quarantined' | 'RMA / Defective';

export interface SerialNumberRecord {
  id: string;
  serialNumber: string;
  itemId?: string;
  oemPartNumber: string;
  brand: string;
  condition: ItemCondition;
  warehouseId?: string;
  warehouseCode: string;
  binLocation: string;
  status: SerialStatus;
  grnId?: string;
  grnNumber?: string;
  receivedDate?: string;
  outgoingOrderId?: string;
  outgoingOrderNumber?: string;
  dispatchedDate?: string;
  customerId?: string;
  customerName?: string;
  warrantyExpiration?: string;
  history?: any[];
}

// Stock Transfers
export type TransferStatus = 'Requested' | 'Approved' | 'Dispatched' | 'Received' | 'Cancelled';

export interface StockTransfer {
  id: string;
  transferNumber: string;
  fromWarehouseId: string;
  fromWarehouseCode: string;
  toWarehouseId: string;
  toWarehouseCode: string;
  status: TransferStatus;
  requestDate: string;
  dispatchDate?: string;
  receivedDate?: string;
  carrier: string;
  trackingNumber: string;
  notes?: string;
  requestedBy: string;
  dispatchedBy?: string;
  receivedBy?: string;
  items: any[];
}

// Stock Adjustments
export interface StockAdjustment {
  id: string;
  adjustmentNumber: string;
  warehouseId: string;
  warehouseCode: string;
  date: string;
  reason: string;
  itemId: string;
  sku?: string;
  brand?: string;
  oemPartNumber: string;
  previousPhysicalQty: number;
  adjustedPhysicalQty: number;
  varianceQty: number;
  varianceValueUSD: number;
  adjustedBy: string;
  approvedBy?: string;
  status: 'Pending Approval' | 'Approved' | 'Rejected';
  notes?: string;
}

// Purchase Orders & Requisitions
export interface POLineItem {
  id: string;
  itemId: string;
  sku: string;
  oemPartNumber: string;
  brand: string;
  description: string;
  condition: ItemCondition;
  quantityOrdered: number;
  quantityReceived: number;
  unitPriceUSD: number;
  lineTotalUSD: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  warehouseCode: string;
  status: string;
  orderDate: string;
  expectedDeliveryDate: string;
  currency: string;
  exchangeRateToUSD: number;
  subtotalUSD: number;
  freightCostUSD: number;
  taxAmountUSD: number;
  totalAmountUSD: number;
  paymentTerms: string;
  notes?: string;
  items: POLineItem[];
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Requisition {
  id: string;
  reqNumber: string;
  requestedBy: string;
  department: string;
  destinationWarehouseId: string;
  urgency: string;
  status: string;
  requiredDate: string;
  notes?: string;
  items?: any[];
  estimatedTotalUSD?: number;
  createdAt?: string;
}

export interface ReorderTrigger {
  itemId: string;
  sku: string;
  oemPartNumber: string;
  brand: string;
  description: string;
  totalPhysical: number;
  totalAvailable: number;
  totalInTransit: number;
  minSafetyStock: number;
  reorderPoint: number;
  suggestedReorderQty: number;
  estimatedCostUSD: number;
  defaultLeadTimeDays: number;
  urgency: string;
  isTriggered: boolean;
}

export interface DocumentRecord {
  id: string;
  title: string;
  type: string;
  relatedEntityType: string;
  relatedEntityId: string;
  relatedEntityCode: string;
  relatedEntity?: string;
  fileName: string;
  fileSizeKb: number;
  mimeType: string;
  uploadedBy: string;
  uploadDate: string;
  url?: string;
  notes?: string;
}

export interface DatabaseHealthReport {
  status: string;
  lastChecked: string;
  totalRecords: any;
  checks: any[];
  googleSheetsConnected: boolean;
  config: any;
}

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  serviceAccountEmail: string;
  privateKey: string;
  autoSync: boolean;
  lastSyncTime?: string;
}

// Legacy GoodsReceiptNote
export interface GoodsReceiptNote {
  id: string;
  grnNumber: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  warehouseCode: string;
  receivedDate: string;
  receivedBy: string;
  status: string;
  deliveryDocketNumber: string;
  carrier: string;
  generalNotes?: string;
  trackingNumber?: string;
  carrierTrackingNumber?: string;
  qualityInspectedBy?: string;
  poId?: string;
  poNumber?: string;
  inspectionDate?: string;
  items: {
    id: string;
    itemId: string;
    sku: string;
    oemPartNumber: string;
    quantityReceived: number;
    quantityPassed: number;
    quantityQuarantined: number;
    binLocation: string;
    serialNumbers: string[];
    inspectionNotes?: string;
    unitCost?: number;
  }[];
}

export interface OutgoingOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  warehouseId: string;
  warehouseCode: string;
  orderDate: string;
  requiredDeliveryDate: string;
  status: string;
  shippingAddress: string;
  carrier: string;
  trackingNumber: string;
  totalAmountUSD: number;
  pickedBy: string;
  packedBy: string;
  dispatchedDate?: string;
  notes?: string;
  poNumber?: string;
  items: {
    id: string;
    itemId: string;
    sku: string;
    oemPartNumber: string;
    brand: string;
    condition: ItemCondition;
    quantity: number;
    unitPriceUSD: number;
    lineTotalUSD: number;
    dispatchedSerialNumbers: string[];
    allocatedBin: string;
  }[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  entityType: string;
  entityId: string;
  entityCode: string;
  details: string;
  ipAddress?: string;
}
