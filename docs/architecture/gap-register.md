# Aide — Gap Register (AIDE-01)

*Companion to [Current Architecture Audit](../architecture/current-state.md)*  
*Each gap links to its implementation issue in the AIDE-01…AIDE-21 series.*

---

## Legend
| Status | Meaning |
|--------|---------|
| ✅ **Implemented** | Working in production (master) |
| 🟡 **Partial** | Core works; missing edge cases / polish / one platform |
| 🔄 **In Progress** | Active branch/PR |
| ❌ **Missing** | Not started |
| 🚫 **Won't Fix** | Explicitly out of scope |

---

## 1. Authentication & Access Control

| ID | Capability | Web | Android | Status | Issue | Notes |
|----|------------|-----|---------|--------|-------|-------|
| AUTH-01 | Email/password login | ✅ | N/A (local-only) | ✅ | — | NextAuth credentials |
| AUTH-02 | OAuth providers (Google, GitHub) | ❌ | N/A | ❌ | — | Not in roadmap |
| AUTH-03 | Mobile bearer token | ✅ | N/A | ✅ | — | `/api/auth/mobile-login` (legacy) |
| AUTH-04 | Android PIN/biometric lock | N/A | ❌ | ❌ | AIDE-03 | App opens directly |
| AUTH-05 | Session management (refresh, expiry) | ✅ | N/A | ✅ | — | NextAuth JWT cookie |
| AUTH-06 | Password reset / recovery | ❌ | N/A | ❌ | — | No forgot-password flow |
| AUTH-07 | MFA / 2FA | ❌ | N/A | ❌ | AIDE-19 | Security hardening |
| AUTH-08 | Role-based access (Owner/Manager/Staff) | ✅ | N/A | ✅ | AIDE-03 | Permission-based enforcement on all employee/invitation routes |
| AUTH-09 | Employee invitation flow | ✅ | N/A | ✅ | AIDE-03 | POST /api/invitations creates invite; PATCH accepts |
| AUTH-10 | Access revocation / deprovisioning | ✅ | N/A | ✅ | AIDE-03 | DELETE /api/employees/[id] removes membership |
| AUTH-11 | Audit log of auth events | ❌ | N/A | ❌ | AIDE-19 | Login, role change, revoke |

---

## 2. Tenant & Organization Model

| ID | Capability | Web | Android | Status | Issue | Notes |
|----|------------|-----|---------|--------|-------|-------|
| TEN-01 | Single business per user | ✅ | ✅ (local) | ✅ | — | `BusinessMembership` |
| TEN-02 | Multi-business per user | ✅ | ✅ (local) | ✅ | — | Multiple memberships |
| TEN-03 | Organization (parent of businesses) | ✅ | ❌ | 🟡 | AIDE-02 | PR #68 merged; Android not migrated |
| TEN-04 | Location/branch under organization | ✅ | ❌ | 🟡 | AIDE-02 | PR #68 merged; Android not migrated |
| TEN-05 | Department/cost center | ❌ | ❌ | ❌ | AIDE-02 | Future |
| TEN-06 | Cross-business reporting (consolidated) | ❌ | ❌ | ❌ | AIDE-14 | Head-office view |
| TEN-07 | Business settings (currency, tax, footer) | ✅ | ✅ (local) | ✅ | — | `/api/business` PATCH |
| TEN-08 | Category management | ✅ | ✅ (local) | ✅ | — | Scoped to business |
| TEN-09 | Data export (CSV/JSON) | ✅ | ✅ (local) | ✅ | — | Sales, products |
| TEN-10 | Full backup/restore | ❌ | ❌ | ❌ | AIDE-19 | Point-in-time + user-initiated |

---

## 3. Products & Inventory

| ID | Capability | Web | Android | Status | Issue | Notes |
|----|------------|-----|---------|--------|-------|-------|
| INV-01 | Product CRUD (name, price, qty, SKU) | ✅ | ✅ | ✅ | — | Auto-SKU: `{CAT}-{4digits}` |
| INV-02 | Product images (camera/upload) | ✅ | ✅ | ✅ | — | Base64 in Dexie/Room (<500KB) |
| INV-03 | Categories + sort order | ✅ | ✅ | ✅ | — | |
| INV-04 | Low-stock threshold + alert | ✅ (sync) | ✅ (Worker) | ✅ | — | Android: `LowStockWorker` 6h/1d |
| INV-05 | Service products (no stock) | ✅ | ✅ | ✅ | — | `isService` flag |
| INV-06 | Barcode scanning | ❌ | ✅ | 🟡 | AIDE-15 | Android: ML Kit; Web: none |
| INV-07 | Barcode printing | ❌ | ❌ | ❌ | AIDE-15 | |
| INV-08 | Product variants (size/color) | ❌ | ❌ | ❌ | AIDE-15 | |
| INV-09 | Bundles/kits | ❌ | ❌ | ❌ | AIDE-15 | |
| INV-10 | Costing methods (FIFO, Avg, LIFO) | ❌ | ❌ | ❌ | AIDE-10 | |
| INV-11 | Stock adjustment (manual + reason) | ❌ | ❌ | ❌ | AIDE-10 | Movement log |
| INV-12 | Stock transfer (multi-location) | ❌ | ❌ | ❌ | AIDE-10, AIDE-14 | |
| INV-13 | Goods receiving (PO → GRN) | ✅ | ❌ | 🟡 | AIDE-09 | Web: GRN model with auto PO status update |
| INV-14 | Supplier management | ✅ | ❌ | 🟡 | AIDE-09 | Web: Supplier CRUD with auto-coded (SUP-NNN) |
| INV-15 | Purchase orders | ✅ | ❌ | 🟡 | AIDE-09 | Web: PO with line items, status tracking |
| INV-16 | Reorder points / auto-PO | ❌ | ❌ | ❌ | AIDE-15 | |
| INV-17 | Inventory valuation report | ❌ | ❌ | ❌ | AIDE-07, AIDE-10 | |
| INV-18 | Expiry/batch tracking | ❌ | ❌ | ❌ | AIDE-15 | Pharmacy/food |

---

## 4. Sales & POS

| ID | Capability | Web | Android | Status | Issue | Notes |
|----|------------|-----|---------|--------|-------|-------|
| POS-01 | Cart (add/remove/qty) | ✅ | ✅ | ✅ | — | Grid + list views |
| POS-02 | Search + SKU scan | ✅ | ✅ | ✅ | — | |
| POS-03 | Payment methods (Cash, M-Pesa, Card) | ✅ | ✅ | ✅ | — | VAT-inclusive tax |
| POS-04 | Cash tender + change calculation | ✅ | ✅ | ✅ | — | PR #33: `CashPaymentRules` |
| POS-05 | Receipt (thermal 58/80mm + A4 PDF) | ✅ | ✅ | ✅ | — | Supermarket-grade |
| POS-06 | Receipt print (Bluetooth/USB) | ✅ | ✅ | ✅ | — | Web: print window; Android: print service |
| POS-07 | Offline sale creation | ✅ | ✅ | ✅ | — | Local-first |
| POS-08 | Sale sync (push/pull) | ✅ | ❌ | 🟡 | AIDE-18 | Android local-only |
| POS-09 | Credit sales (customer balance) | ✅ | ✅ | 🟡 | AIDE-08 | Web: `customerId` on Sale; Android: `CustomerEntity.balance` |
| POS-10 | Refund / void | ❌ | ❌ | ❌ | AIDE-11 | No reversal workflow |
| POS-11 | Lay-away / suspended carts | ❌ | ❌ | ❌ | AIDE-11 | |
| POS-12 | Multi-terminal (registers) | ❌ | ❌ | ❌ | AIDE-11 | |
| POS-13 | Cashier shifts + cash drawers | ❌ | ❌ | ❌ | AIDE-11 | |
| POS-14 | Shift Z-report / reconciliation | ❌ | ❌ | ❌ | AIDE-13 | |
| POS-15 | Tips / service charge | ❌ | ❌ | ❌ | AIDE-11 | |
| POS-16 | Discounts / promotions | ❌ | ❌ | ❌ | AIDE-15 | |
| POS-17 | Loyalty / customer points | ❌ | ❌ | ❌ | AIDE-08 | |
| POS-18 | Split payment (cash + card) | ❌ | ❌ | ❌ | AIDE-11 | |
| POS-19 | Sale notes / internal memo | ✅ | ✅ | ✅ | — | `Sale.notes` |

---

## 5. Customers & Accounts Receivable

| ID | Capability | Web | Android | Status | Issue | Notes |
|----|------------|-----|---------|--------|-------|-------|
| AR-01 | Customer directory | ✅ | ✅ | 🟡 | AIDE-08 | Web: full CRUD API; Android: `CustomerEntity` |
| AR-02 | Customer credit balance | ✅ | ✅ | 🟡 | AIDE-08 | Web: denormalized `balance` field; Android: `CustomerEntity.balance` |
| AR-03 | Credit sales workflow | ✅ | ❌ | 🟡 | AIDE-08 | Web: `customerId` on Sale links credit sales |
| AR-04 | Invoice generation | ✅ | ❌ | 🟡 | AIDE-08 | Web: Invoice + InvoiceLine models, auto-numbered |
| AR-05 | Invoice email/SMS | ❌ | ❌ | ❌ | AIDE-08, AIDE-20 | |
| AR-06 | Payment allocation (receipts) | ✅ | ❌ | 🟡 | AIDE-08 | Web: PaymentAllocation model, invoice + general payments |
| AR-07 | Aging report | ✅ | ❌ | 🟡 | AIDE-08 | Web: 5-bucket aging (current, 1-30, 31-60, 61-90, 90+) |
| AR-08 | Statements | ✅ | ❌ | 🟡 | AIDE-08 | Web: customer statement with running balance |
| AR-09 | Bad debt write-off | ✅ | ❌ | 🟡 | AIDE-08 | Web: WRITTEN_OFF invoice status |
| AR-10 | Customer portal | ❌ | ❌ | ❌ | AIDE-20 | |

---

## 6. Suppliers & Accounts Payable

| ID | Capability | Web | Android | Status | Issue | Notes |
|----|------------|-----|---------|--------|-------|-------|
| AP-01 | Supplier directory | ✅ | ❌ | 🟡 | AIDE-09 | Web: full CRUD API with search, auto-coded (SUP-NNN) |
| AP-02 | Purchase orders | ✅ | ❌ | 🟡 | AIDE-09 | Web: auto-numbered (PO-YEAR-NNNN), line items, status tracking |
| AP-03 | Goods receiving (GRN) | ✅ | ❌ | 🟡 | AIDE-09 | Web: GRN against PO, auto-updates PO status (PARTIALLY_RECEIVED/RECEIVED) |
| AP-04 | Supplier invoices | ✅ | ❌ | 🟡 | AIDE-09 | Web: link to PO, payment tracking, status transitions |
| AP-05 | Payment to suppliers | ✅ | ❌ | 🟡 | AIDE-09 | Web: invoice-specific + general payments, auto-updates supplier balance |
| AP-06 | AP aging report | ✅ | ❌ | 🟡 | AIDE-09 | Web: 5-bucket aging (current, 1-30, 31-60, 61-90, 90+ days) |
| AP-07 | 3-way match (PO/GRN/Invoice) | ✅ | ❌ | 🟡 | AIDE-09 | Web: SupplierInvoice links to PurchaseOrder; GRN tracks against PO lines |

---

## 7. Expenses & Cost Tracking

| ID | Capability | Web | Android | Status | Issue | Notes |
|----|------------|-----|---------|--------|-------|-------|
| EXP-01 | Expense capture | ❌ | ✅ | 🟡 | — | Android only (`ExpenseEntity`) |
| EXP-02 | Expense categories (free-text) | ❌ | ✅ | 🟡 | — | No standardized CoA |
| EXP-03 | COGS vs overhead distinction | ❌ | ✅ | 🟡 | — | `isCogs` flag; unused |
| EXP-04 | Recurring expenses | ❌ | ❌ | ❌ | AIDE-07 | |
| EXP-05 | Expense receipts (photo) | ❌ | ❌ | ❌ | AIDE-07 | |
| EXP-06 | Expense approval workflow | ❌ | ❌ | ❌ | AIDE-12 | |
| EXP-07 | Mileage / per diem | ❌ | ❌ | ❌ | AIDE-07 | |

---

## 8. Accounting & Financial Statements

| ID | Capability | Web | Android | Status | Issue | Notes |
|----|------------|-----|---------|--------|-------|-------|
| ACC-01 | Chart of accounts | ✅ | ❌ | 🟡 | AIDE-05 | 22 standard accounts seeded on first use |
| ACC-02 | Double-entry journal entries | ✅ | ❌ | 🟡 | AIDE-05 | Central posting engine with balance enforcement |
| ACC-03 | General ledger | ✅ | ❌ | 🟡 | AIDE-05 | JournalEntry + JournalLine models, queryable via API |
| ACC-04 | POS → GL auto-post | ✅ | ❌ | 🟡 | AIDE-06 | Every sale (direct + sync) posts balanced journal entries |
| ACC-05 | Trial balance | ✅ | ❌ | 🟡 | AIDE-07 | Verifies debits = credits across all accounts |
| ACC-06 | Profit & Loss (P&L) | ✅ | ❌ | 🟡 | AIDE-07 | Revenue, COGS, operating expenses, net profit |
| ACC-07 | Balance Sheet | ✅ | ❌ | 🟡 | AIDE-07 | Assets = Liabilities + Equity, retained earnings |
| ACC-08 | Cash Flow Statement | ✅ | ❌ | 🟡 | AIDE-07 | Operating, investing, financing activities |
| ACC-09 | Accounting periods (open/close) | ✅ | ❌ | 🟡 | AIDE-07 | Period CRUD, close/lock controls, role-gated |
| ACC-10 | Year-end closing | ❌ | ❌ | ❌ | AIDE-07 | |
| ACC-11 | Fixed assets / depreciation | ❌ | ❌ | ❌ | AIDE-07 | |
| ACC-12 | Bank reconciliation | ❌ | ❌ | ❌ | AIDE-16 | |
| ACC-13 | Multi-currency | ❌ | ❌ | ❌ | AIDE-14 | |
| ACC-14 | Consolidated accounts (multi-entity) | ❌ | ❌ | ❌ | AIDE-14 | |
| ACC-15 | Monetary precision (Decimal not Float) | ✅ | ❌ | 🟡 | AIDE-04 | Web: Decimal(19,4) migrated; Android: still Float |

---

## 9. Reporting & Analytics

| ID | Capability | Web | Android | Status | Issue | Notes |
|----|------------|-----|---------|--------|-------|-------|
| RPT-01 | Revenue chart (7d) | ✅ | ✅ | ✅ | — | SVG bar chart |
| RPT-02 | Top products | ✅ | ✅ | ✅ | — | |
| RPT-03 | Payment method breakdown | ✅ | ✅ | ✅ | — | |
| RPT-04 | Sales by category | ✅ | ✅ | ✅ | — | |
| RPT-05 | Sales by cashier | ❌ | ❌ | ❌ | AIDE-11 | |
| RPT-06 | Profit margin by product | ❌ | ❌ | ❌ | AIDE-10 | Needs costing |
| RPT-07 | Stock valuation | ❌ | ❌ | ❌ | AIDE-10 | |
| RPT-08 | Low stock report | ✅ | ✅ | ✅ | — | |
| RPT-09 | Customer sales history | ✅ | ✅ | 🟡 | AIDE-08 | Web: customer statement API; Android only |
| RPT-10 | Custom date ranges | ✅ | ✅ | ✅ | — | |
| RPT-11 | Export (CSV/JSON/PDF) | ✅ | ✅ | ✅ | — | |
| RPT-12 | Scheduled/emailed reports | ❌ | ❌ | ❌ | AIDE-20 | |
| RPT-13 | Dashboard widgets (customizable) | ❌ | ❌ | ❌ | AIDE-21 | |
| RPT-14 | Budget vs actual | ❌ | ❌ | ❌ | AIDE-21 | |
| RPT-15 | Forecasting / AI insights | ❌ | ❌ | ❌ | AIDE-21 | |

---

## 10. Sync & Offline

| ID | Capability | Web | Android | Status | Issue | Notes |
|----|------------|-----|---------|--------|-------|-------|
| SYNC-01 | Offline mutation queue (outbox) | ✅ | N/A | ✅ | — | `syncQueue` in Dexie |
| SYNC-02 | Auto-sync (30s interval) | ✅ | N/A | ✅ | — | Online event + timer |
| SYNC-03 | Conflict resolution (LWW) | ✅ | N/A | ✅ | — | `resolveConflict()` |
| SYNC-04 | Stock oversell prevention | ✅ | N/A | ✅ | — | Movement-ledger check |
| SYNC-05 | Conflict review UI | ✅ | N/A | ✅ | — | Settings → Sync Conflicts |
| SYNC-06 | Android cloud sync | N/A | ❌ | ❌ | AIDE-18 | By design: local-only |
| SYNC-07 | Cross-device sync (same business) | ✅ | ❌ | ❌ | AIDE-18 | Web only |
| SYNC-08 | Background sync (WorkManager) | N/A | ❌ | ❌ | AIDE-18 | Only notifications |
| SYNC-09 | Selective sync (large catalogs) | ❌ | N/A | ❌ | — | Pulls all since timestamp |
| SYNC-10 | Sync status UI (badge, errors) | ✅ | N/A | ✅ | — | Sidebar OnlineStatus |

---

## 11. Notifications

| ID | Capability | Web | Android | Status | Issue | Notes |
|----|------------|-----|---------|--------|-------|-------|
| NOT-01 | Low stock alert (on-device) | ❌ | ✅ | 🟡 | — | `LowStockWorker` |
| NOT-02 | Daily summary (on-device) | ❌ | ✅ | 🟡 | — | `DailySummaryWorker` |
| NOT-03 | In-app notification center | ❌ | ✅ | 🟡 | — | `NotificationCenterSheet` |
| NOT-04 | Server push (web) | ❌ | N/A | ❌ | — | `Notification` model exists, no delivery |
| NOT-05 | FCM / remote push | N/A | ❌ | ❌ | — | Not planned |
| NOT-06 | Notification preferences | ✅ | ✅ | ✅ | — | Per-type enable/disable |
| NOT-07 | Deep links from notification | N/A | ✅ | ✅ | — | `route` in `NotifiedEventEntity` |
| NOT-08 | Email/SMS alerts | ❌ | ❌ | ❌ | AIDE-20 | |

---

## 12. Kenya-Specific Compliance

| ID | Capability | Web | Android | Status | Issue | Notes |
|----|------------|-----|---------|--------|-------|-------|
| KE-01 | KES currency formatting | ✅ | ✅ | ✅ | — | `formatMoney` in `lib/format.ts` |
| KE-02 | VAT (16%) calculation | ✅ | ✅ | ✅ | — | `taxRate` on Business; VAT-inclusive receipts |
| KE-03 | eTIMS integration | ❌ | ❌ | ❌ | AIDE-17 | KRA electronic tax invoice |
| KE-04 | M-Pesa STK Push / C2B | ❌ | ❌ | ❌ | AIDE-16 | |
| KE-05 | Withholding tax | ❌ | ❌ | ❌ | AIDE-17 | |
| KE-06 | PAYE / NHIF / NSSF payroll | ❌ | ❌ | ❌ | AIDE-17 | |
| KE-07 | Localized UI (Swahili) | ❌ | ❌ | ❌ | AIDE-18 | |

---

## 13. Platform & DevOps

| ID | Capability | Web | Android | Status | Issue | Notes |
|----|------------|-----|---------|--------|-------|-------|
| DEV-01 | Web CI (type-check, lint, build) | ✅ | N/A | ✅ | — | `web-build.yml` |
| DEV-02 | Android CI (unit, lint, device tests) | N/A | ✅ | ✅ | — | `android-ci.yml` |
| DEV-03 | Android signed release pipeline | N/A | ✅ | ✅ | — | `android-release.yml` |
| DEV-04 | Android AAB / Play Store | N/A | ❌ | ❌ | AIDE-18 | |
| DEV-05 | Web preview deployments | ✅ | N/A | ✅ | — | Vercel preview URLs |
| DEV-06 | Automated dependency updates | ❌ | ❌ | ❌ | — | |
| DEV-07 | Security scanning (SAST/DAST) | ❌ | ❌ | ❌ | AIDE-19 | |
| DEV-08 | Secret scanning | ❌ | ❌ | ❌ | AIDE-19 | |
| DEV-09 | Load testing | ❌ | ❌ | ❌ | AIDE-19 | |
| DEV-10 | Chaos engineering / DR test | ❌ | ❌ | ❌ | AIDE-19 | |

---

## 14. Data Migration Risks (Summary)

| Migration | Risk Level | Blocking Issue | Rollback Plan |
|-----------|------------|----------------|---------------|
| Float → Decimal (monetary) | ✅ **Done** | AIDE-04 (done) | Dual-column backfill + Phase 2 cutover complete |
| Org/Location hierarchy (PR #68) | ✅ **Done** | AIDE-02 (done) | Backfill script reversible; queries scoped to `businessId` |
| Android Room v4 migration | 🟢 **Low** | — | Explicit migrations tested; no destructive fallback |
| Sync conflict resolver changes | 🟡 **Medium** | AIDE-18 | Deterministic; conflicts surfaced for review |
| Desktop build removal | 🟢 **Low** | #19 (done) | Assets left on GitHub Releases |

---

## 15. Recommended Next Actions (Priority Order)

1. **AIDE-04** ✅ — Decimal migration complete (web Prisma + Neon done, Android pending)
2. **AIDE-03** ✅ — Tenant-scoped RBAC, employee membership, access lifecycle
   - ✅ All API routes use `requireBusiness()` for membership-based tenant isolation
   - ✅ Employee profiles with sequential IDs (Employee model)
   - ✅ Invitation flow: create, accept, revoke (Invitation model)
   - ✅ Role templates: OWNER (full), MANAGER (no employee/settings), STAFF (POS only)
   - ✅ Permission-based authorization on all RBAC routes
   - ✅ Access revocation: DELETE employee removes membership
   - ❌ Android PIN/biometric lock still missing
   - ❌ Audit log of auth events still missing
3. **AIDE-05** ✅ — Double-entry accounting: chart of accounts, journal entries, posting engine
   - ✅ 22 standard accounts auto-seeded per business
   - ✅ Central posting engine with balance enforcement
   - ✅ Entry reversal, account balance queries
   - ❌ Android not migrated
4. **AIDE-06** ✅ — Connect POS to GL (auto-post on sale creation)
   - ✅ Direct sales API auto-posts to GL after each sale
   - ✅ Synced offline sales auto-post on sync
   - ✅ Chart of accounts auto-seeded on first sale
   - ✅ Non-blocking — sale succeeds even if GL posting fails
5. **AIDE-07** ✅ — Core financial statements (P&L, BS, CF) + period controls
   - ✅ Profit & Loss: revenue, COGS, operating expenses, net profit
   - ✅ Balance Sheet: assets = liabilities + equity, retained earnings
   - ✅ Cash Flow: operating, investing, financing activities
   - ✅ Trial Balance: verifies debits = credits
   - ✅ Accounting periods: CRUD, close/lock, role-gated
   - ❌ Android not migrated
   - ❌ Year-end closing, fixed assets/depreciation still missing
6. **AIDE-08** ✅ — Customers & Accounts Receivable (web)
  - ✅ Customer directory: full CRUD API with search, credit limits, balances
  - ✅ Credit sales: `customerId` on Sale links transactions to customers
  - ✅ Invoice generation: Invoice + InvoiceLine models, auto-numbered (INV-YEAR-NNNN)
  - ✅ Payment allocation: record payments against invoices or general balance
  - ✅ Aging report: 5-bucket breakdown (current, 1-30, 31-60, 61-90, 90+ days)
  - ✅ Customer statements: transaction history with running balance
  - ✅ Bad debt write-off: WRITTEN_OFF invoice status
  - ❌ Invoice email/SMS still missing
  - ❌ Android not migrated
7. **AIDE-09** ✅ — Suppliers & Accounts Payable (web)
  - ✅ Supplier directory: full CRUD API with search, auto-coded (SUP-NNN), payment terms
  - ✅ Purchase orders: auto-numbered (PO-YEAR-NNNN), line items, status tracking
  - ✅ Goods receiving (GRN): receive against PO, auto-updates PO status
  - ✅ Supplier invoices: link to PO, payment tracking, status transitions
  - ✅ Supplier payments: invoice-specific + general payments, auto-updates balance
  - ✅ AP aging report: 5-bucket breakdown (current, 1-30, 31-60, 61-90, 90+ days)
  - ✅ Supplier statements: transaction history with running balance
  - ✅ 3-way match: SupplierInvoice links to PurchaseOrder; GRN tracks against PO lines
  - ❌ Android not migrated
8. **AIDE-18** — Shared offline-first multi-user (Android sync) — strategic differentiator
9. **AIDE-10** — Inventory movement ledger, costing, multi-warehouse
10. **AIDE-16/17** — Kenya-specific: M-Pesa, eTIMS, tax engine

---

*This register is a living document. Update as gaps close and new ones are discovered.*