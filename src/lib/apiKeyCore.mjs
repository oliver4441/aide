/**
 * ENT-09: pure, dependency-free helpers for machine API keys.
 *
 * Keys are generated as `aide_<prefix>_<random>`; only a SHA-256 hash is
 * stored server-side. The prefix is stored in clear for display/lookup and
 * revocation, never the full key.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const API_KEY_PREFIX = "aide";
export const API_KEY_BYTES = 24;
export const SCOPES = Object.freeze([
  "products:read", "products:write",
  "sales:read", "sales:write",
  "customers:read", "customers:write",
  "inventory:read", "inventory:write",
  "webhooks:read", "webhooks:write",
]);

export function isValidScope(scope) {
  return typeof scope === "string" && SCOPES.includes(scope);
}

export function normalizeScopes(scopes) {
  if (!Array.isArray(scopes)) return null;
  const out = [...new Set(scopes)];
  if (out.some((s) => !isValidScope(s))) return null;
  return out;
}

export function generateApiKey() {
  const random = randomBytes(API_KEY_BYTES).toString("base64url");
  const prefix = random.slice(0, 8);
  const key = `${API_KEY_PREFIX}_${prefix}_${random}`;
  return { key, prefix, hash: hashApiKey(key) };
}

export function hashApiKey(key) {
  return createHash("sha256").update(key).digest("hex");
}

export function parseApiKey(key) {
  if (typeof key !== "string") return null;
  const match = key.match(/^aide_([A-Za-z0-9_-]{8})_([A-Za-z0-9_-]+)$/);
  if (!match) return null;
  return { prefix: match[1], hash: hashApiKey(key) };
}

/** Constant-time comparison of two hex hashes of equal length. */
export function hashesEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ba.length !== bb.length || ba.length === 0) return false;
  return timingSafeEqual(ba, bb);
}

/** True when the key's scopes cover the required scope. */
export function hasScope(scopes, required) {
  if (!Array.isArray(scopes)) return false;
  return scopes.includes(required);
}
