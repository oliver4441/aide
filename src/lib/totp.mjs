import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * AIDE-ENT-04: minimal RFC 6238 TOTP (SHA-1, 30s period, 6 digits).
 *
 * Deliberately dependency-free so it can be used from the Next.js runtime and
 * tested directly with the RFC 6238 vectors. No SMS or email codes — the
 * authenticator app owns the second factor.
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export const TOTP_PERIOD_SECONDS = 30;
export const TOTP_DIGITS = 6;
export const TOTP_DEFAULT_WINDOW = 1; // accept one step before/after for clock skew

/** Generate a 160-bit (32-char base32) secret. */
export function generateTotpSecret(bytes = 20) {
  return encodeBase32(randomBytes(bytes));
}

export function encodeBase32(buffer) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function decodeBase32(input) {
  const clean = String(input ?? "").toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  if (!clean || /[^A-Z2-7]/.test(clean)) throw new Error("Invalid base32 secret");
  let bits = 0;
  let value = 0;
  const out = [];
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) throw new Error("Invalid base32 secret");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Dynamic truncation described in RFC 4226 §5.4. */
export function totpAt(secret, counter, period = TOTP_PERIOD_SECONDS, digits = TOTP_DIGITS) {
  const buffer = Buffer.alloc(8);
  // Write the 64-bit counter without BigInt literals (repo targets ES5).
  let value = BigInt(counter);
  for (let i = 7; i >= 0; i--) {
    buffer[i] = Number(value & BigInt(0xff));
    value >>= BigInt(8);
  }
  const hmac = createHmac("sha1", decodeBase32(secret)).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** digits).padStart(digits, "0");
}

export function totpNow(secret, nowMs = Date.now(), options = {}) {
  const period = options.period ?? TOTP_PERIOD_SECONDS;
  return totpAt(secret, Math.floor(nowMs / 1000 / period), period, options.digits ?? TOTP_DIGITS);
}

/** Constant-time compare; accepts +/- `window` steps to tolerate clock skew. */
export function verifyTotp(code, secret, options = {}) {
  const candidate = String(code ?? "").replace(/\s|-/g, "");
  if (!/^\d{6}$/.test(candidate)) return false;
  const nowMs = options.nowMs ?? Date.now();
  const window = options.window ?? TOTP_DEFAULT_WINDOW;
  const period = options.period ?? TOTP_PERIOD_SECONDS;
  const step = Math.floor(nowMs / 1000 / period);
  const expectedBuffer = Buffer.from(candidate);

  for (let delta = -window; delta <= window; delta++) {
    const expected = Buffer.from(totpAt(secret, step + delta, period));
    if (expected.length === expectedBuffer.length && timingSafeEqual(expected, expectedBuffer)) {
      return true;
    }
  }
  return false;
}

/** otpauth:// URI for authenticator apps. */
export function otpauthUri(secret, label, issuer = "Aide") {
  const params = new URLSearchParams({
    secret: String(secret).toUpperCase(),
    issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?${params}`;
}

/** Backup codes are 10 alphanumeric chars, stored only as bcrypt hashes. */
export function generateBackupCodes(count = 8) {
  return Array.from({ length: count }, () =>
    randomBytes(8).toString("hex").toUpperCase().slice(0, 10)
  );
}

export function normaliseBackupCode(code) {
  return String(code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}
