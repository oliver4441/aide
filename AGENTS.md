# Aide - Offline-First Business Management Platform

## Tech Stack
- **Next.js 14** (App Router, TypeScript)
- **Prisma** ORM → **Neon PostgreSQL** (host: `ep-billowing-silence-aulkcd3c`, db: `neondb`)
- **NextAuth** (Credentials provider: User + Admin tables)
- **Tailwind CSS** with semantic token system (`bg-surface`, `text-on-surface`, `bg-primary`, etc.)
- **Dexie** (IndexedDB) for offline-first local storage
- **PWA** via `manifest.webmanifest` + `sw.js` + logo favicon
- **Tawk.to** live chat integration
- **Deployed on Vercel**: https://aide.omixsystems.store

## Architecture
- **Offline-first**: IndexedDB (Dexie) is the client source of truth. Client generates UUIDs. Data syncs to Neon via `POST /api/sync` when online.
- **Sync engine** (`src/lib/sync.ts`): push pending mutations, pull server changes, outbox + retry/backoff, 30s auto-sync.
- **Deterministic conflict resolver** (`src/lib/conflicts.ts`): LWW by `updatedAt` for descriptive fields, append-only sales, movement-ledger stock reconciliation.
- **DashboardInit** component seeds Dexie from Neon on first login.
- **Semantic color tokens**: `:root` (light) + `.dark` (dark) CSS variables mapped to Tailwind. Default theme: dark.
- **No build step for styling** — CSS `@import` for Google Fonts, Tailwind via PostCSS.

## Pages & Routes
| Route | Auth | Description |
|-------|------|-------------|
| `/` | Public | Landing page (hero, features, pricing in KES, FAQ, footer) |
| `/login` | Public | Login (credentials) |
| `/help` | Public | Help center (FAQ, contact, getting started) |
| `/dashboard` | Protected | Main dashboard (real-time metrics from Dexie) |
| `/dashboard/pos` | Protected | Point of Sale (offline sale creation, receipt print) |
| `/dashboard/inventory` | Protected | Product management (image upload, camera, auto SKU) |
| `/dashboard/sales` | Protected | Activity logs (expandable, CSV/JSON export) |
| `/dashboard/reports` | Protected | Reports (SVG chart, top products, print/QR/CSV) |
| `/dashboard/settings` | Protected | Business profile, categories, sync conflicts, data export |
| `/dashboard/admin/reviews` | Protected (admin) | Admin reviews dashboard |
| `/api/sync` | Public | Offline sync endpoint (push/pull) |
| `/api/auth/[...nextauth]` | Public | NextAuth authentication |
| `/api/products` | Protected | Product CRUD |
| `/api/sales` | Protected | Sales CRUD |
| `/api/categories` | Protected | Category CRUD |
| `/api/reviews` | Public POST, Admin GET | Reviews API |

## User Onboarding Flow
When a first-time user logs in, a 4-step onboarding wizard appears:

1. **Source** — "Where did you hear about us?" (Google, Social Media, Friend, App Store, YouTube, Other)
2. **Goals** — "What do you want to do with Aide?" (multi-select: inventory, POS, analytics, receipts, multi-business, offline)
3. **Business Type** — "What type of business are you?" (Salon, Grocery, Electronics, Restaurant, Pharmacy, Clothing, General Shop, Other)
4. **Complete** — Summary of selections + "Start Using Aide" button

Selections saved to localStorage (`aide_onboarded`, `aide_onboarding_prefs`). Wizard only shows once.

## How the App Works (End-to-End)
Aide is an offline-first PWA for managing real businesses (salons, shops, restaurants, pharmacies). A business owner signs in with email/password, answers a quick onboarding wizard (referral source, goals, business type), and lands on their dashboard showing real-time metrics pulled from local IndexedDB — today's revenue, profit, product count, and low-stock alerts. They can add products with names, prices, quantities, images (upload or camera), and auto-generated SKUs organized into configurable categories. When a sale happens at the POS, items are scanned from inventory, the cart totals with VAT-inclusive tax, payment is recorded (cash, M-Pesa, card), and a supermarket-grade receipt is generated locally — showing business name, receipt number, date/time, cashier, itemized lines with qty x price, subtotal, VAT breakdown, total, amount paid, and change — printable via Bluetooth thermal printer or as a clean A4 PDF. The sale deducts stock locally and enqueues a sync mutation. When the device is online, the sync engine pushes all pending changes to Neon PostgreSQL and pulls latest server data, using a deterministic conflict resolver (last-write-wins for descriptions, movement-ledger for stock). The sales history is an activity log of every transaction with expandable details, filterable by date and payment method, exportable as CSV or JSON. Reports show real-time revenue charts (SVG bar graph, last 7 days), top-selling products, payment method breakdown, and are printable as A4 reports or scannable via QR code. Settings let the owner configure their business profile (name, type, currency, tax rate, receipt footer), manage product categories, review sync conflicts, and export all data. A floating help widget provides searchable FAQ and live chat via Tawk.to. The entire app works offline — all data persists in IndexedDB, all features function without internet, and syncing happens silently in the background when connectivity returns.

### Authentication
Aide uses NextAuth.js with CredentialsProvider for email/password authentication. Passwords are hashed with bcrypt and stored in the Neon PostgreSQL database. Authentication works fully offline since credentials are verified against the database without external dependencies. Google Sign-In was removed to enable true offline authentication.

## Admin Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Platform Admin (SUPER_ADMIN) | `admin@aide.co.ke` | `admin123` |
| Business User (OWNER) | `oliver@aide.co.ke` | `password123` |

**Note:** New users must be created via database seeding (`npx prisma db push`) or added directly to the database. Email/password authentication is the only supported method (Google Sign-In removed for offline compatibility).

## Key Files
| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema (Admin, User, Business, Product, Sale, SaleItem, Category, Review, SyncConflict) |
| `prisma/seed.ts` | Test data seeder (admin, user, 2 businesses, 17 products, 15 sales) |
| `src/lib/auth.ts` | NextAuth config (CredentialsProvider: email/password with bcrypt, JWT session with role + businessId) |
| `src/lib/db.ts` | Dexie IndexedDB schema (7 tables) |
| `src/lib/sync.ts` | SyncEngine (push/pull/enqueue, auto-sync, seedFromSession) |
| `src/lib/conflicts.ts` | Deterministic conflict resolver (LWW + stock oversell check) |
| `src/lib/sounds.ts` | Web Audio API sounds (sale complete, low stock, notification, etc.) |
| `src/lib/format.ts` | formatMoney, formatDate, timeAgo utilities |
| `src/components/Sidebar.tsx` | Sectioned sidebar (Main/Manage/Account), ThemeToggle, OnlineStatus |
| `src/components/DashboardInit.tsx` | Seeds Dexie from Neon on first dashboard load |
| `src/components/receipt/ReceiptDocument.tsx` | Supermarket-grade receipt (thermal + A4 print) |
| `src/components/receipt/PrintReceipt.tsx` | Print receipt via new window |
| `src/components/onboarding/` | 4-step onboarding wizard |
| `src/components/reviews/` | Star rating review system + admin dashboard |
| `src/components/help/` | HelpCenter slide-over, HelpWidget, FAQ, Contact |
| `src/components/ads/` | OmixSystems promotional banners |
| `src/components/reports/` | ReportPrint (A4), QRCode, SalesLog |
| `public/manifest.webmanifest` | PWA manifest (logo favicon, installable) |
| `public/sw.js` | Service worker (cache-first static, network-first navigation) |

## Development
- Edit files, `npm run dev` for local preview, `npx vercel deploy --prod` to publish
- Firebase project: `omix-systems-cd1af` (for analytics, separate from Aide backend)
- Neon project: `aide (shiny-rain-18812100)`
- GitHub: `https://github.com/oliver4441/aide`
- Vercel: `https://aide.omixsystems.store`

## Notable Conventions
- All components use `"use client"` directive (client-side rendering)
- Semantic color tokens only — no hardcoded `text-white`, `bg-black`, `zinc-*` etc.
- Client-generated UUIDs for offline-first (no server dependency for ID generation)
- Session carries `role` (admin/user) + `businessId` for multi-business scoping
- Product images stored as base64 data URLs in Dexie (compressed <500KB via canvas)
- Auto-generated SKUs: `{CATEGORY_ABBR}-{4 random digits}`
- VAT-inclusive tax display on receipts: `VAT = total - total/(1+rate/100)`

## Android Project (Native Kotlin/Compose App)
| File | Purpose |
|------|---------|
| `android/app/build.gradle.kts` | Gradle build config (Compose, Room, Retrofit, WorkManager) |
| `android/app/src/main/java/ke/co/aide/MainActivity.kt` | Main activity with navigation and DI |
| `android/app/src/main/java/ke/co/aide/AideApplication.kt` | Application class with notification channels |
| `android/app/src/main/java/ke/co/aide/sync/SyncEngine.kt` | Sync logic (push/pull to Neon API) |
| `android/app/src/main/java/ke/co/aide/data/` | Data layer (Repositories, DAOs, DTOs, Entities) |
| `android/app/src/main/java/ke/co/aide/ui/` | UI layer (Screens, ViewModels, Theme, Components) |

### Android App Architecture
- **Native Kotlin/Compose app** (not Capacitor-based despite directory structure)
- **Offline-first:** Room database for local storage
- **Sync:** Push/pull with Neon PostgreSQL via `/api/sync`
- **Auth:** Email/password only (Google Sign-In removed)
- **Build:** Gradle 8.3.2, Kotlin 1.9.23, Compose BOM 2024.04.00
- **Version:** 1.0.0 (code 1), Target SDK 34, Min SDK 24
- **Packages:** ke.co.aide (namespace), ke.co.aide.ui, ke.co.aide.data, ke.co.aide.sync

### GitHub Actions Workflows
| File | Purpose |
|------|---------|
| `.github/workflows/android-ci.yml` | Debug build on push/PR |
| `.github/workflows/release-android.yml` | Release APK with GitHub Release |

### Recent Changes (2026-09-29)
- ✅ Removed Capacitor/Cordova directories (legacy unused files)
- ✅ Removed hardcoded demo credentials fallback (security improvement)
- ✅ Enabled ProGuard/R8 for release builds (`isMinifyEnabled = true`)
- ✅ Created comprehensive ProGuard rules file (`proguard-rules.pro`)
- ✅ Deployed web app to Vercel: https://aide-395ga290s-twistedoliver211fs-1271.vercel.app
- ✅ Created GitHub Actions workflows for Android and Desktop releases

## Desktop Apps (Electron)
### Windows App (EXE)
| File | Purpose |
|------|---------|
| `electron/main.js` | Electron main process with tray, window management |
| `electron/package.json` | Electron build config with NSIS installer |
| `electron/sign.js` | Code signing placeholder |

### Linux DEB Package
| File | Purpose |
|------|---------|
| `electron/package.json` | Electron build config with deb target |

### GitHub Actions Workflows
| File | Purpose |
|------|---------|
| `.github/workflows/release-desktop.yml` | Desktop releases for Windows, macOS, Linux |

### Desktop App Features
- **Cross-platform:** Windows (NSIS), macOS (DMG), Linux (DEB, AppImage)
- **System tray:** Quick access menu with Open, Visit Website, Quit
- **Offline:** Works without internet after installation

### Build Commands
```bash
# Install dependencies
cd electron && npm install

# Start development
cd electron && npm start

# Build Windows EXE
npm run electron:build:win

# Build macOS DMG
npm run electron:build:mac

# Build Linux DEB
npm run electron:build:linux
```

## Android Development
- **Web/PWA:** `npm run dev` for preview, `npx vercel deploy --prod` to publish
- **Android:** `cd android && ./gradlew assembleDebug` or `assembleRelease`
- **Firebase project:** `omix-systems-cd1af` (analytics only, not used for auth)
- **Neon project:** `aide (shiny-rain-18812100)`
- **GitHub:** `https://github.com/oliver4441/aide`
- **Vercel (Web):** `https://aide.omixsystems.store`

## Agent Logs (Development History)

| File | Date | Summary |
|------|------|---------|
| `AGENT_1_LOG.md` | Initial | Design system & theming (semantic tokens, ThemeProvider) |
| `AGENT_2_LOG.md` | Initial | Dashboard & metrics setup |
| `AGENT_3_LOG.md` | Initial | POS functionality |
| `AGENT_4_LOG.md` | Initial | Product & category management |
| `AGENT_PWA_LOG.md` | Initial | PWA setup (manifest, service worker) |
| `AGENT_PWA_META_LOG.md` | Initial | PWA metadata & installability |
| `AGENT_HELP_LOG.md` | Initial | Help center & FAQ |
| `AGENT_LANDING_LOG.md` | Initial | Landing page |
| `AGENT_ONBOARD_LOG.md` | Initial | Onboarding wizard |
| `AGENT_REPORTS_LOG.md` | Initial | Reports & analytics |
| `AGENT_PRODUCT_LOG.md` | Initial | Product management enhancements |
| `AGENT_SIDEBAR_LOG.md` | Initial | Sidebar redesign, emoji removal |
| `AGENT_AUTH_LOG.md` | 2026-09-29 | Removed Google Sign-In, email/password only (offline auth) |
| `AGENT_PWA_STAB_LOG.md` | 2026-09-29 | PWA stabilization review - service worker, manifest, offline-first |
| `AGENT_ANDROID_LOG.md` | 2026-09-29 | Android native app review - cleanup, ProGuard rules, offline auth |
| `AGENT_DESKTOP_LOG.md` | 2026-09-29 | Desktop app setup - Electron + NSIS installer for Windows/Linux |

## Desktop Apps (Electron)
### Windows App (EXE)
| File | Purpose |
|------|---------|
| `electron/main.js` | Electron main process with tray, window management |
| `electron/package.json` | Electron build config with NSIS installer |
| `electron/sign.js` | Code signing placeholder |

### Linux DEB Package
| File | Purpose |
|------|---------|
| `electron/package.json` | Electron build config with deb target |

### GitHub Actions Workflows
| File | Purpose |
|------|---------|
| `.github/workflows/release-desktop.yml` | Desktop releases for Windows, macOS, Linux |

### Desktop App Features
- **Cross-platform:** Windows (NSIS), macOS (DMG), Linux (DEB, AppImage)
- **System tray:** Quick access menu with Open, Visit Website, Quit
- **Offline:** Works without internet after installation

### Build Commands
```bash
# Install dependencies
cd electron && npm install

# Start development
cd electron && npm start

# Build Windows EXE
npm run electron:build:win

# Build macOS DMG
npm run electron:build:mac

# Build Linux DEB
npm run electron:build:linux
```

## Android Development
- **Build Debug APK:** `cd android && ./gradlew assembleDebug`
- **Build Release APK:** `cd android && ./gradlew assembleRelease`
- **Run Tests:** `cd android && ./gradlew testDebugUnitTest`
- **Clean Build:** `cd android && ./gradlew clean`
- **Version:** 1.0.0 (code 1)
- **Min SDK:** 24 (Android 7.0)
- **Target SDK:** 34 (Android 14)

## Development
- **Web/PWA:** `npm run dev` for preview, `npx vercel deploy --prod` to publish
- **Android:** `cd android && ./gradlew assembleDebug` or `assembleRelease`
- **Desktop:** `cd electron && npm run electron:build:win` (or mac/linux)
- **Firebase project:** `omix-systems-cd1af` (analytics only, not used for auth)
- **Neon project:** `aide (shiny-rain-18812100)`
- **GitHub:** `https://github.com/oliver4441/aide`
- **Vercel (Web):** `https://aide-395ga290s-twistedoliver211fs-1271.vercel.app`
