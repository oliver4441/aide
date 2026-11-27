/**
 * AIDE-07 / ACC-10: pure year-end closing math.
 *
 * Uses 4-decimal fixed-point BigInt arithmetic so closing entries are exact and
 * free of float drift. The caller supplies per-account debit/credit totals for
 * the fiscal year; this module returns the balancing postings that zero every
 * income and expense account and move the net result to Retained Earnings.
 *
 * Income accounts are credit-normal, expense accounts debit-normal. A positive
 * net result credits Retained Earnings; a loss debits it.
 */

const SCALE = 10000n;

function toUnits(value) {
  if (typeof value === "bigint") return value;
  const raw = String(value ?? "0").trim();
  if (!/^-?\d+(\.\d+)?$/.test(raw)) {
    throw new Error(`Invalid monetary amount: ${raw}`);
  }
  const negative = raw.startsWith("-");
  const [intPart, fracPart = ""] = raw.replace("-", "").split(".");
  const frac = (fracPart + "0000").slice(0, 4);
  const units = BigInt(intPart) * SCALE + BigInt(frac);
  return negative ? -units : units;
}

function fromUnits(units) {
  const negative = units < 0n;
  const abs = negative ? -units : units;
  const whole = abs / SCALE;
  const frac = (abs % SCALE).toString().padStart(4, "0");
  return `${negative ? "-" : ""}${whole}.${frac}`;
}

/**
 * @param {{ accounts: Array<{ code: string, type: string, debit?: string|number|bigint, credit?: string|number|bigint }>, retainedEarningsCode?: string }} input
 * @returns {{ postings: Array<{ account: string, amount: string, side: "debit"|"credit" }>, netProfit: string }}
 */
export function buildClosingPostings(input) {
  const accounts = Array.isArray(input?.accounts) ? input.accounts : [];
  const retained = input?.retainedEarningsCode || "3100";

  const postings = [];
  let totalIncome = 0n;
  let totalExpense = 0n;

  for (const account of accounts) {
    const debit = toUnits(account.debit);
    const credit = toUnits(account.credit);

    if (account.type === "INCOME") {
      const net = credit - debit;
      totalIncome += net;
      if (net !== 0n) {
        postings.push({
          account: account.code,
          amount: fromUnits(net < 0n ? -net : net),
          side: net > 0n ? "debit" : "credit",
        });
      }
    } else if (account.type === "EXPENSE") {
      const net = debit - credit;
      totalExpense += net;
      if (net !== 0n) {
        postings.push({
          account: account.code,
          amount: fromUnits(net < 0n ? -net : net),
          side: net > 0n ? "credit" : "debit",
        });
      }
    }
  }

  const netProfit = totalIncome - totalExpense;
  if (netProfit !== 0n) {
    postings.push({
      account: retained,
      amount: fromUnits(netProfit < 0n ? -netProfit : netProfit),
      side: netProfit > 0n ? "credit" : "debit",
    });
  }

  return { postings, netProfit: fromUnits(netProfit) };
}
