# Aide Android MVP — Product, UX and Native Android Release Plan

## 1. Product direction

Aide will have two first-class clients:

```text
                    AIDE PLATFORM
                         |
              +----------+----------+
              |                     |
          Web / PWA             Android App
              |                     |
          Next.js              Kotlin + Compose
              |                     |
              +----------+----------+
                         |
                    Aide API
                         |
                       Neon
```

The Android application is **not a Capacitor wrapper** and must not depend on a WebView for its primary UI. It is a native Kotlin application with its own UI, navigation, local database, background work, notifications and Android-specific features.

The PWA and Android app share the backend, authentication model, business rules and API contracts, while each client can have its own presentation and platform-specific capabilities.

The Android client may expose pages and workflows that the PWA does not need to expose. Examples include a native notification centre, notification-driven deep links, Android-specific sync controls, device settings, barcode workflows, and other mobile-first functionality.

## 2. Current web baseline

Aide is a multi-business management platform for small shops and businesses. The current web stack is Next.js, Neon/PostgreSQL, NextAuth.js, Tailwind CSS, with offline/PWA support.

The repository currently contains a Capacitor Android implementation. That implementation is now considered transitional and should **not** become the long-term Android architecture. The native Kotlin implementation described in this document replaces the Capacitor approach.

Do not merge the existing Capacitor Android delivery branch into `master` merely to ship a wrapper. The goal is a maintainable native Android client.

## 3. Native Android MVP stack

Use a conventional, maintainable Android stack:

- Kotlin.
- Jetpack Compose for the native UI.
- Material 3 for the component foundation.
- Navigation Compose for screen navigation.
- ViewModel + StateFlow for UI state.
- Kotlin Coroutines for asynchronous work.
- Room for the local/offline database.
- WorkManager for reliable background synchronization.
- Firebase Cloud Messaging (FCM) for push notifications where appropriate.
- Android notification channels and deep links for notification-driven navigation.
- Retrofit/OkHttp or an equivalent typed HTTP client for the Aide API.
- Android Keystore / encrypted storage for sensitive local credentials or tokens.

Keep dependencies deliberately small. Aide targets ordinary and potentially low-end Android hardware, so avoid unnecessary animation, background processing and heavyweight libraries.

## 4. Backend boundary

The Android app must **never connect directly to Neon/PostgreSQL**.

```text
Android Kotlin App
       |
       | HTTPS + authenticated API
       v
   Aide API
       |
       +--> Authentication / RBAC
       +--> Business logic
       +--> Validation
       +--> Notifications/events
       +--> Audit rules
       |
       v
     Neon
```

The same API boundary should serve the PWA and Android application. This prevents database credentials from reaching clients and keeps business rules centralized.

The API contract should be documented and versioned. Breaking API changes require coordination between the web and Android clients.

## 5. Android user journey

```text
Launch
  |
  v
Native Splash
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
  |     +--> Product search / barcode workflow
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
  +--> Customers
  |
  +--> Suppliers
  |
  +--> Expenses
  |
  +--> Notifications
  |
  +--> Sync Centre / Offline Queue
  |
  +--> More
        +--> Businesses
        +--> Settings
        +--> Help
```

The native app is allowed to grow beyond the PWA where Android capabilities provide real value.

## 6. Mobile wireframes

### Dashboard

```text
+--------------------------------+
| Aide             [bell] [sync]|
| Good morning                   |
| Main Shop                [v]  |
+--------------------------------+
| TODAY                          |
| KSh 18,450       23 sales     |
| Profit KSh 5,820 Stock 142    |
+--------------------------------+
| [      SELL      ]             |
| [    INVENTORY    ]            |
| [     SALES      ]             |
| [     REPORTS    ]             |
+--------------------------------+
| Recent sales                   |
| #1042  2 items      KSh 850   |
| #1041  5 items      KSh 2,300 |
| #1040  1 item       KSh 250   |
+--------------------------------+
| Home Sell Stock Reports More  |
+--------------------------------+
```

### POS / Sell

```text
+--------------------------------+
| <- Sell              [barcode]|
| [ Search products...........]  |
+--------------------------------+
| [All] [Drinks] [Food] [Other] |
|                               |
| Milk 500ml             +  120 |
| Bread                  +   80 |
| Sugar 1kg              +  160 |
+--------------------------------+
| Cart (3)                      |
| Milk x2                 240   |
| Bread x1                 80   |
| Sugar x1                160   |
| Total                   480   |
|                               |
|          [ CHECKOUT ]         |
+--------------------------------+
```

### Checkout

```text
+--------------------------------+
| <- Checkout                   |
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
| Inventory             [+ Add] |
| [ Search products...........]  |
| 142 products | Low stock 7   |
+--------------------------------+
| Milk 500ml                    |
| Stock 24       KSh 120        |
|                         >     |
| Bread                         |
| Stock 8        KSh 80         |
|                         >     |
| Sugar 1kg                     |
| Stock 31       KSh 160        |
|                         >     |
+--------------------------------+
| Home Sell Stock Reports More |
+--------------------------------+
```

### Native notification centre

```text
+--------------------------------+
| <- Notifications       [read] |
+--------------------------------+
| TODAY                          |
| [!] Low stock                 |
| Milk 500ml is below threshold |
| 10 minutes ago                |
+--------------------------------+
| [$] Sale completed            |
| KSh 2,450 • Main Shop         |
| 35 minutes ago                |
+--------------------------------+
| [sync] Sync completed         |
| 4 offline changes uploaded    |
| 1 hour ago                    |
+--------------------------------+
```

Notifications should deep-link to the relevant native screen. For example, tapping a low-stock notification opens the affected product rather than merely opening the app home screen.

### Offline / sync state

```text
Synced:     [cloud-check] Synced
Offline:    [cloud-off] Offline — changes saved locally
Pending:    [sync] 3 changes waiting to sync
Conflict:   [!] Review 1 change
Error:      [x] Sync failed — Retry
```

Offline status must be visible but non-blocking. Sales should remain usable offline when the local data required for the sale is available. The application must queue local mutations and synchronize them safely when connectivity returns.

## 7. Native offline architecture

```text
                 Compose UI
                     |
                  ViewModel
                     |
                Repository
                /         \
          Room DB       Aide API
             |              |
       local changes       server
             |              |
             +------+-------+
                    |
               Sync Engine
                    |
               WorkManager
```

Room is the local source for screens that need offline access. The API is the server source of truth. The sync layer is responsible for upload/download ordering, retries, idempotency and conflict handling.

A sale created offline must receive a client-generated operation/transaction identifier so retries do not accidentally create duplicate sales.

The exact conflict strategy must be defined per entity. Do not use a blanket last-write-wins rule for financial transactions without evaluating its consequences.

## 8. Notifications and Android capabilities

Native Android allows Aide to support capabilities that the PWA does not need to own.

Initial candidates:

- Push notifications for important business events.
- Native notification channels for different alert types.
- Deep links from notifications to sales, inventory, reports or other relevant screens.
- Persistent low-stock and sync alerts where justified.
- Barcode scanning through a native Android implementation.
- Share/print integrations where there is a clear business use case.
- Background synchronization through WorkManager.
- Android-specific app settings and permission management.
- Future device integrations without changing the web application architecture.

Do not add a native capability simply because Android supports it. Each feature should have a business purpose and a clear permission/privacy model.

## 9. UX rules

- Mobile-first and one-handed.
- Large touch targets; roughly 44dp or larger where practical.
- Primary action obvious on every screen.
- POS should require as few taps as possible.
- Avoid desktop-style data tables on the phone.
- Use cards, rows and progressive detail.
- Keep bottom navigation focused: Home, Sell, Stock, Reports, More.
- Notifications should be actionable and deep-link to the relevant screen.
- Network state must never be confused with payment or transaction failure.
- Receipts must remain available after a successful local/offline sale.
- Destructive actions require confirmation.
- Stock adjustments show before/after quantities.
- Cached/local data should render immediately when available.
- Sync errors must be recoverable and explain what happened.
- Accessibility: readable contrast, scalable text, semantic controls and appropriate touch targets.

## 10. Visual direction

Use a clean, professional retail-management interface rather than a generic admin dashboard. Prefer a light base with restrained dark text and a single Aide accent, rounded cards, subtle borders, compact data summaries and strong numeric hierarchy.

The Android application should feel native rather than like a website placed inside an app. Use Android conventions for navigation, sheets, dialogs, keyboard handling, back navigation and system UI.

Keep animation short and functional. Avoid heavy blur, large background images, continuous animation and effects that consume CPU/GPU.

## 11. Repository structure

The long-term repository should separate the web and native clients clearly:

```text
aide/
|
+-- web/                         # Next.js PWA/client
|
+-- android/                     # Native Kotlin Android client
|   +-- app/
|   +-- build.gradle.kts
|   +-- settings.gradle.kts
|   +-- gradle/
|
+-- shared/                      # API contracts/docs/shared schemas as appropriate
|
+-- docs/
|   +-- MOBILE_MVP.md
|   +-- ANDROID_ARCHITECTURE.md
|   +-- API_CONTRACT.md
|   +-- RELEASE.md
|
+-- .github/
    +-- workflows/
        +-- web-ci.yml
        +-- android-ci.yml
        +-- android-release.yml
```

The exact move of the existing Next.js files into `web/` should be treated as a separate migration and should only happen after CI/build paths are updated and verified. Do not restructure the repository and rewrite application code in the same risky change.

## 12. Git and branch model

```text
master
  |
  +-- feat/web-<feature>
  +-- feat/android-<feature>
  +-- fix/<bug>
  +-- chore/<maintenance>
  +-- release/<version>
```

Rules:

1. Never develop directly on `master`.
2. Every change enters through a pull request.
3. PR CI must pass before merge.
4. Merge only after review and green CI.
5. Android release artifacts are produced only from semantic version tags such as `v0.1.0`.
6. Never commit keystores, passwords, signing keys, `.env` files or production credentials.
7. Keep Android `versionName` aligned with the Git tag.
8. Increment Android `versionCode` for every Play-distributed release.
9. Keep web and Android feature branches independently mergeable where possible.
10. A native Android change must not unnecessarily modify the PWA.

## 13. CI workflow

The Android pipeline no longer runs Capacitor synchronization.

```text
Pull Request
   |
   +--> Web lint/build/tests
   |
   +--> Kotlin compile
   |
   +--> Android lint
   |
   +--> Unit tests
   |
   +--> Instrumentation tests where configured
   |
   +--> Assemble debug APK
   |
   +--> Upload debug APK artifact
```

The debug APK is a test artifact only. It is not a production release.

Android CI should use a pinned Java/Android toolchain and Gradle wrapper committed to the repository. Builds must be reproducible from a clean GitHub Actions runner.

## 14. Release workflow

A production release starts with a reviewed semantic version tag:

```bash
git tag -a v0.1.0 -m "Aide 0.1.0"
git push origin v0.1.0
```

GitHub Actions then:

```text
tag v0.1.0
   |
   v
checkout exact tag
   |
   v
run web + Android validation
   |
   v
run Android tests
   |
   v
restore encrypted signing material
   |
   v
Gradle assembleRelease
   |
   +--> signed APK
   |
   +--> signed AAB
   |
   +--> SHA-256 checksums
   |
   +--> GitHub Release
```

For Google Play distribution, the preferred store artifact is an AAB. A signed APK should also be produced when direct installation, QA or controlled distribution requires it.

Use Google Play App Signing for Play distribution where appropriate. Keep the upload/signing credentials protected and backed up securely outside the repository.

## 15. Android signing secrets

Configure protected GitHub Actions secrets before the first production release. The exact secret names should be documented in `docs/RELEASE.md` and must not contain actual values in Git.

Recommended values include:

- `ANDROID_KEYSTORE_BASE64` — encoded signing keystore.
- `ANDROID_STORE_PASSWORD` — keystore password.
- `ANDROID_KEY_ALIAS` — signing key alias.
- `ANDROID_KEY_PASSWORD` — key password.

The workflow should restore the keystore only into the temporary runner filesystem, use it for the release build, and delete it in an always-run cleanup step.

## 16. Test levels

PR gate:

- Web lint/build validation.
- Kotlin compilation.
- Android lint.
- Android unit tests.
- Debug APK compilation.

Pre-release device testing:

- Install APK on at least one physical Android device.
- Test sign-in and account recovery.
- Test business selection.
- Test dashboard.
- Test product search and barcode flow when implemented.
- Complete cash and M-Pesa sale flows where supported.
- Verify receipt creation and viewing.
- Test inventory adjustments.
- Test notifications and notification deep links.
- Toggle airplane mode and perform an offline sale.
- Kill/restart the app while offline and verify local data survives.
- Reconnect and verify queued operations synchronize exactly once.
- Test sync failure/retry.
- Test back navigation and keyboard behavior.
- Test permission-denied paths.
- Test Android system UI and status/navigation bars.

Release gate:

- All PR checks green.
- Version/tag correct.
- Signed APK generated.
- AAB generated when publishing to Play.
- SHA-256 checksums generated.
- Release notes describe user-visible changes and known limitations.

## 17. Definition of Android MVP complete

The native Android MVP is complete when a small-shop user can install Aide, authenticate, select a business, inspect inventory, complete a sale, see a receipt, review sales, receive important notifications, and continue core work during temporary network loss without data loss.

The Android app must have its own native UI and local data layer. It must not require Capacitor or a remote web page to render the primary application experience.

The application must be reproducibly buildable from GitHub Actions, tested on a physical Android device, and production releases must be signed using protected CI secrets.

## 18. Migration from the existing Capacitor work

The current Capacitor configuration is not the target architecture. Treat the existing Capacitor branch as disposable delivery scaffolding rather than as the Android foundation.

Migration order:

```text
1. Keep current PWA stable.
        |
2. Define API contracts needed by Android.
        |
3. Create native Kotlin Android project.
        |
4. Implement authentication/session handling.
        |
5. Implement Room local data model.
        |
6. Implement API repository layer.
        |
7. Implement sync engine + WorkManager.
        |
8. Build Compose navigation and core screens.
        |
9. Add notifications/deep links.
        |
10. Add barcode/device capabilities.
        |
11. Add Android CI.
        |
12. Test on physical devices.
        |
13. Add signed APK/AAB release pipeline.
        |
14. Only then retire obsolete Capacitor configuration.
```

Do not delete the existing web/PWA offline implementation during this migration. The PWA remains an independent Aide client.
