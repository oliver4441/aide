# Aide — Data Migration Inventory (AIDE-01)

*Companion to [Current Architecture Audit](../architecture/current-state.md) and [Gap Register](../architecture/gap-register.md)*  
*Documents every schema change required to implement the AIDE-01…AIDE-21 roadmap, with risk assessment and sequencing.*

---

## Migration Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **SCHEMA** | New tables, columns, indexes, constraints | Add `Organization`, `Location`, `JournalEntry` |
| **TYPE** | Column type changes (e.g., Float → Decimal) | `buyingPrice`, `sellingPrice`, `total`, `cost` |
| **DATA** | Backfill, transformation, derivation | Populate `Organization` from existing `Business` |
| **CODE** | Application logic changes required by migration | Update Prisma client, API routes, sync resolver |
| **CLIENT** | Android Room / Web Dexie schema changes | Room migration v5, Dexie version bump |
| **INFRA** | CI/CD, secrets, deployment changes | Neon branch, Vercel env vars, GH Actions |

---

## Inventory by Phase

### Phase 1: Foundation (AIDE-01 → AIDE-04)

| # | Migration | Category | Risk | Effort | Dependencies | Rollback |
|---|-----------|----------|------|--------|--------------|----------|
| M1 | Add `Organization` model | SCHEMA | Low | S | AIDE-01 | `DROP TABLE` |
| M2 | Add `Location` model | SCHEMA | Low | S | M1 | `DROP TABLE` |
| M3 | Add `Business.organizationId` FK | SCHEMA | Low | S | M1 | `DROP COLUMN` |
| M4 | Add `Business.locationId` FK | SCHEMA | Low | S | M2 | `DROP COLUMN` |
| M5 | Backfill: create default Org per Business | DATA | Medium | M | M1, M3 | `DELETE FROM Organization` |
| M6 | Backfill: create default Location per Business | DATA | Medium | M | M2, M4 | `DELETE FROM Location` |
| M7 | Add `BusinessMembership.organizationId` (denorm) | SCHEMA | Low | S | M1 | `DROP COLUMN` |
| M8 | Update API routes to scope by org/location | CODE | Medium | L | M3, M4 | Revert code |
| M9 | Update sync resolver for org/location scope | CODE | Medium | M | M8 | Revert code |
| M10 | Android Room: add Organization/Location entities | CLIENT | Medium | M | M1, M2 | Room migration v5 |
| M11 | Android Room: add orgId/locationId to BusinessEntity | CLIENT | Medium | M | M3, M4 | Room migration v5 |
| M12 | **Float → Decimal: monetary columns** | TYPE | **High** | **XL** | AIDE-04 | Dual-column strategy |
| M13 | Prisma: change `Float` → `Decimal` in schema | SCHEMA | High | M | M12 | Revert schema |
| M14 | Backfill: copy Float → Decimal with rounding audit | DATA | High | L | M13 | `DROP COLUMN decimal_*` |
| M15 | Dual-write period (Float + Decimal) | CODE | High | L | M13 | Feature flag off |
| M16 | Cutover: read from Decimal, drop Float | CODE | High | M | M15 | Re-enable Float reads |
| M17 | Android Room: migrate monetary fields to Decimal | CLIENT | High | L | M12 | Room migration v6 |
| M18 | Web Dexie: migrate monetary fields | CLIENT | High | M | M12 | Dexie version bump |
| M19 | Update sync conflict resolver for Decimal | CODE | Medium | S | M12 | Revert resolver |
| M20 | Add `BusinessRole` permissions matrix | SCHEMA | Low | S | AIDE-03 | `DROP TABLE` |
| M21 | Add `Invitation` model (email, role, org, expires) | SCHEMA | Low | S | AIDE-03 | `DROP TABLE` |
| M22 | Add audit log table (`AuthEvent`) | SCHEMA | Low | M | AIDE-03, AIDE-19 | `DROP TABLE` |

---

### Phase 2: Accounting Core (AIDE-05 → AIDE-07)

| # | Migration | Category | Risk | Effort | Dependencies | Rollback |
|---|-----------|----------|------|--------|--------------|----------|
| M23 | Add `Account` model (CoA) | SCHEMA | Medium | M | AIDE-05, M12 | `DROP TABLE` |
| M24 | Add `JournalEntry` + `JournalLine` models | SCHEMA | Medium | L | M23 | `DROP TABLE` |
| M25 | Add `PostingRule` model (automation) | SCHEMA | Medium | M | M24 | `DROP TABLE` |
| M26 | Add `AccountingPeriod` model | SCHEMA | Low | S | AIDE-07 | `DROP TABLE` |
| M27 | Backfill: create default CoA per business | DATA | Medium | M | M23 | `DELETE` |
| M28 | Connect Sale → JournalEntry (auto-post) | CODE | High | L | M24, M12 | Feature flag off |
| M29 | Connect Payment → JournalEntry | CODE | High | M | M28 | Feature flag off |
| M30 | Connect Expense → JournalEntry | CODE | High | M | M28 | Feature flag off |
| M31 | Trial Balance report query | CODE | Medium | M | M24 | Revert code |
| M32 | P&L report query | CODE | Medium | M | M24, M26 | Revert code |
| M33 | Balance Sheet report query | CODE | Medium | M | M24, M26 | Revert code |
| M34 | Cash Flow report query | CODE | Medium | M | M24, M26 | Revert code |
| M35 | Period open/close workflow | CODE | Medium | M | M26 | Revert code |
| M36 | Year-end closing procedure | CODE | Medium | L | M35 | Revert code |
| M37 | Android Room: CoA + Journal entities | CLIENT | High | XL | M23, M24 | Room migration v7 |
| M38 | Web Dexie: CoA + Journal entities | CLIENT | High | L | M23, M24 | Dexie version bump |

---

### Phase 3: Commercial Operations (AIDE-08 → AIDE-13)

| # | Migration | Category | Risk | Effort | Dependencies | Rollback |
|---|-----------|----------|------|--------|--------------|----------|
| M39 | Add `Customer` model (server) | SCHEMA | Low | M | AIDE-08 | `DROP TABLE` |
| M40 | Add `Quotation` + `QuotationItem` | SCHEMA | Low | M | AIDE-08 | `DROP TABLE` |
| M41 | Add `Invoice` + `InvoiceItem` | SCHEMA | Low | M | AIDE-08 | `DROP TABLE` |
| M42 | Add `PaymentReceived` (AR receipts) | SCHEMA | Low | M | AIDE-08 | `DROP TABLE` |
| M43 | Add `Supplier` model | SCHEMA | Low | M | AIDE-09 | `DROP TABLE` |
| M44 | Add `PurchaseOrder` + `POItem` | SCHEMA | Low | M | AIDE-09 | `DROP TABLE` |
| M45 | Add `GoodsReceipt` + `GRItem` | SCHEMA | Low | M | AIDE-09 | `DROP TABLE` |
| M46 | Add `SupplierInvoice` + `SIItem` | SCHEMA | Low | M | AIDE-09 | `DROP TABLE` |
| M47 | Add `PaymentMade` (AP payments) | SCHEMA | Low | M | AIDE-09 | `DROP TABLE` |
| M48 | Add `StockMovement` model (ledger) | SCHEMA | Medium | L | AIDE-10 | `DROP TABLE` |
| M49 | Add `Warehouse` / `LocationStock` | SCHEMA | Medium | M | AIDE-10, M2 | `DROP TABLE` |
| M50 | Add `CostLayer` (FIFO/Avg costing) | SCHEMA | High | L | AIDE-10, M12 | `DROP TABLE` |
| M51 | Add `Register` / `Shift` / `CashDrawer` | SCHEMA | Medium | M | AIDE-11 | `DROP TABLE` |
| M52 | Add `TillReconciliation` model | SCHEMA | Low | M | AIDE-13 | `DROP TABLE` |
| M53 | Add `Variance` / `CashCount` models | SCHEMA | Low | M | AIDE-13 | `DROP TABLE` |
| M54 | Android Room: Customer/Quotation/Invoice | CLIENT | High | XL | M39–M42 | Room migration v8 |
| M55 | Android Room: Supplier/PO/GR | CLIENT | High | XL | M43–M47 | Room migration v9 |
| M56 | Android Room: StockMovement/Warehouse | CLIENT | High | XL | M48, M49 | Room migration v10 |
| M57 | Android Room: Register/Shift/Drawer | CLIENT | High | L | M51 | Room migration v11 |

---

### Phase 4: Scale & Compliance (AIDE-14 → AIDE-21)

| # | Migration | Category | Risk | Effort | Dependencies | Rollback |
|---|-----------|----------|------|--------|--------------|----------|
| M58 | Add `ConsolidationRule` (multi-entity) | SCHEMA | Medium | M | AIDE-14 | `DROP TABLE` |
| M59 | Add `Budget` + `BudgetLine` | SCHEMA | Low | M | AIDE-21 | `DROP TABLE` |
| M60 | Add `Forecast` model (AI/ML) | SCHEMA | Medium | L | AIDE-21 | `DROP TABLE` |
| M61 | Add `Integration` / `Webhook` models | SCHEMA | Low | M | AIDE-20 | `DROP TABLE` |
| M62 | Add `ApiKey` / `OAuthClient` models | SCHEMA | Low | M | AIDE-20 | `DROP TABLE` |
| M63 | Add `AuditLog` (immutable) | SCHEMA | Medium | M | AIDE-19 | `DROP TABLE` (append-only) |
| M64 | Add `BackupJob` / `RestoreJob` models | SCHEMA | Low | M | AIDE-19 | `DROP TABLE` |
| M65 | eTIMS integration schema (KRA) | SCHEMA | High | L | AIDE-17 | `DROP TABLE` |
| M66 | M-Pesa STK/C2B schema | SCHEMA | High | L | AIDE-16 | `DROP TABLE` |
| M67 | Android sync engine (cloud) | CLIENT | **Critical** | **XL** | AIDE-18 | Feature flag off |
| M68 | Web ↔ Android conflict resolution | CODE | **Critical** | **XL** | M67 | Revert resolver |
| M69 | Multi-device sync testing | INFRA | High | L | M67 | N/A |

---

## Detailed: Float → Decimal Migration (M12–M19) — Highest Risk

### Affected Columns (Prisma)
| Model | Fields | Current Type | Target Type |
|-------|--------|--------------|-------------|
| `Product` | `buyingPrice`, `sellingPrice` | `Float` | `Decimal(19,4)` |
| `Sale` | `total`, `cost`, `profit`, `paid`, `change`, `tax`, `taxRate` | `Float` | `Decimal(19,4)` |
| `SaleItem` | `price`, `cost` | `Float` | `Decimal(19,4)` |
| `Expense` (Android) | `amount` | `Double` | `REAL` → custom Decimal |
| `Customer` (Android) | `balance` | `Double` | `REAL` → custom Decimal |
| `Category` | — | — | — |

### Migration Strategy (Zero-Downtime)

```sql
-- 1. Add shadow Decimal columns (non-blocking)
ALTER TABLE "Product" ADD COLUMN "buyingPrice_d" DECIMAL(19,4);
ALTER TABLE "Product" ADD COLUMN "sellingPrice_d" DECIMAL(19,4);
-- ... repeat for all monetary columns

-- 2. Backfill with explicit rounding (audit trail)
UPDATE "Product" SET
  "buyingPrice_d" = ROUND("buyingPrice"::numeric, 4),
  "sellingPrice_d" = ROUND("sellingPrice"::numeric, 4);
-- Verify: SELECT * FROM "Product" WHERE "buyingPrice_d" != ROUND("buyingPrice"::numeric, 4);

-- 3. Dual-write in application code (feature flag)
-- WRITE: update both Float and Decimal columns
-- READ: prefer Decimal, fall back to Float

-- 4. Validation period (2 weeks minimum)
-- Monitor: discrepancy reports, sync conflicts, receipt totals

-- 5. Cutover (single deploy)
-- - Switch READ to Decimal only
-- - Drop Float columns
-- - Rename Decimal columns (or keep _d suffix)

-- 6. Android Room: custom TypeConverter for Decimal
-- - Store as TEXT (exact string) or BIGINT (scaled integer)
-- - Migration v6: add TEXT columns, backfill, drop REAL
```

### Risk Mitigation
| Risk | Mitigation |
|------|------------|
| Rounding discrepancies in historical data | Audit script flags rows where `Decimal != Round(Float, 4)`; manual review |
| Sync conflicts during dual-write | Conflict resolver compares Decimal values; Float only as fallback |
| Android Room type change | Use `TypeConverter` storing scaled `Long` (amount × 10000) — no floating point |
| Receipt total mismatch | Receipt generator uses Decimal; verify against stored Float during dual-write |
| Performance (Decimal slower) | Index on Decimal columns; `DECIMAL(19,4)` fits in 8 bytes |

---

## Android Room Migration Plan

| Version | Entities Added/Changed | Migration Complexity |
|---------|------------------------|---------------------|
| v1 (current) | Product, Category, Sale, SaleItem | Baseline |
| v2 | NotifiedEvent | Simple CREATE TABLE |
| v3 | (schema changes) | — |
| v4 | Expense, Customer | Simple CREATE TABLE + indexes |
| **v5** | **Organization, Location** + FK on Business | **Medium** (FK + backfill) |
| **v6** | **Monetary fields: REAL → TEXT (scaled Long)** | **High** (data migration) |
| **v7** | **Account, JournalEntry, JournalLine** | **High** (new tables + indexes) |
| **v8** | **Customer, Quotation, Invoice, PaymentReceived** | **High** |
| **v9** | **Supplier, PurchaseOrder, GoodsReceipt, SupplierInvoice, PaymentMade** | **High** |
| **v10** | **StockMovement, Warehouse, LocationStock, CostLayer** | **High** |
| **v11** | **Register, Shift, CashDrawer, TillReconciliation** | **Medium** |

### Room Migration Best Practices (Enforced)
1. **Never use `fallbackToDestructiveMigration`** — explicit `Migration` objects only
2. **Test every migration** — `DatabaseUpgradeTest` runs v1→v2→v3→v4→vN
3. **Column types must match Kotlin** — `Double` → `REAL`, `String` → `TEXT`, `Int` → `INTEGER`, `Boolean` → `INTEGER`
4. **Indexes declared in SQL** — `CREATE INDEX IF NOT EXISTS`
5. **Idempotent SQL** — `CREATE TABLE IF NOT EXISTS`, `DROP INDEX IF EXISTS` before recreate

---

## Web Dexie Migration Plan

| Version | Changes | Notes |
|---------|---------|-------|
| v1 | Original schema (products, categories, sales, saleItems, businesses, syncQueue, syncConflicts) | Baseline |
| v2 | Added notifications, notificationPrefs | `db.version(2).stores({...})` |
| v3 | Added `status`, `attempts` to syncQueue | Retry/quarantine logic |
| **v4** | **Organization, Location tables** | New stores |
| **v5** | **Monetary fields: number → string (Decimal)** | Type change requires data migration |
| **v6** | **Account, JournalEntry, JournalLine** | Accounting core |
| **v7** | **Customer, Quotation, Invoice, Supplier, PO, GR** | Commercial ops |
| **v8** | **StockMovement, Warehouse, CostLayer** | Inventory ledger |
| **v9** | **Register, Shift, CashDrawer** | POS multi-terminal |

### Dexie Migration Pattern
```typescript
// In db.ts version(N).upgrade(tx => {
await tx.table('products').modify(product => {
  product.buyingPrice = product.buyingPrice.toFixed(4); // number → string
  product.sellingPrice = product.sellingPrice.toFixed(4);
});
// })
```

---

## CI/CD & Infrastructure Migrations

| # | Change | Workflow | Risk |
|---|--------|----------|------|
| I1 | Add Neon branching for migrations | `web-build.yml` | Low |
| I2 | Add Prisma migration check in CI | `web-build.yml` | Low |
| I3 | Android: add AAB build + Play Store upload | `android-release.yml` | Medium |
| I4 | Add secret scanning (GitLeaks/TruffleHog) | New workflow | Low |
| I5 | Add SAST (CodeQL) | New workflow | Low |
| I6 | Add dependency review | `web-build.yml`, `android-ci.yml` | Low |
| I7 | Neon PITR verification test | New workflow | Medium |
| I8 | Android downgrade test (install old → new → old) | `android-release.yml` | Medium |

---

## Sequencing Constraints (Critical Path)

```
AIDE-01 (Audit) ──────► AIDE-02 (Org/Location) ──────► AIDE-03 (RBAC)
      │                      │                           │
      │                      ▼                           ▼
      │                 M1-M11 (done in PR #66)      M20-M22
      │                      │                           │
      └──────────────────────┴───────────────────────────┘
                              │
                              ▼
                    AIDE-04 (Decimal Migration) ◄─── CRITICAL PATH
                    M12-M19 (highest risk, longest)
                              │
                              ▼
                    AIDE-05 (Double-Entry) ──► AIDE-06 (GL Connect)
                    M23-M30                         M28-M30
                              │
                              ▼
                    AIDE-07 (Financial Statements)
                    M31-M36
                              │
                              ▼
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         AIDE-08          AIDE-09          AIDE-10
         (AR)             (AP)             (Inventory)
         M39-M42          M43-M47          M48-M50
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                    AIDE-11/12/13 (POS Enterprise)
                    M51-M53
                              │
                              ▼
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         AIDE-14          AIDE-15          AIDE-16/17
         (Multi-branch)   (Supermarket)    (Kenya: M-Pesa/eTIMS)
         M58              M15,M16          M65,M66
                              │
                              ▼
                    AIDE-18 (Android Sync) ◄─── STRATEGIC
                    M67,M68 (Critical path for mobile)
                              │
                              ▼
                    AIDE-19 (Security/DR)
                    M63,M64
                              │
                              ▼
                    AIDE-20 (API/Integrations)
                    M61,M62
                              │
                              ▼
                    AIDE-21 (Intelligence)
                    M59,M60
```

---

## Sign-Off Checklist per Migration

Before merging any migration PR:

- [ ] **Schema**: Prisma migration file reviewed; `db push` works on Neon branch
- [ ] **Data**: Backfill script tested on staging; row counts match; audit queries pass
- [ ] **Code**: All API routes, sync resolver, UI updated for new schema
- [ ] **Android**: Room migration tested v1→vN; `DatabaseUpgradeTest` passes
- [ ] **Web**: Dexie migration tested; no data loss in local storage
- [ ] **Sync**: Conflict resolver handles new types; integration test passes
- [ ] **Rollback**: Compensating migration documented and tested
- [ ] **Docs**: `current-state.md`, `gap-register.md` updated
- [ ] **CI**: All workflows green (web-build, android-ci, android-release validation)

---

*This inventory is updated as migrations are planned, executed, and completed.*