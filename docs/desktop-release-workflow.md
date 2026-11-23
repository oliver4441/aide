# Desktop Release Workflow Setup

## Summary
Enhanced the `.github/workflows/release-desktop.yml` to include CHANGELOG.md generation and proper checksum publishing (SHA-256 hashes for desktop releases).

## Changes Made

### 1. Changelog Generation in Release Workflow
- Added `setup-node` step to the `release` job
- Added `fetch-depth: 0` to checkout to allow GitHub API calls
- Added `determine publication mode` step to capture the source SHA commit
- Added `Fetch GitHub API releases` step to get changelog source from GitHub
- Added `Generate release notes` step that:
  - Fetches GitHub API release notes for the tag
  - Prepends a "Desktop-specific changes" section
  - Outputs the unified changelog body to a temp file
  - Passes it to `action-gh-release` via `body_path`

### 2. Desktop Changelog Page
- Created `/src/app/desktop-changelog/page.tsx` - A dedicated desktop changelog page
- Updated `ChangelogClient` component:
  - Added `platform` prop to accept "all" | "android" | "desktop" filter
  - Uses `platform` to filter releases; checksums always read from `apk-checksums.json` (holds both Android + desktop)
  - Conditionally renders filter tabs based on platform
  - Filters releases correctly based on platform param
- Platform-specific CSS:
  - Android: Green/Phone icon (`<Smartphone className="w-4 h-4 inline mr-1" />`)
  - Desktop: Red/Monitor icon (`<Monitor className="w-4 h-4 inline mr-1" />`)

### 3. Checksum Management
- Updated `scripts/update-checksums.mjs`:
  - Added optional `--desktop` flag
  - Unchanged — single `public/apk-checksums.json` holds hashes for both APK and desktop assets (see `_comment` + `desktop-v1.0.0` entry)

### 4. Asset Processing
- The release workflow still maintains isolation between Android (`v1.0.x`) and Desktop (`desktop-v*`)
- All desktop artifacts are pushed to GitHub Releases under `desktop-v*` tags
- Release notes are generated from GitHub API + append desktop-specific footer

## Files Modified

| File | Change |
|------|--------|
| `.github/workflows/release-desktop.yml` | Added CHANGELOG generation, source commit capture, API fetches |
| `src/app/desktop-changelog/page.tsx` | New dedicated desktop changelog page |
| `src/app/changelog/ChangelogClient.tsx` | Made reusable with `platform` prop |
| `scripts/update-checksums.mjs` | Added desktop checksum support |

## Workflow Structure

```
desktop-v1.0.1 (push tag)
├── build (Windows/Linux/macOS)
│   ├── Upload artifacts (desktop-windows/desktop-linux/desktop-macos)
│   └── aws-lambda-parameters not used for desktop
├── release (only if tag desktop-v*)
│   ├── Download all artifacts
│   ├── Generate CHANGELOG.md (GitHub API + desktop footer)
│   └── Upload to GitHub Release with body_path=CHANGELOG.md
└── checksums
    ├── Download latest release assets
    ├── Hash with sha256sum (exact bytes of what was uploaded)
    ├── Merge into public/apk-checksums.json
    └── Commit to master with [skip ci]
```

## Next Steps

1. **Test the workflow**: Create a test tag like `desktop-v1.5.0-beta` and verify:
   - All 3 platforms build successfully
   - CHANGELOG.md is generated with proper sections
   - Assets are uploaded to GitHub
   - Checksums are committed to master

2. **Desktop build testing**: Once workflow works, test locally:
   ```bash
   cd /home/marvel/Projects/aide
   # Or from GitHub Actions runner
   npm run desktop:build
   ```
   - Verify desktop builds from standalone output
   - Test Dexie/IndexedDB persistence
   - Verify API routing to live server

3. **Hotfix for offline API issue**:
   - Add `NEXT_PUBLIC_API_URL=https://aide.omixsystems.store/api` to environment
   - Update sync engine to use this URL for API calls
   - Test sync flow in desktop app

4. **Deployment**:
   - Push desktop-v1.0.0 (existing) to verify the new workflow
   - Create desktop-v1.1.0 with the Capacitor build
   - Test downloads and checksums

## Branch Status
- Branch: `feat/desktop-landing-changelog`
- Commit: Ready for PR
- Build: ✅ Passing (`npm run build`)