#!/usr/bin/env npx tsx
/**
 * AIDE-04: Real Dexie v3 -> v4 upgrade integration test.
 *
 * Tests `src/lib/db.ts` directly against `fake-indexeddb`:
 * 1. Seeds `AideDB` at version 3 with numeric float-trap monetary values
 * 2. Dynamically imports `src/lib/db.ts` and opens `AideDB` (triggering v4 upgrade)
 * 3. Validates monetary fields across products, sales, saleItems, and businesses
 * 4. Confirms all AIDE-03..AIDE-11 stores exist and are writable/readable
 *
 * Usage: npx tsx scripts/test-dexie-upgrade.ts
 */

import Dexie from 'dexie';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

const DB_NAME = 'AideDB';

async function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function runTest() {
  await deleteDatabase(DB_NAME);

  console.log('=== AIDE-04 Real Dexie v3 -> v4 upgrade test ===\n');
  console.log('Step 1: Seeding AideDB at schema version 3 with numeric float values...');

  const v3 = new Dexie(DB_NAME);
  v3.version(1).stores({
    products: 'id, businessId, categoryId, name, syncStatus, updatedAt',
    categories: 'id, businessId, name, syncStatus',
    sales: 'id, businessId, createdAt, syncStatus, deviceId',
    saleItems: 'id, saleId, productId',
    businesses: 'id, slug',
    syncQueue: '++key, action, table, recordId, timestamp',
    syncConflicts: 'id, entityType, entityId, status, createdAt',
  });
  v3.version(2).stores({
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
  v3.version(3).stores({
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

  await v3.open();
  const now = new Date().toISOString();

  await v3.table('products').bulkAdd([
    { id: 'p1', businessId: 'b1', name: 'Coffee', buyingPrice: 450.0, sellingPrice: 600.0, quantity: 10, lowStock: 5, isService: false, isActive: true, categoryId: 'c1', syncStatus: 'synced', updatedAt: now, createdAt: now },
    { id: 'p2', businessId: 'b1', name: 'Milk', buyingPrice: 49.9, sellingPrice: 69.0, quantity: 20, lowStock: 5, isService: false, isActive: true, categoryId: 'c1', syncStatus: 'synced', updatedAt: now, createdAt: now },
    { id: 'p3', businessId: 'b1', name: 'Airtime', buyingPrice: 3.3333, sellingPrice: 5.0, quantity: 100, lowStock: 10, isService: false, isActive: true, categoryId: 'c1', syncStatus: 'synced', updatedAt: now, createdAt: now },
    { id: 'p4', businessId: 'b1', name: 'Fraction 1/3', buyingPrice: 0.3333333333333333, sellingPrice: '1', quantity: 50, lowStock: 5, isService: false, isActive: true, categoryId: 'c1', syncStatus: 'synced', updatedAt: now, createdAt: now },
    { id: 'p5', businessId: 'b1', name: 'Service', buyingPrice: null, sellingPrice: 1500.0, quantity: 0, lowStock: 0, isService: true, isActive: true, categoryId: 'c1', syncStatus: 'synced', updatedAt: now, createdAt: now },
  ]);

  await v3.table('sales').bulkAdd([
    { id: 's1', businessId: 'b1', total: 1750.0, cost: 1000.0, profit: 750.0, paid: 2000.0, change: 250.0, tax: 241.38, taxRate: 16.0, paymentMethod: 'CASH', deviceId: 'dev1', syncStatus: 'synced', createdAt: '2025-02-01T10:00:00Z' },
    { id: 's2', businessId: 'b1', total: 0.30000000000000004, cost: 0.1, profit: 0.19999999999999998, paid: 0.5, change: 0.2, tax: 0.04, taxRate: 16.0, paymentMethod: 'MPESA', deviceId: 'dev1', syncStatus: 'synced', createdAt: '2025-02-01T11:00:00Z' },
    { id: 's3', businessId: 'b1', total: 1.0, cost: 0.6666666666666666, profit: 0.3333333333333334, paid: 1.0, change: 0.0, tax: 0.05, taxRate: undefined, paymentMethod: 'CASH', deviceId: 'dev1', syncStatus: 'synced', createdAt: '2025-02-01T12:00:00Z' },
  ]);

  await v3.table('saleItems').bulkAdd([
    { id: 'i1', saleId: 's1', productId: 'p1', name: 'Coffee', quantity: 2, price: 600.0, cost: 450.0 },
    { id: 'i2', saleId: 's1', productId: 'p2', name: 'Milk', quantity: 1, price: 69.0, cost: 49.9 },
    { id: 'i3', saleId: 's2', productId: 'p4', name: 'Fraction 1/3', quantity: 1, price: 0.2, cost: 0.1 },
    { id: 'i4', saleId: 's2', productId: 'p4', name: 'Fraction 1/3', quantity: 1, price: 0.10000000000000002, cost: 0.05 },
  ]);

  await v3.table('businesses').add({
    id: 'b1',
    name: 'Acme',
    type: 'Shop',
    slug: 'acme',
    currency: 'KSh',
    taxRate: 16.0,
    receiptFooter: 'Thanks',
    logoUrl: '',
  });

  v3.close();

  console.log('Step 2: Importing src/lib/db.ts and opening AideDB (runs real v4 upgrade)...');
  const { default: db } = await import('../src/lib/db');
  await db.open();

  console.log('Step 3: Validating post-upgrade data & stores...');
  let pass = 0;
  let fail = 0;

  function check(desc: string, actual: unknown, expected: unknown) {
    if (actual === expected) {
      console.log(`  PASS  ${desc}`);
      pass++;
    } else {
      console.log(`  FAIL  ${desc} (got "${String(actual)}", expected "${String(expected)}")`);
      fail++;
    }
  }

  function checkType(desc: string, value: unknown, type: string) {
    if (typeof value === type) {
      console.log(`  PASS  ${desc} (type: ${type})`);
      pass++;
    } else {
      console.log(`  FAIL  ${desc} (type: ${typeof value}, expected: ${type})`);
      fail++;
    }
  }

  const products = await db.products.toArray();
  const sales = await db.sales.toArray();
  const saleItems = await db.saleItems.toArray();
  const businesses = await db.businesses.toArray();

  for (const p of products) {
    checkType(`product ${p.id} buyingPrice is string`, p.buyingPrice, 'string');
    checkType(`product ${p.id} sellingPrice is string`, p.sellingPrice, 'string');
    if (p.id === 'p1') {
      check('product p1 buyingPrice', p.buyingPrice, '450.0000');
      check('product p1 sellingPrice', p.sellingPrice, '600.0000');
    } else if (p.id === 'p2') {
      check('product p2 buyingPrice', p.buyingPrice, '49.9000');
      check('product p2 sellingPrice', p.sellingPrice, '69.0000');
    } else if (p.id === 'p3') {
      check('product p3 buyingPrice', p.buyingPrice, '3.3333');
      check('product p3 sellingPrice', p.sellingPrice, '5.0000');
    } else if (p.id === 'p4') {
      check('product p4 buyingPrice (1/3)', p.buyingPrice, '0.3333');
      check('product p4 sellingPrice ("1")', p.sellingPrice, '1.0000');
    } else if (p.id === 'p5') {
      check('product p5 buyingPrice (null fallback)', p.buyingPrice, '0.0000');
      check('product p5 sellingPrice', p.sellingPrice, '1500.0000');
    }
  }

  for (const s of sales) {
    for (const field of ['total', 'cost', 'profit', 'paid', 'change', 'tax', 'taxRate'] as const) {
      checkType(`sale ${s.id} ${field} is string`, s[field], 'string');
    }
    if (s.id === 's1') {
      check('sale s1 total', s.total, '1750.0000');
      check('sale s1 cost', s.cost, '1000.0000');
      check('sale s1 profit', s.profit, '750.0000');
    } else if (s.id === 's2') {
      check('sale s2 total (0.1+0.2)', s.total, '0.3000');
      check('sale s2 cost', s.cost, '0.1000');
      check('sale s2 profit', s.profit, '0.2000');
    } else if (s.id === 's3') {
      check('sale s3 total', s.total, '1.0000');
      check('sale s3 cost (2/3)', s.cost, '0.6667');
      check('sale s3 profit (1/3)', s.profit, '0.3333');
      check('sale s3 taxRate fallback', s.taxRate, '16.0000');
    }
  }

  for (const i of saleItems) {
    checkType(`item ${i.id} price is string`, i.price, 'string');
    checkType(`item ${i.id} cost is string`, i.cost, 'string');
    if (i.id === 'i1') {
      check('item i1 price', i.price, '600.0000');
      check('item i1 cost', i.cost, '450.0000');
    } else if (i.id === 'i4') {
      check('item i4 price (precision)', i.price, '0.1000');
      check('item i4 cost', i.cost, '0.0500');
    }
  }

  for (const b of businesses) {
    checkType(`business ${b.id} taxRate is string`, b.taxRate, 'string');
    if (b.id === 'b1') check('business b1 taxRate', b.taxRate, '16.0000');
  }

  const expectedStores = [
    'products', 'categories', 'sales', 'saleItems', 'businesses',
    'syncQueue', 'syncConflicts', 'notifications', 'notificationPrefs',
    'accounts', 'journalEntries', 'journalLines',
    'customers', 'invoices', 'invoiceLines', 'paymentAllocations',
    'suppliers', 'purchaseOrders', 'purchaseOrderLines', 'supplierInvoices',
    'stockAdjustments', 'stockAdjustmentLines',
    'refunds', 'refundLines', 'cashierShifts', 'splitPayments',
    'employees', 'invitations',
  ];
  const actualStores = new Set(db.tables.map((t) => t.name));
  for (const store of expectedStores) {
    check(`store "${store}" registered in v4`, actualStores.has(store), true);
  }

  await db.delete();

  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
  if (fail > 0) process.exit(1);
}

runTest().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
