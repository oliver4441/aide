import crypto from "node:crypto";

export const OUTBOX_STATUS = Object.freeze({
  PENDING: "pending",
  PROCESSING: "processing",
  DELIVERED: "delivered",
  DEAD_LETTER: "dead_letter",
});

const DECIMAL_STRING_RE = /^-?\d+(\.\d{1,4})?$/;
const ISO_CURRENCY_RE = /^[A-Z]{3}$/;

/**
 * Validates that an accounting adapter payload uses decimal strings (never floats),
 * an ISO-4217 currency code, and a server-derived orgId.
 */
export function validateAccountingContract(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object") {
    return { ok: false, errors: ["Payload must be an object"] };
  }
  if (!payload.orgId) errors.push("orgId is required");
  if (!payload.currency || !ISO_CURRENCY_RE.test(String(payload.currency))) {
    errors.push("currency must be a 3-letter ISO code");
  }
  if (typeof payload.amount !== "string" || !DECIMAL_STRING_RE.test(payload.amount)) {
    errors.push("amount must be a decimal string (e.g. '1250.00'), not a float");
  }
  return { ok: errors.length === 0, errors };
}

export function buildIdempotencyKey({ orgId, sourceEntity, sourceId, type, payloadVersion = 1 }) {
  return `${orgId}:${sourceEntity}:${sourceId}:${type}:v${payloadVersion}`;
}

export function createOutboxEvent({
  orgId,
  type,
  sourceEntity,
  sourceId,
  payload,
  payloadVersion = 1,
}) {
  const now = new Date().toISOString();
  return {
    eventId: crypto.randomUUID(),
    orgId,
    type,
    sourceEntity,
    sourceId,
    payloadVersion,
    idempotencyKey: buildIdempotencyKey({ orgId, sourceEntity, sourceId, type, payloadVersion }),
    payload,
    occurredAt: now,
    status: OUTBOX_STATUS.PENDING,
    retries: 0,
    nextAttemptAt: now,
    lastError: null,
    processedAt: null,
  };
}

export function computeBackoffMs(retries, baseMs = 1000, maxMs = 60000, jitterFactor = 0.2) {
  const exp = Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, retries)));
  const jitter = exp * jitterFactor * Math.random();
  return Math.round(exp + jitter);
}

export function recordOutboxFailure(event, errorMessage, maxRetries = 5) {
  const retries = event.retries + 1;
  if (retries >= maxRetries) {
    return {
      ...event,
      retries,
      status: OUTBOX_STATUS.DEAD_LETTER,
      lastError: String(errorMessage || "Unknown error"),
    };
  }
  const delayMs = computeBackoffMs(retries);
  return {
    ...event,
    retries,
    status: OUTBOX_STATUS.PENDING,
    nextAttemptAt: new Date(Date.now() + delayMs).toISOString(),
    lastError: String(errorMessage || "Unknown error"),
  };
}

export function replayDeadLetterEvent(event) {
  if (event.status !== OUTBOX_STATUS.DEAD_LETTER) {
    return event;
  }
  return {
    ...event,
    status: OUTBOX_STATUS.PENDING,
    retries: 0,
    nextAttemptAt: new Date().toISOString(),
    lastError: null,
  };
}

const SENSITIVE_KEYS = new Set(["secret", "token", "password", "authorization", "apiKey"]);

export function redactSensitivePayload(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(k)) {
      out[k] = "[REDACTED]";
    } else if (v && typeof v === "object") {
      out[k] = redactSensitivePayload(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}
