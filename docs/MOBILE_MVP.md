# Aide Android MVP — Product, UX and Release Plan

## 1. Current baseline

Aide is a multi-business management platform for small shops and businesses. The current web stack is Next.js, Neon/PostgreSQL, NextAuth.js, Tailwind CSS, with offline/PWA support. The repository already contains Capacitor Android configuration using `com.omixsystems.aide` and the production web app at `https://aide.omixsystems.store`.

The Android MVP should be a thin, reliable Capacitor shell around the existing product first. Do not create a second business-logic implementation for Android. Shared web UI/business logic remains the source of truth until there is a proven reason to move a feature native.

## 2. MVP user journey

```text
Launch
  |
  v
Splash / Aide logo
  |
  v
Sign in / Create account
  |
  v
Business selector (if >1 business)
  |
  v
Dashboard
  +--> Sell
  |     +--> Cart --> Payment --> Receipt
  |     +--> Quick product search / barcode-ready input
  |
  +--> Inventory
  |     +--> Products --> Product detail --> Stock adjustment
  |
  +--> Sales
  |     +--> Today / history --> Receipt
  |
  +--> Reports
  |     +--> Revenue / profit / stock summary
  |
  +--> More
        +--> Businesses
        +--> Settings
        +--> Offline queue / sync status
        +--> Help
```

## 3. Mobile wireframe

### Dashboard

```text
+--------------------------------+
| Aide                 [sync] [..]|
| Good morning                    |
| Main Shop                 [v]  |
+--------------------------------+
| TODAY                           |
| KSh 18,450        23 sales     |
| Profit KSh 5,820  Stock 142     |
+--------------------------------+
| [  SELL  ]   [ INVENTORY ]     |
|                                |
| [  SALES ]   [  REPORTS   ]    |
+--------------------------------+
| Recent sales                   |
| #1042  2 items       KSh 850   |
| #1041  5 items       KSh 2,300 |
| #1040  1 item        KSh 250   |
+--------------------------------+
| Home  Sell  Stock  Reports More|
+--------------------------------+
```

### POS / Sell

```text
+--------------------------------+
| <- Sell              [barcode] |
| [ Search products...........]   |
+--------------------------------+
| [All] [Drinks] [Food] [Other]  |
|                                |
| Milk 500ml             +  120  |
| Bread                  +  80   |
| Sugar 1kg              + 160   |
+--------------------------------+
| Cart (3)                       |
| Milk x2                 240    |
| Bread x1                 80    |
| Sugar x1                160    |
| Total                   480    |
|                                |
|          [ CHECKOUT ]          |
+--------------------------------+
```

### Checkout

```text
+--------------------------------+
| <- Checkout                    |
+--------------------------------+
| Total                         |
| KSh 480                       |
+--------------------------------+
| Payment method                |
| [Cash] [M-Pesa] [Other]      |
+--------------------------------+
| Customer (optional)           |
| [ Search / add customer ]     |
+--------------------------------+
|        [ COMPLETE SALE ]      |
+--------------------------------+
```

### Inventory

```text
+--------------------------------+
| Inventory            [+ Add]   |
| [ Search products...........]   |
| 142 products  | Low stock 7    |
+--------------------------------+
| Milk 500ml                     |
| Stock 24       KSh 120         |
|                         >      |
| Bread                           |
| Stock 8        KSh 80          |
|                         >      |
| Sugar 1kg                      |
| Stock 31       KSh 160         |
|                         >      |
+--------------------------------+
| Home  Sell  Stock  Reports More|
+--------------------------------+
```

### Offline / sync state

```text
Normal:     [cloud-check] Synced
Offline:    [cloud-off] Offline — changes saved locally
Pending:    [sync] 3 changes waiting to sync
Conflict:   [!] Review 1 change
```

Offline status must be visible but non-blocking. Sales should remain usable offline when the local data required for the sale is already available. Synchronization should be explicit and recoverable rather than silently discarding changes.

## 4. UX rules

- Mobile-first, one-handed operation, large touch targets and short forms.
- The primary action should be obvious on every screen.
- POS should require as few taps as possible.
- Avoid desktop-style tables on the phone; use cards/rows with progressive detail.
- Keep navigation to four primary destinations plus More: Home, Sell, Stock, Reports, More.
- Use consistent status language: Synced, Offline, Pending, Conflict, Error.
- Never make connectivity look like a payment failure. Separate network state from transaction state.
- Receipts must be viewable after a successful sale even when the network disappears.
- Destructive actions require confirmation; stock adjustments should show before/after quantities.
- Loading states should use skeletons or local cached data instead of blank screens.
- Accessibility: readable contrast, scalable text, semantic controls, and touch targets of at least roughly 44dp.

## 5. Visual direction

Use a clean, professional retail-management interface rather than a generic admin dashboard. Prefer a light base with restrained dark text and a single Aide accent, rounded cards, subtle borders, compact data summaries, and strong numeric hierarchy. The interface should feel fast and practical on low-end Android devices.

Animations should be short and functional. Avoid heavy blur, large background images, continuous animations, or effects that consume CPU/GPU.

## 6. Android architecture

```text
                 Aide Web App
              Next.js + Tailwind
                       |
                 Capacitor bridge
                       |
              +--------+--------+
              |                 |
        Android WebView     Native plugins
              |                 |
              +--------+--------+
                       |
              Android APK / AAB
```

The web application remains the product source of truth. Capacitor provides the Android container and native capabilities such as status bar, splash screen, filesystem, share/printing integrations where justified, and future barcode/native capabilities.

Do not add native dependencies merely because they exist. Every plugin increases build and maintenance surface.

## 7. Repository and branch model

```text
master
  |
  +-- feat/<feature>
  +-- fix/<bug>
  +-- chore/<maintenance>
  +-- release/<version>       (only when a coordinated release needs it)
```

Rules:

1. Never develop directly on `master`.
2. Every change enters through a pull request.
3. PR CI must pass before merge.
4. Merge only after review and green CI.
5. Android release artifacts are produced only from version tags such as `v0.1.0`.
6. Never commit keystores, passwords, signing keys, `.env` files, or production credentials.
7. Keep `versionName` aligned with the Git tag and increment `versionCode` for every Play-distributed APK/AAB release.

## 8. CI workflow

Every push/PR should run:

```text
Checkout
  -> Node setup
  -> npm ci
  -> lint
  -> Next build
  -> Capacitor sync
  -> Android unit tests
  -> assembleDebug
  -> upload debug APK artifact
```

The debug APK is a test artifact only. It is not the production release.

## 9. Release workflow

A release is created by pushing a semantic-version tag:

```bash
git tag -a v0.1.0 -m "Aide 0.1.0"
git push origin v0.1.0
```

GitHub Actions then:

```text
tag v0.1.0
   |
   v
verify source + dependencies
   |
   v
run tests
   |
   v
Capacitor sync
   |
   v
restore encrypted Android keystore from GitHub secret
   |
   v
Gradle assembleRelease
   |
   +--> APK signed with release key
   |
   +--> SHA-256 checksum
   |
   +--> GitHub Release + APK artifact
```

For Google Play, prefer an AAB for the store and keep a signed APK for direct testing/distribution. The signing key must be backed up offline and the release key must never be regenerated casually.

## 10. Required GitHub Actions secrets

Configure these repository secrets before the first production release:

- `ANDROID_KEYSTORE_BASE64` — base64-encoded release keystore.
- `ANDROID_STORE_PASSWORD` — keystore password.
- `ANDROID_KEY_ALIAS` — release key alias.
- `ANDROID_KEY_PASSWORD` — key password.

The workflow writes the keystore to a temporary runner path and deletes it after the build. No signing secret belongs in Git.

## 11. Test levels

PR gate:

- TypeScript/build validation through the existing Next build.
- Android unit tests.
- Debug APK compilation.

Pre-release:

- Install the APK on at least one physical Android device.
- Test sign-in, business selection, product search, sale, receipt, inventory adjustment, logout.
- Toggle airplane mode and verify offline/cached behavior.
- Reconnect and verify queued changes synchronize.
- Verify back navigation, keyboard behavior, rotation policy, status bar, splash screen and external links.

Release gate:

- All PR checks green.
- Version/tag correct.
- Signed artifact generated.
- SHA-256 checksum generated.
- Release notes describe user-visible changes and known limitations.

## 12. Definition of MVP complete

The Android MVP is complete when a small-shop user can install Aide, authenticate, select a business, inspect inventory, complete a sale, see a receipt, review sales, and continue core work during temporary network loss without data loss. The APK must be reproducibly buildable from GitHub Actions and production releases must be signed from protected GitHub secrets.
