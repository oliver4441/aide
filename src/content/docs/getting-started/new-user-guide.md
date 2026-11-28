## Day one on Aide

This page walks you through your first day: creating an account, setting up your
business and team, loading or importing your stock, ringing up a sale, and
trusting it all to work when the internet drops. Each step links to the detailed
page for that area.

Everything here takes minutes, not hours — the goal is a working till before
your next customer walks in.

### 1. Create your account

Open [the sign-in page](/login) and either **Continue with Google** or switch
to **Sign up** with your name, email, password and business name. Both paths
create three things at once: your user account, your first business, and your
membership of it as **OWNER**. Web sign-in and registration are protected by
Cloudflare Turnstile.

New businesses start with sensible Kenyan defaults (`KES`, `16%` VAT), which you
can change in the next step. The full details, including the API route behind
the form, are on [Set up your business](/docs/getting-started/setup).

### 2. Make it yours (and invite your team)

Open **Settings** from the sidebar. Three things are worth doing before trading:

- **Business profile** — your business name, type, currency, tax rate and the
  footer text printed at the bottom of every receipt.
- **Product categories** — add the groups you sell in, like *Drinks*, *Hair
  Products* or *Accessories*.
- **Team and access** — invite cashiers, managers, storekeepers or accountants
  and assign one of Aide's 12 role templates with scoped permissions.

Aide runs in a dark-first interface designed for long shifts at the till. If
you prefer light mode, the theme switch lives in the dashboard top bar next to
the notification bell and is saved per device.

### 3. Add or import your products

**Inventory → Add Product** lets you add items one by one: give the product a
name, a selling price and a cost, snap a photo if you have one, and pick its
category — Aide generates the SKU for you. Add a **low-stock threshold** on
anything you never want to run out of so Aide alerts you when stock dips below it.

Services you sell by the job (a haircut, a repair) can be added with stock
tracking off so they never decrement inventory. See
[Products and categories](/docs/guides/products) for the full walkthrough.

Already have a spreadsheet? Open **Data Import** (`/dashboard/import`) to bulk
import **products**, **customers**, or **historical sales** from CSV or Excel
with column mapping, dry-run validation, duplicate handling, and one-click undo.
See [Data import](/docs/guides/data-import).

### 4. Make your first sale

**New Sale** opens the point of sale. Tap or search items to build the cart,
attach a customer if needed, adjust quantities, then choose how they paid —
**Cash**, **M-Pesa** or **Card** — and complete the sale. Aide records which
method was used; it does not process card or mobile-money payments itself. Stock
updates automatically, the sale appears on your dashboard, and the receipt is
ready to print.

As your business grows, the sidebar also gives you dedicated workspaces for
**Shifts** (opening and closing cash drawers), **Customers**, **Invoices**,
**Refunds**, and **Suppliers**. See [Point of sale](/docs/guides/pos) for
search, till workflows and reprints.

### 5. Share the receipt

Every receipt carries a **QR code** the customer can scan to get their copy on
their phone and save it as a PDF. The share link is a signed capability token —
it works without signing in, but it cannot be guessed, so only that customer
sees their receipt. Margin, cost and internal notes are never included in the
shared copy.

Print it from your browser's print dialog — an 80 mm thermal slip or a full A4
page — or let the customer scan the QR code. Either way, the sale is already
recorded.

### 6. Trust it offline

On the web (PWA) and desktop apps, Aide is offline-first: every sale is written
to the device first and synced to the server afterwards. If the network drops
mid-sale, nothing is lost — keep selling, and everything syncs safely when you
reconnect.

Use the **Sync now** button to push pending changes immediately. The button
shows how many changes are queued, and it drives both data sync and notification
sync. See [How Aide stores your data](/docs/concepts/offline-first) for what
this means in practice.

> **Using the Android APK?** The native Android app is **local-only** (stored
> in an on-device Room database with role-based navigation and no cloud sync).
> Export your records regularly from the app before uninstalling or switching
> devices.

### 7. Stay notified

Tap the **bell** icon for your notification centre. Aide alerts you about new
sales, low stock, sync results and system updates — all inside the app, with no
browser permission prompt, and they work offline.

**Settings → In-app Notifications** controls what you get alerted about, with a
master switch and per-category toggles. On Android, scheduled alerts cover
low-stock checks and a daily summary at your chosen time. See
[Notifications](/docs/guides/notifications) for the details.

### 8. Install the app

Use the install banner (or your browser menu → **Add to Home Screen**) so Aide
opens full-screen like a native app and works offline. You can also download
native installers from [Get the app](/downloads), complete with SHA-256
checksums to verify every build:

- **Android** — native `.apk`
- **Desktop** — Windows (`.exe`), macOS (`.dmg`), and Linux (`.AppImage` / `.deb`)
- **Web (PWA)** — installable from any modern browser

### 9. Know your numbers and where your data lives

Two things to know from day one:

- **Your records are yours.** Every sale, product, customer, invoice and
  accounting record belongs to your business, and tenant isolation ensures no
  other account can read or change them.
- **Reports, financials and backups.** Check **Reports** for daily revenue,
  top products and payment breakdowns, and **Financials** for journal entries,
  accounting periods, fixed assets, year-end closing and the audit trail.
  **Sales History** exports everything as CSV or JSON — ready for your
  accountant — and **Settings → Export All Data** downloads a full copy of your
  local records.

---

## Where to go next

- [Set up your business](/docs/getting-started/setup) — the detailed version of steps 1 and 2
- [Data import](/docs/guides/data-import) — bulk import products, customers and sales from CSV or Excel
- [Make your first sale](/docs/getting-started/first-sale) — the detailed version of steps 4 and 5
- [Reports and analytics](/docs/guides/reports) — when you want to understand your numbers
- [Businesses, staff and permissions](/docs/concepts/businesses) — how multi-tenant isolation and roles work
- [Sync and conflict resolution](/docs/concepts/sync) — when two devices disagree
