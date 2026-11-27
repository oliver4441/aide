/**
 * AIDE-19 / AIDE-03: pure helpers for the audit trail.
 *
 * Kept free of Prisma/request imports so the redaction rule is unit-testable.
 * Metadata is written by callers as free-form JSON; any key that could carry a
 * credential or secret is dropped before persistence, and values are coerced to
 * JSON-safe primitives.
 */

const SENSITIVE_KEY = /pass(word)?|secret|token|authorization|api[-_]?key|credential/i;

/** True when a metadata key must never be persisted. */
export function isSensitiveKey(key) {
  return SENSITIVE_KEY.test(String(key));
}

/**
 * Returns a JSON-safe copy of audit metadata with sensitive keys removed.
 * Non-object input yields null. Nested objects/arrays are cleaned recursively.
 */
export function sanitizeAuditMetadata(value, depth = 0) {
  if (value === null || value === undefined) return null;
  if (depth > 5) return "[truncated]";
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditMetadata(item, depth + 1));
  }
  if (typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (isSensitiveKey(key)) continue;
      out[key] = sanitizeAuditMetadata(item, depth + 1);
    }
    return out;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return String(value);
}
