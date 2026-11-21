import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { postEntry, seedChartOfAccounts } from "./post";
import { buildClosingPostings } from "./yearEndCore.mjs";

/**
 * AIDE-07 / ACC-10: close a fiscal year.
 *
 * Preconditions:
 *  - every accounting period in the year must be CLOSED or LOCKED, including
 *    December (the year-end entry is dated 31 December);
 *  - the year must not already have a posted `year_end` journal entry.
 *
 * Effect: one balanced journal entry zeros all income and expense accounts for
 * the year and transfers the net result to Retained Earnings (3100).
 */

export class YearEndError extends Error {
  constructor(message: string, public status = 409) {
    super(message);
    this.name = "YearEndError";
  }
}

export type YearEndResult = {
  year: number;
  netProfit: string;
  postingCount: number;
  entryId: string | null;
  entryNumber: string | null;
};

type AccountBalance = {
  code: string;
  type: "INCOME" | "EXPENSE";
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
};

export async function closeYear(businessId: string, year: number): Promise<YearEndResult> {
  await seedChartOfAccounts(businessId);

  const existing = await prisma.journalEntry.findFirst({
    where: { businessId, sourceType: "year_end", sourceId: String(year) },
    select: { id: true },
  });
  if (existing) {
    throw new YearEndError(`Fiscal year ${year} is already closed`);
  }

  const periods = await prisma.accountingPeriod.findMany({
    where: { businessId, year },
    select: { month: true, status: true },
  });
  const december = periods.find((p) => p.month === 12);
  if (!december) {
    throw new YearEndError(`December ${year} period must exist and be closed before year-end`);
  }
  if (december.status === "OPEN") {
    throw new YearEndError(`December ${year} period must be closed before year-end`);
  }
  if (periods.some((p) => p.status === "OPEN")) {
    throw new YearEndError(`All ${year} periods must be closed before year-end`);
  }

  const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));

  const accounts = await prisma.account.findMany({
    where: { businessId, type: { in: ["INCOME", "EXPENSE"] } },
    select: { id: true, code: true, type: true },
  });

  const lines = await prisma.journalLine.findMany({
    where: {
      entry: {
        businessId,
        status: "POSTED",
        date: { gte: start, lt: end },
      },
      OR: [
        { debitAccountId: { in: accounts.map((a) => a.id) } },
        { creditAccountId: { in: accounts.map((a) => a.id) } },
      ],
    },
    select: {
      debit: true,
      credit: true,
      debitAccountId: true,
      creditAccountId: true,
    },
  });

  const balances = new Map<string, AccountBalance>();
  for (const account of accounts) {
    balances.set(account.id, {
      code: account.code,
      type: account.type as "INCOME" | "EXPENSE",
      debit: new Prisma.Decimal(0),
      credit: new Prisma.Decimal(0),
    });
  }

  const add = (key: "debit" | "credit", accountId: string | null, amount: unknown) => {
    if (!accountId) return;
    const row = balances.get(accountId);
    if (!row) return;
    row[key] = row[key].add(new Prisma.Decimal(amount as Prisma.Decimal.Value));
  };

  for (const line of lines) {
    add("debit", line.debitAccountId, line.debit);
    add("credit", line.creditAccountId, line.credit);
  }

  const { postings, netProfit } = buildClosingPostings({
    accounts: Array.from(balances.values()).map((row) => ({
      ...row,
      debit: row.debit.toString(),
      credit: row.credit.toString(),
    })),
    retainedEarningsCode: "3100",
  });

  if (postings.length === 0) {
    return { year, netProfit, postingCount: 0, entryId: null, entryNumber: null };
  }

  const posted = await postEntry({
    businessId,
    description: `Year-end closing ${year}`,
    sourceType: "year_end",
    sourceId: String(year),
    date: new Date(Date.UTC(year, 11, 31, 23, 59, 59)),
    postings,
  });

  return {
    year,
    netProfit,
    postingCount: postings.length,
    entryId: posted.entryId,
    entryNumber: posted.entryNumber,
  };
}
