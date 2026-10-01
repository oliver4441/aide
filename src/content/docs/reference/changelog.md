Releases are cut from `master` and published to
[GitHub Releases](https://github.com/oliver4441/aide/releases) in the
`oliver4441/aide` repository. There is no separate changelog file — the release
body on GitHub *is* the changelog, and the app and the website read it from
there.

## Where the changelog lives

| Surface | Source |
| --- | --- |
| This page | GitHub Releases bodies, in summary |
| In the app | `GET /api/releases`, rendered in the updates screen |
| On the website | `/downloads`, fed by the same endpoint |
| Latest build only | `GET /api/latest-release` |

Because the app reads from GitHub rather than a bundled file, **publishing a
release updates every surface at once**, within the five-minute cache window
described in [Releases](/docs/api/releases).

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

## Reading the history

- In the app: **Settings → Updates** lists every release with assets attached,
  with its notes and file size.
- On the web: [/downloads](/downloads) shows the same list.
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

1. Land the change on `master` and confirm CI is green.
2. Bump `versionName` and `versionCode` in `android/app/build.gradle`.
3. Tag and push — the Android workflow builds on tag push.
4. Publish the GitHub release with `versionCode+APK` as assets and the notes
   above as the body.
5. Verify `GET /api/latest-release` reports the new version after the cache
   window.

Builds with no uploaded asset are filtered out of `/api/releases` entirely, so
step 4 is what actually makes a release visible.

## Notable changes

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
