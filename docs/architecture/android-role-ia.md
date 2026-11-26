# AIDE-ANDROID-06 — Role-Based Android Information Architecture & Daily Task Journeys

Status: **Approved architecture & journey specification (Issue #120)**  
Parent epic: **#39**  
Coordinates with: **#115** (shared identity), **#117** (warehouse/POS workflows), **#118** (device enrollment), **#119** (adaptive design system), **#109** (identity security), **#110** (resource isolation).

---

## 1. Design Principles

1. **Task-oriented, not a desktop module catalogue**: Every employee lands on a compact home screen tailored to their daily job, with 3–4 primary navigation destinations and 1-tap quick actions for their highest-frequency tasks.
2. **Permission-driven UI, server-authoritative enforcement**: Navigation tabs, quick actions, secondary module groups, and in-screen mutation controls are computed from explicit `MobilePermission` grants rather than role-name assumptions alone. The backend (`/api/mobile/navigation-context` and resource APIs) enforces authorization independently; client UI gating prevents dead-end taps and accidental unauthorized attempts.
3. **Explicit operating location context**: An always-visible context header displays the active **Organization (Legal Entity) · Business / Branch · Assigned Warehouse or POS Terminal · Active Role** so staff never ring up a sale, receive stock, or count inventory in the wrong location.
4. **Zero silent context switches & strict tenant isolation**: Users with multiple memberships or roles switch context explicitly via the Context Switcher. Switching with an active POS cart requires confirmation, clears transient state, and re-scopes every repository/ViewModel stream so data from a previous business never leaks or flashes stale figures.
5. **Graceful permission narrowing & revocation**: If permissions are narrowed or a membership is suspended/revoked, navigation recomputes immediately; deep links or back-stack entries targeting now-unauthorized screens render a non-destructive **Access Restricted** state with a 1-tap path back to the employee's authorized home.
6. **Continuity for existing Aide users**: Existing single-owner Android installs automatically map their saved `businessId` to an `OWNER_ADMIN` workspace keeping the familiar `Home · Sell · Stock · Workspace` primary navigation without forcing re-onboarding or data migration loss.
7. **Honest offline & storage copy**: Onboarding, banners, and settings accurately distinguish local on-device Room storage from server-managed membership contexts and never claim background cloud backup when operating in standalone local mode.

---

## 2. Mobile Personas, Permissions & Navigation Matrix

### 2.1 Persona Summary

| Role ID | Persona | Operating Location Focus | Primary Navigation (4 tabs) | Home Dashboard Focus |
|---|---|---|---|---|
| `OWNER_ADMIN` | Owner / Administrator | Organization + Branch (+ optional Till/Warehouse) | `Home`, `Sell`, `Stock`, `Workspace` | Today's Sales, Gross Profit, Pending Approvals, Low Stock + 7-day sales chart |
| `BRANCH_MANAGER` | Branch Manager | Assigned Branch (+ Drawers/Stockroom) | `Home`, `Tasks`, `Sell`, `Workspace` | Branch Sales Today, Active Shift Status, Pending Approvals, Low Stock Alerts |
| `CASHIER` | Cashier / Checkout Operator | Assigned Branch + POS Terminal / Till | `Home`, `Sell`, `Lookup`, `Shift` | Shift Status & Till Float, Shift Sales Count & Takings *(never Profit or Cost)* |
| `WAREHOUSE_OPERATOR` | Warehouse Operator | Assigned Branch + Warehouse / Stockroom | `Home`, `Receive`, `Count`, `Tasks` | Open Warehouse Tasks, Low-Stock Replenishment, Today's Receipts & Counts *(no Sales/Profit)* |
| `RECEIVING_CLERK` | Receiving Clerk | Assigned Branch + Receiving Dock / Warehouse | `Home`, `Receive`, `Lookup`, `Tasks` | Deliveries (GRNs) Today, Pending Receiving Tasks, Low-Stock Items Awaiting Delivery |
| `INVENTORY_CONTROLLER` | Inventory Controller | Assigned Branch + Warehouse(s) | `Home`, `Stock`, `Count`, `Workspace` | Active SKUs, Low-Stock Alerts, Stock Counts/Adjustments Today, Retail Stock Value |
| `ACCOUNTANT` | Accountant / Finance Reviewer | Organization + Authorized Branch(es) | `Home`, `Reports`, `Expenses`, `Workspace` | Today's Revenue, Net/Gross Profit, Customer Receivables, Overheads + 7-day trend |

### 2.2 Permission Matrix by Persona

Permissions align with `src/lib/rbac.ts` (`Permission`) and `src/lib/mobileNavigation.mjs`:

| Capability / Permission | Owner / Admin | Branch Manager | Cashier | Warehouse Operator | Receiving Clerk | Inventory Controller | Accountant |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `SALE_CREATE` (Start POS sale) | Yes | Yes | Yes | - | - | - | - |
| `SALE_READ` (View sales activity) | Yes | Yes | Yes *(till)* | - | - | - | Yes |
| `SHIFT_OPEN` / `SHIFT_CLOSE` | Yes | Yes | Yes | - | - | - | - |
| `SHIFT_MANAGE` (Audit shifts) | Yes | Yes | - | - | - | - | Yes *(read)* |
| `PRODUCT_READ` (Scan / search SKU) | Yes | Yes | Yes *(price/qty)* | Yes *(qty/SKU)* | Yes *(qty/SKU)* | Yes | Yes |
| `PRODUCT_CREATE` / `PRODUCT_UPDATE` | Yes | Yes | - | - | - | Yes | - |
| `PRODUCT_DELETE` | Yes | Yes | - | - | - | - | - |
| `GOODS_RECEIVE` (Record GRN) | Yes | Yes | - | Yes | Yes | Yes | - |
| `PURCHASE_ORDER_READ` | Yes | Yes | - | Yes | Yes | Yes | Yes |
| `STOCK_COUNT_PERFORM` (Count stock) | Yes | Yes | - | Yes | - | Yes | - |
| `STOCK_ADJUST_CREATE` (Apply variance) | Yes | Yes | - | - *(req. approval)* | - | Yes | - |
| `STOCK_ADJUST_READ` | Yes | Yes | - | Yes | - | Yes | Yes |
| `CUSTOMER_READ` | Yes | Yes | Yes | - | - | - | Yes |
| `CUSTOMER_CREATE` / `CUSTOMER_UPDATE` | Yes | Yes | Yes | - | - | - | - |
| `CUSTOMER_DELETE` | Yes | Yes | - | - | - | - | - |
| `EXPENSE_READ` / `EXPENSE_CREATE` | Yes | Yes | - | - | - | - | Yes |
| `ACCOUNT_READ` / `JOURNAL_READ` | Yes | Yes | - | - | - | - | Yes |
| `REPORT_READ` (Revenue/Profit/VAT) | Yes | Yes | - | - | - | - | Yes |
| `REPORT_EXPORT` (JSON/CSV export) | Yes | Yes | - | - | - | - | Yes |
| `TASK_VIEW` / `TASK_COMPLETE` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `APPROVAL_REQUEST` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `APPROVAL_DECIDE` (Approve/Reject) | Yes | Yes | - | - | - | - | - |
| `SETTINGS_READ` | Yes | Yes | Yes *(device)* | Yes *(device)* | Yes *(device)* | Yes *(device)* | Yes |
| `SETTINGS_UPDATE` (Business profile/VAT) | Yes | - | - | - | - | - | - |

### 2.3 Grouped Secondary Modules (`Workspace` Hub)

Instead of an unstructured `More` list, secondary destinations are organized into three task-domain sections and filtered by `grantedPermissions` (sections with zero permitted destinations are hidden):

1. **Store & Warehouse Operations**
   - `Sell` *(POS Checkout)* — when permitted and not already in primary bar
   - `Product Lookup` *(Scan / Search SKU & Price)*
   - `Stock Catalogue` *(Products & Low-Stock Thresholds)*
   - `Receive Goods` *(Inbound Delivery / GRN)*
   - `Count Stock` *(Cycle Count & Stock Variance)*
   - `Assigned Tasks` *(Daily Checklist & Operational Queue)*
   - `Cashier Shifts` *(Open / Close Till & Float Reconciliation)*
   - `Approvals` *(Request Override or Review Pending Approvals)*
2. **Customers & Finance**
   - `Customers` *(Directory & Credit Balances)*
   - `Expenses` *(Shop Overheads & Ledger Spend)*
   - `Financial Reports` *(Revenue, Net Profit, VAT & Payment Split)*
   - `Margin Calculator` *(Buy/Sell Pricing & Unit Margin)* — gated to pricing/finance roles (`PRODUCT_UPDATE` or `REPORT_READ`)
3. **Workspace, Context & Device**
   - `Switch Role / Business Context` *(Active Entity, Branch, Warehouse, Terminal & Role)*
   - `Workspace & Role Guide` *(Re-open role, permissions & offline setup guide)*
   - `Settings & Data Export` *(Appearance, notifications, and authorized business profile/export)*

---

## 3. Core Daily Journey Maps & Usability Budgets

### Journey A — Cashier: Shift Open -> Fast Checkout -> Price Lookup -> Shift Close
1. **Context check (0 taps)**: Top context bar confirms `Entity · Branch · Till 01 · Cashier`. Home shows Shift Status (`CLOSED` or `OPEN`) and hides store-wide Profit/Margin KPIs.
2. **Open Shift (2 taps)**: Tap `Open / Close Shift` on Home (or `Shift` tab) -> confirm opening cash float -> Shift status becomes `OPEN`.
3. **Start Sale & Complete Checkout (3–4 taps)**: Tap `Start Sale` (or `Sell` tab) -> search/tap products -> tap `Checkout` -> confirm payment method / cash tender -> `Complete Sale` -> share/close Receipt.
4. **Price & Availability Check (1 tap)**: Tap `Lookup` tab -> enter SKU/name -> read selling price and available units (buying cost and profit margin remain hidden).
5. **Exception / Override (2 taps)**: Need a refund or discount above limit -> tap `Request Approval` -> submit reason and amount -> queued for Branch Manager/Owner.
6. **Close Shift (2 taps)**: Tap `Shift` tab -> enter counted cash -> inspect expected vs counted variance -> `Close Shift`.
- **Target budget**: Core sale completion <= 4 interactions; 0 unauthorized controls visible.

### Journey B — Warehouse Operator / Receiving Clerk: Task Check -> Goods Receipt (GRN) -> Cycle Count
1. **Context check (0 taps)**: Top context bar confirms `Entity · Branch · Main Warehouse · Warehouse Operator`. Home shows Open Tasks, Low-Stock Replenishment count, and Today's Receipts/Counts.
2. **Receive Goods (3 taps)**: Tap `Receive` tab (or `Receive Goods` quick action) -> pick/search product SKU -> enter supplier, delivery note reference, and received quantity -> `Record Goods Receipt`. Product stock increments in the active business and a traceable `GRN-*` record is logged.
3. **Cycle Stock Count (3 taps)**: Tap `Count` tab -> filter `Low Stock` or search SKU -> enter physical counted quantity and reason -> if `STOCK_ADJUST_CREATE` is granted (e.g., Inventory Controller), stock updates immediately; if Warehouse Operator lacks direct adjustment rights on a variance, 1 tap submits a **Stock Variance Approval Request** to the manager.
4. **Complete Task (1 tap)**: Tap `Tasks` tab -> mark replenishment/count task done.
- **Target budget**: Goods receipt or stock count <= 4 interactions; POS checkout and financial reports are completely unreachable.

### Journey C — Branch Manager / Owner: Exception Triage -> Approval Decision -> Multi-Branch Context Switch
1. **Dashboard Triage (0–1 tap)**: Home surfaces actionable alert cards (*Pending Approvals*, *Low-Stock Products*, *Shift Status*) scoped to the active branch.
2. **Decide Approval (2 taps)**: Tap pending approvals alert -> inspect requester, location, reason, and amount -> tap `Approve` or `Reject` (separation of duties blocks self-approval when another approver is required).
3. **Switch Branch / Business Context Safely (2 taps)**: Tap context header -> choose second branch/business membership in `ContextSwitcherSheet` -> if POS cart is non-empty, explicit confirmation dialog prevents cross-branch billing -> confirming clears transient state and refreshes navigation, KPIs, products, sales, tasks, and reports exclusively for the newly selected business.
- **Target budget**: Approval decision <= 3 interactions; 0 stale records across context switches.

---

## 4. Empty, Blocked & Permission-Changed States

| State | Trigger | UX Behavior |
|---|---|---|
| **Empty Role Home / No Tasks** | Fresh workspace or all daily tasks completed | Role-specific guidance card explaining the first recommended action (e.g., *"Open your till shift to start serving customers"* for Cashier, *"All assigned warehouse tasks are caught up"* for Warehouse Operator). |
| **Unauthorized Route / Deep Link** | Notification tap, intent extra, or stale back-stack route lacks required permission | Renders `AccessRestrictedScreen` naming the active role/location and offering **Return to Home** or **Switch Workspace Context** — never crashes or renders unauthorized data. |
| **Mid-Session Permission Narrowing** | Backend/admin removes a permission (e.g., `SALE_CREATE` or `REPORT_READ`) | `WorkspaceContextStore` updates `grantedPermissions`; primary tabs, quick actions, and in-screen action controls update immediately via `StateFlow`. |
| **Revoked / Suspended Membership** | Employee offboarded or membership suspended (`isRevoked = true`) | All operational tabs and mutations are blocked; `AccessRestrictedScreen` explains that access to this workspace has been revoked and allows switching to another valid membership if one exists. |
