import test from 'node:test';
import assert from 'node:assert/strict';
import {
  stockOnHand, movingAverageCost, profitMargin, validateTransfer,
  MOVEMENT_TYPES,
} from '../../src/lib/inventoryLedger.mjs';

test('stock on hand is the signed sum of movements', () => {
  assert.equal(stockOnHand([{ quantityDelta: 10 }, { quantityDelta: -3 }, { quantityDelta: 2 }]), 9);
  assert.equal(stockOnHand([]), 0);
});

test('moving average cost recalculates on inbound only', () => {
  const r = movingAverageCost([
    { quantityDelta: 10, unitCost: 100 },
    { quantityDelta: 10, unitCost: 200 },
    { quantityDelta: -5, unitCost: 0 },
  ]);
  assert.equal(r.quantity, 15);
  assert.equal(r.averageCost, 150);
  assert.equal(r.totalValue, 2250);
});

test('moving average handles sell-out and restock', () => {
  const r = movingAverageCost([
    { quantityDelta: 2, unitCost: 100 },
    { quantityDelta: -2, unitCost: 0 },
    { quantityDelta: 4, unitCost: 250 },
  ]);
  assert.equal(r.quantity, 4);
  assert.equal(r.averageCost, 250);
});

test('profit margin computes exact percentages', () => {
  const rows = profitMargin([
    { productId: 'p1', name: 'Coffee', revenue: 1000, cost: 600 },
    { productId: 'p2', name: 'Tea', revenue: 500, cost: 500 },
  ]);
  assert.equal(rows[0].profit, 400);
  assert.equal(rows[0].marginPercent, 40);
  assert.equal(rows[1].marginPercent, 0);
});

test('transfer validation enforces distinct warehouses, positive qty, availability', () => {
  const base = { fromWarehouseId: 'a', toWarehouseId: 'b', lines: [{ productId: 'p', quantity: 2, available: 5, productName: 'Coffee' }] };
  assert.equal(validateTransfer(base).ok, true);
  assert.equal(validateTransfer({ ...base, toWarehouseId: 'a' }).ok, false);
  assert.equal(validateTransfer({ ...base, lines: [{ productId: 'p', quantity: 0 }] }).ok, false);
  assert.equal(validateTransfer({ ...base, lines: [{ productId: 'p', quantity: 9, available: 5 }] }).ok, false);
  assert.equal(validateTransfer({ ...base, lines: [] }).ok, false);
});

test('movement types are the approved enum', () => {
  assert.ok(MOVEMENT_TYPES.includes('RECEIPT'));
  assert.ok(MOVEMENT_TYPES.includes('TRANSFER_OUT'));
  assert.equal(MOVEMENT_TYPES.length, 7);
});
