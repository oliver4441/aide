# Aide Accounting Controlled Cutover Plan (`AIDE-BIGCAP-07`)

- **Issue**: #82 (Parent: #75)
- **Cutover Helper**: `src/lib/accountingCutover.mjs`

---

## 1. Legacy Inventory (Retained Read-Only Until Cutover)

- UI: `src/app/dashboard/financials/*`
- APIs: `src/app/api/accounts/route.ts`, `src/app/api/journal/route.ts`, `src/app/api/periods/route.ts`

## 2. Cutover Sequence (Per Tenant)

1. **Freeze Legacy Posting** (`legacy_frozen`): `canPostToLegacy` returns `false` to prevent dual posting.
2. **Dry-Run & Export**: Run `runDryRunMigration` to validate COA mappings and balanced journals.
3. **Import & Reconcile** (`reconciled`): Run `reconcileTrialBalance` and verify `varianceCount === 0` across trial balance, AR/AP, and cash/bank.
4. **Activate Gateway** (`gateway_active`): Route accounting operations through `/api/internal/accounting/*`.
5. **Rollback**: Restore pre-cutover snapshot and set phase to `rolled_back`.
