export const CUTOVER_PHASE = Object.freeze({
  LEGACY_ACTIVE: "legacy_active",
  LEGACY_FROZEN: "legacy_frozen",
  MIGRATING: "migrating",
  RECONCILED: "reconciled",
  GATEWAY_ACTIVE: "gateway_active",
  ROLLED_BACK: "rolled_back",
});

export function canPostToLegacy(phase) {
  return phase === CUTOVER_PHASE.LEGACY_ACTIVE || phase === CUTOVER_PHASE.ROLLED_BACK;
}

function toCents(val) {
  const num = Number(val ?? 0);
  if (!Number.isFinite(num)) throw new Error(`Invalid balance: ${val}`);
  return Math.round(num * 100);
}

/**
 * Compares legacy and target trial balances by account code.
 * Requires zero variance across all accounts before cutover.
 */
export function reconcileTrialBalance(legacyBalances, targetBalances) {
  const codes = new Set([
    ...Object.keys(legacyBalances || {}),
    ...Object.keys(targetBalances || {}),
  ]);
  const variances = [];

  for (const code of codes) {
    const legacyCents = toCents(legacyBalances?.[code] ?? "0.00");
    const targetCents = toCents(targetBalances?.[code] ?? "0.00");
    if (legacyCents !== targetCents) {
      variances.push({
        accountCode: code,
        legacy: (legacyCents / 100).toFixed(2),
        target: (targetCents / 100).toFixed(2),
        diff: ((targetCents - legacyCents) / 100).toFixed(2),
      });
    }
  }

  return {
    ok: variances.length === 0,
    varianceCount: variances.length,
    variances,
  };
}

export function runDryRunMigration({ orgId, accounts = [], journals = [] }) {
  const errors = [];
  if (!orgId) errors.push("orgId is required");

  const accountCodes = new Set(accounts.map((a) => a.code));
  for (const j of journals) {
    let debit = 0;
    let credit = 0;
    for (const line of j.lines ?? []) {
      if (!accountCodes.has(line.account)) {
        errors.push(`Journal ${j.id} references unmapped account ${line.account}`);
      }
      debit += toCents(line.debit ?? "0.00");
      credit += toCents(line.credit ?? "0.00");
    }
    if (debit !== credit) {
      errors.push(`Journal ${j.id} is unbalanced`);
    }
  }

  return {
    dryRun: true,
    orgId,
    accountCount: accounts.length,
    journalCount: journals.length,
    ok: errors.length === 0,
    errors,
  };
}
