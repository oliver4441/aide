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

interface AideDB {
  products: Table<ProductRecord>;
  categories: Table<CategoryRecord>;
  sales: Table<SaleRecord>;
  saleItems: Table<SaleItemRecord>;
  businesses: Table<BusinessRecord>;
  syncQueue: Table<SyncQueueItem>;
  syncConflicts: Table<SyncConflictRecord>;
  notifications: Table<NotificationRecord>;
  notificationPrefs: Table<NotificationPrefRecord>;
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

export default db;
