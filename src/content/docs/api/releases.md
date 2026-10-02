Two **public** endpoints — no credentials required — that expose published builds
from the `oliver4441/aide` GitHub repository. They back the
[downloads page](/downloads) and the "get the app" links across the site.

Both proxy GitHub rather than storing anything, and both send:

```http
Cache-Control: s-maxage=300, stale-while-revalidate=60
```

The underlying fetch uses Next's `revalidate: 300`, so the response is cached
for five minutes and served stale for a minute while it refreshes. Hit them
freely; there is no rate limit worth worrying about on your side.

## All releases

```bash
curl https://aide.omixsystems.store/api/releases
```

```json
{
  "releases": [
    {
      "tag": "v2.1.0+42",
      "version": "2.1.0",
      "versionCode": 42,
      "name": "Aide 2.1.0",
      "notes": "## What's new\n- ...",
      "prerelease": false,
      "publishedAt": "2026-09-20T10:00:00Z",
      "url": "https://github.com/oliver4441/aide/releases/tag/v2.1.0%2B42",
      "assets": [
        {
          "name": "aide-2.1.0.apk",
          "sizeBytes": 18432000,
          "downloadUrl": "https://github.com/oliver4441/aide/releases/download/v2.1.0%2B42/aide-2.1.0.apk"
        }
      ]
    }
  ]
}
```

### Tag format

Versions are read **from the git tag**, using the pattern `v<version>+<code>`:

| Field | Derivation | Example tag |
| --- | --- | --- |
| `tag` | The tag verbatim | `v2.1.0+42` |
| `version` | Tag namespace and `v` prefix stripped, build metadata stripped | `2.1.0` |
| `versionCode` | The `+N` suffix, else the number in the release name, else `null` | `42` |
| `name` | The release's display name, falling back to the tag | `Aide 2.1.0` |
| `notes` | The release body, or `null` | Markdown string |
| `prerelease` | Boolean from GitHub | `false` |
| `publishedAt` | ISO timestamp, or `null` | |
| `url` | The GitHub release page, or `null` | |
| `assets` | Mapped below | |

```js
version: parseVersion(r.tag_name),          // src/lib/releaseVersion.ts
versionCode: parseVersionCode(r.tag_name, r.name),
```

Every field is nullable except `prerelease` and `assets`.

`versionCode` is **null**, not `0`, when the tag carries no `+N` suffix and the
release name carries no parenthesised build number. An earlier version of this
route reported `0` in that case, which reads like a real build number when it
is only the absence of one. Only the APK family has a `versionCode` at all —
every desktop release reports `null`.

`version` also strips the tag namespace, so `desktop-v1.0.0` reports
`1.0.0`, not `desktop-v1.0.0`.

### Assets

Each GitHub asset is flattened to three fields — `name`, `sizeBytes` (the raw
`size` in bytes), and `downloadUrl` (GitHub's `browser_download_url`). Checksums,
download counts and content types are not exposed.

### Only releases with assets

```js
.filter((r: any) => r.assets.length > 0);
```

A release with no attached files is removed entirely. Tags pushed without a
build never appear here — which is the common case during development.

> This is not `releases/latest`; it is the full list endpoint, so prereleases
> are included. Filter on `prerelease` yourself if you only want stable builds.

## Latest release

```bash
curl https://aide.omixsystems.store/api/latest-release
```

Returns a **single flattened object**, not an array:

```json
{
  "version": "2.1.0",
  "versionCode": 42,
  "tag": "v2.1.0+42",
  "downloadUrl": "https://github.com/.../aide-2.1.0.apk",
  "apkName": "aide-2.1.0.apk",
  "sizeBytes": 18432000,
  "releaseDate": "2026-09-20T10:00:00Z",
  "releaseUrl": "https://github.com/oliver4441/aide/releases/tag/v2.1.0%2B42",
  "notes": "## What's new\n- ..."
}
```

This does **not** call `releases/latest`. That endpoint returns the newest
release of any kind, and the desktop family publishes independently — so as soon
as a desktop build is released after an Android one, "latest" is no longer an
Android build and the download button would vanish while a signed APK sat
untouched in an older release. Instead this route lists the 20 most recent
releases, skips drafts, and returns the first one that actually ships an APK.

The practical difference: the answer does not change when the desktop pipeline
publishes. If **no** release ships an APK, the endpoint returns `404`.

### Which APK gets picked

```js
function pickApk(assets = []) {
  const apks = assets.filter((a) => a.name?.toLowerCase().endsWith(".apk"));
  if (apks.length === 0) return null;

  const isDebug = (a) => a.name.toLowerCase().includes("debug");
  return apks.find((a) => !isDebug(a)) ?? apks[0];
}
```

Only `.apk` files are considered — the `.aab` or `.exe` assets in a release are
invisible here. Among the APKs, a name **not** containing `debug` wins; if every
APK is a debug build, the first is used anyway.

If a release publishes no APK at all, the endpoint still returns `200` with
every download field `null`:

```json
{
  "version": "2.2.0",
  "versionCode": 43,
  "tag": "v2.2.0+43",
  "downloadUrl": null,
  "apkName": null,
  "sizeBytes": null,
  "...": ""
}
```

> Check `downloadUrl` before rendering a download button. A `200` here does not
> guarantee an installable file.

## No release yet

Both endpoints return the same empty shape with status `404` when there is
nothing to serve — either because GitHub returned a non-OK status or because
the fetch threw:

| Endpoint | Body | Status |
| --- | --- | --- |
| `/api/releases` | `{ "releases": [] }` | `404` |
| `/api/latest-release` | `{ "version": null, "downloadUrl": null, "message": "No release available yet" }` | `404` |

Treat `404` as "nothing published yet", not as "endpoint missing".

## Caching guidance

- Both endpoints are safe to cache client-side for five minutes.
- Neither varies by user, so a shared cache is fine — there is no
  `Vary` on credentials because there are no credentials.
- If you show a download size, `sizeBytes` is bytes; divide by 1048576 for
  megabytes.

## Related

- [Installation](/docs/getting-started/installation)
- [Changelog](/docs/reference/changelog)
