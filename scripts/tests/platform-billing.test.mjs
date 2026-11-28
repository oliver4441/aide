import { test } from "node:test";
import assert from "node:assert/strict";
import {
  billingHealth,
  daysUntil,
  implicitFreeOrganizations,
  monthlyAmount,
  mrrByCurrency,
  mrrFromGroups,
  normalizeRange,
  parsePagination,
  percent,
  rangeStart,
  redactPayload,
  sanitizeFailureMessage,
  subscriptionSummary,
  totalPages,
} from "../../src/lib/platformBilling.mjs";

// AIDE-ADMIN-03: MRR/ARR and lifecycle bucketing. These encode the documented
// rules: only contracted billable statuses count, trials and cancellations do
// not, annual plans normalize to a monthly figure, and unlike currencies are
// never summed into one number.

test("monthly plans count at face value, annual plans normalize by 12", () => {
  assert.equal(monthlyAmount(1200, "MONTHLY"), 1200);
  assert.equal(monthlyAmount(12000, "YEARLY"), 1000);
  assert.equal(monthlyAmount("600", "MONTHLY"), 600);
  assert.equal(monthlyAmount(null, "MONTHLY"), 0);
});

test("MRR excludes trials, cancellations and expiries", () => {
  const rows = [
    { status: "ACTIVE", amount: 1000, currency: "KES", interval: "MONTHLY" },
    { status: "PAST_DUE", amount: 500, currency: "KES", interval: "MONTHLY" },
    { status: "GRACE_PERIOD", amount: 250, currency: "KES", interval: "MONTHLY" },
    { status: "TRIALING", amount: 9999, currency: "KES", interval: "MONTHLY" },
    { status: "CANCELED", amount: 9999, currency: "KES", interval: "MONTHLY" },
    { status: "EXPIRED", amount: 9999, currency: "KES", interval: "MONTHLY" },
  ];
  const [kes] = mrrByCurrency(rows);
  assert.equal(kes.mrr, 1750);
  assert.equal(kes.arr, 21000);
  assert.equal(kes.counted, 3);
});

test("MRR keeps currencies in separate buckets and sorts them", () => {
  const buckets = mrrByCurrency([
    { status: "ACTIVE", amount: 100, currency: "usd", interval: "MONTHLY" },
    { status: "ACTIVE", amount: 1200, currency: "KES", interval: "YEARLY" },
    { status: "ACTIVE", amount: 50, currency: "USD", interval: "MONTHLY" },
  ]);
  assert.deepEqual(
    buckets.map((b) => b.currency),
    ["KES", "USD"]
  );
  const kes = buckets.find((b) => b.currency === "KES");
  const usd = buckets.find((b) => b.currency === "USD");
  assert.equal(kes.mrr, 100);
  assert.equal(usd.mrr, 150);
  assert.equal(usd.arr, 1800);
});

test("MRR from grouped aggregates matches the row-based calculation", () => {
  const grouped = mrrFromGroups([
    { status: "ACTIVE", currency: "KES", interval: "MONTHLY", _sum: { amount: 2000 }, _count: { _all: 2 } },
    { status: "ACTIVE", currency: "KES", interval: "YEARLY", _sum: { amount: 12000 }, _count: { _all: 1 } },
    { status: "PAST_DUE", currency: "USD", interval: "MONTHLY", _sum: { amount: 40 }, _count: { _all: 1 } },
    { status: "TRIALING", currency: "KES", interval: "MONTHLY", _sum: { amount: 0 }, _count: { _all: 9 } },
  ]);
  assert.deepEqual(grouped, [
    { currency: "KES", mrr: 3000, arr: 36000, counted: 3 },
    { currency: "USD", mrr: 40, arr: 480, counted: 1 },
  ]);
});

test("MRR is zero with no billable subscriptions", () => {
  assert.deepEqual(mrrByCurrency([]), []);
  assert.deepEqual(mrrByCurrency([{ status: "TRIALING", amount: 500 }]), []);
});

test("subscription summary buckets every status and flags near-term events", () => {
  const now = new Date("2026-11-27T00:00:00.000Z");
  const rows = [
    { status: "TRIALING", amount: 0, trialEnd: "2026-12-01T00:00:00.000Z" },
    { status: "TRIALING", amount: 0, trialEnd: "2027-02-01T00:00:00.000Z" },
    { status: "ACTIVE", amount: 1000, currentPeriodEnd: "2026-12-10T00:00:00.000Z" },
    { status: "ACTIVE", amount: 1000, currentPeriodEnd: "2027-06-10T00:00:00.000Z" },
    { status: "PAST_DUE", amount: 1000, currentPeriodEnd: "2026-12-02T00:00:00.000Z" },
    { status: "GRACE_PERIOD", amount: 0 },
    { status: "CANCELED", amount: 0 },
    { status: "EXPIRED", amount: 0 },
  ];
  const summary = subscriptionSummary(rows, { now });
  assert.equal(summary.total, 8);
  assert.equal(summary.trialing, 2);
  assert.equal(summary.trialsExpiringSoon, 1);
  assert.equal(summary.paidActive, 2);
  assert.equal(summary.pastDue, 1);
  assert.equal(summary.gracePeriod, 1);
  assert.equal(summary.canceled, 1);
  assert.equal(summary.expired, 1);
  assert.equal(summary.upcomingRenewals, 2);
});

test("a trial that already ended is not counted as expiring soon", () => {
  const now = new Date("2026-11-27T00:00:00.000Z");
  const summary = subscriptionSummary(
    [{ status: "TRIALING", trialEnd: "2026-11-01T00:00:00.000Z" }],
    { now }
  );
  assert.equal(summary.trialsExpiringSoon, 0);
});

test("organizations without a subscription row are implicitly free", () => {
  assert.equal(implicitFreeOrganizations(10, 4), 6);
  assert.equal(implicitFreeOrganizations(3, 5), 0);
  assert.equal(implicitFreeOrganizations(0, 0), 0);
});

test("pagination is clamped and defaults are safe", () => {
  assert.deepEqual(parsePagination({}), { page: 1, pageSize: 25, skip: 0, take: 25 });
  assert.deepEqual(parsePagination({ page: "3", pageSize: "10" }), {
    page: 3,
    pageSize: 10,
    skip: 20,
    take: 10,
  });
  assert.equal(parsePagination({ page: "-4", pageSize: "5000" }).page, 1);
  assert.equal(parsePagination({ pageSize: "5000" }).pageSize, 100);
  assert.equal(parsePagination({ pageSize: "1" }).pageSize, 5);
  assert.equal(totalPages(101, 25), 5);
  assert.equal(totalPages(0, 25), 1);
});

test("range filters only accept 7/30/90 days", () => {
  assert.equal(normalizeRange("7"), 7);
  assert.equal(normalizeRange("90"), 90);
  assert.equal(normalizeRange("365"), 30);
  assert.equal(normalizeRange(undefined), 30);
  const now = new Date("2026-11-27T00:00:00.000Z");
  assert.equal(rangeStart(7, now).toISOString(), "2026-11-20T00:00:00.000Z");
});

test("sanitizeFailureMessage strips keys, cards and bearer tokens", () => {
  assert.equal(
    sanitizeFailureMessage("card declined for 4242 4242 4242 4242"),
    "card declined for [redacted number]"
  );
  assert.match(sanitizeFailureMessage("bad key sk_live_abc123"), /\[redacted key\]/);
  assert.doesNotMatch(sanitizeFailureMessage("bad key sk_live_abc123"), /abc123/);
  assert.match(sanitizeFailureMessage("Authorization: Bearer abc.def.ghi"), /\[redacted\]/);
  assert.equal(sanitizeFailureMessage(null), null);
  assert.ok(sanitizeFailureMessage("x".repeat(500)).length <= 240);
});

test("redactPayload drops secret-named keys at any depth", () => {
  const redacted = redactPayload({
    id: "evt_1",
    data: {
      object: { client_secret: "sk_live_x", last4: "4242", cvc: "123", amount: 500 },
      card_number: "4242424242424242",
    },
    api_key: "abc",
  });
  assert.equal(redacted.id, "evt_1");
  assert.equal(redacted.api_key, "[redacted]");
  assert.equal(redacted.data.object.client_secret, "[redacted]");
  assert.equal(redacted.data.object.cvc, "[redacted]");
  assert.equal(redacted.data.card_number, "[redacted]");
  assert.equal(redacted.data.object.amount, 500);
  assert.equal(redacted.data.object.last4, "4242");
});

test("redactPayload bounds depth and array length", () => {
  const deep = { a: { b: { c: { d: { e: "too deep" } } } } };
  assert.equal(JSON.stringify(redactPayload(deep)).includes("too deep"), false);
  const wide = redactPayload({ items: Array.from({ length: 50 }, (_, i) => i) });
  assert.equal(wide.items.length, 20);
});

test("billing health maps statuses to operator labels", () => {
  assert.equal(billingHealth("ACTIVE"), "healthy");
  assert.equal(billingHealth("TRIALING"), "trial");
  assert.equal(billingHealth("PAST_DUE"), "at-risk");
  assert.equal(billingHealth("GRACE_PERIOD"), "at-risk");
  assert.equal(billingHealth("CANCELED"), "churned");
  assert.equal(billingHealth("EXPIRED"), "churned");
  assert.equal(billingHealth("WHAT"), "unknown");
});

test("daysUntil is floor-based and null-safe", () => {
  const now = new Date("2026-11-27T00:00:00.000Z");
  assert.equal(daysUntil("2026-11-30T00:00:00.000Z", now), 3);
  assert.equal(daysUntil("2026-11-20T00:00:00.000Z", now), -7);
  assert.equal(daysUntil(null, now), null);
  assert.equal(daysUntil("not a date", now), null);
});

test("percent is zero-safe", () => {
  assert.equal(percent(1, 4), 25);
  assert.equal(percent(1, 0), 0);
  assert.equal(percent(0, 0), 0);
  assert.equal(percent(2, 3), 66.7);
});
