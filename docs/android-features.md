# Aide for Android — what the APK actually does

This is the reference for the native client (`android/`). Everything below is
implemented in this repository; anything that is **not** here is listed under
[What the APK does not do](#what-the-apk-does-not-do) so the two lists cannot
drift apart.

The APK is a **local-only** build: Room is the only store, there is no account,
no server session and no sync. The web PWA is the cloud client; the two share a
design language, not a database.

---

## First run & Workspace Onboarding

A new install opens a **welcome screen** (`ui/screens/WelcomeScreen.kt`) followed by
**workspace onboarding** (`ui/screens/WorkspaceOnboardingScreen.kt`, 3 concise steps):
1. **Business & Operating Location** — Organization, business/branch, stockroom/warehouse, and POS terminal/till name.
2. **Role & Permissions** — Choose the assigned employee persona (`Owner / Admin`, `Branch Manager`, `Cashier`, `Warehouse Operator`, `Receiving Clerk`, `Inventory Controller`, or `Accountant`) with an explicit preview of allowed tabs and permissions.
3. **Device Assignment & Offline Rules** — Personal/owner device, shared branch phone, dedicated POS terminal, or warehouse handheld, plus clear disclosure that records live locally per business workspace until exported or synchronized.

Existing installs upgrading from earlier versions skip blocking onboarding automatically:
their existing `businessId` and `businessName` map to an `Owner / Admin` workspace with
no orphaned data and no forced re-learning (`data/local/WorkspaceContextStore.kt`).
*Skip to the app* on Welcome sets Owner defaults and goes straight in.

## Look and feel

- **Dark by default.** `ThemeMode.DARK` is the default and also the fallback for
  an unreadable saved value; light is the opt-in in Settings, and `SYSTEM` is
  there for anyone who wants the phone to decide.
- **The accent drives the containers.** `primaryContainer`,
  `secondaryContainer` and their `on*` pairs are mixed from the chosen accent
  over the surface (`ui/theme/Theme.kt`), so picking Plum, Teal or Amber re-tints
  the welcome mark, the badges, the selected rail pill and the dashboard's
  warning card.

## Role-Based Information Architecture & Navigation

Full persona journeys and permission matrices live in
[Android Role-Based IA](architecture/android-role-ia.md).

- **Persistent Operating Context Bar** (`ui/components/OperatingContextHeader.kt`) sits at
  the top of every operational screen showing the active `Branch · Org · Warehouse/Till`
  and role badge, plus the notification bell.
- **Permission-Driven Primary Navigation** (`domain/ia/RoleNavigationResolver.kt`,
  mirrored on the backend in `src/lib/mobileNavigation.mjs` and
  `GET /api/mobile/navigation-context`):
  - **Owner / Admin**: `Home · Sell · Stock · Workspace`
  - **Branch Manager**: `Home · Tasks · Sell · Workspace`
  - **Cashier**: `Home · Sell · Lookup · Shift`
  - **Warehouse Operator**: `Home · Receive · Count · Tasks`
  - **Receiving Clerk**: `Home · Receive · Lookup · Tasks`
  - **Inventory Controller**: `Home · Stock · Count · Workspace`
  - **Accountant**: `Home · Reports · Expenses · Workspace`
- **Adaptive Layout** — Compact phones (`< 600dp`) use a 4-destination bottom
  `NavigationBar`; tablets and landscape layouts (`>= 600dp`) use `AideNavRail`
  driven by the same resolved role destinations.
- **Role-Specific Compact Home (`HomeScreen`)** — Shows role-relevant KPIs,
  permission-filtered quick actions, tap-to-resolve operational alerts, and
  role-scoped recent activity. Sales/profit figures and 7-day revenue charts are
  never shown to roles without `SALE_READ` / `REPORT_READ`.
- **Grouped Workspace Hub (`WorkspaceScreen` in `MoreScreen.kt`)** — Replaces the
  flat catch-all More list with logical groups (*Store & Warehouse Operations*,
  *Customers & Finance*, *Workspace & Device*), rendering only permitted modules.
- **Multi-Membership Context Switcher (`ContextSwitcherSheet`)** — Supports users
  with multiple business/branch memberships and roles without leaking data across
  `businessId` partitions or silently switching context. Switching while a POS cart
  has items prompts explicit confirmation before clearing the cart.
- **Graceful Access Denial (`AccessRestrictedScreen`)** — Unauthorized routes or
  revoked/narrowed memberships fail closed immediately and strip unauthorized
  in-screen controls.

## Daily Task Workflows (`OperationsScreens.kt`, `OperationsViewModel`)

- **Scan / Search Product (`ProductLookupScreen`)** — Read-only price and shelf-stock
  lookup by name or SKU; hides unit buying cost unless permitted and offers one-tap
  *Sell* handoff for cashiers.
- **Receive Goods (`ReceiveGoodsScreen`)** — Records supplier deliveries as Goods
  Received Notes (`GRN-*`) scoped to the active branch/warehouse and increments
  local product stock.
- **Count Stock (`StockCountScreen`)** — Records physical shelf/bin counts (`CNT-*`),
  computes system variance, reconciles directly when the role holds
  `STOCK_ADJUST_CREATE`, or automatically submits a variance approval request for
  manager review.
- **Assigned Tasks (`TasksScreen`)** — Role-scoped daily checklist with priority
  badges and one-tap navigation into the target task screen.
- **Cashier Shifts (`ShiftsScreen`)** — Opens till shifts with starting float on the
  active terminal, tracks cash sales during the shift, and closes/reconciles
  counted drawer cash with variance calculation.
- **Approvals (`ApprovalsScreen`)** — Frontline staff submit price-override, refund,
  or stock-variance requests (`APPROVAL_REQUEST`); managers and owners review and
  approve/reject (`APPROVAL_DECIDE`) with separation-of-duties enforcement.

## Selling (`SellScreen`, `SellViewModel`)

- Search products by name or SKU; grid or list layout.
- Tap a product to add it; the same tap increments an existing line.
- Per-line quantity control and removal; stock is only decremented when the sale
  completes.
- Payment method: Cash, Mobile Money, Card — recorded on the sale, not processed
  by Aide.
- Cash tender with quick-cash chips for the exact total and the 100 / 500 / 1,000
  round-ups. Leaving the amount blank means exact payment; a short tender blocks
  completion and shows the minimum amount due. Card and Mobile Money are recorded
  as paid in full, without an unnecessary cash-tender field.
- Change due is shown only for a valid cash tender; the APK does not accept partial
  payments or leave a balance owed on a sale.
- VAT is extracted from the VAT-inclusive total (`vatOn`), so the receipt and the
  reports agree with the web client.
- A completed sale plays the till chime when **App sounds** is on, and opens its
  receipt.

## Stock (`StockScreen`, `StockViewModel`)

- Product list with search, an "All" / "Low stock" filter, and stock-level
  indicators with the low-stock threshold.
- Add products: name, SKU (or generated), buying price, selling price, opening
  quantity, low-stock threshold, and a service flag for items that never
  decrement stock.
- Margin preview per product.
- **Edit and delete UI**: Tapping any product opens the Edit Product sheet to adjust
  name, pricing, current stock, low-stock threshold, SKU, and image, with a confirmation
  dialog for deletion.

## Customers (`CustomersScreen`, `CustomerViewModel`)

- Directory with search, add (name, phone, email, notes) and delete.
- Balance shown per customer when non-zero.

## Expenses (`ExpensesScreen`, `ExpenseViewModel`)

- Record overheads by category (rent, utilities, transport, restocking, wages,
  cost of goods) with amounts and dates.
- Expenses feed net profit in Reports.

## Reports (`ReportsScreen`, `ReportViewModel`)

- Ranges: Today, Last 7 days, Last 30 days, All time.
- Revenue, profit, VAT, sale count, average sale, top products, and payment-method
  split; overheads subtracted for net profit.
- Chart components live in `ui/components/Charts.kt`.

## Calculator (`CalculatorScreen`)

- Buy price, sell price and quantity in; per-unit and total margin out. It does
  not write to inventory.

## Receipt (`ReceiptScreen`)

- Shows the sale: business name, items, quantities, totals, VAT line, payment method, change, and custom receipt footer.
- **Share Receipt**: Built-in Android share sheet (`Intent.ACTION_SEND`) to send an itemized text receipt via WhatsApp, SMS, or email. The APK does not include Bluetooth or physical printer drivers.

## Settings (`SettingsScreen`)

- **Business profile** — name, currency, VAT rate, receipt footer.
- **Appearance** — accent colour and Light / Dark / System theme.
- **Notifications** — master switch and per-channel switches for the two alerts
  the app actually raises (Inventory, Reports); summary time picker (see below).
- **Sounds** — on/off for the two chimes, with preview buttons.
- **Export data** — writes a JSON snapshot (products, sales with items, expenses,
  customers) to the app's external files directory and toasts the file name. It
  is a file on the device; there is no cloud backup.
- **About** — company link, version, manual update check.

---

## Notifications

Everything here is generated on the device from local data. There is no FCM, no
push service and no server involvement.

### What fires

| Alert | When | Channel | Chime |
|---|---|---|---|
| Low stock | `LowStockWorker`, every 6 hours (battery-not-low), at most one alert per day | Inventory | warning chime |
| Daily summary | `DailySummaryWorker`, once a day at the configured time | Reports | till chime |
| "No sales recorded today" | Same worker, on a day with no sales | Reports | till chime |

Each alert has an idempotency key (`low_stock_<yyyymmdd>`,
`daily_summary_<yyyymmdd>`, `daily_zero_<yyyymmdd>`), inserted into
`notified_events` first, so a repeated worker run cannot show the same event
twice. The log is pruned to 90 days.

### Schedule

The daily summary defaults to **18:00 local time** and can be moved to any time
in Settings → Notifications → *Daily summary time* (a real time picker, 24-hour).
Changing it re-enqueues the unique periodic work immediately, so the next run is
at the new time rather than tomorrow's old one. WorkManager is best-effort: Doze
and battery optimisation can delay the run, so the summary is "around" the chosen
time, not to the second.

### Sounds

- `res/raw/till_chime.wav` — bright two-note bell: completed sale, daily summary.
- `res/raw/warning_chime.wav` — descending pair: low stock.
- Android freezes a channel's sound at creation, so the channels exist in two
  variants (`aide_inventory` / `aide_inventory_silent`, likewise for reports) and
  `AideNotifications.ensureChannels` keeps exactly the variant that matches the
  setting. Turning **App sounds** off moves posting to the silent variants.
- Below Android 8 the sound is set per notification instead, since there are no
  channels.

### Expandable cards

Low-stock and summary notifications carry `detailLines`, which the app posts as a
`NotificationCompat.InboxStyle`: the shade shows one line per product with its
remaining units (six lines, then "+N more"), and the summary shows revenue,
profit, average sale and the payment-method split — rather than a single
truncated sentence.

### Activity history

The bell opens the activity sheet (`NotificationCenterSheet`): the last 100
events newest-first, each with channel, title, message and relative time, a red
dot while unread, a per-row ✓ to mark read, and **Mark all read**. Opening a row
marks it read and deep-links to Stock, Home or Sell. Data comes from
`NotifiedEventDao.recent()` / `unreadCount()`, so the badge updates as workers
post.

---

## Data and updates

- **Storage** — Room (`aide_database`), single local `businessId` created on
  first launch. Uninstalling deletes everything; Settings says so and offers the
  JSON export.
- **Database health** — if the database cannot be opened, the app shows the
  recovery screen instead of crashing in a loop (`DatabaseHealth`). An unknown
  migration or downgrade never automatically wipes local business records.
- **Updates** — `UpdateManager` checks stable Android **GitHub Releases** in the
  background on launch/resume, throttled to once every six hours (manual Settings
  checks bypass this). A native Material 3 dialog shows version/date/size and
  release notes, Update now/Later, download progress/retry, checksum and signer
  verification, permission guidance and Android-controlled installation. Mandatory
  updates offer Update/Close app, never silent installation. WorkManager persists
  downloads across navigation/restarts; installed version is refreshed on return.
  Update metadata and user-approved APK downloads are the only network traffic;
  no business data is sent. See [Android updates](android-updates.md).
- **WorkManager** — two unique periodic reminder jobs plus user-requested one-off APK downloads; reminder jobs both are re-enqueued on launch and
  whenever the notification settings change.

---

## What the APK does not do

Stated explicitly so the docs, the UI copy and the app agree:

- **Offline-first local workspace storage**: operational records (products, sales,
  shifts, GRNs, cycle counts, tasks, approvals, customers, expenses) are stored in
  Room and local workspace preferences partitioned by `businessId`. Background
  bidirectional cloud sync is not yet wired in the standalone APK (tracked under
  the sync engine milestone); meanwhile `GET /api/mobile/navigation-context`
  defines the authoritative server role/permission contract.
- No camera barcode decoding yet (SKU/text search and hardware keyboard-wedge
  scanners work in Lookup, Sell, Receive Goods, and Count Stock).
- No split or partial payments on POS checkout — one payment method per sale;
  price overrides route through manager approval requests.
- No direct Bluetooth or ESC/POS thermal-printer integration (receipt sharing via
  Android text share sheet is supported).
- No remote push notifications: alerts are local (`LowStockWorker` and
  `DailySummaryWorker`), respect the active role's permissions (for example,
  daily financial summaries never expose profit when the active role lacks
  `REPORT_READ`), and only arrive while the app is installed and notifications
  are permitted.
- No cloud backup: the JSON export is a file on the phone and nothing uploads it.

## Where it lives

| Concern | File |
|---|---|
| Role IA models & resolver | `domain/ia/RoleIaModels.kt`, `domain/ia/RoleNavigationResolver.kt`, `src/lib/mobileNavigation.mjs` |
| Multi-membership & operations stores | `data/local/WorkspaceContextStore.kt`, `data/local/OperationsStore.kt` |
| Operating context bar & switcher | `ui/components/OperatingContextHeader.kt`, `ui/screens/WorkspaceOnboardingScreen.kt` |
| Daily task screens | `ui/screens/OperationsScreens.kt`, `ui/screens/HomeScreen.kt`, `ui/screens/MoreScreen.kt` |
| Navigation rail, bell | `ui/components/AideNavRail.kt`, `ui/components/NotificationCenter.kt` |
| Notification posting, channels, styles | `notifications/AideNotifications.kt` |
| Dedupe + log | `notifications/NotificationEngine.kt` |
| Chimes | `notifications/AideSounds.kt`, `res/raw/*.wav` |
| Background jobs | `work/AideWorkScheduler.kt`, `work/LowStockWorker.kt`, `work/DailySummaryWorker.kt` |
| Settings + schedule | `data/local/SettingsStore.kt`, `ui/screens/SettingsScreen.kt` |
| Context-reactive ViewModels | `ui/viewmodel/{Home,Sell,Stock,Customer,Expense,Report,Operations}ViewModel.kt` |
