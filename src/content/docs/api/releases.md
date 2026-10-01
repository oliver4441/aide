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
| `version` | `v` stripped, build metadata stripped | `2.1.0` |
| `versionCode` | The `+N` suffix as an integer | `42` |
| `name` | The release's display name, falling back to the tag | `Aide 2.1.0` |
| `notes` | The release body, or `null` | Markdown string |
| `prerelease` | Boolean from GitHub | `false` |
| `publishedAt` | ISO timestamp, or `null` | |
| `url` | The GitHub release page, or `null` | |
| `assets` | Mapped below | |

```js
version: r.tag_name?.replace(/^v/, "").replace(/\+\d+$/, ""),
versionCode: parseInt(r.tag_name?.match(/\+(\d+)$/)?.[1] || "0", 10),
```

Every field is nullable except `prerelease` and `assets`. A release tagged
without a `+N` suffix still lists, with `versionCode: 0`.

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

This calls GitHub's `releases/latest`, which excludes drafts and prereleases —
so this endpoint gives you the newest **stable** build.

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
