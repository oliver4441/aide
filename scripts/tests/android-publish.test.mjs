import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { generateManifest, verifyUploadedDraft } from "../android-release.mjs";

const digest = bytes => createHash("sha256").update(bytes).digest("hex");

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), "aide-publish-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const sourceSha = "a".repeat(40);
  const filename = "aide-1.0.14.apk";
  const apk = Buffer.from("production-verified APK fixture");
  const metadata = {
    tag: "v1.0.14+1014", version: "1.0.14", version_code: 1014,
    package: "com.omix.aide", cert_sha256: "a".repeat(64),
    filename, size: apk.length, sha256: digest(apk)
  };
  writeFileSync(join(directory, filename), apk);
  const notes = "Repair startup on v12 and v13. Keep existing local data.\n";
  const manifest = generateManifest(metadata, join(directory, filename), notes,
    { mandatory: false, minimumSupportedVersionCode: 1 }, metadata.cert_sha256, "2026-11-04T00:00:00Z");
  writeFileSync(join(directory, filename + ".sha256"), metadata.sha256 + "  " + filename + "\n");
  writeFileSync(join(directory, "android-update.json"), JSON.stringify(manifest, null, 2) + "\n");
  writeFileSync(join(directory, "CHANGELOG.md"), notes);
  const assets = [filename, filename + ".sha256", "android-update.json", "CHANGELOG.md"].map(name => {
    const bytes = readFileSync(join(directory, name));
    return { name, state: "uploaded", size: bytes.length, digest: "sha256:" + digest(bytes) };
  });
  const draft = {
    id: 433336438, tag_name: metadata.tag, draft: true, prerelease: false,
    target_commitish: sourceSha, html_url: "https://github.com/oliver4441/aide/releases/tag/untagged-example", assets
  };
  return { directory, sourceSha, filename, metadata, draft, releases: [draft] };
}

const verify = value => verifyUploadedDraft(value.releases, value.metadata, value.directory, value.sourceSha);

test("resolves an unpublished untagged draft by numeric ID and verifies every uploaded byte digest", t => {
  const value = fixture(t);
  // GET /releases/tags/v1.0.14+1014 returns 404 in this state. The list API
  // still returns this draft and its uploaded assets before a tag is created.
  value.releases.unshift({ id: 1, tag_name: "v1.0.13", draft: false });
  assert.equal(verify(value), value.draft.id);
});

for (const [name, mutate, message] of [
  ["a published release is immutable", v => { v.draft.draft = false; }, /published release/],
  ["a prerelease cannot be promoted as stable", v => { v.draft.prerelease = true; }, /prerelease/],
  ["the draft must target the reviewed and tested source", v => { v.draft.target_commitish = "b".repeat(40); }, /verified source SHA/],
  ["a branch name is not a verified source SHA", v => { v.sourceSha = "master"; }, /full verified source SHA/],
  ["the draft must have a numeric release ID", v => { v.draft.id = "433336438"; }, /release ID/],
  ["a missing tag is not silently replaced", v => { v.releases = []; }, /exactly one release/],
  ["multiple matching releases are ambiguous", v => { v.releases.push({ ...v.draft, id: 2 }); }, /exactly one release/],
  ["an unrelated tag is never selected", v => { v.draft.tag_name = "v1.0.15+1015"; }, /exactly one release/],
  ["the metadata version must match its tag", v => { v.metadata.version = "9.0.0"; }, /Draft version/],
  ["metadata cannot introduce a path-traversal filename", v => { v.metadata.filename = "../evil.apk"; }, /APK identity/],
  ["all four assets are required", v => { v.draft.assets.pop(); }, /four expected/],
  ["unexpected uploaded assets are rejected", v => { v.draft.assets.push({ name: "app-debug.apk" }); }, /four expected/],
  ["duplicate asset names are rejected", v => { v.draft.assets[3] = { ...v.draft.assets[0] }; }, /duplicate release asset/],
  ["an incomplete upload cannot become public", v => { v.draft.assets[0].state = "new"; }, /incomplete release asset/],
  ["an incorrect uploaded size is rejected", v => { v.draft.assets[0].size++; }, /incomplete release asset/],
  ["a missing server digest fails closed", v => { v.draft.assets[0].digest = null; }, /Uploaded SHA-256/],
  ["same-size uploaded APK tampering is rejected", v => { v.draft.assets[0].digest = "sha256:" + "b".repeat(64); }, /Uploaded SHA-256/],
  ["manifest bytes are verified as well as the APK", v => { v.draft.assets[2].digest = "sha256:" + "b".repeat(64); }, /Uploaded SHA-256.*android-update/],
  ["local bytes cannot change after uploading", v => { writeFileSync(join(v.directory, v.filename), Buffer.alloc(v.metadata.size, 42)); }, /Uploaded SHA-256/],
  ["APK bytes must retain the production verification checksum", v => { v.metadata.sha256 = "b".repeat(64); }, /APK changed after production verification/],
  ["APK bytes must retain the production verification size", v => { v.metadata.size++; }, /APK changed after production verification/],
  ["missing local release notes cannot pass", v => { unlinkSync(join(v.directory, "CHANGELOG.md")); }, /ENOENT/]
]) {
  test("draft publication gate: " + name, t => {
    const value = fixture(t);
    mutate(value);
    assert.throws(() => verify(value), message);
  });
}

test("verify-draft CLI emits only the verified numeric ID and fails without an ID for published assets", t => {
  const value = fixture(t);
  const releases = join(value.directory, "releases.json");
  const metadata = join(value.directory, "release-metadata.json");
  writeFileSync(releases, JSON.stringify(value.releases));
  writeFileSync(metadata, JSON.stringify(value.metadata));
  const args = [fileURLToPath(new URL("../android-release.mjs", import.meta.url)), "verify-draft", releases, metadata, value.directory, value.sourceSha];
  const passed = spawnSync(process.execPath, args, { encoding: "utf8" });
  assert.equal(passed.status, 0, passed.stderr);
  assert.equal(passed.stdout, value.draft.id + "\n");
  value.draft.draft = false;
  writeFileSync(releases, JSON.stringify(value.releases));
  const refused = spawnSync(process.execPath, args, { encoding: "utf8" });
  assert.equal(refused.status, 1);
  assert.equal(refused.stdout, "");
  assert.match(refused.stderr, /Refusing to modify a published release/);
});

test("publication workflow finds drafts through the list API and publishes only the verified ID", () => {
  const workflow = readFileSync(new URL("../../.github/workflows/android-release.yml", import.meta.url), "utf8");
  const start = workflow.indexOf("      - name: Upload to a draft, verify every asset, then make it public");
  assert.ok(start >= 0);
  const publish = workflow.slice(start, workflow.indexOf("\n  checksums:", start));
  assert.match(publish, /gh api "repos\/\$GITHUB_REPOSITORY\/releases\?per_page=100"/);
  assert.match(publish, /RELEASE_ID=\$\(node scripts\/android-release\.mjs verify-draft/);
  assert.match(publish, /gh api --method PATCH "repos\/\$GITHUB_REPOSITORY\/releases\/\$RELEASE_ID" -F draft=false/);
  assert.doesNotMatch(publish, /releases\/tags\/\$TAG/);
});
