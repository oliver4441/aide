import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AIDE_ACCOUNTING_BRANDING,
  validateWhiteLabelConfig,
} from '../../src/lib/accountingBranding.mjs';

test('AIDE_ACCOUNTING_BRANDING passes white-label smoke check', () => {
  const result = validateWhiteLabelConfig(AIDE_ACCOUNTING_BRANDING);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.equal(AIDE_ACCOUNTING_BRANDING.legalNotices.license, 'AGPL-3.0');
});

test('validateWhiteLabelConfig rejects competing brand names and missing notices', () => {
  const bad = {
    ...AIDE_ACCOUNTING_BRANDING,
    productName: 'Bigcapital Cloud',
    legalNotices: { license: '' },
  };
  const result = validateWhiteLabelConfig(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.length >= 2);
});
