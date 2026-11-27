# AIDE-03 — Role templates & permission matrix

This matrix is generated from `src/lib/roleTemplates.mjs` and verified by
`scripts/tests/rbac-templates.test.mjs`. It is the authoritative answer to
"who can do what" — UI visibility is never an authorization decision.

## Storage model

`BusinessMembership.role` remains the coarse, persisted tier
(`OWNER` / `MANAGER` / `STAFF`) so existing clients and the sync engine
keep working. `Employee.roleTemplate` names one of the templates below and,
when present, is authoritative for granular permissions and data scope.
`Employee.scopeType` plus `branchId`/`departmentId`/`warehouseId`/
`terminalId`/`ownRecordsOnly` narrow the boundary further. A deactivated
employee is rejected by `requireBusiness` on every API route.

## Templates

| Template | Coarse role | Tier | Default scope | Permissions |
|---|---|---|---|---|
| Owner (`OWNER`) | OWNER | 4 | ORGANIZATION | all 42 permissions |
| HQ admin (`HQ_ADMIN`) | MANAGER | 3 | ORGANIZATION | all 42 permissions |
| Finance (`FINANCE`) | MANAGER | 2 | ORGANIZATION | `SALE_READ`, `CUSTOMER_READ`, `ACCOUNT_READ`, `ACCOUNT_EDIT`, `JOURNAL_CREATE`, `JOURNAL_READ`, `REPORT_READ`, `REPORT_EXPORT`, `SETTINGS_READ`, `SUPPLIER_INVOICE_READ`, `SUPPLIER_PAYMENT_READ`, `SUPPLIER_PAYMENT_CREATE`, `REFUND_READ` |
| Accountant (`ACCOUNTANT`) | STAFF | 1 | ORGANIZATION | `SALE_READ`, `CUSTOMER_READ`, `ACCOUNT_READ`, `JOURNAL_READ`, `REPORT_READ`, `REPORT_EXPORT`, `SETTINGS_READ`, `SUPPLIER_INVOICE_READ`, `SUPPLIER_PAYMENT_READ`, `REFUND_READ` |
| Branch/store manager (`BRANCH_MANAGER`) | MANAGER | 2 | BRANCH | `SALE_CREATE`, `SALE_READ`, `SALE_DELETE`, `SALE_REFUND`, `PRODUCT_CREATE`, `PRODUCT_READ`, `PRODUCT_UPDATE`, `PRODUCT_DELETE`, `CUSTOMER_CREATE`, `CUSTOMER_READ`, `CUSTOMER_UPDATE`, `CUSTOMER_DELETE`, `SUPPLIER_READ`, `PURCHASE_ORDER_CREATE`, `PURCHASE_ORDER_READ`, `PURCHASE_ORDER_UPDATE`, `GOODS_RECEIVE`, `SUPPLIER_INVOICE_READ`, `SUPPLIER_PAYMENT_READ`, `ACCOUNT_READ`, `JOURNAL_READ`, `REPORT_READ`, `REPORT_EXPORT`, `SETTINGS_READ`, `EMPLOYEE_INVITE`, `EMPLOYEE_MANAGE`, `SHIFT_MANAGE`, `STOCK_ADJUST_CREATE`, `STOCK_ADJUST_READ`, `SHIFT_OPEN`, `SHIFT_CLOSE`, `REFUND_CREATE`, `REFUND_READ` |
| Store manager (`STORE_MANAGER`) | MANAGER | 2 | BRANCH | `SALE_CREATE`, `SALE_READ`, `SALE_DELETE`, `SALE_REFUND`, `PRODUCT_CREATE`, `PRODUCT_READ`, `PRODUCT_UPDATE`, `PRODUCT_DELETE`, `CUSTOMER_CREATE`, `CUSTOMER_READ`, `CUSTOMER_UPDATE`, `SUPPLIER_READ`, `PURCHASE_ORDER_READ`, `GOODS_RECEIVE`, `ACCOUNT_READ`, `REPORT_READ`, `REPORT_EXPORT`, `SETTINGS_READ`, `SHIFT_MANAGE`, `STOCK_ADJUST_CREATE`, `STOCK_ADJUST_READ`, `SHIFT_OPEN`, `SHIFT_CLOSE`, `REFUND_CREATE`, `REFUND_READ` |
| Procurement (`PROCUREMENT`) | STAFF | 1 | ORGANIZATION | `PRODUCT_READ`, `SUPPLIER_CREATE`, `SUPPLIER_READ`, `SUPPLIER_UPDATE`, `PURCHASE_ORDER_CREATE`, `PURCHASE_ORDER_READ`, `PURCHASE_ORDER_UPDATE`, `GOODS_RECEIVE`, `SUPPLIER_INVOICE_READ`, `SUPPLIER_PAYMENT_READ`, `REPORT_READ`, `SETTINGS_READ`, `STOCK_ADJUST_READ` |
| Inventory controller (`INVENTORY`) | STAFF | 1 | WAREHOUSE | `PRODUCT_CREATE`, `PRODUCT_READ`, `PRODUCT_UPDATE`, `PRODUCT_DELETE`, `PURCHASE_ORDER_READ`, `GOODS_RECEIVE`, `STOCK_ADJUST_CREATE`, `STOCK_ADJUST_READ`, `REPORT_READ`, `SETTINGS_READ` |
| Warehouse operator (`WAREHOUSE`) | STAFF | 1 | WAREHOUSE | `PRODUCT_READ`, `PURCHASE_ORDER_READ`, `GOODS_RECEIVE`, `STOCK_ADJUST_CREATE`, `STOCK_ADJUST_READ`, `REPORT_READ`, `SETTINGS_READ` |
| Cashier (`CASHIER`) | STAFF | 1 | TERMINAL | `SALE_CREATE`, `SALE_READ`, `PRODUCT_READ`, `CUSTOMER_READ`, `CUSTOMER_CREATE`, `SHIFT_OPEN`, `SHIFT_CLOSE`, `REPORT_READ`, `SETTINGS_READ`, `REFUND_READ` |
| Cash office (`CASH_OFFICE`) | STAFF | 1 | BRANCH | `SALE_READ`, `SHIFT_MANAGE`, `SHIFT_OPEN`, `SHIFT_CLOSE`, `REFUND_CREATE`, `REFUND_READ`, `ACCOUNT_READ`, `REPORT_READ`, `REPORT_EXPORT`, `SETTINGS_READ`, `CUSTOMER_READ` |
| Salesperson (`SALESPERSON`) | STAFF | 1 | OWN_RECORDS | `SALE_CREATE`, `SALE_READ`, `PRODUCT_READ`, `CUSTOMER_READ`, `CUSTOMER_CREATE`, `CUSTOMER_UPDATE`, `REPORT_READ`, `SETTINGS_READ`, `REFUND_READ` |
| Auditor (`AUDITOR`) | STAFF | 0 | ORGANIZATION | `SALE_READ`, `PRODUCT_READ`, `CUSTOMER_READ`, `SUPPLIER_READ`, `PURCHASE_ORDER_READ`, `SUPPLIER_INVOICE_READ`, `SUPPLIER_PAYMENT_READ`, `ACCOUNT_READ`, `JOURNAL_READ`, `REPORT_READ`, `REPORT_EXPORT`, `SETTINGS_READ`, `STOCK_ADJUST_READ`, `SHIFT_MANAGE`, `REFUND_READ` |

## Assignment rules

A caller can assign only templates strictly below their own tier; OWNER may
assign OWNER. The full matrix of allowed assignments:

| Caller \ Target | OWNER | HQ_ADMIN | FINANCE | ACCOUNTANT | BRANCH_MANAGER | STORE_MANAGER | PROCUREMENT | INVENTORY | WAREHOUSE | CASHIER | CASH_OFFICE | SALESPERSON | AUDITOR |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| OWNER | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |
| HQ_ADMIN | — | — | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |
| FINANCE | — | — | — | yes | — | — | yes | yes | yes | yes | yes | yes | yes |
| ACCOUNTANT | — | — | — | — | — | — | — | — | — | — | — | — | yes |
| BRANCH_MANAGER | — | — | — | yes | — | — | yes | yes | yes | yes | yes | yes | yes |
| STORE_MANAGER | — | — | — | yes | — | — | yes | yes | yes | yes | yes | yes | yes |
| PROCUREMENT | — | — | — | — | — | — | — | — | — | — | — | — | yes |
| INVENTORY | — | — | — | — | — | — | — | — | — | — | — | — | yes |
| WAREHOUSE | — | — | — | — | — | — | — | — | — | — | — | — | yes |
| CASHIER | — | — | — | — | — | — | — | — | — | — | — | — | yes |
| CASH_OFFICE | — | — | — | — | — | — | — | — | — | — | — | — | yes |
| SALESPERSON | — | — | — | — | — | — | — | — | — | — | — | — | yes |
| AUDITOR | — | — | — | — | — | — | — | — | — | — | — | — | — |

## Scope semantics

- `ORGANIZATION` — all businesses in the caller's organizations.
- `BRANCH` — one business/branch; cross-branch resources are denied even if
  they carry a matching branch label.
- `DEPARTMENT` / `WAREHOUSE` / `TERMINAL` — only records within the
  assigned unit.
- `OWN_RECORDS` — only records whose `ownerId` is the caller. On sales this
  uses the indexed `cashierUserId` column.

Tenant isolation is always checked first: a resource in a business the caller
is not a member of is denied regardless of any other scope.

## Audit

Template assignment, role change, scope change, invitation, activation,
suspension and revocation all append an immutable `AuditEvent` via
`recordAudit`. The trail is read-only through `GET /api/audit-events`.
