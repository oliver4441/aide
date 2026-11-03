import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

// Exercise the fail-closed shell gate without a signing key or Android SDK.
// Real apksigner/zipalign and signed-device upgrades run separately in Actions.
const script = resolve("scripts/verify-android-apk.sh");
const pin = readFileSync("android/release-certificate.sha256", "utf8").trim();
const identity = "package: name='com.omix.aide' versionCode='1014' versionName='1.0.14' compileSdkVersion='36'\n";

function verify({ badging = identity + "minSdkVersion:'24'\ntargetSdkVersion:'35'\n", certificate = pin, v2 = true, signerStatus = 0, alignStatus = 0 } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "aide-signing-gate-"));
  try {
    const tools = join(directory, "build-tools", "36.0.0");
    mkdirSync(tools, { recursive: true });
    const fake = (name, text, status) => writeFileSync(join(tools, name),
      `#!${process.execPath}\nprocess.stdout.write(${JSON.stringify(text)}); process.exitCode = ${status};\n`, { mode: 0o755 });
    fake("apksigner", `Verified using v2 scheme (APK Signature Scheme v2): ${v2}\nSigner #1 certificate SHA-256 digest: ${certificate}\n`, signerStatus);
    fake("aapt2", badging, 0);
    fake("zipalign", "", alignStatus);
    const output = join(directory, "output");
    writeFileSync(output, "");
    const result = spawnSync("bash", [script, "fixture.apk", "1.0.14", "1014"], {
      encoding: "utf8", env: { ...process.env, ANDROID_HOME: directory, GITHUB_OUTPUT: output }
    });
    return { ...result, metadata: readFileSync(output, "utf8") };
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

for (const field of ["sdkVersion", "minSdkVersion"]) {
  test(`signing gate accepts numeric API 24 from ${field} across build-tools versions`, () => {
    const result = verify({ badging: identity + `${field}:'24'\n` });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.metadata, /package=com\.omix\.aide/);
    assert.ok(result.metadata.includes(`cert_sha256=${pin}`));
  });
}
test("signing certificate comparison tolerates CRLF and uppercase tool output", () => {
  assert.equal(verify({ certificate: pin.toUpperCase() + "\r" }).status, 0);
});
for (const [description, options] of [
  ["missing minimum SDK", { badging: identity + "targetSdkVersion:'35'\n" }],
  ["incompatible minimum SDK", { badging: identity + "minSdkVersion:'26'\n" }],
  ["preview SDK codename", { badging: identity + "minSdkVersion:'Baklava'\n" }],
  ["ambiguous SDK declarations", { badging: identity + "sdkVersion:'24'\nminSdkVersion:'24'\n" }],
  ["rotated signing certificate", { certificate: "b".repeat(64) }],
  ["missing v2 signature", { v2: false }],
  ["signature verification failure", { signerStatus: 1 }],
  ["misaligned APK", { alignStatus: 1 }],
  ["different package", { badging: identity.replace("com.omix.aide", "other.app") + "minSdkVersion:'24'\n" }],
  ["wrong version code", { badging: identity.replace("1014", "1013") + "minSdkVersion:'24'\n" }],
  ["wrong version name", { badging: identity.replace("1.0.14", "1.0.13") + "minSdkVersion:'24'\n" }],
  ["debuggable production APK", { badging: identity + "minSdkVersion:'24'\napplication-debuggable\n" }]
]) {
  test(`signing gate rejects ${description}`, () => {
    const result = verify(options);
    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.equal(result.metadata, "", "Unverified identity must not be exported");
  });
}
