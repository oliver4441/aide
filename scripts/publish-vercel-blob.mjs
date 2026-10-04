#!/usr/bin/env node
/**
 * Mirror a published release asset to Vercel Blob and record it in
 * public/releases.json.
 *
 *   node scripts/publish-vercel-blob.mjs <asset-dir> <tag>
 *
 * Why: every download button on /downloads flows through
 * /api/latest-release, which used to hand out GitHub's release-asset CDN URL.
 * That URL is cross-origin, so the `download` attribute on the anchor is
 * ignored and users land on an interstitial before the file starts. Serving
 * from aide.omixsystems.store makes the download one click, and means the APK
 * the user installs comes from our own domain.
 *
 * Blob keys are the versioned asset name (aide-1.0.3.apk) so every copy can be
 * cached immutably forever; /download/apk is the stable "latest" pointer.
 *
 * Requires BLOB_READ_WRITE_TOKEN. Writes public/releases.json, merging into any
 * existing entries so older releases keep their published hashes and URLs.
 */
import { createHash } from "node:crypto";
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "releases.json");

const [, , dir, tag] = process.argv;
if (!dir || !tag) {
  console.error("usage: node scripts/publish-vercel-blob.mjs <asset-dir> <tag>");
  process.exit(2);
}

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  // Not fatal to the release itself: the APK is already on GitHub. The site
  // falls back to the GitHub URL until someone configures the token.
  console.error("BLOB_READ_WRITE_TOKEN is not set — skipping the Vercel Blob mirror.");
  process.exit(3);
}

/** The Blob SDK is installed into a scratch prefix by CI, not into this repo. */
async function loadBlobSdk() {
  const candidates = [
    "@vercel/blob",
    process.env.VERCEL_BLOB_MODULE,
    "/tmp/blobtool/node_modules/@vercel/blob",
  ].filter(Boolean);

  for (const spec of candidates) {
    try {
      return await import(spec);
    } catch {
      /* try the next one */
    }
  }
  throw new Error(
    "Could not load @vercel/blob. Install it first, e.g. " +
      "npm install --prefix /tmp/blobtool @vercel/blob"
  );
}

/** Reads the existing manifest so re-runs do not lose earlier releases. */
async function readManifest() {
  try {
    const raw = JSON.parse(await readFile(OUT, "utf8"));
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

async function main() {
  const { put } = await loadBlobSdk();

  const files = (await readdir(resolve(dir))).filter((f) =>
    /\.(apk|zip|dmg|exe|deb|AppImage)$/i.test(f)
  );
  if (files.length === 0) {
    throw new Error(`no release assets to upload in ${dir}`);
  }

  const manifest = await readManifest();
  const releases = { ...(manifest.releases ?? {}) };

  for (const name of files) {
    const path = join(resolve(dir), name);
    const bytes = await readFile(path);
    const sha256 = createHash("sha256").update(bytes).digest("hex");

    // Immutability is the point: the key never changes for a given version, so
    // re-running this for the same tag overwrites rather than duplicating.
    const { url } = await put(name, bytes, {
      access: "public",
      token,
      addRandomSuffix: false,
      contentType: name.endsWith(".apk") ? "application/vnd.android.package-archive" : undefined,
      cacheControlMaxAge: 31536000, // one year — the key is versioned
    });

    const version = tag.replace(/^desktop-/, "").replace(/^v/, "");

    releases[tag] = {
      tag,
      version,
      family: tag.startsWith("desktop-") ? "desktop" : "android",
      file: basename(name),
      url,
      sizeBytes: bytes.length,
      sha256,
      publishedAt: new Date().toISOString(),
    };

    console.log(`${name} -> ${url}`);
    console.log(`  sha256 ${sha256}`);
  }

  // "latest" is the highest Android version we know about, not simply whichever
  // tag ran last — desktop releases must not become the Android download.
  const androidTags = Object.keys(releases)
    .filter((t) => releases[t].family === "android")
    .sort((a, b) => compareVersions(releases[b].version, releases[a].version));

  const latest = androidTags.length ? releases[androidTags[0]] : null;

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(
    OUT,
    JSON.stringify(
      {
        _comment:
          "Aide release assets mirrored to Vercel Blob. Written by " +
          ".github/workflows/android-release.yml after each release, and read by " +
          "/api/latest-release before it falls back to the GitHub API.",
        latest,
        releases,
      },
      null,
      2
    ) + "\n"
  );

  console.log(`wrote ${OUT}`);
  if (latest) console.log(`latest Android release: ${latest.tag} (${latest.file})`);
}

/** Numeric-aware version compare: 1.0.10 sorts above 1.0.9. */
function compareVersions(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

main().catch((err) => {
  console.error(err?.stack ?? String(err));
  process.exit(1);
});