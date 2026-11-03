#!/usr/bin/env node
/** Shared, tested source of truth for release versions and updater manifests. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, appendFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const MAX_VERSION_CODE = 2_100_000_000;
export const MAX_MANIFEST_BYTES = 256 * 1024;
const REPO = "oliver4441/aide";
function invariant(value, message) { if (!value) throw new Error(message); }
function code(value) {
  invariant(Number.isSafeInteger(value) && value > 0 && value <= MAX_VERSION_CODE, "Invalid Android versionCode");
  return value;
}
export function parseTag(tag) {
  const match = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\+([1-9]\d*))?$/.exec(tag);
  invariant(match, `Invalid Android release tag: ${tag}`);
  const parts = match.slice(1, 4).map(Number);
  invariant(parts.every(Number.isSafeInteger), "Version component overflow");
  return { version: parts.join("."), parts, explicitCode: match[4] ? code(Number(match[4])) : null, tag };
}
export function compareVersions(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  }
  return 0;
}
export function androidReleases(releases) {
  invariant(Array.isArray(releases), "GitHub release response must be an array");
  return releases.filter(r => !r.draft && !r.prerelease && /^v\d+\.\d+\.\d+(?:\+\d+)?$/.test(r.tag_name ?? ""))
    .filter(r => r.assets?.some(a => a.name?.endsWith(".apk") && !a.name.toLowerCase().includes("debug")))
    .map(r => {
      const parsed = parseTag(r.tag_name);
      const named = /\(([1-9]\d*)\)/.exec(r.name ?? "");
      const build = parsed.explicitCode ?? (named ? code(Number(named[1])) : null);
      // Old releases without a known build are never assigned an invented code.
      return { ...parsed, code: build, release: r };
    });
}
export function resolveVersion(tag, releases) {
  const requested = parseTag(tag);
  const published = androidReleases(releases);
  const highestCode = published.reduce((max, r) => Math.max(max, r.code ?? 0), 0);
  const newestKnown = [...published].filter(r => r.code != null).sort((a, b) => compareVersions(b.parts, a.parts))[0];
  invariant(!published.some(r => r.code == null && (!newestKnown || compareVersions(r.parts, newestKnown.parts) >= 0)), "Cannot prove versionCode progression: newest APK has no recorded build number");
  invariant(!published.some(r => compareVersions(requested.parts, r.parts) <= 0), "Release version must be newer than every published Android release");
  const selectedCode = code(requested.explicitCode ?? highestCode + 1);
  invariant(selectedCode > highestCode, "versionCode must progress beyond every published Android APK");
  const previous = [...published].filter(r => r.code != null).sort((a, b) => b.code - a.code)[0];
  return {
    tag: requested.tag, version: requested.version, version_code: selectedCode,
    previous_tag: previous?.tag ?? "", previous_code: previous?.code ?? 0,
    previous_version: previous?.version ?? ""
  };
}
export function nextVersion(releases) {
  const published = androidReleases(releases);
  invariant(published.length, "No published Android release to increment");
  const newest = [...published].sort((a, b) => compareVersions(b.parts, a.parts))[0];
  const parts = [...newest.parts];
  parts[2]++;
  invariant(Number.isSafeInteger(parts[2]), "Patch version overflow");
  const highestCode = published.reduce((max, r) => Math.max(max, r.code ?? 0), 0);
  return resolveVersion(`v${parts.join(".")}+${code(highestCode + 1)}`, releases);
}
export function generateManifest(metadata, apk, notes, policy, certificate, publishedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z")) {
  const parsed = parseTag(metadata.tag);
  const build = code(Number(metadata.version_code));
  invariant(parsed.version === metadata.version && (!parsed.explicitCode || parsed.explicitCode === build), "Manifest version disagrees with tag");
  invariant(metadata.package === "com.omix.aide", "Unexpected APK package");
  const pin = certificate.trim().toLowerCase();
  invariant(/^[a-f0-9]{64}$/.test(pin) && metadata.cert_sha256 === pin, "Signing certificate does not match the committed pin");
  invariant(typeof policy.mandatory === "boolean", "mandatory must be a boolean");
  invariant(code(policy.minimumSupportedVersionCode) <= build, "Minimum supported version is ahead of this release");
  invariant(typeof notes === "string" && notes.length <= 64_000, "Release notes exceed manifest limit");
  const size = statSync(apk).size;
  invariant(size > 0 && size <= 512 * 1024 * 1024, "APK size is outside supported limits");
  const sha256 = createHash("sha256").update(readFileSync(apk)).digest("hex");
  invariant(metadata.sha256 === sha256 && Number(metadata.size) === size, "APK changed after verification");
  invariant(metadata.filename === `aide-${parsed.version}.apk`, "APK filename disagrees with version");
  invariant(typeof publishedAt === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(publishedAt) &&
    Number.isFinite(Date.parse(publishedAt)) && new Date(publishedAt).toISOString().slice(0, 19) === publishedAt.slice(0, 19), "Invalid release date");
  const manifest = {
    schemaVersion: 1, packageName: metadata.package, versionName: parsed.version, versionCode: build,
    minimumSupportedVersionCode: policy.minimumSupportedVersionCode, mandatory: policy.mandatory,
    minSdk: 24, publishedAt, releaseNotes: notes,
    releaseUrl: `https://github.com/${REPO}/releases/tag/${metadata.tag}`,
    certificateSha256: pin,
    // A single universal APK is intentional: Room includes multiple ABIs and
    // Android chooses the right library. The client also supports ABI splits.
    assets: [{ abi: "universal", url: `https://github.com/${REPO}/releases/download/${metadata.tag}/${metadata.filename}`, sizeBytes: size, sha256 }]
  };
  invariant(Buffer.byteLength(JSON.stringify(manifest, null, 2) + "\n", "utf8") <= MAX_MANIFEST_BYTES, "Serialized update manifest exceeds the Android response limit");
  return manifest;
}

/** Resolve an unpublished release by ID and prove its uploads match verified local bytes. */
export function verifyUploadedDraft(releases, metadata, directory, sourceSha) {
  invariant(Array.isArray(releases), "GitHub release response must be an array");
  const parsed = parseTag(metadata.tag);
  const build = code(Number(metadata.version_code));
  invariant(parsed.version === metadata.version && (!parsed.explicitCode || parsed.explicitCode === build), "Draft version disagrees with verified metadata");
  invariant(/^[a-f0-9]{40}$/.test(sourceSha), "A full verified source SHA is required");
  const filename = `aide-${parsed.version}.apk`;
  invariant(metadata.filename === filename && metadata.package === "com.omix.aide", "Unexpected verified APK identity");
  const matches = releases.filter(release => release?.tag_name === metadata.tag);
  invariant(matches.length === 1, "Expected exactly one release for the draft tag");
  const release = matches[0];
  invariant(release.draft === true, "Refusing to modify a published release");
  invariant(release.prerelease === false, "Refusing to publish a prerelease as stable");
  invariant(Number.isSafeInteger(release.id) && release.id > 0, "Invalid draft release ID");
  invariant(release.target_commitish === sourceSha, "Draft target differs from the verified source SHA");
  const names = [filename, filename + ".sha256", "android-update.json", "CHANGELOG.md"];
  invariant(Array.isArray(release.assets) && release.assets.length === names.length, "Draft must contain exactly the four expected release assets");
  for (const name of names) {
    const uploaded = release.assets.filter(asset => asset?.name === name);
    invariant(uploaded.length === 1, "Missing or duplicate release asset: " + name);
    const asset = uploaded[0];
    const bytes = readFileSync(join(directory, name));
    const digest = createHash("sha256").update(bytes).digest("hex");
    invariant(bytes.length > 0 && asset.state === "uploaded" && asset.size === bytes.length, "Missing or incomplete release asset: " + name);
    invariant(asset.digest === "sha256:" + digest, "Uploaded SHA-256 differs from verified bytes: " + name);
    if (name === filename) {
      invariant(metadata.sha256 === digest && metadata.size === bytes.length, "APK changed after production verification");
    }
  }
  return release.id;
}

function output(values) {
  console.log(JSON.stringify(values, null, 2));
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join(""));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [command, ...args] = process.argv.slice(2);
    if (command === "next") output(nextVersion(JSON.parse(readFileSync(args[0], "utf8"))));
    else if (command === "resolve") output(resolveVersion(args[0], JSON.parse(readFileSync(args[1], "utf8"))));
    else if (command === "verify-draft") {
      const [releasesPath, metadataPath, directory, sourceSha] = args;
      console.log(verifyUploadedDraft(JSON.parse(readFileSync(releasesPath, "utf8")), JSON.parse(readFileSync(metadataPath, "utf8")), directory, sourceSha));
    }
    else if (command === "manifest") {
      const [metadataPath, apkPath, notesPath, outputPath] = args;
      const manifest = generateManifest(JSON.parse(readFileSync(metadataPath, "utf8")), apkPath, readFileSync(notesPath, "utf8"), JSON.parse(readFileSync("android/update-policy.json", "utf8")), readFileSync("android/release-certificate.sha256", "utf8"));
      writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + "\n");
      console.log(`Wrote ${outputPath}`);
    } else throw new Error("Usage: android-release.mjs next <releases.json> | resolve <tag> <releases.json> | manifest <metadata.json> <apk> <notes.md> <output.json> | verify-draft <releases.json> <metadata.json> <asset-dir> <source-sha>");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
