import { test } from "node:test";
import assert from "node:assert/strict";
import {
  totpAt,
  totpNow,
  verifyTotp,
  encodeBase32,
  decodeBase32,
  generateTotpSecret,
  otpauthUri,
  generateBackupCodes,
  normaliseBackupCode,
} from "../../src/lib/totp.mjs";

// RFC 6238 Appendix B test vectors (SHA-1, 8-digit form; we truncate to 6).
const RFC_SECRET = encodeBase32(Buffer.from("12345678901234567890", "ascii"));

// RFC 6238 Appendix B lists T (time step counter) for each wall-clock time;
// T = floor(seconds / 30).
const RFC_CASES = [
  { seconds: 59, counter: 1, eight: "94287082", six: "287082" },
  { seconds: 1111111109, counter: 37037036, eight: "07081804", six: "081804" },
  { seconds: 1234567890, counter: 41152263, eight: "89005924", six: "005924" },
  { seconds: 2000000000, counter: 66666666, eight: "69279037", six: "279037" },
  { seconds: 20000000000, counter: 666666666, eight: "65353130", six: "353130" },
];

test("RFC 6238 SHA-1 vectors (truncated to six digits)", () => {
  for (const { seconds, counter, eight, six } of RFC_CASES) {
    assert.equal(totpAt(RFC_SECRET, counter, 30, 8), eight, `8-digit @ ${seconds}s`);
    assert.equal(totpAt(RFC_SECRET, counter, 30, 6), six, `6-digit @ ${seconds}s`);
  }
});

test("base32 round-trip handles padding and lowercase", () => {
  const bytes = Buffer.from([0, 1, 2, 3, 250, 251, 252, 253, 254, 255]);
  const encoded = encodeBase32(bytes);
  assert.deepEqual(decodeBase32(encoded.toLowerCase()), bytes);
  assert.throws(() => decodeBase32("not-base32!"));
});

test("generated secrets are 20 bytes of base32 and produce six-digit codes", () => {
  const secret = generateTotpSecret();
  assert.match(secret, /^[A-Z2-7]{32}$/);
  const code = totpNow(secret, 1_000_000);
  assert.match(code, /^\d{6}$/);
});

test("verification accepts the current and adjacent steps, rejects stale/replayed codes", () => {
  const secret = generateTotpSecret();
  const now = 1_700_000_000_000;
  const current = totpNow(secret, now);
  assert.equal(verifyTotp(current, secret, { nowMs: now }), true);
  // 30 seconds later the same code is still within the ±1 step skew window.
  assert.equal(verifyTotp(current, secret, { nowMs: now + 30_000 }), true);
  // Four minutes later it is stale.
  assert.equal(verifyTotp(current, secret, { nowMs: now + 240_000 }), false);
  assert.equal(verifyTotp("12345", secret, { nowMs: now }), false);
  assert.equal(verifyTotp("", secret, { nowMs: now }), false);
});

test("otpauth URI includes issuer, algorithm, digits and period", () => {
  const uri = otpauthUri("JBSWY3DPEHPK3PXP", "owner@example.com");
  assert.match(uri, /^otpauth:\/\/totp\/Aide:owner%40example\.com\?/);
  for (const part of ["secret=JBSWY3DPEHPK3PXP", "algorithm=SHA1", "digits=6", "period=30"]) {
    assert.ok(uri.includes(part), `missing ${part}`);
  }
});

test("backup codes are unique, uppercase and normalised for comparison", () => {
  const codes = generateBackupCodes(8);
  assert.equal(codes.length, 8);
  assert.equal(new Set(codes).size, 8);
  for (const code of codes) {
    assert.match(code, /^[A-F0-9]{10}$/);
    assert.equal(normaliseBackupCode(` ${code.toLowerCase()} `), code);
  }
});
