import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IMPORT_LIMITS,
  FIELD_DEFS,
  autoDetectMapping,
  buildDryRun,
  compareDecimalStrings,
  dedupeKey,
  parseBooleanStrict,
  parseDecimalStrict,
  parseIntStrict,
  planRow,
  roundDecimalString,
  validateMapping,
  validateRowData,
  normalizePhone,
} from '../../src/lib/importEngine.mjs';

// ── decimal string arithmetic (exact, no floats) ───────────────────────────
test('roundDecimalString rounds half-up without float error', () => {
  assert.equal(roundDecimalString('2.675', 2), '2.68');   // classic float trap: 2.675 is stored as 2.67499...
  assert.equal(roundDecimalString('1.005', 2), '1.01');
  assert.equal(roundDecimalString('0.30000000000000004', 4), '0.3000');
  assert.equal(roundDecimalString('9.99995', 4), '10.0000'); // carry past all 9s
  assert.equal(roundDecimalString('-1.005', 2), '-1.01');
  assert.equal(roundDecimalString('7', 4), '7.0000');
  assert.equal(roundDecimalString('3.14159', 4), '3.1416');
});

test('compareDecimalStrings orders exact decimals', () => {
  assert.equal(compareDecimalStrings('0.0000', '0'), 0);
  assert.equal(compareDecimalStrings('1.5000', '1.25'), 1);
  assert.equal(compareDecimalStrings('1.25', '1.5000'), -1);
  assert.equal(compareDecimalStrings('10.0000', '9.9999'), 1);
});

test('parseDecimalStrict handles currency, thousands separators and parentheses', () => {
  assert.deepEqual(parseDecimalStrict('KES 1,234.50'), { ok: true, value: '1234.5000' });
  assert.deepEqual(parseDecimalStrict('$2,000'), { ok: true, value: '2000.0000' });
  assert.deepEqual(parseDecimalStrict('(100.00)'), { ok: true, value: '-100.0000' });
  assert.equal(parseDecimalStrict('abc').ok, false);
  assert.equal(parseDecimalStrict('').value, null);
  assert.equal(parseDecimalStrict('1.2.3').ok, false);
});

test('parseIntStrict accepts whole numbers only', () => {
  assert.deepEqual(parseIntStrict('42'), { ok: true, value: 42 });
  assert.deepEqual(parseIntStrict('42.0'), { ok: true, value: 42 });
  assert.equal(parseIntStrict('42.5').ok, false);
  assert.equal(parseIntStrict('').value, null);
});

test('parseBooleanStrict and normalizePhone', () => {
  assert.equal(parseBooleanStrict('yes').value, true);
  assert.equal(parseBooleanStrict('No').value, false);
  assert.equal(parseBooleanStrict('maybe').ok, false);
  assert.equal(normalizePhone('+254 712-345 678'), '+254712345678');
  assert.equal(normalizePhone(''), null);
});

// ── mapping auto-detect ────────────────────────────────────────────────────
test('autoDetectMapping detects product columns including currency-suffixed headers', () => {
  const headers = ['Item Name', 'SKU', 'Cost Price', 'Selling Price (KES)', 'Qty', 'Department'];
  const mapping = autoDetectMapping(headers, 'products');
  assert.equal(mapping.name, 0);
  assert.equal(mapping.sku, 1);
  assert.equal(mapping.buyingPrice, 2);
  assert.equal(mapping.sellingPrice, 3); // contained in "Selling Price (KES)"
  assert.equal(mapping.quantity, 4);
  assert.equal(mapping.category, 5);
});

test('autoDetectMapping detects customer columns without reusing columns', () => {
  const headers = ['Customer', 'Email', 'Phone', 'Credit Limit'];
  const mapping = autoDetectMapping(headers, 'customers');
  assert.equal(mapping.name, 0);
  assert.equal(mapping.email, 1);
  assert.equal(mapping.phone, 2);
  assert.equal(mapping.creditLimit, 3);
  const used = Object.values(mapping);
  assert.equal(new Set(used).size, used.length);
});

test('validateMapping rejects out-of-range indexes, column reuse and missing required fields', () => {
  const m1 = validateMapping('products', { name: 0, sellingPrice: 9 }, 3);
  assert.equal(m1.ok, false);
  const m2 = validateMapping('products', { name: 0, sellingPrice: 0 }, 3);
  assert.equal(m2.ok, false); // same column mapped twice
  const m3 = validateMapping('products', { sku: 0 }, 3);
  assert.equal(m3.ok, false); // required name/sellingPrice unmapped
  const m4 = validateMapping('products', { name: 0, sellingPrice: 1 }, 3);
  assert.equal(m4.ok, true);
});

// ── row validation ─────────────────────────────────────────────────────────
test('validateRowData enforces product invariants', () => {
  const defs = Object.fromEntries(FIELD_DEFS.products.map((d) => [d.key, d]));
  assert.ok(defs.name.required);
  const good = validateRowData('products', { name: 'Soap', sellingPrice: '25.50', buyingPrice: '10', quantity: '100' });
  assert.deepEqual(good.errors, []);
  assert.equal(good.data.sellingPrice, '25.5000');
  assert.equal(good.data.quantity, 100);

  const missing = validateRowData('products', { sellingPrice: '25' });
  assert.ok(missing.errors.some((e) => /name/i.test(e)));

  const negative = validateRowData('products', { name: 'X', sellingPrice: '-1' });
  assert.ok(negative.errors.some((e) => /negative/i.test(e)));

  const badQty = validateRowData('products', { name: 'X', sellingPrice: '1', quantity: '2.5' });
  assert.ok(badQty.errors.some((e) => /whole number/i.test(e)));
});

test('validateRowData enforces customer invariants', () => {
  const bad = validateRowData('customers', { name: 'Jane', email: 'not-an-email', phone: '12' });
  assert.ok(bad.errors.some((e) => /Email/.test(e)));
  assert.ok(bad.errors.some((e) => /Phone/.test(e)));

  const good = validateRowData('customers', { name: 'Jane', phone: '+254 712 345 678', creditLimit: '5,000' });
  assert.deepEqual(good.errors, []);
  assert.equal(good.data.phone, '+254712345678');
  assert.equal(good.data.creditLimit, '5000.0000');
});

// ── dry run ────────────────────────────────────────────────────────────────
const PRODUCT_HEADERS = ['name', 'sku', 'selling price', 'quantity'];
const productMapping = { name: 0, sku: 1, sellingPrice: 2, quantity: 3 };

test('buildDryRun classifies rows and counts totals', () => {
  const dry = buildDryRun({
    entity: 'products',
    headers: PRODUCT_HEADERS,
    rows: [
      ['Soap', 'SKU-1', '25', '100'],
      ['', '', '', ''],                       // empty row — ignored
      ['Foam', 'SKU-1', '30', '5'],           // duplicate of SKU-1
      ['Broken', 'SKU-2', 'oops', 'x'],       // error
    ],
    mapping: productMapping,
  });
  assert.equal(dry.ok, true);
  assert.equal(dry.totalRows, 4);
  assert.equal(dry.validCount, 1);
  assert.equal(dry.duplicateCount, 1);
  assert.equal(dry.errorCount, 1);
  assert.equal(dry.emptyCount, 1);
  const dup = dry.rows.find((r) => r.status === 'duplicate');
  assert.equal(dup.duplicateOf, 2); // human row number of first occurrence
  assert.equal(dry.errorReport.length, 1);
  assert.equal(dry.errorReport[0].row, 5);
});

test('buildDryRun enforces the row limit', () => {
  const rows = Array.from({ length: IMPORT_LIMITS.maxRows + 1 }, () => ['x', 's', '1', '1']);
  const dry = buildDryRun({ entity: 'products', headers: PRODUCT_HEADERS, rows, mapping: productMapping });
  assert.equal(dry.ok, false);
  assert.match(dry.error, /limit/i);
});

test('buildDryRun rejects unknown entities and bad mappings', () => {
  assert.equal(buildDryRun({ entity: 'sales', headers: ['a'], rows: [], mapping: {} }).ok, false);
  assert.equal(buildDryRun({ entity: 'products', headers: [], rows: [], mapping: {} }).ok, false);
});

test('dedupeKey prefers sku/code over name, phone over email', () => {
  assert.equal(dedupeKey('products', { name: 'A', sku: 'X-1' }), 'sku:x-1');
  assert.equal(dedupeKey('products', { name: 'A', sku: null }), 'name:a');
  assert.equal(dedupeKey('customers', { name: 'A', customerCode: 'C-1' }), 'code:c-1');
  assert.equal(dedupeKey('customers', { name: 'A', phone: '+254 712' }), 'phone:254712');
  assert.equal(dedupeKey('customers', { name: 'A', email: 'A@B.co' }), 'email:a@b.co');
});

// ── row planning (commit semantics) ───────────────────────────────────────
test('planRow: create/update/skip/fail decisions', () => {
  assert.equal(planRow({ status: 'ok' }, { strategy: 'skip' }).action, 'create');
  assert.equal(planRow({ status: 'empty' }, { strategy: 'skip' }).action, 'skip-empty');
  assert.equal(planRow({ status: 'error', errors: ['bad'] }, { strategy: 'skip' }).action, 'fail');
  // file-internal duplicate never merges
  assert.equal(planRow({ status: 'duplicate', duplicateOf: 2 }, { strategy: 'merge' }).action, 'skip-duplicate');
  // database duplicate merges only under merge strategy with existingId
  assert.equal(planRow({ status: 'duplicate', existingId: 'p1' }, { strategy: 'merge' }).action, 'update');
  assert.equal(planRow({ status: 'duplicate', existingId: 'p1' }, { strategy: 'skip' }).action, 'skip-duplicate');
});

test('dry-run rows carry the provided-field list for merge safety', () => {
  const dry = buildDryRun({
    entity: 'products',
    headers: ['name', 'sku', 'selling price'],
    rows: [['Soap', '', '25']],
    mapping: { name: 0, sku: 1, sellingPrice: 2 },
  });
  const row = dry.rows[0];
  assert.deepEqual(row.provided.sort(), ['name', 'sellingPrice']); // blank SKU not "provided"
});
