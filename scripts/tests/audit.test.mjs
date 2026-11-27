import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isSensitiveKey,
  sanitizeAuditMetadata,
} from "../../src/lib/auditCore.mjs";

// AIDE-19 / AIDE-03: audit metadata must never persist credentials. These
// pure tests pin the redaction and JSON-safety rules without a database.

test("sensitive keys are detected case-insensitively", () => {
  for (const key of ["password", "Password", "passwordHash", "secret", "apiKey", "api_key", "authorization", "token", "credentials"]) {
    assert.equal(isSensitiveKey(key), true, key);
  }
  for (const key of ["role", "email", "name", "status", "reason"]) {
    assert.equal(isSensitiveKey(key), false, key);
  }
});

test("drops sensitive keys but keeps safe ones", () => {
  const cleaned = sanitizeAuditMetadata({
    role: "MANAGER",
    previousRole: "STAFF",
    password: "hunter2",
    passwordHash: "$2b$10$...",
    token: "abc",
    apiKey: "sk-live",
    email: "a@b.co",
  });
  assert.deepEqual(cleaned, {
    role: "MANAGER",
    previousRole: "STAFF",
    email: "a@b.co",
  });
});

test("redacts nested objects and arrays", () => {
  const cleaned = sanitizeAuditMetadata({
    nested: { secret: "x", keep: 1 },
    list: [{ token: "t", id: "1" }],
  });
  assert.deepEqual(cleaned, { nested: { keep: 1 }, list: [{ id: "1" }] });
});

test("returns null for missing metadata", () => {
  assert.equal(sanitizeAuditMetadata(undefined), null);
  assert.equal(sanitizeAuditMetadata(null), null);
});

test("coerces non-primitive leaf values to strings", () => {
  const cleaned = sanitizeAuditMetadata({ when: new Date("2020-01-01T00:00:00.000Z") });
  assert.equal(typeof cleaned.when, "string");
});
