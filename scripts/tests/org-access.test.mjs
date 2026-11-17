import { test } from "node:test";
import assert from "node:assert/strict";
import { selectAccessible } from "../../src/lib/accessSelect.mjs";

// These exercise the cross-tenant selection primitive used by both
// requireBusiness and resolveOrganization. They encode the isolation rule
// without a database: a caller may only act within ids they are a member of,
// and a non-member id must never be returned (no leak to another tenant).

test("honours a requested id the caller may access", () => {
  assert.equal(selectAccessible("b2", ["b1", "b2", "b3"]), "b2");
});

test("falls back to the first accessible id when no request is made", () => {
  assert.equal(selectAccessible(undefined, ["b1", "b2"]), "b1");
  assert.equal(selectAccessible(null, ["b1", "b2"]), "b1");
});

test("falls back to the first accessible id when the requested id is not accessible", () => {
  assert.equal(selectAccessible("other", ["b1", "b2"]), "b1");
});

test("denies (null) when the caller has no accessible ids", () => {
  assert.equal(selectAccessible("b1", []), null);
  assert.equal(selectAccessible(undefined, []), null);
});

test("never leaks another tenant's id as the fallback", () => {
  assert.notEqual(selectAccessible("attacker", ["b1"]), "attacker");
  assert.equal(selectAccessible("attacker", ["b1"]), "b1");
});
