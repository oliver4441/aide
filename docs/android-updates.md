# Android signing, GitHub updates, and release operations

## Identity and trust

- Production application ID: **`com.omix.aide`**, unchanged. Minimum Android:
  **7.0 / API 24**. Debug builds are now **`com.omix.aide.debug`**, so a developer
  key cannot accidentally replace production or its local data.
- The existing production signing certificate is pinned in
  `android/release-certificate.sha256`:
  `a9a9b088764e3a612df549d4a675bd4e5540321748227c27aba9f51548ac514a`.
  This is a public certificate fingerprint, **not** a signing secret. It matches
  the certificate recorded for v1.0.12; release validation independently reads
  and verifies the previous APK, not just its release notes.
- Keep the **same private key**, alias, and passwords in the existing GitHub
  Actions secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_STORE_PASSWORD`,
  `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Keep an encrypted offline backup
  of that key outside Git. Never generate a replacement key to fix a CI error.
- Gradle refuses release builds with absent/incomplete signing configuration,
  an unreadable/expired certificate, or a fingerprint that differs from the
  committed pin. Explicit unsigned CI builds use
  `-PaideAllowUnsignedRelease=true`; those APKs are never published. Release
  signing enables v1/v2/v3; v2 is verified with minSdk 24. CI also checks APK
  identity, non-debuggability, zip alignment (including 16 KB native-library
  alignment), and real installation/upgrades on API **24 and 35**.
- A legacy/debug copy signed with **another key cannot be made upgrade-compatible
  retroactively**. The updater never uninstalls it or clears data. Export local
  data before any manual migration; do not uninstall merely to retry a download.

## User experience

1. On launch/resume, refresh the installed version through `PackageManager`.
   Check GitHub's stable Android releases asynchronously, at most once per **six
   hours**, persisted across restarts. Failed automatic attempts are throttled
   too; a user-initiated Settings check bypasses the throttle. No startup network
   request blocks opening the app. Debug builds do not request production updates.
2. Parse the release's `android-update.json` using a JSON parser and strict
   schema, identity, numeric-range, date, URL, checksum and certificate checks.
   Desktop releases, drafts and prereleases are excluded. Legacy releases without
   a manifest are not install candidates. APKs always come from this repository's
   HTTPS GitHub Releases URLs; only HTTPS redirects to known GitHub asset hosts
   are followed. No GitHub token is embedded in the app.
3. Compare **Android build numbers**, never version strings. Equal/older releases
   do not prompt. Choose an exact ABI in the device's preferred order, then a
   universal APK. Incompatible Android/ABI combinations explain the issue rather
   than downloading a wrong APK. The current release pipeline intentionally ships
   one universal APK; the client supports per-ABI manifests for future builds.
4. A Material 3 dialog shows installed/new versions, release date, download size
   and full release notes. Optional updates offer **Update now / Later**. Later
   snoozes the dialog for six hours for that version; the small in-app entry point
   remains available. No APK is downloaded until the user chooses Update now.
5. WorkManager owns the download, independent of activity rotation or navigation.
   It waits for connectivity and can keep running while the app is backgrounded,
   subject to Android's scheduling/battery rules. Progress shows bytes and percent.
   Network, disk, timeout, interrupted-transfer and verification failures have a
   retry state. Retries restart from byte zero, not from an untrusted partial.
   Regular work ends gracefully before WorkManager's ten-minute budget; it is
   not an unlimited foreground download service.
6. Only exact-size, SHA-256-verified bytes become an `.apk` via an atomic rename.
   `.part` files are removed on failure/cancellation and discarded on restart.
   Before handoff, verify again: checksum, package, version, signing certificate
   (both the archive and installed app), and minimum Android version. A missing
   or evicted cache file requires a fresh download, never an unverified handoff.
7. On Android 8+, explain **Install unknown apps** and open the system setting
   only on user request. Returning with permission granted exposes **Install
   update**; it never launches installation automatically. Users can revoke that
   source permission afterwards. API 24/25 use Android's older installer flow.
8. Use a narrow, non-exported FileProvider with a temporary read grant to hand
   the verified APK to **Android's installer**. Android ALWAYS retains final
   confirmation. No root, device-owner, shell, silent-install or uninstall code
   exists in the application. A cancellation/rejection is not reported as success.
   On return (including process replacement), re-read the installed version;
   clear completed download state only when the new build is actually installed.

## Manifest contract (schema 1)

`android-update.json` is attached to **each Android GitHub release**, together
with the signed APK, its `.sha256`, and `CHANGELOG.md`:

```json
{
  "schemaVersion": 1,
  "packageName": "com.omix.aide",
  "versionName": "1.0.13",
  "versionCode": 1013,
  "minimumSupportedVersionCode": 1,
  "mandatory": false,
  "minSdk": 24,
  "publishedAt": "2026-11-03T12:00:00Z",
  "releaseNotes": "Safer updates and installation fixes.",
  "releaseUrl": "https://github.com/oliver4441/aide/releases/tag/v1.0.13+1013",
  "certificateSha256": "a9a9b088764e3a612df549d4a675bd4e5540321748227c27aba9f51548ac514a",
  "assets": [
    {
      "abi": "universal",
      "url": "https://github.com/oliver4441/aide/releases/download/v1.0.13+1013/aide-1.0.13.apk",
      "sizeBytes": 8362269,
      "sha256": "<64 lowercase hex characters calculated from the actual signed APK>"
    }
  ]
}
```

The example size/hash are illustrative; release automation calculates both from
verified bytes. Supported ABI keys: `arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`,
`universal`. An ABI must not occur twice. Unknown schemas and malformed manifests
are rejected, not treated as authoritative "up to date" results.

### Mandatory vs optional

The reviewed policy is `android/update-policy.json`, defaulting to optional:

- `mandatory: true` requires the new release for **all older builds**.
- Otherwise, an installed code below `minimumSupportedVersionCode` must update.
- Current/newer builds are never blocked or downgraded.
- Mandatory dialogs cannot be dismissed/deferred into the app. **Close app** is
  still available, and installation still needs Android's approval. Known,
  cached mandatory policy survives offline checks/errors; a first-time offline
  device cannot discover a requirement it has never downloaded.

Use mandatory policy sparingly: this is an offline-first business app. Publish a
compatible universal APK and adequate release notes before retiring old builds.
The GitHub account/release metadata is trusted for update policy; an APK's pinned
signer and checksum are independently checked before installation.

## Versions and publication

- `android/version.properties` holds a truthful local-development fallback.
  Release workflows inject the selected name/code through Gradle properties.
- `scripts/android-release.mjs` is shared by CI, auto-release and the manual
  publisher. Build numbers are **independent monotonically increasing integers**.
  Do not remove dots to generate one: `1.0.99 → 1.1.0` otherwise becomes a downgrade.
  Auto-release uses the highest recorded production code + 1 and an explicit
  `v<major>.<minor>.<patch>+<code>` tag. For example, v1.0.12 (1012) is followed by
  **v1.0.13+1013**, not by an invented semantic-version encoding.
- Unknown build numbers in the newest prior release fail progression validation;
  fix the release record rather than guessing. Published versions/codes cannot
  be reused or overwritten.
- A successful master Android CI triggers the existing auto-release workflow.
  Manual tag pushes publish too. Public publication is restricted to master
  history and serialized. Release tests, certificate verification and real
  **previous signed production APK → new signed APK** upgrades must pass first.
  Upgrade tests do not uninstall or permit downgrades; they verify the retained
  package UID and a private-data marker, and check startup for crashes.
- Assets are first uploaded to a **draft**. Size/state of the APK, checksum,
  manifest and changelog must all match before the draft is made public.
  Never use `--clobber` to replace a published APK. If an upload fails, inspect
  the incomplete draft/tag, then deliberately resolve it before retrying.
- Website checksums are published after release; the Android updater does **not**
  depend on a Vercel deploy or the website's `/api/latest-release` endpoint.

### Validate the real signing setup without publishing

Repository branch pushes on `arena/**`, `feat/*`, and `fix/*` run the signed
release validation path automatically. They **never publish or create a tag**.
A maintainer with Actions dispatch permissions can also run:

```sh
gh workflow run android-release.yml --ref <review-branch> \
  -f version=v1.0.13+1013 -f publish=false
```

The default for manual dispatch is intentionally **false**. Auto-release passes
`publish=true` explicitly. A production tag push also publishes after verification.
No repository-variable warning can bypass the committed certificate pin.

## Tests

```sh
npm run test:release
cd android
./gradlew testDebugUnitTest testReleaseUnitTest lintDebug \
  -PaideAllowUnsignedRelease=true
./gradlew connectedDebugAndroidTest
```

Coverage includes manifest/escaped-note parsing, invalid/missing/oversized
metadata, URLs/signers, optional/mandatory thresholds, numeric version comparison,
ABI order/fallback/incompatibility, checksum success/tampering, HTTP/network
failures, failed/interrupted/truncated/oversized downloads, cancellation and
process-kill leftovers, safe retries/cache reuse, no-release/current/newer-install
scenarios, persisted six-hour throttling, concurrent checks, manual checks,
clock rollback, cached mandatory policy and version-code boundary progression.
Native UI tests run on API 24 and 35 and cover offer/actions, mandatory state,
progress, retry, permission explanations and explicit install handoff. Production
signing and upgrade tests run separately with the real existing signing secrets.

Business data remains local-only. Update requests send no inventory, sales,
customer, account, or device identifiers to GitHub.
