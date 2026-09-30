import Dexie, { Table } from 'dexie';

export interface SyncQueueItem {
  key?: number;
  action: 'create' | 'update' | 'delete';
  table: string;
  recordId: string;
  data: any;
  timestamp: string;
  deviceId: string;
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
  buyingPrice: number;
  sellingPrice: number;
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
  total: number;
  cost: number;
  profit: number;
  paid: number;
  change: number;
  tax: number;
  taxRate: number;
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
  price: number;
  cost: number;
}

export interface BusinessRecord {
  id: string;
  name: string;
  type: string;
  slug: string;
  currency: string;
  taxRate: number;
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

export default db;
