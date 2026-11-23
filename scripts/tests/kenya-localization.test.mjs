import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KENYA_DEFAULTS,
  computeKenyaVat,
  formatNairobiDate,
  buildFinancialCsv,
} from '../../src/lib/kenyaLocalization.mjs';

test('computeKenyaVat calculates 16% VAT in KES', () => {
  const res = computeKenyaVat('1000.00');
  assert.equal(res.net, '1000.00');
  assert.equal(res.vat, '160.00');
  assert.equal(res.gross, '1160.00');
  assert.equal(res.currency, KENYA_DEFAULTS.currency);
});

test('formatNairobiDate formats ISO dates in Africa/Nairobi timezone', () => {
  const formatted = formatNairobiDate('2026-11-23T22:30:00Z');
  assert.ok(formatted.includes('2026'));
  assert.equal(formatNairobiDate('invalid'), '');
});

test('buildFinancialCsv escapes commas and neutralizes formula injection', () => {
  const csv = buildFinancialCsv(
    [{ label: '=SUM(A1:A2)', amount: '500.00' }],
    [
      { key: 'label', label: 'Line' },
      { key: 'amount', label: 'Amount' },
    ]
  );
  assert.equal(csv, "Line,Amount\n'=SUM(A1:A2),500.00");
});
