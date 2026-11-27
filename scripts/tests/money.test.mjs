import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toUnits, fromUnits, add, subtract, multiply, compare, gte,
  roundTo, sumAmounts, taxInclusive, changeDue, allocate,
} from '../../src/lib/money.mjs';

// ── AIDE-04 acceptance: no binary floats in monetary calculation ────────────

test('0.1 + 0.2 is exactly 0.3000', () => {
  assert.equal(add('0.1', '0.2'), '0.3000');
  assert.equal(toUnits('0.30000000000000004').toString(), '3000');
});

test('rounding is half-up at 4dp and at 2dp, including negatives', () => {
  assert.equal(roundTo('2.675', 2), '2.68');     // classic double trap
  assert.equal(roundTo('1.005', 2), '1.01');
  assert.equal(roundTo('-1.005', 2), '-1.01');
  assert.equal(roundTo('9.99995', 4), '10.0000'); // carry past all 9s
});

test('large values beyond Number.MAX_SAFE_INTEGER keep every digit', () => {
  const huge = '9007199254740993.0001'; // 2^53 + 1 — rounds in a double
  assert.equal(add(huge, '0.0001'), '9007199254740993.0002');
  assert.equal(fromUnits(toUnits(huge)), huge);
});

test('VAT-inclusive tax uses exact decimal division', () => {
  assert.equal(taxInclusive('100.0000', 16), '13.7931'); // 100 - 100/1.16
  assert.equal(taxInclusive('100000.0000', '16'), '13793.1034');
  assert.equal(taxInclusive('100.0000', 0), '0.0000');
});

test('change from cash payment is exact and never negative', () => {
  assert.equal(changeDue('5', '4.35'), '0.6500');
  assert.equal(changeDue('0.3', add('0.1', '0.2')), '0.0000');
  assert.equal(changeDue('4.35', '4.35'), '0.0000');
});

test('split payments allocate every unit exactly, remainder to the last payer', () => {
  const parts = allocate('1.0000', [1, 1, 1]);
  assert.equal(sumAmounts(parts), '1.0000');
  const twoWay = allocate('100.0000', [1, 2]);
  assert.deepEqual(twoWay, ['33.3333', '66.6667']);
  assert.equal(sumAmounts(twoWay), '100.0000');
});

test('refund nets sale total, tax and change without float drift', () => {
  const total = multiply('0.1', 3); // 0.3000 exactly
  const tax = taxInclusive(total, 16);
  assert.equal(subtract(total, tax), '0.2586');
  assert.equal(changeDue('0.50', total), '0.2000');
  assert.equal(compare(subtract(total, tax), '0.2586'), 0);
});

test('comparison and payment sufficiency are exact', () => {
  assert.equal(compare('0.1', '0.1000'), 0);
  assert.equal(compare('0.1', '0.0999'), 1);
  assert.equal(compare('-1.0001', '-1'), -1);
  assert.equal(gte('0.3000', add('0.1', '0.2')), true);
  assert.equal(gte('0.2999', add('0.1', '0.2')), false);
});
