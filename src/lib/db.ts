import Dexie, { Table } from 'dexie';

export interface SyncQueueItem {
  key?: number;
  action: 'create' | 'update' | 'delete';
  table: string;
  recordId: string;
  data: any;
  timestamp: string;
  deviceId: string;
  status?: 'pending' | 'retry' | 'quarantined' | 'synced';
  attempts?: number;
  /** Last time the outbox touched this row (retry bookkeeping only). */
  updatedAt?: string;
}

export interface SyncConflictRecord {
  id: string;
  entityType: string;
  entityId: string;
  clientData: any;
  serverData: any;
  resolution?: string;
  status: string;
  businessId: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface ProductRecord {
  id: string;
  businessId: string;
  name: string;
  sku?: string;
  buyingPrice: string; // Decimal as string for exact precision
  sellingPrice: string;
  quantity: number;
  lowStock: number;
  isService: boolean;
  isActive: boolean;
  categoryId?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  syncStatus: 'synced' | 'pending' | 'conflict';
  updatedAt: string;
  createdAt: string;
  deletedAt?: string;
}

export interface CategoryRecord {
  id: string;
  businessId: string;
  name: string;
  sortOrder: number;
  syncStatus: 'synced' | 'pending' | 'conflict';
  createdAt: string;
  deletedAt?: string;
}

export interface SaleRecord {
  id: string;
  businessId: string;
  total: string; // Decimal as string
  cost: string;
  profit: string;
  paid: string;
  change: string;
  tax: string;
  taxRate: string;
  paymentMethod: string;
  notes?: string;
  cashier?: string;
  deviceId: string;
  syncStatus: 'synced' | 'pending' | 'conflict';
  createdAt: string;
}

export interface SaleItemRecord {
  id: string;
  saleId: string;
  productId?: string;
  name: string;
  quantity: number;
  price: string; // Decimal as string
  cost: string;
}

export interface BusinessRecord {
  id: string;
  name: string;
  type: string;
  slug: string;
  currency: string;
  taxRate: string; // Decimal as string
  receiptFooter?: string;
  logoUrl?: string;
}

export type NotificationType = "sales" | "inventory" | "customers" | "system" | "business";

export interface NotificationRecord {
  id: string;
  businessId?: string;
  type: NotificationType;
  channel: "local" | "server";
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
  expiresAt?: string;
  deletedAt?: string;
}

export interface NotificationPrefRecord {
  key: string; // "enabled" | "sales" | "inventory" | ...
  value: boolean;
}

// ============================================================================
// AIDE-05: Double-entry accounting
// ============================================================================

export interface AccountRecord {
  id: string;
  businessId: string;
  code: string;
  name: string;
  type: string; // ASSET | LIABILITY | EQUITY | INCOME | EXPENSE
  subType?: string;
  description?: string;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  deletedAt?: string;
}

export interface JournalEntryRecord {
  id: string;
  businessId: string;
  entryNo: string;
  date: string;
  description?: string;
  source?: string;
  sourceId?: string;
  status: string; // DRAFT | POSTED | REVERSED
  totalDebit: string;
  totalCredit: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface JournalLineRecord {
  id: string;
  entryId: string;
  businessId: string;
  accountCode: string;
  accountName: string;
  debit: string;
  credit: string;
  description?: string;
}

// ============================================================================
// AIDE-08: Customers & Accounts Receivable
// ============================================================================

export interface CustomerRecord {
  id: string;
  businessId: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  creditLimit: string;
  balance: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface InvoiceRecord {
  id: string;
  businessId: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  status: string; // DRAFT | ISSUED | PARTIALLY_PAID | PAID | CANCELLED
  issueDate: string;
  dueDate: string;
  subtotal: string;
  tax: string;
  total: string;
  paidAmount: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface InvoiceLineRecord {
  id: string;
  invoiceId: string;
  businessId: string;
  description: string;
  quantity: number;
  unitPrice: string;
  taxRate: string;
  taxAmount: string;
  total: string;
}

export interface PaymentAllocationRecord {
  id: string;
  invoiceId: string;
  businessId: string;
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
}

// ============================================================================
// AIDE-09: Suppliers & Accounts Payable
// ============================================================================

export interface SupplierRecord {
  id: string;
  businessId: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  paymentTerms: number;
  balance: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface PurchaseOrderRecord {
  id: string;
  businessId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  status: string; // DRAFT | SENT | PARTIALLY_RECEIVED | RECEIVED | CANCELLED
  orderDate: string;
  expectedDate?: string;
  subtotal: string;
  tax: string;
  total: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface PurchaseOrderLineRecord {
  id: string;
  poId: string;
  businessId: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  taxRate: string;
  total: string;
}

export interface SupplierInvoiceRecord {
  id: string;
  businessId: string;
  invoiceNo: string;
  supplierId: string;
  supplierName: string;
  poId?: string;
  status: string; // PENDING | PARTIALLY_PAID | PAID | CANCELLED
  invoiceDate: string;
  dueDate: string;
  total: string;
  paidAmount: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// AIDE-10: Inventory advanced
// ============================================================================

export interface StockAdjustmentRecord {
  id: string;
  businessId: string;
  adjustmentNo: string;
  reason: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockAdjustmentLineRecord {
  id: string;
  adjustmentId: string;
  businessId: string;
  productId: string;
  productName: string;
  oldQuantity: number;
  newQuantity: number;
  delta: number;
}

// ============================================================================
// AIDE-11: POS advanced
// ============================================================================

export interface RefundRecord {
  id: string;
  businessId: string;
  refundNo: string;
  saleId: string;
  reason: string;
  status: string; // PENDING | APPROVED | REJECTED | COMPLETED
  refundedTotal: string;
  refundedTax: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RefundLineRecord {
  id: string;
  refundId: string;
  name: string;
  quantity: number;
  price: string;
  cost: string;
}

export interface CashierShiftRecord {
  id: string;
  businessId: string;
  shiftNo: string;
  status: string; // OPEN | CLOSED | LOCKED
  cashierId: string;
  cashierName?: string;
  openedAt: string;
  closedAt?: string;
  openingCash: string;
  closingCash?: string;
  expectedCash?: string;
  cashDifference?: string;
  totalSales: string;
  totalRefunds: string;
  totalTips: string;
  notes?: string;
  createdAt: string;
}

export interface SplitPaymentRecord {
  id: string;
  saleId: string;
  businessId: string;
  amount: string;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
}

// ============================================================================
// AIDE-03: RBAC - Employees & Invitations
// ============================================================================

export interface EmployeeRecord {
  id: string;
  businessId: string;
  userId: string;
  name: string;
  email: string;
  role: string; // OWNER | MANAGER | STAFF
  status: string; // ACTIVE | INACTIVE
  phone?: string;
  jobTitle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvitationRecord {
  id: string;
  businessId: string;
  email: string;
  role: string;
  invitedBy: string;
  acceptedAt?: string;
  expiresAt: string;
  createdAt: string;
}

interface AideDB {
  // Original tables
  products: Table<ProductRecord>;
  categories: Table<CategoryRecord>;
  sales: Table<SaleRecord>;
  saleItems: Table<SaleItemRecord>;
  businesses: Table<BusinessRecord>;
  syncQueue: Table<SyncQueueItem>;
  syncConflicts: Table<SyncConflictRecord>;
  notifications: Table<NotificationRecord>;
  notificationPrefs: Table<NotificationPrefRecord>;

  // AIDE-05: Accounting
  accounts: Table<AccountRecord>;
  journalEntries: Table<JournalEntryRecord>;
  journalLines: Table<JournalLineRecord>;

  // AIDE-08: Customers & AR
  customers: Table<CustomerRecord>;
  invoices: Table<InvoiceRecord>;
  invoiceLines: Table<InvoiceLineRecord>;
  paymentAllocations: Table<PaymentAllocationRecord>;

  // AIDE-09: Suppliers & AP
  suppliers: Table<SupplierRecord>;
  purchaseOrders: Table<PurchaseOrderRecord>;
  purchaseOrderLines: Table<PurchaseOrderLineRecord>;
  supplierInvoices: Table<SupplierInvoiceRecord>;

  // AIDE-10: Inventory advanced
  stockAdjustments: Table<StockAdjustmentRecord>;
  stockAdjustmentLines: Table<StockAdjustmentLineRecord>;

  // AIDE-11: POS advanced
  refunds: Table<RefundRecord>;
  refundLines: Table<RefundLineRecord>;
  cashierShifts: Table<CashierShiftRecord>;
  splitPayments: Table<SplitPaymentRecord>;

  // AIDE-03: RBAC
  employees: Table<EmployeeRecord>;
  invitations: Table<InvitationRecord>;
}

const db = new Dexie('AideDB') as Dexie & AideDB;

/**
 * Migrations:
 *  - version 1 is the original schema.
 *  - version 2 adds the notification tables.
 *  - version 3 adds `status` + `attempts` to syncQueue so stuck outbox rows can
 *    be retried or quarantined instead of sitting forever in `pending`. Dexie
 *    applies each version as a diff, so the earlier versions must stay declared
 *    and sequential — never renumber or drop them.
 */
db.version(1).stores({
  products: 'id, businessId, categoryId, name, syncStatus, updatedAt',
  categories: 'id, businessId, name, syncStatus',
  sales: 'id, businessId, createdAt, syncStatus, deviceId',
  saleItems: 'id, saleId, productId',
  businesses: 'id, slug',
  syncQueue: '++key, action, table, recordId, timestamp',
  syncConflicts: 'id, entityType, entityId, status, createdAt',
});

db.version(2).stores({
  products: 'id, businessId, categoryId, name, syncStatus, updatedAt',
  categories: 'id, businessId, name, syncStatus',
  sales: 'id, businessId, createdAt, syncStatus, deviceId',
  saleItems: 'id, saleId, productId',
  businesses: 'id, slug',
  syncQueue: '++key, action, table, recordId, timestamp',
  syncConflicts: 'id, entityType, entityId, status, createdAt',
  notifications: 'id, businessId, type, read, createdAt',
  notificationPrefs: 'key',
});

db.version(3).stores({
  products: 'id, businessId, categoryId, name, syncStatus, updatedAt',
  categories: 'id, businessId, name, syncStatus',
  sales: 'id, businessId, createdAt, syncStatus, deviceId',
  saleItems: 'id, saleId, productId',
  businesses: 'id, slug',
  syncQueue: '++key, action, table, recordId, timestamp, status, attempts',
  syncConflicts: 'id, entityType, entityId, status, createdAt',
  notifications: 'id, businessId, type, read, createdAt',
  notificationPrefs: 'key',
});

/**
 * Version 4: Decimal migration (AIDE-04)
 * Converts monetary fields from number to string (exact decimal representation)
 * to avoid floating-point precision issues.
 */
db.version(4).stores({
  products: 'id, businessId, categoryId, name, syncStatus, updatedAt',
  categories: 'id, businessId, name, syncStatus',
  sales: 'id, businessId, createdAt, syncStatus, deviceId',
  saleItems: 'id, saleId, productId',
  businesses: 'id, slug',
  syncQueue: '++key, action, table, recordId, timestamp, status, attempts',
  syncConflicts: 'id, entityType, entityId, status, createdAt',
  notifications: 'id, businessId, type, read, createdAt',
  notificationPrefs: 'key',
}).upgrade(async (tx) => {
  // Products: buyingPrice, sellingPrice
  await tx.table('products').toCollection().modify((product) => {
    if (typeof product.buyingPrice === 'number') {
      product.buyingPrice = product.buyingPrice.toFixed(4);
    }
    if (typeof product.sellingPrice === 'number') {
      product.sellingPrice = product.sellingPrice.toFixed(4);
    }
  });

  // Sales: total, cost, profit, paid, change, tax, taxRate
  await tx.table('sales').toCollection().modify((sale) => {
    const fields: (keyof SaleRecord)[] = ['total', 'cost', 'profit', 'paid', 'change', 'tax', 'taxRate'];
    for (const field of fields) {
      const value = sale[field];
      if (typeof value === 'number') {
        (sale as any)[field] = value.toFixed(4);
      }
    }
  });

  // SaleItems: price, cost
  await tx.table('saleItems').toCollection().modify((item) => {
    if (typeof item.price === 'number') {
      item.price = item.price.toFixed(4);
    }
    if (typeof item.cost === 'number') {
      item.cost = item.cost.toFixed(4);
    }
  });

  // Businesses: taxRate
  await tx.table('businesses').toCollection().modify((business) => {
    if (typeof business.taxRate === 'number') {
      business.taxRate = business.taxRate.toFixed(4);
    }
  });
});

/**
 * Version 5: All new models from AIDE-03 through AIDE-11.
 * Adds tables for accounting, customers, suppliers, inventory adjustments,
 * POS advanced features, and RBAC.
 */
db.version(5).stores({
  // Original tables (unchanged)
  products: 'id, businessId, categoryId, name, syncStatus, updatedAt',
  categories: 'id, businessId, name, syncStatus',
  sales: 'id, businessId, createdAt, syncStatus, deviceId',
  saleItems: 'id, saleId, productId',
  businesses: 'id, slug',
  syncQueue: '++key, action, table, recordId, timestamp, status, attempts',
  syncConflicts: 'id, entityType, entityId, status, createdAt',
  notifications: 'id, businessId, type, read, createdAt',
  notificationPrefs: 'key',

  // AIDE-05: Accounting
  accounts: 'id, businessId, code, type',
  journalEntries: 'id, businessId, entryNo, date, status',
  journalLines: 'id, entryId, businessId, accountCode',

  // AIDE-08: Customers & AR
  customers: 'id, businessId, code, name',
  invoices: 'id, businessId, invoiceNo, customerId, status',
  invoiceLines: 'id, invoiceId, businessId',
  paymentAllocations: 'id, invoiceId, businessId',

  // AIDE-09: Suppliers & AP
  suppliers: 'id, businessId, code, name',
  purchaseOrders: 'id, businessId, poNumber, supplierId, status',
  purchaseOrderLines: 'id, poId, businessId',
  supplierInvoices: 'id, businessId, invoiceNo, supplierId, status',

  // AIDE-10: Inventory advanced
  stockAdjustments: 'id, businessId, adjustmentNo',
  stockAdjustmentLines: 'id, adjustmentId, businessId, productId',

  // AIDE-11: POS advanced
  refunds: 'id, businessId, refundNo, saleId, status',
  refundLines: 'id, refundId',
  cashierShifts: 'id, businessId, shiftNo, cashierId, status',
  splitPayments: 'id, saleId, businessId',

  // AIDE-03: RBAC
  employees: 'id, businessId, userId, email',
  invitations: 'id, businessId, email',
});

export default db;
