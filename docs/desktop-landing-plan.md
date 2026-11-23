# Desktop Build + Landing Changelog & Download — Plan

**Branch:** `feat/desktop-landing-changelog`
**Status:** Plan — approved before implementation

---

## Goal

1. Ship a real **desktop app** for Windows / macOS / Linux, moving the landing
   page from a "desktop = coming soon" position to a first-class download.
2. Add a **changelog** + **download button** to the landing page, alongside the
   Android APK entry point.
3. Wrap the web app with **Capacitor** for the desktop build.

---

## What already exists (context — no re-invention)

- An **Electron shell** already ships (`electron/main.js`, `electron/package.json`,
  `electron-builder` targets for win/mac/linux) and a **desktop release already
  exists on GitHub**: `desktop-v1.0.0` (2026-10-02) with `.exe`, `.dmg`,
  `.AppImage`, `.deb` assets.
- **BUT** the current Electron shell is a thin wrapper that loads the **live PWA
  URL** (`https://aide.omixsystems.store`) — it is not a real local app. This is
  what the Capacitor work replaces.
- Landing page already has `DownloadSection` + `DownloadButton`, but desktop
  users are told "coming soon" (`getRecommendedBuild` returns `kind: "coming-soon"`
  for win/mac/linux/desktop).
- `/downloads` page and GitHub release API routes already exist (`/api/releases`,
  `/api/latest-release`). The release list already contains both APKs and the
  desktop release.
- Android uses a **GitHub-release-driven model**: release body = changelog,
  `CHANGELOG.md` uploaded as an asset, SHA-256 checksums published alongside.

---

## Decisions (the important part)

### 1. Capacitor for the desktop app — replace the thin Electron shell

- **Web view = Capacitor** (through `@capacitor/electron` + `capacitor/cli`),
  which packages the *local* Next.js static/served build rather than pointing at
  a remote URL. This is the "wrap the web app with Capacitor for the desktop"
  requirement.
- **Caveat to verify up front**: Capacitor's official desktop support is
  **Electron-based** (`@capacitor/electron`) and is legacy/experimental. Two
  viable paths:

  - **Path A (recommended): Capacitor for native packaging, Electron as the
    runner.** Use `@capacitor/core` for the in-app API surface (filesystem,
    offline storage, updates) and `@capacitor/electron` to produce the desktop
    app from the local web build. Accept that this effectively *replaces* the
    current `electron/main.js` with Capacitor's Electron template.
  - **Path B (fallback): keep/upgrade the current Electron shell** to load a
    *local* build (`next export` static or local `next start`) instead of the
    remote URL, and skip Capacitor. Lower risk, but does not satisfy the
    "wrap with Capacitor" ask.

  **Recommendation: start with Path A; fall back to B if Capacitor's desktop
  path is too immature.** Regardless of path, the key improvement over today is
  **bundle a local build — no network dependency at launch**.

### 2. Desktop release pipeline — mirror the Android release model

- Desktop tags stay in the **`desktop-v*` namespace** (already handled by
  `release-desktop.yml` + `parseVersion`/`parseVersionCode`).
- **Publish checksums** for desktop artifacts next to the binaries (currently
  only the Android APKs get `.sha256` assets). The `/downloads` page already
  shows SHA-256 — we extend the note to cover desktop files.
- **Version the desktop release properly.** Current: `desktop-v1.0.0`. Keep,
  but add an update story (see below).

### 3. Automatic desktop updates (must-have for a real desktop app)

- **Electron path:** add `electron-updater` + `autoUpdater` so the desktop shell
  checks the GitHub `latest` release (`desktop-v*`) and downloads delta/full
  updates. Electron-builder + `publish: { provider: "github" }` supports this.
- **Capacitor path:** Capacitor has no built-in auto-update; use the same
  release-check pattern the Android app uses (poll GitHub, offer update dialog).
- **Out of scope for this iteration if too big:** signed auto-update on macOS
  (needs a Developer ID cert). Ship unsigned first (like the current desktop
  release), note the caveat in the changelog/downloads page.

### 4. Landing page changes

- **Add a desktop** presence in `DownloadSection`: "Windows · macOS · Linux" +
  a **download button** that resolves to the newest desktop artifact by OS.
- **Keep the Android APK button** as-is (it must not regress).
- **Add a Changelog** section on the landing page (or a dedicated
  `/changelog` route + a landing link), sourced from the GitHub release bodies —
  consistent with how `/downloads` and `/api/releases` already work.
- Redesign: light-touch, keep the Newsprint design system + `border-rule` /
  `bg-ground` / `text-ink` / `text-secondary` / `text-accent` tokens. No new
  theme.
- `getRecommendedBuild` / `getDeviceType` in `src/lib/device.ts` already detect
  win/mac/linux/desktop — extend to return a **real** desktop download URL
  instead of the `coming-soon` kind.

### 5. /downloads page

- Add a **Desktop download card** (Windows `.exe`, macOS `.dmg`, Linux
  `.AppImage`/`.deb`) next to the Android / iOS cards, with SHA-256 for each
  asset.
- The release list section already shows *all* releases (Android + desktop) —
  verify it surfaces desktop artifacts correctly and improve if needed.
- Update the "Detected: <device>" footer logic so desktop visitors get the
  right primary CTA.

### 6. Changelog

- **Source of truth:** GitHub release bodies (same as Android).
- **Landing:** add a compact "What's new" changelog block (most recent 3–5
  releases, across Android + desktop).
- **Dedicated page:** `/changelog` (optional but recommended) mirroring
  `/downloads` — full history, filterable, with desktop & Android version notes.

---

## Implementation order

1. `src/lib/desktop.ts` — desktop release helpers (pick newest desktop release,
   map OS → correct asset URL + checksum).
2. `src/app/api/desktop-release/route.ts` — newest desktop release (non-Android)
   endpoint, mirroring `/api/latest-release`.
3. `src/lib/releases.ts` — shared changelog helpers (fetch both release families,
   shape for display).
4. `src/components/landing/DownloadSection.tsx` — add desktop card + download
   button; keep Android button.
5. `src/components/landing/ChangelogSection.tsx` — "What's new" block on landing
   (sourced from releases).
6. `/changelog` page (optional) + route.
7. `/downloads` — desktop card + checksums + device-aware CTA.
8. `src/lib/device.ts` — `getRecommendedBuild` returns real desktop link, drop
   `coming-soon` for desktop.
9. **Capacitor integration** (the big one):
   - Install `@capacitor/core` + `@capacitor/electron` + `capacitor/cli`.
   - `npx cap init`, add Electron platform, point at the local web build.
   - Solution to **offline storage**: bundle the Next.js build locally
     (`next export` static or local server) so IndexedDB works without a server.
   - Verify Dexie/IndexedDB still works inside the Capacitor webview.
10. Extend `release-desktop.yml` (or add a capacitor step) to:
    - build desktop artifacts from the Capacitor project,
    - attach `.sha256` checksums for every binary,
    - publish a `CHANGELOG.md` asset (like Android),
    - tag as `desktop-vX.Y.Z`.
11. Auto-update wiring (electron-updater or Capacitor release check).
12. Landing microcopy: iOS "PWA", Android "APK", desktop "Windows · macOS ·
    Linux" — each with a real CTA, no more "coming soon".

---

## Risks / open questions

- **Capacitor desktop maturity**: official support is experimental. Mitigation:
  Path B fallback keeps the current Electron shell but points it at a local
  build — that alone delivers a true desktop app with no network dependency.
- **macOS signing**: unsigned builds warn on launch; auto-update requires a
  Developer ID. Ship unsigned first, document the caveat.
- **Offline/IndexedDB in a packaged webview**: the remote-URL Electron shell
  currently works online-only; bundling a local build must preserve Dexie
  persistence. Needs a spike in step 9.
- **Release ordering**: `/api/latest-release` already picks "newest release with
  an APK" rather than literally "latest" — the desktop release must not break
  that (it won't; desktop assets are not `.apk`).
- **Anti-pattern to avoid**: don't let the desktop build call home to the PWA
  URL — that's what the current Electron shell does and it is the main thing we
  are replacing.

---

## Acceptance criteria

- [ ] Desktop app listed on the landing page with working download buttons for
      Windows / macOS / Linux, alongside the Android APK button.
- [ ] A changelog (landing block + `CHANGELOG.md` on GitHub releases) sourced from
      release bodies.
- [ ] A desktop release reachable on GitHub with `.sha256` checksums for every
      binary.
- [ ] The packaged desktop app runs from a **local** web build (no network
      dependency at launch) — Capacitor-wrapped.
- [ ] `/downloads` shows desktop + Android entries with checksums and
      device-aware CTAs.
- [ ] Newsprint design tokens preserved; no new color/theme system.
