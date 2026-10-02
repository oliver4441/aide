# Aide — Handoff Document

**Live site:** https://aide.omixsystems.store
**Repo:** `github.com/oliver4441/aide` (`origin`) — deploys to Vercel on push to `master`
**Last commit:** `7078bf0` · **Status:** everything below is deployed and verified on the live site

> **Updated 2026-10-02.** Three later sessions landed on top of this document: a
> landing/SEO overhaul (§2.10), a full `/docs` section (§2.12), and the desktop
> release + accent themes + new-user guide (§2.13–§2.16). Sections 4.1, 4.2 and
> 4.5 have been rewritten with the current CI and release findings — the older
> text in them was wrong. **§4.5 is now resolved:** the desktop release is
> published.

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

### 2026-10-02 session

Three commits, plus one tag that unblocked the desktop release.

| Commit | What it did |
|---|---|
| `6e94555` | `/downloads` desktop card now lists the published Windows/macOS/Linux builds |
| `57c9998` | Accent themes: Settings → Appearance, 5 palettes, `data-theme` + no-flash persistence |
| `7078bf0` | New-user guide: `/docs/getting-started/new-user-guide` + `/help` CTA |

Tag **`desktop-v1.0.0`** was pushed to `origin`, which ran the release job and
published "Aide Desktop v1.0.0" with 9 assets including the Windows installer.

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
  and a **Versions & checksums** section listing every release with file sizes and
  **copyable SHA-256** values, plus the `sha256sum` / `certutil` commands to verify.
  Checksums live in `public/apk-checksums.json`. The desktop card was an
  honest "in progress" placeholder when this session ran; it now lists the real
  published builds (§2.14).
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

### 2.12 Documentation section (`/docs`)

Shipped in `6f67e64`. A Cloudflare-style docs site: persistent left rail with nested
categories, per-page content column, breadcrumbs, an on-page contents rail with scroll
tracking, and a previous/next pager.

| Piece | File |
|---|---|
| Page registry (24 pages, 5 categories) | `src/lib/docs-nav.ts` |
| Markdown renderer (dependency-free) | `src/lib/markdown.ts` |
| Filesystem read + breadcrumbs + pager | `src/lib/docs.ts` |
| Per-page `Metadata` | `src/lib/docs-metadata.ts` |
| Content, read at build time only | `src/content/docs/**/*.md` |
| Routes | `src/app/docs/page.tsx`, `src/app/docs/[...slug]/page.tsx` |
| Components | `src/components/docs/` |

Three decisions worth keeping:

- **`docs-nav.ts` is pure data.** The sidebar is a client component and must never
  pull in `node:fs`, so the registry and the filesystem read are deliberately split.
  `DOC_NAV` and `DOC_ORDER` are *derived* from `DOC_PAGES`, so the sidebar, the pager
  and the sitemap cannot drift from the registry.
- **`dynamicParams = false`** on the catch-all, so only registered slugs are built
  and anything else 404s rather than being rendered on demand.
- **No new dependencies.** The renderer emits design-token classes and `data-docs-copy`
  buttons that `DocsContent` wires up imperatively after hydration.

Docs pages are grounded in the real handlers under `src/app/api`, including their
quirks (the hard-coded low-stock threshold on `/api/dashboard`, the per-collection
`since` cursors on `/api/sync`, bearer-token-before-cookie auth resolution). That is
deliberate: a reference that documents intended behaviour rather than actual behaviour
is worse than no reference.

### 2.13 Desktop release published (`desktop-v1.0.0`)

The §4.5 blocker is resolved. On 2026-10-02 the tag `desktop-v1.0.0` was pushed
to `origin`, the `Desktop App Release` workflow ran end to end (~4 minutes), and
the **"Aide Desktop v1.0.0"** release was published with 9 assets:

| Asset | Size |
|---|---|
| `Aide.Setup.1.0.0.exe` (Windows installer, x64 NSIS) | 76 MB |
| `Aide-1.0.0.dmg` / `Aide-1.0.0-arm64.dmg` (macOS) | ~99 / 94 MB |
| `Aide-1.0.0.AppImage` / `-arm64.AppImage` (Linux) | ~104 MB each |
| `aide_1.0.0_amd64.deb` / `aide_1.0.0_arm64.deb` | ~72 / 68 MB |
| `Aide-1.0.0-mac.zip` / `Aide-1.0.0-arm64-mac.zip` | ~96 / 91 MB |

Verified live through `/api/releases`. The desktop app is an Electron shell
around the live PWA (`electron/main.js`) — it loads the deployed URL, so there
is no bundled Next.js output. To publish the next one: bump
`electron/package.json`, push a `desktop-v<semver>` tag.

### 2.14 `/downloads` desktop card (`6e94555`)

The "Windows, macOS & Linux" card no longer says the builds are "in progress".
It renders the newest `desktop-v*` release from `/api/releases`: a version
badge, release date, and every asset with a friendly label (Windows installer,
macOS Intel / Apple Silicon, Linux AppImage / package), its file name, size and
a direct download button. Falls back to the old copy when no desktop release is
published, so the page cannot claim a build that does not exist.

### 2.15 Accent themes (`57c9998`)

Settings → **Appearance** offers a light/dark picker and five accent palettes:
**Plum** (the default), **Ocean**, **Forest**, **Sunrise**, **Graphite**.

- Each accent overrides only the `--primary` trio through a `data-theme`
  attribute on `<html>`, with light *and* dark variants defined in
  `globals.css`. They sit after the `.dark` block so an explicit palette beats
  the default in both modes. Surfaces, text and outlines stay shared, so every
  palette is usable in either mode.
- The choice persists to `localStorage` under `accent` and is applied **before
  first paint**: the inline script in `layout.tsx` now reads the accent too, and
  it honours `prefers-color-scheme` (it previously defaulted to dark, which
  disagreed with `ThemeProvider`'s system-preference default — a small flash
  bug fixed in passing).
- `ThemeProvider.tsx` exports `ACCENTS` (id, label, swatch hex) and manages both
  `theme` and `accent`. The sidebar's quick light/dark toggle is unchanged and
  orthogonal to the accent.
- The scrollbar tint and the `theme-color` meta tags now follow the accent, so
  the PWA status bar and taskbar tile match the chosen palette.

### 2.16 New user guide (`7078bf0`)

`/docs/getting-started/new-user-guide` is a day-one walkthrough: create the
account, pick a theme, add categories and products, ring up the first sale,
share the receipt, work offline, turn on notifications, install, and know where
the data lives. It is grounded in the real handlers (capability-token receipts,
split payments, in-app notifications) and links to the detailed pages rather
than duplicating them.

Registered in `DOC_PAGES` as the first "Getting started" page after the index,
so the sidebar, pager and sitemap all followed from the registry — the sitemap
went from 29 to 30 URLs. `/help` now leads with a "New here? Start with the new
user guide" CTA, and the docs index's "New here?" note points at it.

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

**2026-10-01, docs + CI + release audit:**

- `npx tsc --noEmit` — clean across the whole docs route/component set.
- `npm run build` — 24 docs paths pre-rendered (23 SSG + `/docs` index).
- Registry/filesystem cross-check: 24 files, 24 registry entries, **no missing, no orphans**.
- Live, all **24** doc URLs return `200`; an unregistered slug returns `404`.
- Live: unique `<title>` per page, **exactly one** self-referencing canonical each,
  `BreadcrumbList` JSON-LD present on every page.
- Live sitemap: **29 URLs** (5 pre-existing + 24 docs).
- Live: `/docs` linked from the landing nav, the footer, `/help` and `llms.txt`.
- Live: sidebar SSR renders the correct `aria-current="page"` item.
- CI on `6f67e64`: **Android CI success**, Desktop **success** on all three platforms,
  `android-release.yml` **fails in 0s** (see 4.1).
- Release audit: Windows/macOS/Linux artifacts exist but **no `desktop-v*` tag has ever
  been pushed**, so nothing is published; **zero `.exe` assets** exist (see 4.5).

**2026-10-02, desktop release + themes + new user guide:**

- `desktop-v1.0.0` run `36987558964`: Windows (1m59s), macOS (2m02s), Linux
  (3m35s) all **success**; `Publish desktop release` (28s) created a public
  release with 9 assets. Confirmed with `gh release view` and live
  `/api/releases`.
- `npx tsc --noEmit` clean; `next lint` only the 2 pre-existing warnings.
- `npm run build` — green, **43** static pages (the new docs page added one) and
  `new-user-guide` pre-rendered.
- Live: `/help` 200 with the new CTA, `/docs/getting-started/new-user-guide`
  200, sitemap **30 URLs** including it.
- Live: `/downloads` no longer renders "still in progress"; the desktop card
  lists the real builds.

---

## 4. Known issues / not done

### 4.1 GitHub Actions is green, except one workflow that never registered

Re-verified on `6f67e64` (Android CI run `36917367806`, 1m16s):

| Workflow | Status | Note |
|---|---|---|
| **Android CI** | PASS - `build` **success** | The old `testDebugUnitTest` failure is fixed; this gate is now clear |
| **Desktop App Release** | PASS - Build macOS / Windows / Linux all **success** | `Publish desktop release` is **skipped** by design (see 4.5) |
| **`.github/workflows/android-release.yml`** | FAIL - **fails in 0s with no log** | See below |

**This does not affect the web app** - that deploys through Vercel, not Actions.

#### The `android-release.yml` failure is a workflow-file problem, not Gradle

The run says so directly:

```
X This run likely failed because of a workflow file issue.
```

The proof is in the API - GitHub never read the `name:` key:

```bash
gh api repos/oliver4441/aide/actions/workflows/android-release.yml
# {"name":".github/workflows/android-release.yml", ...}   <- name is the FILE PATH
# {"badge_url":".../workflows/.github/workflows/android-release.yml/badge.svg"}
```

Compare `android-ci.yml` and `release-desktop.yml`, which report `Android CI` and
`Desktop App Release`. `android-release.yml` has reported its own **path** as its
name since `created_at: 2026-09-07` - **this workflow has never once run**.

That also explains the other oddity: a run appears on *every* push even though the
file has not changed since `b50d7e6`. The file only triggers on `v*` tags and
`workflow_dispatch`, so a push-triggered run is impossible unless the file is being
rejected outright.

**Still unresolved.** The file is byte-identical on `master` (md5 verified), pure
ASCII, no BOM, no CRLF, no tabs, and parses cleanly under a standard YAML parser.
Whatever GitHub's stricter validator objects to is not surfaced through `gh` - only
the Actions UI shows it. Next step: open the run in a browser, or bisect by
replacing the file with a minimal skeleton and adding steps back.

### 4.2 No signed release APK is published, and the download button serves a debug build

Two separate problems, both live today.

**(a) The signing workflow has never run** - see 4.1. `android-release.yml` is
rejected by GitHub, so the `v*`-tag path that would build a signed APK is dead.
The secrets (`ANDROID_KEYSTORE_BASE64`, `ANDROID_STORE_PASSWORD`,
`ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`) are also unconfigured, which would
skip `assembleRelease` even if it did run.

**(b) The public download is a debug APK.** `/api/latest-release` picks the
newest stable release (v1.0.1) and its only asset is `app-debug.apk`:

```json
{ "version": "1.0.1", "versionCode": 0, "tag": "v1.0.1",
  "downloadUrl": ".../releases/download/v1.0.1/app-debug.apk",
  "apkName": "app-debug.apk", "sizeBytes": 4795842 }
```

`/downloads` links to exactly that URL, so every user who taps "Download the APK"
gets an unsigned debug build. Note `versionCode: 0` - the tag `v1.0.1` has no
`+N` suffix, so the API's `parseInt(... || "0")` yields 0.

Also worth knowing: `v1.0.0` ships **both** `aide-release.apk` and
`app-debug.apk` at the byte-identical size (4,145,362), which suggests the
"release" asset is a debug build that was simply renamed.

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

### 4.5 Windows EXE — RESOLVED (2026-10-02)

The desktop release is published. Tag `desktop-v1.0.0` ran the release job and
shipped `Aide.Setup.1.0.0.exe` alongside the macOS and Linux builds (§2.13), and
`/downloads` now lists the real builds with working download links (§2.14). The
`/downloads` metadata no longer promises a file that does not exist.

Two things from this area are still open:

- **Desktop checksums are not in `apk-checksums.json`**, so those 9 assets show
  "checksum unavailable" in the Versions & checksums section. The fix is to
  download the release assets, `sha256sum` them, and add a `desktop-v1.0.0` map
  to `public/apk-checksums.json`. Better: compute the hashes inside the release
  workflow after the release is published, so future tags never need manual
  work.
- **The installer is unsigned.** There is no code-signing certificate, so
  Windows SmartScreen warns on first run. Acceptable while the certificate costs
  money, but revisit if it is costing installs.

### 4.5b Tag pushes no longer trigger workflows (open, GitHub-side)

**`android-release.yml` is fixed** (§2.17) and publishes correctly — but the
trigger is unreliable, so a release cannot be published by tagging alone.

Observed on 2026-10-02: pushing `desktop-v1.0.0` at 09:03 **did** start a run.
From 15:23 onward, pushing `v1.0.2+2` and then `v1.0.2` created **no runs at
all** — no workflow, zero jobs. Branch pushes to `master` kept working the whole
time, and GitHub's status page reported Actions as operational.

A deliberately minimal probe workflow (`tag-probe.yml`, plain filename, ten
lines, byte-identical to local, `actionlint` clean, deleted afterwards) was also
rejected on arrival: it registered under its **file path** instead of its name,
its push run failed in **0s with no jobs**, and it could not be dispatched. The
same symptom the broken `android-release.yml` had. Files that already exist are
fine — editing `android-release.yml` and `release-desktop.yml` today registered
and ran normally — so this affects **newly added** workflow files specifically.

**Workaround that is proven to work:** dispatch against the tag.

```bash
gh workflow run android-release.yml --repo oliver4441/aide --ref v1.0.2 -f version=1.0.2
```

With `--ref <tag>`, `github.ref` is `refs/tags/<tag>`, so the release and
checksum steps pass their `startsWith(github.ref, 'refs/tags/')` gates exactly
as they would on a real tag push. `v1.0.2` was published this way.

Worth checking in the GitHub UI (**not** visible to this token, which lacks
Administration read): repository **Settings → Actions → General** — "Disable
actions", the allowed-actions list, and any organisation-level workflow policy.

### 2.17 Android release pipeline repaired (2026-10-02)

Three defects, all fixed and verified:

1. **The workflow never registered.** Two steps declared action inputs at the
   *step* level instead of under `with:`. That collided with the step's own
   `name:` key, and duplicate keys in one mapping are a hard error for GitHub's
   Actions parser — so the whole file was rejected, which is why it reported its
   path as its name and failed in 0s on every push.
2. **Release builds were silently unsigned.** The decode step gated on
   `env.ANDROID_KEYSTORE_PATH`, populated from a secret named
   `ANDROID_KEYSTORE_PATH` that **does not exist** (the real one is
   `ANDROID_KEYSTORE_BASE64`). The condition was always false, so the keystore
   was never written and `build.gradle.kts` fell back to an unsigned build. The
   secrets are now mapped to env vars and the step gates on one that exists,
   with a warning annotation when there is no keystore at all.
3. **Version drift.** Gradle still said `versionCode = 1` / `1.0.0` while GitHub
   was tagged `v1.0.1`. Now `versionCode = 2` / `1.0.2`.

`v1.0.2` is published: `aide-release.apk`, 1.43 MB, signed with the **new**
certificate (`notBefore Oct 2 2026` → `notAfter Feb 17 2054`), replacing the
original whose 7-day validity had expired on 14 Sep 2026. `/downloads` now
serves the signed APK instead of `app-debug.apk`. Signing material lives
outside the repository in `~/.aide/` (mode 700, files 600) and `*.jks` is now
ignored by git.

> The tag is `v1.0.2` without a `+N` suffix, so `/api/latest-release` reports
> `versionCode: 0` even though the APK's real versionCode is 2. Nothing on the
> page displays that field, but the API docs describe the `+N` convention — see
> the open question in §7.

### 4.6 Credentials: what was found, what was fixed, what still needs you

A full sweep was run on 2026-10-01 over **every blob in git history** (1,334 blobs),
not just the working tree. Four separate leaks were found. Three are now fixed in
`HEAD`; **all of them still exist in git history, so every one needs rotating.**

| # | What leaked | Where | State |
|---|---|---|---|
| 1 | **Admin account email + password** (`admin@aide.co.ke` / `admin123`) | `public/llms.txt` (published!), `AGENT_AUTH_LOG.md`, `prisma/seed.ts` | Redacted from `HEAD`. **Rotate the account.** |
| 2 | **Business account email + password** (`oliver@aide.co.ke` / `password123`) | same three files, plus `AGENT_ANDROID_LOG.md` | Redacted from `HEAD`. **Rotate the account.** |
| 3 | **Google/Firebase API key** (`AIzaSyAs7C…`) | `AGENT_AUTH_LOG.md` (still in `HEAD` until this fix), and historically `src/lib/firebase.ts` + `src/app/layout.tsx` | Redacted from `HEAD`. **Revoke the key** in Google Cloud. |
| 4 | Neon project host id (`ep-bil…`) | `AGENTS.md` | Left in place - it is an identifier, not a credential |

Leak 1 and 2 are the serious ones: `public/llms.txt` is served from the site root
and is **designed to be read by crawlers and LLMs**, so those two working logins
were published to the internet and indexed. `prisma/seed.ts` also *created* the
accounts with those exact passwords, so they are not placeholders - they are real.

#### What this commit changes

- `prisma/seed.ts` no longer hardcodes credentials. It reads `SEED_ADMIN_EMAIL`,
  `SEED_ADMIN_PASSWORD`, `SEED_USER_EMAIL`, `SEED_USER_PASSWORD` from the
  environment and **throws if any is missing**. A seed file that bakes passwords
  into source is the reason they reached git in the first place.
- `AGENT_AUTH_LOG.md` and `AGENT_ANDROID_LOG.md`: credentials replaced with
  `<REDACTED-2026-10-01>` markers, with a note explaining why.
- `.env.example`: the real admin email replaced with a placeholder, the new seed
  variables documented, and a warning added that `ADMIN_EMAILS` must always be set.

#### What you still have to do

Rotation is the only thing that actually closes this. Deleting a value from `HEAD`
does **not** remove it from history, from existing clones, or from web caches.
**Do this in this order:**

1. **Rotate the two accounts** in production (or delete them). They were public.
2. **Revoke the Google/Firebase API key** in Google Cloud Console. Firebase web
   config is arguably public by design, but it was used for Auth, so revoke it -
   Firebase Auth is now unused anyway.
3. **Rotate the Neon personal access token** in `~/.config/neon` on the dev machine,
   then wipe the file. It was never committed, but it is a live credential sitting
   in plaintext on disk.
4. **Rotate `NEXTAUTH_SECRET`** if you have any reason to think it leaked - the
   sweep found no copy of it in history, but rotating it invalidates all sessions,
   so do it in a quiet moment.
5. Only *after* rotating, consider rewriting history with `git filter-repo`.
   Rewriting is disruptive (every clone must be replaced, every open PR breaks) and
   does nothing on its own - **rotation is the part that matters.**

#### Still open, not credentials

- A **Neon personal access token** sits in `~/.config/neon` on the dev machine.
- Scratch DB scripts live in `/tmp/nrtest` - safe to delete.
- **`prisma/seed.ts` is destructive.** It runs `deleteMany()` on reviews, sync
  conflicts, sales, sale items, products, categories, memberships and businesses
  before inserting. It is a dev fixture and must never be pointed at production.
  A guard would be worth adding.
- **`ADMIN_EMAILS` has a hardcoded fallback** to a personal Gmail address in
  `src/lib/auth.ts` and `src/lib/mobileAuth.ts`. If `ADMIN_EMAILS` is ever unset,
  that address silently gets the admin role. It was left alone deliberately -
  removing it before `ADMIN_EMAILS` is confirmed set in the Vercel environment
  would lock the owner out of `/dashboard/admin`.

### 4.6b Receipt sharing — fixed, and it depends on NEXTAUTH_SECRET

Shared receipts were broken for the people they exist for. The QR on every
receipt and the "Send to Customer" button both point at `/r/<saleId>`, which
called `/api/receipts/<saleId>` **without credentials** against a route that
requires them and returns `401`. The fallback read the viewer's own IndexedDB,
which never has the shop's sale, so a customer scanning at the till saw "Could
not load receipt". It only ever worked for the owner, already signed in.

Making that route public was not an option. Sale ids are minted on the device:

```js
const saleId = `sale_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
```

A millisecond timestamp plus six base36 characters from a non-cryptographic
source — enumerable. A public route keyed on the id alone would have published
every customer's receipt to anyone walking a plausible trading window.

Fixed in `5a24758` with a capability token:

| Route | Auth | Purpose |
|---|---|---|
| `GET /api/sales/[id]/share` | Bearer or session, tenant-scoped | Mints `/r/<id>?t=<hmac>` |
| `GET /api/public/receipts/[id]?t=` | **none** | Serves the receipt, token required |

The token is an HMAC-SHA256 of the sale id under `NEXTAUTH_SECRET`, namespaced
(`aide:receipt:v1`) so it cannot be replayed elsewhere, and compared with
`timingSafeEqual`. A missing or wrong token returns the **same 404** as a sale
that does not exist, so ids cannot be probed. The public projection omits
`cost`, `profit`, `notes` and `businessId` — margin is the merchant's, not the
customer's.

Verified live: no token → `404`, bad token → `404`, mint unauthenticated →
`401`.

> ⚠️ **This depends on `NEXTAUTH_SECRET` being set in the Vercel environment.**
> `src/lib/shareToken.ts` throws without it, which is deliberate — but it means
> share links break loudly rather than silently signing with a default. Confirm
> it is set before shipping. Rotating the secret invalidates every previously
> printed QR code.

The POS mints the link when a sale completes and caches it in localStorage
against the sale id, so an offline reprint still prints a working QR.

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

**Releases** — do not just `git push origin vX.Y.Z`: tag pushes do not trigger
workflows in this repo (§4.5b), so that silently does nothing. Use:

```bash
scripts/publish-release.sh v1.0.3 --dry-run   # check the plan, change nothing
scripts/publish-release.sh v1.0.3              # tag, dispatch, watch, verify
scripts/publish-release.sh desktop-v1.0.1
```

It picks the right workflow from the tag shape, refuses a tag that disagrees
with `android/app/build.gradle.kts` or `electron/package.json`, refuses to run
without the four signing secrets, then pushes the tag, dispatches against it,
waits, and prints the published assets. `v1.0.2` was published by hand before
this existed; the same two commands it runs are what it automates.

```bash
# Refreshing checksums for a release published another way
gh workflow run release-desktop.yml --repo oliver4441/aide -f checksums_tag=desktop-v1.0.0
```

> Builds on this machine exceed the ~3-minute foreground command limit. Run them detached:
> `nohup npm run build > /tmp/build.log 2>&1 &` then poll the log.

---

## 7. Suggested next steps

**Security first** — these are ordered by blast radius, not convenience:

1. **Rotate every credential that ever reached git history** (§4.6). Deleting the
   value from `HEAD` does not remove it from history, clones, or caches. Then run a
   full-history secret sweep (`gitleaks detect --source .` or `trufflehog git .`) —
   assume more than the one in `llms.txt` leaked, and check `.env`, CI logs and the
   Neon token too. Only *after* rotating is history rewriting (`git filter-repo`)
   worth considering; rotation is the part that actually closes the hole.
2. **Rotate and wipe the Neon token** in `~/.config/neon`, and delete `/tmp/nrtest`.
3. ~~**Remove `firebase` and `google-auth-library`**~~ — **done**, both uninstalled,
   lockfile and `node_modules` clean, build still green. This does not block FCM
   later: FCM needs the Admin SDK and a service account, not these client libraries.

**Then correctness of what is already published:**

4. ~~**Decide the Windows question**~~ — **done** (2026-10-02): `desktop-v1.0.0`
   published `Aide.Setup.1.0.0.exe` and `/downloads` lists the real builds
   (§2.13, §2.14). Remaining from this area: add the desktop checksums to
   `apk-checksums.json`, ideally computed by the release workflow (§4.5).
5. ~~**Fix `android-release.yml` and sign the APK**~~ — **done** (§2.17): the
   workflow registers, the keystore is used, `v1.0.2` is published signed, and
   `/downloads` serves `aide-release.apk`. Two things remain: **tag pushes no
   longer trigger workflows at all** (§4.5b) — publish with
   `gh workflow run android-release.yml --ref <tag>` until that clears — and
   decide whether `/api/latest-release` should stop reporting `versionCode: 0`
   for tags without a `+N` suffix (§2.17).
6. **Android v2 notifications** (extends the existing Compose app, per the agreed
   architecture):
   - Phase 2 — native local notifications + `NotificationManager` channels
   - Phase 3 — FCM remote delivery, driven by the backend event model
   - Phase 4 — deep links (`action` + `product_id` -> open the right screen), badges,
     notification preferences
   - Use an `event_id` idempotency key so server, PWA and Android never show a duplicate
   - FCM is the *delivery* mechanism only — the backend notification/event model stays
     channel-independent so the same event can serve PWA, Android, email later

**Then maintenance:**

7. **Reconcile `prisma/schema.prisma` with production** so future migrations are safe.
8. **Revisit the previous features** (Customer, Expense, Staff, Invoice, PO, AI).
9. **Server-side scheduled jobs** for daily summaries / recurring low-stock checks — the
   `POST /api/notifications` route already respects preferences, so a cron can drive it.
10. **Extend `/docs`** as features land. Add the page to `DOC_PAGES` in
    `src/lib/docs-nav.ts` and drop the Markdown in `src/content/docs/`; the sidebar,
    pager and sitemap all follow from the registry.
11. ~~**Refresh this document**~~ — **done** for the 2026-10-02 session; refresh
    again after the next one.
