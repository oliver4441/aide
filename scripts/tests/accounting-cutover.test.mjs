import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CUTOVER_PHASE,
  canPostToLegacy,
  reconcileTrialBalance,
  runDryRunMigration,
} from '../../src/lib/accountingCutover.mjs';

test('canPostToLegacy prevents dual posting during and after cutover', () => {
  assert.equal(canPostToLegacy(CUTOVER_PHASE.LEGACY_ACTIVE), true);
  assert.equal(canPostToLegacy(CUTOVER_PHASE.LEGACY_FROZEN), false);
  assert.equal(canPostToLegacy(CUTOVER_PHASE.GATEWAY_ACTIVE), false);
  assert.equal(canPostToLegacy(CUTOVER_PHASE.ROLLED_BACK), true);
});

test('reconcileTrialBalance detects zero variance and reports mismatches', () => {
  const match = reconcileTrialBalance(
    { '1010': '500.00', '4000': '-500.00' },
    { '1010': '500.00', '4000': '-500.00' }
  );
  assert.equal(match.ok, true);
  assert.equal(match.varianceCount, 0);

  const mismatch = reconcileTrialBalance(
    { '1010': '500.00' },
    { '1010': '490.00' }
  );
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.variances[0].diff, '-10.00');
});

test('runDryRunMigration validates mapped accounts and balanced journals', () => {
  const ok = runDryRunMigration({
    orgId: 'org-1',
    accounts: [{ code: '1010' }, { code: '4000' }],
    journals: [
      {
        id: 'j-1',
        lines: [
          { account: '1010', debit: '100.00', credit: '0.00' },
          { account: '4000', debit: '0.00', credit: '100.00' },
        ],
      },
    ],
  });
  assert.equal(ok.ok, true);

  const bad = runDryRunMigration({
    orgId: 'org-1',
    accounts: [{ code: '1010' }],
    journals: [
      {
        id: 'j-2',
        lines: [{ account: '9999', debit: '100.00', credit: '0.00' }],
      },
    ],
  });
  assert.equal(bad.ok, false);
  assert.equal(bad.errors.length, 2);
});
