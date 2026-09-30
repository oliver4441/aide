# Aide — Handoff Document

**Live site:** https://aide.omixsystems.store
**Repo:** `github.com/oliver4441/aide` (`origin`) — deploys to Vercel on push to `master`
**Last commit:** `a830ca1` · **Status:** everything below is deployed and live

---

## 1. Summary of this session

Seven commits pushed to `origin/master`, covering PWA/mobile upgrade, a new
UI kit, a rebuilt landing page, and a full in-app notification system
(client + backend). All changes are verified on the live site.

Commits (oldest → newest):

| Commit | What it did |
|---|---|
| `4313cc9` | Tawk reposition for mobile, UI kit, lucide icons + animated mobile sheet |
| `db062f4` | Time-aware greeting, PWA icons/manifest, install prompt, OG image, landing CTA |
| `31a467b` | Aide variants on landing + in-app notification center (client) |
| `5632088` | Backend notification engine (Prisma + API + PWA sync) |
| `da7f6a3` | Neon DDL for notification tables |
| `8c77059` | Back-to-home on login + Notification Center page |
| `a830ca1` | Redesigned 404 page |

---

## 2. What is done

### 2.1 Mobile / chat widget fix
- **Tawk chat widget no longer overlaps the mobile bottom nav.** Positioned via
  `Tawk_API.customStyle` in `src/app/layout.tsx`, defined *before* the embed script
  (required for it to take effect):
  - Mobile → `cr` (right-center / vertical equator)
  - Desktop → `br` with a small `yOffset`
- Code-level config overrides any Tawk dashboard position setting.

### 2.2 UI kit (`src/components/ui/`)
Built on the option-3 stack that was chosen: **`lucide-react`**,
**`framer-motion`**, **`class-variance-authority`**, plus `clsx`/`tailwind-merge`.

| File | Purpose |
|---|---|
| `UiButton.tsx` | `cva` variants (`primary`/`outline`/`ghost`/`danger`, 4 sizes), motion press feedback, built-in loading state, renders a Next `<Link>` when `href` is passed |
| `UiLoader.tsx` | Motion-driven gradient ring loader, inherits `currentColor` (theme-aware) |
| `UiSpinner.tsx` | Thin alias of `UiLoader` (back-compat, single implementation) |
| `src/lib/utils.ts` | `cn()` — class merge with Tailwind conflict resolution |

Replaced every plain CSS border-spinner (login, sync, admin reviews, shared receipt).

### 2.3 Mobile navigation
`src/components/Sidebar.tsx` rewritten:
- Hand-written inline-SVG icon map → **lucide icons**
- Mobile **"More" bottom sheet is animated** (`AnimatePresence`, spring slide-up + fade overlay)
- Desktop sidebar behaviour unchanged; admin console entry preserved

### 2.4 Dashboard greeting
`src/app/dashboard/DashboardPageInner.tsx` — `Good business, Manager` replaced with a
**time-aware greeting**: Good morning / afternoon / evening / night.
Reads the client clock, so it works **offline**.

### 2.5 PWA install & metadata
- **Real icons generated** from the Aide logo (ImageMagick) — the previous
  `icon-192.png` / `icon-512.png` were broken **1×1 pixel placeholders**:
  - `/icon-192.png`, `/icon-512.png` (purpose `any`)
  - `/maskable-192.png`, `/maskable-512.png` (logo inside the ~66% safe zone)
  - `/apple-touch-icon.png` regenerated
- **`public/manifest.webmanifest` rewritten**: `id`, `lang`, `dir`,
  `display_override`, correct `any` + `maskable` icons, and app **shortcuts**
  (New Sale, Inventory, Dashboard).
- **Install prompt rebuilt** (`InstallPrompt.tsx`): animated bottom-sheet/pill
  (framer-motion), shows the logo, dismissal persisted to localStorage, shows
  iOS/Android manual instructions when there is no native prompt, hides when
  installed/standalone. Positioned above the mobile bottom nav.
- **OG image rebuilt**: 1200×630 branded image (plum gradient, Aide logo, wordmark,
  tagline, "OMIX SYSTEMS") at `/og.jpg`, referenced by OG + Twitter metadata.
- Landing **CTA section** now displays the Aide logo.

### 2.6 Landing page — pricing replaced with "Aide variants"
`src/components/landing/Pricing.tsx` no longer shows prices. It now presents the
three Aide clients, each with strengths, the one real limitation, and a download
button:

| Variant | Strengths | Limitation | Button |
|---|---|---|---|
| **Aide PWA** | Cloud database + multi-device sync, installable anywhere, offline-first, cross-platform, cloud backup | In-app notifications (no system push) | Install the PWA → `/login` |
| **Android APK** | Real system notifications, background tasks, scheduled reminders, native Android integrations, offline | Local-first (no cloud account yet) | Download APK → GitHub Releases |
| **Windows EXE** | Real system notifications, background tasks, scheduled reminders, native desktop integrations, faster at the till, offline | Desktop only | Download for Windows → GitHub Releases |

### 2.7 In-app notification system (client)
Deliberately **independent of Web Push / FCM / the browser Notification API** — these
are notifications inside the PWA UI, and they work offline.

- **Local store**: Dexie schema **v2** adds `notifications` and `notificationPrefs`
  tables (`src/lib/db.ts`). Records carry `data`, which can include a **destination
  route** for deep-linking.
- **`src/lib/notifications.ts`**: store API, category list, enable/per-category
  preferences, 200-item cap, and `syncNotificationsWithServer()`.
- **`src/hooks/useNotifications.ts`**: live queries for the list and unread count,
  plus low-stock seeding.
- **`NotificationBell.tsx`**: bell with unread badge, animated dropdown centre,
  mark-all-read, per-item dismiss, clear-all, and a **View all notifications** link.
- **`NotificationPermissionPrompt.tsx`**: asks on first load, choice persisted.
- **`src/app/dashboard/notifications/page.tsx`**: full Notification Center page,
  deep-linking via `data.route`, "synced" badge for server-origin items.
- **Settings** (`SettingsPageInner.tsx`): replaced the dead placeholder toggles with
  a real **In-app Notifications** section — master enable toggle + per-category
  toggles (Sales, Inventory, Customers, System, Business).
- **Event sources wired**: low-stock detection, and sync completed / sync failed
  (the sync button also reconciles server notification state).

### 2.8 Backend notification engine
- **Prisma models** (`prisma/schema.prisma`): `Notification` and
  `NotificationPreference`, with relations, cascade deletes, and indexes on
  `(userId, businessId, createdAt)` and `(userId, read)`, plus a unique index on
  `(userId, businessId, type)`.
- **API routes** (all tenant-scoped through `requireBusiness`, so session cookie and
  mobile bearer token both work, and one tenant can never read another's notifications):

| Route | Method | Purpose |
|---|---|---|
| `/api/notifications` | GET | List notifications (supports a `since` cursor) |
| `/api/notifications` | POST | Create a notification (respects per-category preferences) |
| `/api/notifications` | PATCH | Mark notifications read |
| `/api/notifications/[id]` | DELETE | Dismiss one notification |
| `/api/notifications/sync` | POST | Reconcile state across devices |

- **Cross-device state sync** — reads and dismissals made on one device propagate to
  the others; new server notifications are pulled down.

### 2.9 Database
- Notification tables **verified present and correct** in production Neon
  (`neondb`): all 12 `Notification` columns including the `data` JSONB column,
  all 5 indexes, and all 4 foreign keys. **No SQL pending.**
- DDL kept in version control at `prisma/notifications.sql`.

### 2.10 Login & 404
- **Login page** has a **"Back to Home"** link (covers sign-in and get-started/sign-up).
- **404 page redesigned** with the Aide logo, branded 404, glow background, and the
  motion `UiButton`s ("Go home", "Help center"). SEO metadata retained.

---

## 3. Verification performed
- `npx tsc --noEmit` — clean
- `next lint` — only 2 pre-existing warnings (unrelated to this work)
- `npm run build` — all routes compile
- Live-site checks with `agent-browser`: login flow, sign-up toggle, 404 page,
  landing variants section, manifest served over HTTP, all icon/OG assets `200`

---

## 4. Known issues / not done

### 4.1 GitHub Actions is red (pre-existing, not from this work)
Three workflows fail on every push, and were **already failing on the previous
commit `b50d7e6`**, before any of these changes:

| Workflow | Failure |
|---|---|
| Desktop App Release | fails at "Install Electron dependencies" (`npm ci` in `electron/`) |
| Android CI | Gradle build/test failure |
| android-release | Gradle build failure |

**This does not affect the web app** — that deploys through Vercel, not Actions.
Likely cause: Electron binary download / Gradle environment in the runner.

### 4.2 Repo schema is behind production (intentionally not changed)
Production Neon contains **28 tables**; this repo's `schema.prisma` models only
the core ones. The extra tables are from **previous features** and are being
preserved for later:

`Customer`, `Expense`, `Staff`, `Invoice`, `InvoiceItem`, `PurchaseOrder`,
`PurchaseOrderItem`, `RecurringInvoice`, `RecurringInvoiceItem`, `SaleReturn`,
`Location`, `AIInsight`, `AIProvider`, `AIDailyBriefing`, `AnalyticsEvent`,
`PendingRegistration`

> ⚠️ **Do not run a blind `prisma db push` against this repo schema.** Against
> production it would propose dropping those extra tables. Use targeted SQL
> (like `prisma/notifications.sql`) for schema changes.

### 4.3 Android / desktop apps
Left alone this session by request. Note the shipped Android APK is
**local-only with no account** (see README), so it has no cloud notifications yet.

### 4.4 Housekeeping
- A Neon personal access token is stored in the local Neon CLI config
  (`~/.config/neon`) on the dev machine, used to verify the schema. Worth rotating
  and wiping once no longer needed.
- Scratch DB scripts live in `/tmp/nrtest` — safe to delete.

---

## 5. Architecture summary

**Client (PWA)**
```
React 18 · Next.js 14 (App Router) · Tailwind 3 · Dexie (IndexedDB)
lucide-react · framer-motion · class-variance-authority
```
Offline-first: local Dexie is the source of truth, `src/lib/sync.ts` reconciles with
the server when online. `SyncNowButton` shows the pending queue and drives both
data sync and notification sync.

**Server**
```
Next.js route handlers · NextAuth (email + password) · Prisma → Neon Postgres
```
Tenant isolation is enforced in `src/lib/apiAuth.ts`: a caller's `businessId` is
only honoured when a `BusinessMembership` row proves they belong to it. No
"first business in the database" fallback, no role-based bypass.

**Notifications**
```
PWA ─┬─ local store (IndexedDB, works offline)
     └─ server reconcile (POST /api/notifications/sync) ←→ Postgres
```

---

## 6. Useful commands
```bash
npm run dev            # dev server
npm run build          # prisma generate + next build
npx tsc --noEmit       # type check
npx next lint          # lint
npm run db:push        # ⚠️ read §4.2 first
```

---

## 7. Suggested next steps
1. Fix the **GitHub Actions** failures (Electron + Gradle) so CI is green.
2. Reconcile `prisma/schema.prisma` with production so future migrations are safe.
3. Revisit the **previous features** (Customer, Expense, Staff, Invoice, PO, AI).
4. Add a **server-side scheduled job** (daily summary, recurring low-stock checks)
   — the `POST /api/notifications` route already respects preferences, so a cron
   or Vercel cron can drive it.
5. Wire the Android APK to a real account so it can receive the same notifications
   natively.
