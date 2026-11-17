#!/usr/bin/env npx tsx
/**
 * AIDE-04: Dexie v4 upgrade local test.
 *
 * This script:
 * 1. Creates a temporary IndexedDB (via dexie)
 * 2. Seeds it with v3-style data (number monetary values)
 * 3. Runs the v4 upgrade
 * 4. Validates all monetary fields are strings with 4 decimal places
 *
 * Usage: npx tsx scripts/test-dexie-upgrade.ts
 */

import Dexie, { type Table } from 'dexie';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

// Set Dexie dependencies for Node.js environment
Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

// Use fake-indexeddb's deleteDatabase function
async function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ---- v3 schema (before migration) ----
interface ProductV3 {
  id: string;
  businessId: string;
  name: string;
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

interface SaleV3 {
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

interface SaleItemV3 {
  id: string;
  saleId: string;
  productId?: string;
  name: string;
  quantity: number;
  price: number;
  cost: number;
}

interface BusinessV3 {
  id: string;
  name: string;
  type: string;
  slug: string;
  currency: string;
  taxRate: number;
  receiptFooter?: string;
  logoUrl?: string;
}

class TestDbV3 extends Dexie {
  products!: Table<ProductV3>;
  sales!: Table<SaleV3>;
  saleItems!: Table<SaleItemV3>;
  businesses!: Table<BusinessV3>;

  constructor(name: string) {
    super(name);
    this.version(3).stores({
      products: 'id, businessId, categoryId, name, syncStatus, updatedAt',
      sales: 'id, businessId, createdAt, syncStatus, deviceId',
      saleItems: 'id, saleId, productId',
      businesses: 'id, slug',
    });
  }
}

// ---- v4 schema (after migration) ----
interface ProductV4 {
  id: string;
  businessId: string;
  name: string;
  buyingPrice: string; // Decimal as string
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

interface SaleV4 {
  id: string;
  businessId: string;
  total: string;
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

interface SaleItemV4 {
  id: string;
  saleId: string;
  productId?: string;
  name: string;
  quantity: number;
  price: string;
  cost: string;
}

interface BusinessV4 {
  id: string;
  name: string;
  type: string;
  slug: string;
  currency: string;
  taxRate: string;
  receiptFooter?: string;
  logoUrl?: string;
}

class TestDbV4 extends Dexie {
  products!: Table<ProductV4>;
  sales!: Table<SaleV4>;
  saleItems!: Table<SaleItemV4>;
  businesses!: Table<BusinessV4>;

  constructor(name: string) {
    super(name);
    this.version(3).stores({
      products: 'id, businessId, categoryId, name, syncStatus, updatedAt',
      sales: 'id, businessId, createdAt, syncStatus, deviceId',
      saleItems: 'id, saleId, productId',
      businesses: 'id, slug',
    });

    this.version(4).stores({
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
        const fields: (keyof SaleV4)[] = ['total', 'cost', 'profit', 'paid', 'change', 'tax', 'taxRate'];
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
  }
}

async function runTest() {
  const dbName = `aide_test_${Date.now()}`;
  await deleteDatabase(dbName);

  console.log('=== AIDE-04 Dexie v4 upgrade test ===\n');

  // Step 1: Seed v3 database with number values (including precision traps)
  console.log('Step 1: Seeding v3 database with Float-like values...');
  const v3 = new TestDbV3(dbName);
  await v3.open();

  const now = new Date().toISOString();

  await v3.products.bulkAdd([
    { id: 'p1', businessId: 'b1', name: 'Coffee', buyingPrice: 450.0, sellingPrice: 600.0, quantity: 10, lowStock: 5, isService: false, isActive: true, categoryId: 'c1', syncStatus: 'synced', updatedAt: now, createdAt: now },
    { id: 'p2', businessId: 'b1', name: 'Milk', buyingPrice: 49.9, sellingPrice: 69.0, quantity: 20, lowStock: 5, isService: false, isActive: true, categoryId: 'c1', syncStatus: 'synced', updatedAt: now, createdAt: now },
    { id: 'p3', businessId: 'b1', name: 'Airtime', buyingPrice: 3.3333, sellingPrice: 5.0, quantity: 100, lowStock: 10, isService: false, isActive: true, categoryId: 'c1', syncStatus: 'synced', updatedAt: now, createdAt: now },
    { id: 'p4', businessId: 'b1', name: 'Fraction 1/3', buyingPrice: 0.3333333333333333, sellingPrice: 1.0, quantity: 50, lowStock: 5, isService: false, isActive: true, categoryId: 'c1', syncStatus: 'synced', updatedAt: now, createdAt: now },
    { id: 'p5', businessId: 'b1', name: 'Service', buyingPrice: 0.0, sellingPrice: 1500.0, quantity: 0, lowStock: 0, isService: true, isActive: true, categoryId: 'c1', syncStatus: 'synced', updatedAt: now, createdAt: now },
  ]);

  await v3.sales.bulkAdd([
    { id: 's1', businessId: 'b1', total: 1750.0, cost: 1000.0, profit: 750.0, paid: 2000.0, change: 250.0, tax: 241.38, taxRate: 16.0, paymentMethod: 'CASH', deviceId: 'dev1', syncStatus: 'synced', createdAt: '2025-02-01T10:00:00Z' },
    { id: 's2', businessId: 'b1', total: 0.30000000000000004, cost: 0.1, profit: 0.19999999999999998, paid: 0.5, change: 0.2, tax: 0.04, taxRate: 16.0, paymentMethod: 'MPESA', deviceId: 'dev1', syncStatus: 'synced', createdAt: '2025-02-01T11:00:00Z' },
    { id: 's3', businessId: 'b1', total: 1.0, cost: 0.6666666666666666, profit: 0.3333333333333334, paid: 1.0, change: 0.0, tax: 0.05, taxRate: 16.0, paymentMethod: 'CASH', deviceId: 'dev1', syncStatus: 'synced', createdAt: '2025-02-01T12:00:00Z' },
  ]);

  await v3.saleItems.bulkAdd([
    { id: 'i1', saleId: 's1', productId: 'p1', name: 'Coffee', quantity: 2, price: 600.0, cost: 450.0 },
    { id: 'i2', saleId: 's1', productId: 'p2', name: 'Milk', quantity: 1, price: 69.0, cost: 49.9 },
    { id: 'i3', saleId: 's2', productId: 'p4', name: 'Fraction 1/3', quantity: 1, price: 0.2, cost: 0.1 },
    { id: 'i4', saleId: 's2', productId: 'p4', name: 'Fraction 1/3', quantity: 1, price: 0.10000000000000002, cost: 0.05 },
  ]);

  await v3.businesses.add({ id: 'b1', name: 'Acme', type: 'Shop', slug: 'acme', currency: 'KSh', taxRate: 16.0, receiptFooter: 'Thanks', logoUrl: '' });

  await v3.close();
  console.log('  Seeded v3 data (numbers).');

  // Step 2: Open with v4 schema - triggers upgrade
  console.log('\nStep 2: Opening with v4 schema (triggers upgrade)...');
  const v4 = new TestDbV4(dbName);
  await v4.open();

  // Step 3: Validate all monetary fields are strings with 4dp
  console.log('\nStep 3: Validating post-upgrade data...');

  const products = await v4.products.toArray();
  const sales = await v4.sales.toArray();
  const saleItems = await v4.saleItems.toArray();
  const businesses = await v4.businesses.toArray();

  let pass = 0, fail = 0;

  function check(desc: string, actual: any, expected: any) {
    if (actual === expected) {
      console.log(`  PASS  ${desc}`);
      pass++;
    } else {
      console.log(`  FAIL  ${desc} (got "${actual}", expected "${expected}")`);
      fail++;
    }
  }

  function checkType(desc: string, value: any, type: string) {
    if (typeof value === type) {
      console.log(`  PASS  ${desc} (type: ${type})`);
      pass++;
    } else {
      console.log(`  FAIL  ${desc} (type: ${typeof value}, expected: ${type})`);
      fail++;
    }
  }

  // Products - check each by ID
  for (const p of products) {
    checkType(`product ${p.id} buyingPrice is string`, p.buyingPrice, 'string');
    checkType(`product ${p.id} sellingPrice is string`, p.sellingPrice, 'string');
    switch (p.id) {
      case 'p1':
        check(`product p1 buyingPrice 450.0000`, p.buyingPrice, '450.0000');
        check(`product p1 sellingPrice 600.0000`, p.sellingPrice, '600.0000');
        break;
      case 'p2':
        check(`product p2 buyingPrice 49.9000`, p.buyingPrice, '49.9000');
        check(`product p2 sellingPrice 69.0000`, p.sellingPrice, '69.0000');
        break;
      case 'p3':
        check(`product p3 buyingPrice 3.3333`, p.buyingPrice, '3.3333');
        check(`product p3 sellingPrice 5.0000`, p.sellingPrice, '5.0000');
        break;
      case 'p4':
        check(`product p4 buyingPrice 0.3333 (rounded 4dp)`, p.buyingPrice, '0.3333');
        check(`product p4 sellingPrice 1.0000`, p.sellingPrice, '1.0000');
        break;
      case 'p5':
        check(`product p5 buyingPrice 0.0000`, p.buyingPrice, '0.0000');
        check(`product p5 sellingPrice 1500.0000`, p.sellingPrice, '1500.0000');
        break;
    }
  }

  // Sales - check each by ID
  for (const s of sales) {
    checkType(`sale ${s.id} total is string`, s.total, 'string');
    checkType(`sale ${s.id} cost is string`, s.cost, 'string');
    checkType(`sale ${s.id} profit is string`, s.profit, 'string');
    checkType(`sale ${s.id} paid is string`, s.paid, 'string');
    checkType(`sale ${s.id} change is string`, s.change, 'string');
    checkType(`sale ${s.id} tax is string`, s.tax, 'string');
    checkType(`sale ${s.id} taxRate is string`, s.taxRate, 'string');
    switch (s.id) {
      case 's1':
        check(`sale s1 total 1750.0000`, s.total, '1750.0000');
        check(`sale s1 cost 1000.0000`, s.cost, '1000.0000');
        check(`sale s1 profit 750.0000`, s.profit, '750.0000');
        break;
      case 's2':
        check(`sale s2 total 0.3000 (0.1+0.2 trap)`, s.total, '0.3000');
        check(`sale s2 cost 0.1000`, s.cost, '0.1000');
        check(`sale s2 profit 0.2000`, s.profit, '0.2000');
        break;
      case 's3':
        check(`sale s3 total 1.0000`, s.total, '1.0000');
        check(`sale s3 cost 0.6667`, s.cost, '0.6667');
        check(`sale s3 profit 0.3333 (1/3 rounded)`, s.profit, '0.3333');
        break;
    }
  }

  // Sale Items - check each by ID
  for (const i of saleItems) {
    checkType(`item ${i.id} price is string`, i.price, 'string');
    checkType(`item ${i.id} cost is string`, i.cost, 'string');
    switch (i.id) {
      case 'i1':
        check(`item i1 price 600.0000`, i.price, '600.0000');
        check(`item i1 cost 450.0000`, i.cost, '450.0000');
        break;
      case 'i2':
        check(`item i2 price 69.0000`, i.price, '69.0000');
        check(`item i2 cost 49.9000`, i.cost, '49.9000');
        break;
      case 'i3':
        check(`item i3 price 0.2000`, i.price, '0.2000');
        check(`item i3 cost 0.1000`, i.cost, '0.1000');
        break;
      case 'i4':
        check(`item i4 price 0.1000 (precision trap)`, i.price, '0.1000');
        check(`item i4 cost 0.0500`, i.cost, '0.0500');
        break;
    }
  }

  // Businesses - check each by ID
  for (const b of businesses) {
    checkType(`business ${b.id} taxRate is string`, b.taxRate, 'string');
    if (b.id === 'b1') {
      check(`business b1 taxRate 16.0000`, b.taxRate, '16.0000');
    }
  }

  await v4.close();
  await deleteDatabase(dbName);

  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
  if (fail > 0) process.exit(1);
}

runTest().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});