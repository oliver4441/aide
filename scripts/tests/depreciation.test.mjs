import { test } from "node:test";
import assert from "node:assert/strict";
import {
  monthlyDepreciation,
  depreciationForPeriod,
  bookValue,
  parseAssetInput,
  parsePeriod,
} from "../../src/lib/accounting/depreciationCore.mjs";

// AIDE-07 / ACC-11: straight-line schedule rules, exact 4-dp math.

const asset = {
  cost: "1200.0000",
  salvageValue: "0.0000",
  usefulLifeMonths: 12,
  acquisitionDate: "2026-01-15T00:00:00.000Z",
};

test("straight-line monthly amount", () => {
  assert.equal(monthlyDepreciation({ cost: "1200", salvageValue: "0", usefulLifeMonths: 12 }), "100.0000");
  assert.equal(monthlyDepreciation({ cost: "1000", salvageValue: "200", usefulLifeMonths: 10 }), "80.0000");
});

test("returns zero before the acquisition month", () => {
  assert.equal(
    depreciationForPeriod({ ...asset, year: 2025, month: 12, accumulated: "0" }),
    "0.0000"
  );
});

test("depreciates starting in the acquisition month", () => {
  assert.equal(depreciationForPeriod({ ...asset, year: 2026, month: 1, accumulated: "0" }), "100.0000");
});

test("returns zero once the life is exhausted", () => {
  assert.equal(
    depreciationForPeriod({ ...asset, year: 2027, month: 1, accumulated: "1200" }),
    "0.0000"
  );
});

test("never depreciates below salvage value", () => {
  assert.equal(
    depreciationForPeriod({
      cost: "1000.0000",
      salvageValue: "200.0000",
      usefulLifeMonths: 10,
      acquisitionDate: "2026-01-01",
      year: 2026,
      month: 10,
      accumulated: "790",
    }),
    "10.0000"
  );
});

test("final month absorbs rounding so the schedule is exact", () => {
  let accumulated = 0n;
  const amounts = [];
  for (let month = 1; month <= 3; month++) {
    const amount = depreciationForPeriod({
      cost: "100.0000",
      salvageValue: "0.0000",
      usefulLifeMonths: 3,
      acquisitionDate: "2026-01-01",
      year: 2026,
      month,
      accumulated: (Number(accumulated) / 10000).toFixed(4),
    });
    amounts.push(amount);
    accumulated += BigInt(Math.round(Number(amount) * 10000));
  }
  assert.deepEqual(amounts, ["33.3333", "33.3333", "33.3334"]);
  assert.equal(accumulated, 1000000n);
});

test("book value never goes negative", () => {
  assert.equal(bookValue({ cost: "1000", accumulated: "250.5000" }), "749.5000");
  assert.equal(bookValue({ cost: "1000", accumulated: "1200" }), "0.0000");
});

test("parseAssetInput validates and normalises", () => {
  const parsed = parseAssetInput({
    name: "  Delivery van ",
    cost: "950000",
    salvageValue: "50000",
    usefulLifeMonths: 60,
    acquisitionDate: "2026-02-01",
  });
  assert.equal(parsed.name, "Delivery van");
  assert.equal(parsed.cost, "950000.0000");
  assert.equal(parsed.salvageValue, "50000.0000");
  assert.equal(parsed.usefulLifeMonths, 60);

  assert.throws(() => parseAssetInput({ ...parsed, name: "" }), /name is required/);
  assert.throws(() => parseAssetInput({ ...parsed, cost: "0" }), /cost must be greater than zero/);
  assert.throws(() => parseAssetInput({ ...parsed, salvageValue: "1000000" }), /cannot exceed cost/);
  assert.throws(() => parseAssetInput({ ...parsed, usefulLifeMonths: 0 }), /between 1 and 1200/);
});

test("parsePeriod validates year and month", () => {
  assert.deepEqual(parsePeriod({ year: "2026", month: "3" }), { year: 2026, month: 3 });
  assert.throws(() => parsePeriod({ year: 1999, month: 3 }), /year/);
  assert.throws(() => parsePeriod({ year: 2026, month: 13 }), /month/);
});
