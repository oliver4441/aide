# Aide for Android — what the APK actually does

This is the reference for the native client (`android/`). Everything below is
implemented in this repository; anything that is **not** here is listed under
[What the APK does not do](#what-the-apk-does-not-do) so the two lists cannot
drift apart.

The APK is a **local-only** build: Room is the only store, there is no account,
no server session and no sync. The web PWA is the cloud client; the two share a
design language, not a database.

---

## First run

A new install opens a **welcome screen** (`ui/screens/WelcomeScreen.kt`): the brand
mark, one line on what the app is, and four points it can actually keep — sales,
low-stock alerts, the closing-time summary, and "no account, no signal, export a
copy from Settings". *Get started* moves on to the theme picker; *Skip to the app*
sets the default theme and goes straight in.

Seen-ness is remembered separately from setup completion (`welcome_seen` in
`aide_business`), so closing the app on the theme picker returns to the picker
rather than replaying the introduction.

## Navigation

- **Collapsible left rail** (`ui/components/AideNavRail.kt`) is the primary
  navigation: brand mark at the top, four destinations (Home, Sell, Stock, More),
  `76dp` icons-only or `208dp` with labels, and a chevron to switch between the
  two. Collapsed by default on phones, expanded from `600dp` up; the choice
  survives rotation.
- **Notification bell** in the top bar, with a red unread badge fed by
  `notified_events.read` (`ui/components/NotificationCenter.kt`).
- Sub-screens (Customers, Expenses, Reports, Settings, Calculator, Receipt) are
  pushed from More or from a sale, and use the system back gesture.

## Selling (`SellScreen`, `SellViewModel`)

- Search products by name or SKU; grid or list layout.
- Tap a product to add it; the same tap increments an existing line.
- Per-line quantity control and removal; stock is only decremented when the sale
  completes.
- Payment method: Cash, Mobile Money, Card — recorded on the sale, not processed
  by Aide.
- Amount received with change/balance calculation, plus quick-cash chips for the
  exact total and the 100 / 500 / 1,000 round-ups.
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
  recovery screen instead of crashing in a loop (`DatabaseHealth`).
- **Update check** — `UpdateChecker` asks
  `https://aide.omixsystems.store/api/latest-release` for the published version
  code and shows a banner when a newer APK exists. This is the only network call
  the app makes; an offline device simply does not see the banner.
- **WorkManager** — two unique periodic jobs; both are re-enqueued on launch and
  whenever the notification settings change.

---

## What the APK does not do

Stated explicitly so the docs, the UI copy and the app agree:

- No cloud sync, no multi-device, no account or sign-in.
- No multi-business switching — one business per install.
- No staff accounts, roles or permissions.
- No barcode scanning (search only) and no camera-based product capture.
- No discounts, no split or partial payments — one payment method per sale.
- No direct Bluetooth or ESC/POS thermal-printer integration (receipt sharing via Android text share sheet is supported).
- No remote push notifications: alerts are local and only arrive while the app is
  installed and notifications are permitted.
- No customer statement or ledger beyond the stored balance.
- No cloud backup: the JSON export is a file on the phone and nothing uploads it.

## Where it lives

| Concern | File |
|---|---|
| Navigation rail, bell | `ui/components/AideNavRail.kt`, `ui/components/NotificationCenter.kt` |
| Notification posting, channels, styles | `notifications/AideNotifications.kt` |
| Dedupe + log | `notifications/NotificationEngine.kt` |
| Chimes | `notifications/AideSounds.kt`, `res/raw/*.wav` |
| Background jobs | `work/AideWorkScheduler.kt`, `work/LowStockWorker.kt`, `work/DailySummaryWorker.kt` |
| Settings + schedule | `data/local/SettingsStore.kt`, `ui/screens/SettingsScreen.kt` |
| Home figures | `ui/viewmodel/HomeViewModel.kt`, `ui/viewmodel/SaleTimeline.kt` |
