import { test } from "node:test";
import assert from "node:assert/strict";
import {
  describeEntitlement,
  describeLimit,
  diffPlanVersions,
  summarizeEntitlements,
  summarizeLimits,
  validatePlanVersionInput,
} from "../../src/lib/platformPlans.mjs";

// AIDE-ADMIN-05: plan version validation and change preview. Publishing a
// version is irreversible for existing subscribers, so the input gate and the
// before/after diff are pinned by tests.

const valid = {
  displayName: "Professional",
  description: "For growing shops",
  price: 2500,
  currency: "kes",
  interval: "MONTHLY",
  trialDays: 14,
  entitlements: { pos: true, accounting: false, multi_branch: true },
  limits: { branches: 3, members: 10, warehouses: null },
  changeReason: "Initial professional pricing",
};

test("accepts a well-formed version and normalises currency", () => {
  const result = validatePlanVersionInput(valid, { now: "2026-11-27T00:00:00.000Z" });
  assert.equal(result.ok, true);
  assert.equal(result.value.currency, "KES");
  assert.equal(result.value.price, 2500);
  assert.deepEqual(result.warnings, []);
});

test("requires a reason of at least ten characters", () => {
  const result = validatePlanVersionInput({ ...valid, changeReason: "update" });
  assert.equal(result.ok, false);
  assert.match(result.errors.changeReason, /at least 10/);
});

test("rejects negative, fractional-cent and missing prices", () => {
  assert.equal(validatePlanVersionInput({ ...valid, price: -1 }).ok, false);
  assert.equal(validatePlanVersionInput({ ...valid, price: 10.005 }).ok, false);
  assert.equal(validatePlanVersionInput({ ...valid, price: "abc" }).ok, false);
});

test("warns when publishing a zero price", () => {
  const result = validatePlanVersionInput({ ...valid, price: 0 });
  assert.equal(result.ok, true);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /free/);
});

test("validates currency, interval and trial length", () => {
  assert.equal(validatePlanVersionInput({ ...valid, currency: "KE" }).ok, false);
  assert.equal(validatePlanVersionInput({ ...valid, interval: "WEEKLY" }).ok, false);
  assert.equal(validatePlanVersionInput({ ...valid, trialDays: -1 }).ok, false);
  assert.equal(validatePlanVersionInput({ ...valid, trialDays: 366 }).ok, false);
  assert.equal(validatePlanVersionInput({ ...valid, trialDays: 1.5 }).ok, false);
});

test("entitlements must be boolean switches", () => {
  const result = validatePlanVersionInput({ ...valid, entitlements: { pos: "yes" } });
  assert.equal(result.ok, false);
  assert.match(result.errors.entitlements, /true or false/);
});

test("limits accept whole numbers and null for unlimited", () => {
  const ok = validatePlanVersionInput({ ...valid, limits: { branches: 0, members: null } });
  assert.equal(ok.ok, true);
  for (const limits of [{ branches: -1 }, { branches: 1.5 }, { branches: "many" }]) {
    const result = validatePlanVersionInput({ ...valid, limits });
    assert.equal(result.ok, false, JSON.stringify(limits));
  }
});

test("effective date cannot be far in the past or invalid", () => {
  const now = "2026-11-27T00:00:00.000Z";
  assert.equal(
    validatePlanVersionInput({ ...valid, effectiveFrom: "2026-01-01T00:00:00.000Z" }, { now }).ok,
    false
  );
  assert.equal(validatePlanVersionInput({ ...valid, effectiveFrom: "not a date" }, { now }).ok, false);
  assert.equal(
    validatePlanVersionInput({ ...valid, effectiveFrom: "2026-12-01T00:00:00.000Z" }, { now }).ok,
    true
  );
});

test("entitlements and limits are described in business language", () => {
  assert.equal(describeEntitlement("multi_branch"), "Multiple branches");
  assert.equal(describeEntitlement("weird_key"), "Weird key");
  assert.equal(describeLimit("members"), "Team members");
  assert.deepEqual(summarizeEntitlements({ pos: true, accounting: false }), [
    { key: "pos", label: "Point of sale" },
  ]);
  assert.deepEqual(summarizeLimits({ branches: 2, members: null }), [
    { key: "branches", label: "Branches", limit: 2, unlimited: false },
    { key: "members", label: "Team members", limit: null, unlimited: true },
  ]);
});

test("the diff reports price, interval, trial, feature and limit changes", () => {
  const before = {
    price: 2000,
    currency: "KES",
    interval: "MONTHLY",
    trialDays: 7,
    entitlements: { pos: true, accounting: false },
    limits: { branches: 2, members: null },
  };
  const after = {
    price: 2500,
    currency: "KES",
    interval: "YEARLY",
    trialDays: 14,
    entitlements: { pos: true, accounting: true, approvals: true },
    limits: { branches: 5, members: 20 },
  };
  const fields = diffPlanVersions(before, after).map((change) => change.field);
  assert.ok(fields.includes("Price"));
  assert.ok(fields.includes("Billing interval"));
  assert.ok(fields.includes("Trial length"));
  assert.ok(fields.includes("Double-entry accounting"));
  assert.ok(fields.includes("Approval workflows"));
  assert.ok(fields.includes("Branches"));
  assert.ok(fields.includes("Team members"));
});

test("no previous version means no diff", () => {
  assert.deepEqual(diffPlanVersions(null, valid), []);
});
