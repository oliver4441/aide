/**
 * ENT-09: pure helpers for signed webhooks.
 *
 * Outbound: `Aide-Signature: t=<unix seconds>,v1=<hex hmac>` over
 * `${t}.${rawBody}`. Inbound verification uses the same scheme plus a nonce
 * store so a captured request cannot be replayed.
 */
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

export const SIGNATURE_HEADER = "aide-signature";
export const TIMESTAMP_HEADER = "aide-timestamp";
export const NONCE_HEADER = "aide-nonce";
export const TOLERANCE_SECONDS = 300; // 5 minutes

export function signPayload(secret, timestamp, rawBody) {
  const mac = createHmac("sha256", secret);
  mac.update(`${timestamp}.${rawBody}`);
  return mac.digest("hex");
}

export function signatureHeader(secret, timestamp, rawBody) {
  return `t=${timestamp},v1=${signPayload(secret, timestamp, rawBody)}`;
}

export function parseSignatureHeader(header) {
  if (typeof header !== "string") return null;
  const out = {};
  for (const part of header.split(",")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim().toLowerCase()] = part.slice(idx + 1).trim();
  }
  if (!out.t || !out.v1) return null;
  return { timestamp: out.t, signature: out.v1 };
}

/** Constant-time hex comparison. */
export function safeEqualHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ba.length !== bb.length || ba.length === 0) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Verify a signature. Returns { ok, error, timestamp }.
 * `nowSeconds` is injectable for deterministic tests.
 */
export function verifySignature(secret, rawBody, header, nowSeconds = Math.floor(Date.now() / 1000)) {
  const parsed = parseSignatureHeader(header);
  if (!parsed) return { ok: false, error: "Malformed signature" };
  const ts = Number(parsed.timestamp);
  if (!Number.isInteger(ts) || ts <= 0) return { ok: false, error: "Invalid timestamp" };
  if (Math.abs(nowSeconds - ts) > TOLERANCE_SECONDS) {
    return { ok: false, error: "Timestamp outside tolerance", timestamp: ts };
  }
  const expected = signPayload(secret, parsed.timestamp, rawBody);
  if (!safeEqualHex(expected, parsed.signature)) {
    return { ok: false, error: "Invalid signature", timestamp: ts };
  }
  return { ok: true, timestamp: ts };
}

export function generateNonce() {
  return randomBytes(16).toString("hex");
}

/** Events an integration can subscribe to. */
export const WEBHOOK_EVENTS = Object.freeze([
  "sale.created", "product.created", "stock.adjusted",
  "invoice.created", "payment.received", "import.completed",
]);

export function normalizeEvents(events) {
  if (!Array.isArray(events)) return null;
  const out = [...new Set(events)];
  if (out.some((e) => typeof e !== "string" || !WEBHOOK_EVENTS.includes(e))) return null;
  return out;
}
