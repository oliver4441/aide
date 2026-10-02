## Day one on Aide

This page walks you through your first day: creating an account, making the app
yours, loading your stock, ringing up a sale, and trusting it all to work when
the internet drops. Each step links to the detailed page for that area.

Everything here takes minutes, not hours — the goal is a working till before
your next customer walks in.

### 1. Create your account

Open [the sign-in page](/login) and switch to **Sign up**. Registration asks for
your name, an email, a password and your business name — and creates three
things at once: your user account, your first business, and your membership of
it as **OWNER**.

New businesses start with sensible Kenyan defaults (KSh, 16% VAT), which you can
change in the next step. The full details, including the API route behind the
form, are on [Set up your business](/docs/getting-started/setup).

### 2. Make it yours

Open **Settings** from the sidebar. Three things worth doing before trading:

- **Business profile** — your business name, type, currency, tax rate and the
  footer text printed at the bottom of every receipt.
- **Appearance** — pick **Light** or **Dark** mode and an accent colour (Plum,
  Ocean, Forest, Sunrise or Graphite). Your choice is saved on the device and
  applied across the app, including the notification bell, buttons and the
  browser's own toolbar tint.
- **Product categories** — add the groups you sell in, like *Drinks*, *Hair
  Products* or *Accessories*.

### 3. Add your products

**Inventory → Add Product**. Give the product a name, a selling price and a
cost, snap a photo if you have one, and pick its category — Aide generates the
SKU for you. Add a **low-stock threshold** on anything you never want to run
out of: Aide will alert you when stock dips below it.

Services you sell by the job (a haircut, a repair) can be added with stock
tracking off so they never decrement inventory. See
[Products and categories](/docs/guides/products) for the full walkthrough.

### 4. Make your first sale

**New Sale** opens the point of sale. Tap items to build the cart, apply a
discount if the customer haggles, then choose how they paid — **Cash**, **M-Pesa**
or **Card** — and complete the sale. Stock updates automatically, the sale
appears on your dashboard, and the receipt is ready to print.

The payment methods are not fixed to three — split payments are supported. See
[Point of sale](/docs/guides/pos) for search, discounts and reprints.

### 5. Share the receipt

Every receipt carries a **QR code** the customer can scan to get their copy on
their phone and save it as a PDF. The share link is a signed capability token —
it works without signing in, but it cannot be guessed, so only that customer
sees their receipt. Margin, cost and notes are never included in the shared
copy.

Print it on a Bluetooth or thermal printer, or let the customer scan. Either
way, the sale is already recorded.

### 6. Trust it offline

Aide is offline-first: every sale is written to the device first and synced to
the server afterwards. If the network drops mid-sale, nothing is lost — keep
selling, and everything syncs safely when you reconnect.

Use the **Sync now** button to push pending changes immediately. The button
shows how many changes are queued, and it drives both data sync and notification
sync. See [How Aide stores your data](/docs/concepts/offline-first) for what
this means in practice.

### 7. Stay notified

Tap the **bell** icon for your notification centre. Aide alerts you about new
sales, low stock, sync results and system updates — all inside the app, with no
browser permission prompt, and they work offline.

**Settings → In-app Notifications** controls what you get alerted about, with a
master switch and per-category toggles. See
[Notifications](/docs/guides/notifications) for the details.

### 8. Install the app

Use the install banner (or your browser menu → **Add to Home Screen**) so Aide
opens full-screen like a native app and works offline. Android users can install
the native APK for real system notifications, and Windows users get a desktop
installer — both from [Get the app](/downloads), with SHA-256 checksums to verify
the download.

### 9. Know where your data lives

Two things to know from day one:

- **Your records are yours.** Every sale, product and category belongs to your
  business, and no other account can read or change them.
- **Backups are your responsibility.** The cloud copy is for sync, not archive.
  **Sales History** exports everything as CSV or JSON — perfect for your
  accountant — and **Settings → Export All Data** downloads a full copy of your
  local records. Do it regularly; the Android app deletes its local data on
  uninstall.

---

## Where to go next

- [Set up your business](/docs/getting-started/setup) — the detailed version of step 1 and 2
- [Make your first sale](/docs/getting-started/first-sale) — the detailed version of step 4 and 5
- [Reports and analytics](/docs/guides/reports) — when you want to understand your numbers
- [Sync and conflict resolution](/docs/concepts/sync) — when two devices disagree
