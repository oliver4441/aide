# Aide — Handoff Document

**Live site:** https://aide.omixsystems.store
**Repo:** `github.com/oliver4441/aide` (`origin`) — deploys to Vercel on push to `master`
**Last commit:** `104cd2c` · **Status:** everything below is deployed and verified on the live site

---

## 1. Summary of this session

Fourteen commits pushed to `origin/master`, covering a PWA/mobile upgrade, a new UI
kit, a rebuilt landing page, an in-app notification system (client + backend), a
downloads/versions page, SEO, and legal pages.

| Commit | What it did |
|---|---|
| `4313cc9` | Tawk reposition for mobile, UI kit, lucide icons + animated mobile sheet |
| `db062f4` | Time-aware greeting, PWA icons/manifest, install prompt, OG image, landing CTA |
| `31a467b` | Aide variants on landing + in-app notification centre (client) |
| `5632088` | Backend notification engine (Prisma + API + PWA sync) |
| `da7f6a3` | Neon DDL for notification tables |
| `8c77059` | Back-to-home on login + Notification Centre page |
| `a830ca1` | Redesigned 404 page |
| `6e81806` | First version of this handoff document |
| `207c2f0` | Fix release API repo + new `/downloads` versions page |
| `232c018` | Fix releases array read on the downloads page |
| `d1256aa` | Generated sitemap (`src/app/sitemap.ts`) |
| `937e5f2` | Privacy Policy + Terms of Service pages |
| `5a10347` | Fix duplicated page titles |
| `104cd2c` | Populate legal pages with Omix Digital Solutions details |

---

## 2. What is done

### 2.1 Mobile / chat widget
- **Tawk.to widget no longer overlaps the mobile bottom nav.** Set via
  `Tawk_API.customStyle` in `src/app/layout.tsx`, defined *before* the embed script
  (required for it to take effect): mobile → `cr` (right-centre), desktop → `br` with
  a small `yOffset`. Code-level config overrides any Tawk dashboard setting.

### 2.2 UI kit (`src/components/ui/`)
Built on the chosen stack: `lucide-react`, `framer-motion`, `class-variance-authority`,
plus `clsx`/`tailwind-merge`.

| File | Purpose |
|---|---|
| `UiButton.tsx` | `cva` variants (`primary`/`outline`/`ghost`/`danger`, 4 sizes), motion press feedback, built-in loading state, renders a Next `<Link>` when `href` is passed |
| `UiLoader.tsx` | Motion-driven gradient ring loader, inherits `currentColor` |
| `UiSpinner.tsx` | Thin alias of `UiLoader` (single implementation) |
| `src/lib/utils.ts` | `cn()` — class merge with Tailwind conflict resolution |

Replaced every plain CSS border-spinner (login, sync, admin reviews, shared receipt).

### 2.3 Mobile navigation
`src/components/Sidebar.tsx` rewritten: inline-SVG icon map → lucide icons; the mobile
**"More" bottom sheet is animated** (`AnimatePresence`, spring slide-up + fade overlay).
Desktop sidebar behaviour unchanged.

### 2.4 Dashboard greeting
`src/app/dashboard/DashboardPageInner.tsx` — `Good business, Manager` replaced with a
**time-aware greeting** (Good morning/afternoon/evening/night). Reads the client clock,
so it works **offline**.

### 2.5 PWA install & metadata
- **Real icons generated** from the Aide logo (ImageMagick). The previous
  `icon-192.png` / `icon-512.png` were broken **1×1 pixel placeholders**:
  `/icon-192.png`, `/icon-512.png` (`any`), `/maskable-192.png`,
  `/maskable-512.png` (`maskable`, logo inside the safe zone), regenerated
  `/apple-touch-icon.png`.
- **`public/manifest.webmanifest` rewritten**: `id`, `lang`, `dir`, `display_override`,
  correct icons, and app **shortcuts** (New Sale, Inventory, Dashboard).
- **Install prompt rebuilt**: animated bottom-sheet/pill, shows the logo, dismissal
  persisted to localStorage, shows manual iOS/Android instructions when there is no
  native prompt, hides when installed/standalone.
- **OG image rebuilt**: 1200×630 branded image (plum gradient, logo, wordmark, tagline)
  at `/og.jpg`, used by OG + Twitter metadata.
- Landing **CTA section** now shows the Aide logo.

### 2.6 Landing page — pricing replaced with "Aide variants"
`src/components/landing/Pricing.tsx` no longer shows prices. It presents the three Aide
clients with strengths, the real limitation, and a download button:

| Variant | Strengths | Limitation |
|---|---|---|
| **Aide PWA** | Cloud database + multi-device sync, installable anywhere, offline-first, cross-platform, cloud backup | In-app notifications only (no system push) |
| **Android APK** | Real system notifications, background tasks, scheduled reminders, native Android integrations, offline | Local-first (no cloud account yet) |
| **Windows EXE** | Real system notifications, background tasks, scheduled reminders, native desktop integrations, offline | Desktop only |

### 2.7 In-app notification system (client)
Deliberately **independent of Web Push / FCM / the browser Notification API** — these
are notifications inside the PWA UI, and they work offline.

- **Local store**: Dexie schema **v2** adds `notifications` + `notificationPrefs`
  (`src/lib/db.ts`). Records carry `data`, which can include a **destination route**.
- **`src/lib/notifications.ts`**: store API, categories, enable/per-category prefs,
  200-item cap, and `syncNotificationsWithServer()`.
- **`src/hooks/useNotifications.ts`**: live queries for the list + unread count, and
  low-stock seeding.
- **`NotificationBell.tsx`**: bell with unread badge, animated dropdown, mark-all-read,
  per-item dismiss, clear-all, "View all notifications" link.
- **`NotificationPermissionPrompt.tsx`**: asks on first load, choice persisted.
- **`src/app/dashboard/notifications/page.tsx`**: full Notification Centre, deep-linking
  via `data.route`, "synced" badge for server-origin items.
- **Settings**: replaced the dead placeholder toggles with a real **In-app Notifications**
  section — master enable + per-category toggles (Sales, Inventory, Customers, System,
  Business).
- **Event sources wired**: low-stock detection, sync completed / sync failed.

### 2.8 Backend notification engine
- **Prisma models**: `Notification` + `NotificationPreference`, with relations, cascade
  deletes, indexes on `(userId, businessId, createdAt)` and `(userId, read)`, and a
  unique index on `(userId, businessId, type)`.
- **API routes** (all tenant-scoped via `requireBusiness`, so both the session cookie and
  the mobile bearer token work, and one tenant can never read another's notifications):

| Route | Method | Purpose |
|---|---|---|
| `/api/notifications` | GET | List (supports a `since` cursor) |
| `/api/notifications` | POST | Create (respects per-category preferences) |
| `/api/notifications` | PATCH | Mark read |
| `/api/notifications/[id]` | DELETE | Dismiss one |
| `/api/notifications/sync` | POST | Reconcile state across devices |

- **Cross-device state sync**: reads and dismissals propagate; new server notifications
  are pulled down.

### 2.9 Downloads & versions (`/downloads`)
- **Fixed a serious bug first**: `/api/latest-release` and `public/latest.json` pointed at
  **`marvel-254/aide`, which has no releases at all** (404) — every download was broken.
  They now read **`oliver4441/aide`** and prefer the release APK over `app-debug.apk`.
- New **`/api/releases`** returns all releases with their assets.
- **`/downloads` page**: Android install card (3 steps), iOS Safari install guidance,
  honest "in progress" desktop card, and a **Versions & checksums** section listing every
  release with file sizes and **copyable SHA-256** values, plus the `sha256sum` /
  `certutil` commands to verify. Checksums live in `public/apk-checksums.json`.
- **`src/lib/device.ts` rewritten**: removed hardcoded URLs for files that never existed
  (`app-release-unsigned.apk`, `Aide-Setup-1.0.0.exe`, `Aide-1.0.0-mac.dmg`,
  `Aide_1.0.0_amd64.deb`, a stale Vercel preview URL) — all were 404s. It now reads from
  the API and marks unbuilt platforms as coming soon.
- **`DownloadButton`** now downloads the APK directly (`download` attribute) instead of
  bouncing the user to a GitHub release page.
- Landing nav: **"Pricing" → "Variants"**, plus a new **"Get the app"** link.

### 2.10 SEO
- **`src/app/sitemap.ts`** replaces the hand-edited `public/sitemap.xml`, which listed
  **`/privacy` and `/terms` — two routes that did not exist** (broken links submitted to
  Google) — and omitted `/downloads`. Being generated, new public pages cannot go missing.
- Indexable routes only: `/`, `/downloads`, `/help`, `/privacy`, `/terms`, `/login`.
  **Excluded:** all `/dashboard/*` (behind auth middleware) and `/r/[id]` (per-sale
  permalinks).
- `robots.txt` already pointed at `/sitemap.xml` and needed no change.

### 2.11 Legal pages
`/privacy` (10 sections) and `/terms` (16 sections), written against what the code
**actually does**, not boilerplate:
- Local-first storage (IndexedDB / Room) **including** the consequence that uninstalling
  the Android app deletes its local data
- Neon-backed cloud sync and the tenant-isolation guarantee
- Third parties verified from the source: Vercel, Neon, GitHub, Google Fonts, and
  **Tawk.to** (noting chat is on the marketing site, not in the signed-in app)
- **Kenya Data Protection Act 2019** rights with the in-app path for each
- Terms: account duties, acceptable use, **beta-free status stated plainly** (no invented
  pricing), backup responsibility, disclaimers, liability cap, Kenyan governing law
- Footer "Privacy Policy" / "Terms of Service" previously pointed at the OmixSystems
  homepage — now link to the real pages

**Company details embedded (verified live):**
Omix Digital Solutions (registered in Kenya) · omixsystems@gmail.com ·
+254 768 213 649 · omixsystems.store

---

## 3. Verification performed
- `npx tsc --noEmit` — clean
- `next lint` — only 2 pre-existing warnings (unrelated)
- `npm run build` — all routes compile
- **Live checks with `agent-browser` and `curl`**: login flow and sign-up toggle, 404
  page, landing variants section, `/downloads` (releases + checksums rendering, no
  console errors), `/privacy` and `/terms` (200, contact details present, no console
  errors), manifest served, all icon/OG assets `200`, sitemap contents.
- **Database verified directly**: notification tables exist in production Neon with all
  12 `Notification` columns (including `data` JSONB), all 5 indexes, and all 4 foreign keys.

---

## 4. Known issues / not done

### 4.1 GitHub Actions is red (pre-existing, not caused by this work)
Three workflows fail on every push, and were **already failing on the previous commit
`b50d7e6`**, before any of these changes:

| Workflow | Failure |
|---|---|
| **Android CI** | fails at the **"Run Unit Tests"** step — `./gradlew testDebugUnitTest`. Build and APK upload steps are skipped as a result. |
| Desktop App Release | fails at "Install Electron dependencies" (`npm ci` in `electron/`) |
| android-release | Gradle failure (only runs on `v*` tags / manual dispatch) |

**This does not affect the web app** — that deploys through Vercel, not Actions. But it
**does** block producing new APKs, so it must be fixed before Android v2 can ship.

### 4.2 No signed release APK is published
The only v1.0.1 asset is `app-debug.apk` — a debug build. The release workflow supports
signing (`ANDROID_KEYSTORE_BASE64`, `ANDROID_STORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD`) but those secrets are not configured, so `assembleRelease` is
skipped. For a properly signed build, add the secrets and push a `v*` tag.

### 4.3 Repo schema is behind production (intentionally not changed)
Production Neon has **28 tables**; this repo's `schema.prisma` models only the core ones.
The extras are from **previous features** and are being preserved for later:

`Customer`, `Expense`, `Staff`, `Invoice`, `InvoiceItem`, `PurchaseOrder`,
`PurchaseOrderItem`, `RecurringInvoice`, `RecurringInvoiceItem`, `SaleReturn`,
`Location`, `AIInsight`, `AIProvider`, `AIDailyBriefing`, `AnalyticsEvent`,
`PendingRegistration`

> ⚠️ **Do not run a blind `prisma db push` against this repo schema.** Against production
> it would propose dropping those extra tables. Use targeted SQL (like
> `prisma/notifications.sql`).

### 4.4 Android app is native, not Capacitor
Important context for the Android v2 work: the APK is a **native Jetpack Compose app**
(Home / Sell / Stock / More), using Room. It is **local-only** — `MainActivity` states
there is "no account, no server, and no sync". Capacitor was added in `62c0659` and then
**removed in `39f43ab`** because it broke the build. So the v2 architecture should
**extend the existing Compose app** rather than assume a WebView wrapper. `WorkManager`,
Retrofit and kotlinx-serialization are already declared in `gradle/libs.versions.toml`
but not yet used in `app/build.gradle.kts`.

### 4.5 Android / desktop builds
Left alone this session by request.

### 4.6 Housekeeping
- A **Neon personal access token** is stored in the local Neon CLI config
  (`~/.config/neon`) on the dev machine, used to verify the schema. **Worth rotating and
  wiping.**
- Scratch DB scripts live in `/tmp/nrtest` — safe to delete.
- `firebase` and `google-auth-library` are still in `package.json` but are **not imported
  anywhere in `src/`**. Auth is email + password. They can be removed unless FCM plans
  need them.

### 4.7 Legal pages need a review pass
Both pages name Omix Digital Solutions with the contact details supplied. If you want to
add a company registration number, physical address, or a named data-protection contact,
that would strengthen the notice. Neither page has been reviewed by a lawyer.

---

## 5. Architecture summary

**Client (PWA)**
```
React 18 · Next.js 14 (App Router) · Tailwind 3 · Dexie (IndexedDB)
lucide-react · framer-motion · class-variance-authority
```
Offline-first: local Dexie is the source of truth; `src/lib/sync.ts` reconciles with the
server when online. `SyncNowButton` shows the pending queue and drives both data sync and
notification sync.

**Server**
```
Next.js route handlers · NextAuth (email + password) · Prisma → Neon Postgres
```
Tenant isolation is enforced in `src/lib/apiAuth.ts`: a caller's `businessId` is only
honoured when a `BusinessMembership` row proves they belong to it. No "first business in
the database" fallback, no role-based bypass.

**Notifications**
```
PWA ─┬─ local store (IndexedDB, works offline)
     └─ server reconcile (POST /api/notifications/sync) ←→ Postgres
```

**Android** — native Compose + Room, local-only, no account/sync yet.

---

## 6. Useful commands
```bash
npm run dev            # dev server
npm run build          # prisma generate + next build
npx tsc --noEmit       # type check
npx next lint          # lint
npm run db:push        # ⚠️ read §4.3 first
```

> Builds on this machine exceed the ~3-minute foreground command limit. Run them detached:
> `nohup npm run build > /tmp/build.log 2>&1 &` then poll the log.

---

## 7. Suggested next steps

1. **Fix Android CI** — diagnose the failing `testDebugUnitTest` step. It is the gate on
   the APK workflow and blocks everything below.
2. **Android v2 notifications** (extends the existing Compose app, per the agreed
   architecture):
   - Phase 2 — native local notifications + `NotificationManager` channels
   - Phase 3 — FCM remote delivery, driven by the backend event model
   - Phase 4 — deep links (`action` + `product_id` → open the right screen), badges,
     notification preferences
   - Use an `event_id` idempotency key so server, PWA and Android never show a duplicate
   - FCM is the *delivery* mechanism only — the backend notification/event model stays
     channel-independent so the same event can serve PWA, Android, email later
3. **Configure APK signing secrets** so a real release APK is published (§4.2).
4. **Reconcile `prisma/schema.prisma` with production** so future migrations are safe.
5. **Revisit the previous features** (Customer, Expense, Staff, Invoice, PO, AI).
6. **Server-side scheduled jobs** for daily summaries / recurring low-stock checks — the
   `POST /api/notifications` route already respects preferences, so a cron can drive it.
7. **Refresh this document** after the next work session.
