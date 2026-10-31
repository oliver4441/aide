Releases are published to
[GitHub Releases](https://github.com/oliver4441/aide/releases) in the
`oliver4441/aide` repository. The GitHub release body is the canonical
changelog; Android release automation also uploads that same Markdown as a
`CHANGELOG.md` asset. The app and website read the release body from GitHub.

## Where the changelog lives

| Surface | Source |
| --- | --- |
| This page | GitHub Releases bodies, in summary |
| In the app | `GET /api/latest-release`, shown as an update banner |
| On the website (`/downloads`, `/api/releases`) | the full release list |
| Latest build only | `GET /api/latest-release` |

The Android app deliberately does not carry a copy of the history: it asks for
the newest release, compares its `versionCode` with its own, and shows a banner
with the download link when a newer one exists. So **publishing a release
updates every surface at once**, within the five-minute cache window described
in [Releases](/docs/api/releases), without shipping a new site build.

## Tag format

Versions follow Android's `<version>+<versionCode>` convention:

```text
v2.1.0+42
   │  └── versionCode, monotonically increasing integer
   └───── semantic version, as users see it
```

Both the leading `v` and the `+N` suffix are stripped to produce the displayed
`version`; the `+N` becomes `versionCode`. Android **requires** `versionCode`
to increase on every upload to Play, and the app compares it to decide whether
an update exists — so never reuse or rewind a code.

`versionCode` is optional in practice. When a tag carries no `+N`, the release
name (`Aide v1.0.2 (2)`, written by `android-release.yml`) supplies the number
the Gradle build actually used. If neither is present the API reports
`versionCode: null` rather than `0` — see
[Releases](/docs/api/releases). Desktop tags are `desktop-v<version>` and have
no versionCode.

## Reading the history

- In the app: the update banner shown when a newer release exists, and
  **Settings → About → Check for updates**, which reports the installed version
  and opens the newest release if there is one. There is no in-app list of past
  releases.
- On the web: [/downloads](/downloads) shows the full list, with notes and file
  sizes.
- On GitHub: the [releases page](https://github.com/oliver4441/aide/releases)
  has the full bodies, including ones with no build attached.

## Writing release notes

Release bodies are plain Markdown and are shown as-is. Keep them short and
scannable — the app renders them in a narrow column:

```markdown
## What's new
- Faster sync when the connection drops mid-sale
- Low-stock alerts now respect each product's threshold

## Fixed
- Receipt footer truncated on narrow screens
```

Headings become headings and lists become lists; anything beyond that is
displayed literally.

## Release checklist

Successful Android CI builds pushed to `master` are published automatically:

1. Merge the change to `master` and wait for **Android CI** to pass. Pull-request
   and feature-branch builds never publish a public release.
2. **Android Auto Release** increments the patch version, dispatches the signed
   release build for that exact commit, and marks the new GitHub release as
   latest. The workflow verifies the APK signature and identity, uploads the
   APK and SHA-256 file, and attaches the release notes as `CHANGELOG.md`.
3. The checksum job updates `public/apk-checksums.json`; the website and app read
   the published GitHub release automatically (within the cache window).

For an explicitly versioned release, a maintainer can still push a `v*` tag or
run `android-release.yml` manually. `scripts/publish-release.sh <tag>` provides
extra local guards for that path (clean tree, unused tag, signing secrets,
waiting for CI, and verifying the published assets).

Builds without a successfully uploaded APK and changelog are treated as failed
releases and are not considered complete.

## Notable changes

### 1.0.8 — 30 October 2026 (versionCode 108)

First APK since v1.0.7. Published by pushing the tag `v1.0.8`; asset
`aide-1.0.8.apk`.

- **Collapsible left rail** replaces the bottom navigation bar: brand mark at the
  top, 76dp icons-only collapsed and 208dp with labels, expanded by default from
  600dp width.
- **Notification chimes**: a till bell for a completed sale and the daily
  summary, a warning pair for low stock, with previews and an on/off switch.
- **Expandable alert cards**: one line per low product with units left, or the
  day's revenue, profit, average sale and payment-method split.
- **Configurable summary time** (default 18:00) instead of a hard-wired one.
- **Activity history**: bell with an unread badge, last 100 alerts, mark as read.
- **Correct home figures**: "Sales Today" counts only today, the chart covers the
  last seven calendar days, and sales after local midnight stay on their own day.
- Low-stock and summary alerts use the business's configured currency, not a
  hard-coded "KSh".

### 2.x — the offline-first client

The release line where Aide moved from a thin web client to a local-first
Android app: writes land on the device first, queue locally, and push through
`POST /api/sync` when a connection returns. Stock movements are tracked as a
ledger so concurrent edits from two devices resolve instead of overwriting.

The API grew `POST /api/sync`, `GET /api/sync`,
`POST /api/notifications/sync`, and `POST /api/auth/mobile-login` in this
period, alongside per-business scoping on every record.

### Security

- Canonical URLs corrected site-wide and auth pages removed from the index.
- A credential that had been published in an old `llms.txt` was rotated. Any
  client holding it must re-authenticate.

## Reporting an issue

If something is wrong in a build, please open an issue on
[GitHub](https://github.com/oliver4441/aide/issues) with the version from
**Settings → About**, your device, and what you expected to happen.

## Related

- [Installation](/docs/getting-started/installation)
- [Releases](/docs/api/releases) — the endpoints behind these surfaces
