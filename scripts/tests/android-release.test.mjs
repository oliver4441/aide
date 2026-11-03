import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { parseTag, resolveVersion, nextVersion, generateManifest, MAX_VERSION_CODE } from "../android-release.mjs";

const release = (tag = "v1.0.12", build = 1012, extra = {}) => ({ tag_name: tag, name: `Aide ${tag} (${build})`, draft: false, prerelease: false, assets: [{ name: "aide.apk" }], ...extra });
test("parses explicit build numbers without concatenating dotted versions", () => {
  assert.equal(parseTag("v1.10.0+1013").explicitCode, 1013);
  assert.equal(parseTag("v1.0.13").explicitCode, null);
});
test("rejects invalid versions, leading zeroes and Android build overflow", () => {
  for (const tag of ["1.0.13", "v1.0", "v01.0.13", "v1.0.13-beta", "v1.0.13+0", `v1.0.13+${MAX_VERSION_CODE + 1}`, "v1.0.13; echo bad", "desktop-v1.0.13"]) assert.throws(() => parseTag(tag));
});
test("auto release increments independent monotonic code", () => {
  assert.deepEqual(nextVersion([release()]), { tag: "v1.0.13+1013", version: "1.0.13", version_code: 1013, previous_tag: "v1.0.12", previous_code: 1012, previous_version: "1.0.12" });
});
test("version boundaries never turn an upgrade into an Android downgrade", () => {
  assert.equal(resolveVersion("v1.1.0", [release("v1.0.99", 1099)]).version_code, 1100);
  assert.equal(resolveVersion("v2.0.0", [release("v1.99.99", 19999)]).version_code, 20000);
  assert.equal(resolveVersion("v1.10.0+1014", [release("v1.9.9", 1013)]).version_code, 1014);
});
test("a re-published old release cannot change highest code selection", () => {
  const releases = [release("v1.0.9", 109), release("v1.0.12", 1012), release("v1.0.11", 1011)];
  assert.equal(nextVersion(releases).version_code, 1013);
});
test("rejects existing versions, decreasing codes and code overflow", () => {
  for (const tag of ["v1.0.12", "v1.0.11+1013", "v1.0.13+1012", "v1.0.13+1"]) assert.throws(() => resolveVersion(tag, [release()]));
  assert.throws(() => nextVersion([release("v1.0.12", MAX_VERSION_CODE)]));
});
test("ignores desktop, prerelease, draft and debug-only releases", () => {
  const extra = [release("desktop-v99.0.0"), release("v99.0.0", 99999, { draft: true }), release("v99.0.0", 99999, { prerelease: true }), release("v99.0.0", 99999, { assets: [{ name: "app-debug.apk" }] })];
  assert.equal(nextVersion([...extra, release()]).version, "1.0.13");
});
test("unknown old build numbers are not fabricated from their versions", () => {
  assert.throws(() => resolveVersion("v1.0.13", [release("v1.0.12", 1012, { name: "Aide 1.0.12" })]));
  assert.throws(() => nextVersion([]));
  assert.throws(() => nextVersion({}));
});
test("explicit build suffix takes priority over legacy release name", () => {
  assert.equal(resolveVersion("v1.0.14", [release("v1.0.13+1013", 1)]).version_code, 1014);
});
test("manifest contains exact signed asset size, hash, identity and update policy", () => {
  const directory = mkdtempSync(join(tmpdir(), "aide-release-test-"));
  try {
    const apk = join(directory, "aide-1.0.13.apk");
    const bytes = Buffer.from("verified APK bytes");
    writeFileSync(apk, bytes);
    const certificate = "a".repeat(64);
    const metadata = { tag: "v1.0.13+1013", version: "1.0.13", version_code: 1013, package: "com.omix.aide", cert_sha256: certificate, sha256: createHash("sha256").update(bytes).digest("hex"), size: bytes.length, filename: "aide-1.0.13.apk" };
    const manifest = generateManifest(metadata, apk, "Release notes\nwith \"quotes\" ✓", { mandatory: false, minimumSupportedVersionCode: 1012 }, certificate, "2026-11-03T12:00:00Z");
    assert.equal(manifest.assets[0].sizeBytes, bytes.length);
    assert.equal(manifest.assets[0].sha256, metadata.sha256);
    assert.equal(manifest.assets[0].abi, "universal");
    assert.equal(manifest.versionCode, 1013);
    assert.equal(manifest.mandatory, false);
    assert.equal(manifest.minimumSupportedVersionCode, 1012);
    assert.throws(() => generateManifest(metadata, apk, "notes", { mandatory: "false", minimumSupportedVersionCode: 1 }, certificate));
    assert.throws(() => generateManifest(metadata, apk, "notes", { mandatory: true, minimumSupportedVersionCode: 1014 }, certificate));
    assert.throws(() => generateManifest(metadata, apk, "notes", { mandatory: false, minimumSupportedVersionCode: 1 }, "b".repeat(64)));
    writeFileSync(apk, "tampered bytes");
    assert.throws(() => generateManifest(metadata, apk, "notes", { mandatory: false, minimumSupportedVersionCode: 1 }, certificate));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
