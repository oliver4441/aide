# Aide - Offline-First Business Management Platform

## Tech Stack
- **Next.js 14** (App Router, TypeScript)
- **Prisma** ORM → **Neon PostgreSQL** (host: `ep-billowing-silence-aulkcd3c`, db: `neondb`)
- **NextAuth** (Credentials provider: User + Admin tables)
- **Tailwind CSS** with semantic token system (`bg-surface`, `text-on-surface`, `bg-primary`, etc.)
- **Dexie** (IndexedDB) for offline-first local storage
- **PWA** via `manifest.webmanifest` + `sw.js` + logo favicon
- **Android** — native Jetpack Compose + Room, local-only (no cloud sync)
- **Tawk.to** live chat integration
- **Deployed on Vercel**: https://aide.omixsystems.store

## Architecture
- **Offline-first (web only)**: IndexedDB (Dexie) is the client source of truth. Client generates UUIDs. Data syncs to Neon via `POST /api/sync` when online.
- **Sync engine** (`src/lib/sync.ts`): push pending mutations, pull server changes, outbox + retry/backoff, 30s auto-sync.
- **Deterministic conflict resolver** (`src/lib/conflicts.ts`): LWW by `updatedAt` for descriptive fields, append-only sales, movement-ledger stock reconciliation.

### Two clients, two models
- **PWA (web)** — offline-first *and* cloud-synced. Dexie outbox pushes to `/api/sync`; it is the only client that talks to the server.
- **Android APK** — local-only. Room is the sole store; there is no account, no server, and no sync. The `sync/` package, Retrofit/OkHttp, the auth layer, and the mutation outbox were all removed. `LocalBusinessStore` generates a stable local `businessId` on first launch. Uninstalling the app deletes all data, so the More screen warns users to export anything they need.
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
| `/api/sync` | Protected | Offline sync endpoint (push/pull), membership-scoped |
| `/api/auth/[...nextauth]` | Public | NextAuth session endpoints |
| `/api/auth/register` | Public POST | Creates user + first business + OWNER membership |
| `/api/auth/mobile-login` | Public POST | JSON login for native clients, returns bearer token |
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
Aide is an offline-first PWA for managing real businesses (salons, shops, restaurants, pharmacies). A business owner signs up with an email and password, answers a quick onboarding wizard (referral source, goals, business type), and lands on their dashboard showing real-time metrics pulled from local IndexedDB — today's revenue, profit, product count, and low-stock alerts. They can add products with names, prices, quantities, images (upload or camera), and auto-generated SKUs organized into configurable categories. When a sale happens at the POS, items are scanned from inventory, the cart totals with VAT-inclusive tax, payment is recorded (cash, M-Pesa, card), and a supermarket-grade receipt is generated locally — showing business name, receipt number, date/time, cashier, itemized lines with qty x price, subtotal, VAT breakdown, total, amount paid, and change — printable via Bluetooth thermal printer or as a clean A4 PDF. The sale deducts stock locally and enqueues a sync mutation. When the device is online, the sync engine pushes all pending changes to Neon PostgreSQL and pulls latest server data, using a deterministic conflict resolver (last-write-wins for descriptions, movement-ledger for stock). The sales history is an activity log of every transaction with expandable details, filterable by date and payment method, exportable as CSV or JSON. Reports show real-time revenue charts (SVG bar graph, last 7 days), top-selling products, payment method breakdown, and are printable as A4 reports or scannable via QR code. Settings let the owner configure their business profile (name, type, currency, tax rate, receipt footer), manage product categories, review sync conflicts, and export all data. A floating help widget provides searchable FAQ and live chat via Tawk.to. The entire app works offline — all data persists in IndexedDB, all features function without internet, and syncing happens silently in the background when connectivity returns.

## Authentication
Sign-in is **email and password** via NextAuth's credentials provider
(`src/lib/auth.ts`). Passwords are bcrypt-hashed. There is no OAuth provider
and no Firebase dependency any more.

Two entry points:
- **Web** — `POST /api/auth/register` creates the User, a default Business, and
  the OWNER membership in one transaction; the login page then signs in through
  NextAuth and gets a session cookie.
- **Native clients** — `POST /api/auth/mobile-login` takes a JSON
  `{email, password}` and returns an HS256 bearer token (30-day expiry, signed
  with `NEXTAUTH_SECRET`). `requireUser()` accepts it via
  `Authorization: Bearer <token>`. The shipped Android APK no longer uses this
  path because it is local-only, but the endpoint remains for any future client.

**Admin role** is granted to emails listed in the `ADMIN_EMAILS` env var
(comma-separated; default `kipkiruigideon890@gmail.com`). Those accounts
authenticate against the `Admin` table; everyone else uses the `User` table.
Admins land on `/dashboard/admin` and can read the reviews API.

**Tenant isolation** is enforced in `src/lib/apiAuth.ts`. All data routes call
`requireBusiness()`, which accepts a caller's `businessId` only when a
`BusinessMembership` proves membership, else falls back to their own first
business. No route may use `prisma.business.findFirst()` as a tenant default,
and admin status never bypasses the membership check.

## Key Files
| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema (Admin, User, Business, Product, Sale, SaleItem, Category, Review, SyncConflict) |
| `prisma/seed.ts` | Test data seeder (admin, user, 2 businesses, 17 products, 15 sales) |
| `src/lib/auth.ts` | NextAuth credentials config (dual User/Admin table auth, JWT session with role + businessId) |
| `src/lib/apiAuth.ts` | Route authorization: session-or-bearer identity, membership-scoped business resolution |
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
- Neon project: `aide (shiny-rain-18812100)`
- GitHub: `https://github.com/oliver4441/aide`
- Vercel: `https://aide.omixsystems.store`

## Notable Conventions
- All components use `"use client"` directive (client-side rendering)
- Semantic color tokens only — no hardcoded `text-white`, `bg-black`, `zinc-*` etc.
- Client-generated UUIDs for offline-first (no server依赖 for ID generation)
- Session carries `role` (admin/user) + `businessId` for multi-business scoping
- Product images stored as base64 data URLs in Dexie (compressed <500KB via canvas)
- Auto-generated SKUs: `{CATEGORY_ABBR}-{4 random digits}`
- VAT-inclusive tax display on receipts: `VAT = total - total/(1+rate/100)`
