import { test } from "node:test";
import assert from "node:assert/strict";
import { buildClosingPostings } from "../../src/lib/accounting/yearEndCore.mjs";

// AIDE-07 / ACC-10: year-end closing must zero income/expense accounts and
// move the exact net result to Retained Earnings (3100), using 4-dp math.

function sumSide(postings, side) {
  return postings
    .filter((p) => p.side === side)
    .reduce((acc, p) => acc + Math.round(Number(p.amount) * 10000), 0);
}

function assertBalanced(postings) {
  assert.equal(sumSide(postings, "debit"), sumSide(postings, "credit"));
}

test("profitable year closes income/expense and credits retained earnings", () => {
  const { postings, netProfit } = buildClosingPostings({
    accounts: [
      { code: "4001", type: "INCOME", debit: "0", credit: "1000.0000" },
      { code: "5001", type: "EXPENSE", debit: "400.0000", credit: "0" },
    ],
  });

  assert.equal(netProfit, "600.0000");
  assert.deepEqual(postings, [
    { account: "4001", amount: "1000.0000", side: "debit" },
    { account: "5001", amount: "400.0000", side: "credit" },
    { account: "3100", amount: "600.0000", side: "credit" },
  ]);
  assertBalanced(postings);
});

test("loss year debits retained earnings", () => {
  const { postings, netProfit } = buildClosingPostings({
    accounts: [
      { code: "4001", type: "INCOME", debit: "0", credit: "100.0000" },
      { code: "5001", type: "EXPENSE", debit: "300.0000", credit: "0" },
    ],
  });

  assert.equal(netProfit, "-200.0000");
  assert.deepEqual(postings, [
    { account: "4001", amount: "100.0000", side: "debit" },
    { account: "5001", amount: "300.0000", side: "credit" },
    { account: "3100", amount: "200.0000", side: "debit" },
  ]);
  assertBalanced(postings);
});

test("accounts already at zero produce no postings", () => {
  const { postings, netProfit } = buildClosingPostings({
    accounts: [
      { code: "4001", type: "INCOME", debit: "50", credit: "50" },
      { code: "5001", type: "EXPENSE", debit: "10", credit: "10" },
    ],
  });
  assert.equal(netProfit, "0.0000");
  assert.deepEqual(postings, []);
});

test("contra balances reverse side correctly", () => {
  const { postings } = buildClosingPostings({
    accounts: [
      { code: "4100", type: "INCOME", debit: "25", credit: "10" },
      { code: "5900", type: "EXPENSE", debit: "5", credit: "20" },
    ],
  });
  assert.deepEqual(postings, [
    { account: "4100", amount: "15.0000", side: "credit" },
    { account: "5900", amount: "15.0000", side: "debit" },
  ]);
  assertBalanced(postings);
});

test("preserves 4-dp precision without float drift", () => {
  const { postings, netProfit } = buildClosingPostings({
    accounts: [
      { code: "4001", type: "INCOME", debit: "0", credit: "0.1000" },
      { code: "4002", type: "INCOME", debit: "0", credit: "0.2000" },
    ],
  });
  assert.equal(netProfit, "0.3000");
  assertBalanced(postings);
});

test("custom retained earnings code is honoured", () => {
  const { postings } = buildClosingPostings({
    accounts: [{ code: "4001", type: "INCOME", debit: "0", credit: "1" }],
    retainedEarningsCode: "3999",
  });
  assert.equal(postings.at(-1).account, "3999");
});
