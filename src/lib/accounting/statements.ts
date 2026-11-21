import { AccountType, JournalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * AIDE-07: Financial statement generators.
 *
 * Queries the general ledger (JournalEntry + JournalLine) and aggregates
 * balances by account to produce P&L, Balance Sheet, Cash Flow, and Trial Balance.
 */

export interface StatementLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface StatementSection {
  label: string;
  lines: StatementLine[];
  total: number;
}

export interface DateRange {
  from: Date;
  to: Date;
}

const INCLUDED_STATUSES = [JournalStatus.POSTED, JournalStatus.REVERSED];

async function getAccountBalancesForPeriod(
  businessId: string,
  accountIds: string[],
  dateRange?: DateRange
): Promise<Map<string, { debit: number; credit: number }>> {
  const balances = new Map<string, { debit: number; credit: number }>();

  if (accountIds.length === 0) return balances;

  const entryFilter: any = {
    businessId,
    status: { in: INCLUDED_STATUSES },
  };
  if (dateRange) {
    entryFilter.date = {
      gte: dateRange.from,
      lte: dateRange.to,
    };
  }

  const results = await prisma.journalLine.groupBy({
    by: ["debitAccountId", "creditAccountId"],
    _sum: {
      debit: true,
      credit: true,
    },
    where: {
      OR: [
        { debitAccountId: { in: accountIds } },
        { creditAccountId: { in: accountIds } },
      ],
      entry: entryFilter,
    },
  });

  for (const accId of accountIds) {
    balances.set(accId, { debit: 0, credit: 0 });
  }

  for (const row of results) {
    if (row.debitAccountId && balances.has(row.debitAccountId)) {
      const entry = balances.get(row.debitAccountId)!;
      entry.debit += row._sum.debit?.toNumber() || 0;
      balances.set(row.debitAccountId, entry);
    }
    if (row.creditAccountId && balances.has(row.creditAccountId)) {
      const entry = balances.get(row.creditAccountId)!;
      entry.credit += row._sum.credit?.toNumber() || 0;
      balances.set(row.creditAccountId, entry);
    }
  }

  return balances;
}

function buildSection(
  label: string,
  accounts: Array<{ id: string; code: string; name: string }>,
  balances: Map<string, { debit: number; credit: number }>,
  normalBalance: "debit" | "credit"
): StatementSection {
  const lines: StatementLine[] = [];
  let total = 0;

  for (const acc of accounts) {
    const bal = balances.get(acc.id) || { debit: 0, credit: 0 };
    const net = normalBalance === "debit"
      ? bal.debit - bal.credit
      : bal.credit - bal.debit;

    lines.push({
      accountCode: acc.code,
      accountName: acc.name,
      debit: bal.debit,
      credit: bal.credit,
      balance: net,
    });

    total += net;
  }

  return { label, lines, total };
}

export async function profitAndLoss(
  businessId: string,
  dateRange?: DateRange
): Promise<{
  period: { from: string; to: string };
  revenue: StatementSection;
  costOfSales: StatementSection;
  grossProfit: number;
  expenses: StatementSection;
  netProfit: number;
}> {
  const [incomeAccounts, cogsAccounts, expenseAccounts] = await Promise.all([
    prisma.account.findMany({
      where: { businessId, type: AccountType.INCOME },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.account.findMany({
      where: { businessId, type: AccountType.EXPENSE, subType: "COST_OF_GOODS_SOLD" },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.account.findMany({
      where: { businessId, type: AccountType.EXPENSE, subType: { not: "COST_OF_GOODS_SOLD" } },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
  ]);

  const allAccountIds = [
    ...incomeAccounts.map((a) => a.id),
    ...cogsAccounts.map((a) => a.id),
    ...expenseAccounts.map((a) => a.id),
  ];

  const balances = await getAccountBalancesForPeriod(businessId, allAccountIds, dateRange);

  const revenue = buildSection("Revenue", incomeAccounts, balances, "credit");
  const costOfSales = buildSection("Cost of Sales", cogsAccounts, balances, "debit");
  const expenses = buildSection("Operating Expenses", expenseAccounts, balances, "debit");

  const grossProfit = revenue.total - costOfSales.total;
  const netProfit = grossProfit - expenses.total;

  const from = dateRange?.from ? dateRange.from.toISOString().split("T")[0] : "All time";
  const to = dateRange?.to ? dateRange.to.toISOString().split("T")[0] : "Present";

  return {
    period: { from, to },
    revenue,
    costOfSales,
    grossProfit,
    expenses,
    netProfit,
  };
}

export async function balanceSheet(
  businessId: string,
  atDate?: Date
): Promise<{
  asOf: string;
  currentAssets: StatementSection;
  fixedAssets: StatementSection;
  totalAssets: number;
  currentLiabilities: StatementSection;
  longTermLiabilities: StatementSection;
  totalLiabilities: number;
  equity: StatementSection;
  retainedEarnings: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
}> {
  const dateRange: DateRange | undefined = atDate
    ? { from: new Date(0), to: atDate }
    : undefined;

  const [currentAssets, fixedAssets, currentLiabilities, longTermLiabilities, equityAccounts] =
    await Promise.all([
      prisma.account.findMany({
        where: { businessId, type: AccountType.ASSET, subType: { in: ["CURRENT_ASSET", "ACCOUNTS_RECEIVABLE"] } },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
      }),
      prisma.account.findMany({
        where: { businessId, type: AccountType.ASSET, subType: "FIXED_ASSET" },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
      }),
      prisma.account.findMany({
        where: { businessId, type: AccountType.LIABILITY, subType: { in: ["CURRENT_LIABILITY", "ACCOUNTS_PAYABLE"] } },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
      }),
      prisma.account.findMany({
        where: { businessId, type: AccountType.LIABILITY, subType: "LONG_TERM_LIABILITY" },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
      }),
      prisma.account.findMany({
        where: { businessId, type: AccountType.EQUITY, subType: "OWNER_EQUITY" },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
      }),
    ]);

  const allAccountIds = [
    ...currentAssets.map((a) => a.id),
    ...fixedAssets.map((a) => a.id),
    ...currentLiabilities.map((a) => a.id),
    ...longTermLiabilities.map((a) => a.id),
    ...equityAccounts.map((a) => a.id),
  ];

  const balances = await getAccountBalancesForPeriod(businessId, allAccountIds, dateRange);

  const currentAssetsSection = buildSection("Current Assets", currentAssets, balances, "debit");
  const fixedAssetsSection = buildSection("Fixed Assets", fixedAssets, balances, "debit");
  const currentLiabilitiesSection = buildSection("Current Liabilities", currentLiabilities, balances, "credit");
  const longTermLiabilitiesSection = buildSection("Long-term Liabilities", longTermLiabilities, balances, "credit");
  const equitySection = buildSection("Owner's Equity", equityAccounts, balances, "credit");

  const [incomeAccounts, expenseAccounts] = await Promise.all([
    prisma.account.findMany({
      where: { businessId, type: AccountType.INCOME },
      select: { id: true },
    }),
    prisma.account.findMany({
      where: { businessId, type: AccountType.EXPENSE },
      select: { id: true },
    }),
  ]);

  const pAndLIds = [...incomeAccounts.map((a) => a.id), ...expenseAccounts.map((a) => a.id)];
  const pAndLBalances = await getAccountBalancesForPeriod(businessId, pAndLIds, dateRange);

  let totalIncome = 0;
  let totalExpenses = 0;

  for (const acc of incomeAccounts) {
    const bal = pAndLBalances.get(acc.id) || { debit: 0, credit: 0 };
    totalIncome += bal.credit - bal.debit;
  }
  for (const acc of expenseAccounts) {
    const bal = pAndLBalances.get(acc.id) || { debit: 0, credit: 0 };
    totalExpenses += bal.debit - bal.credit;
  }

  const retainedEarnings = totalIncome - totalExpenses;

  const totalAssets = currentAssetsSection.total + fixedAssetsSection.total;
  const totalLiabilities = currentLiabilitiesSection.total + longTermLiabilitiesSection.total;
  const totalEquity = equitySection.total + retainedEarnings;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  const asOf = atDate ? atDate.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

  return {
    asOf,
    currentAssets: currentAssetsSection,
    fixedAssets: fixedAssetsSection,
    totalAssets,
    currentLiabilities: currentLiabilitiesSection,
    longTermLiabilities: longTermLiabilitiesSection,
    totalLiabilities,
    equity: equitySection,
    retainedEarnings,
    totalEquity,
    totalLiabilitiesAndEquity,
  };
}

export async function cashFlow(
  businessId: string,
  dateRange?: DateRange
): Promise<{
  period: { from: string; to: string };
  operatingActivities: StatementSection;
  netCashFromOperations: number;
  investingActivities: StatementSection;
  netCashFromInvesting: number;
  financingActivities: StatementSection;
  netCashFromFinancing: number;
  netChangeInCash: number;
}> {
  const pAndL = await profitAndLoss(businessId, dateRange);
  const netProfit = pAndL.netProfit;

  const operatingLines: StatementLine[] = [
    {
      accountCode: "NET",
      accountName: "Net Profit",
      debit: 0,
      credit: 0,
      balance: netProfit,
    },
  ];

  const depreciationAccounts = await prisma.account.findMany({
    where: { businessId, type: AccountType.EXPENSE, subType: "DEPRECIATION_EXPENSE" },
    select: { id: true, code: true, name: true },
  });

  const depreciationIds = depreciationAccounts.map((a) => a.id);
  const depreciationBalances = await getAccountBalancesForPeriod(businessId, depreciationIds, dateRange);

  for (const acc of depreciationAccounts) {
    const bal = depreciationBalances.get(acc.id) || { debit: 0, credit: 0 };
    const amount = bal.debit - bal.credit;
    if (amount > 0) {
      operatingLines.push({
        accountCode: acc.code,
        accountName: `${acc.name} (non-cash add-back)`,
        debit: 0,
        credit: 0,
        balance: amount,
      });
    }
  }

  // Working capital changes: AR, Inventory (1100), AP, VAT Payable (2010)
  const workingCapitalAccounts = await prisma.account.findMany({
    where: {
      businessId,
      OR: [
        { subType: { in: ["ACCOUNTS_RECEIVABLE", "ACCOUNTS_PAYABLE"] } },
        { code: { in: ["1100", "2010"] } },
      ],
    },
    select: { id: true, code: true, name: true, type: true, subType: true },
  });

  const wcIds = workingCapitalAccounts.map((a) => a.id);
  const wcBalances = await getAccountBalancesForPeriod(businessId, wcIds, dateRange);

  for (const acc of workingCapitalAccounts) {
    const bal = wcBalances.get(acc.id) || { debit: 0, credit: 0 };

    if (acc.type === AccountType.ASSET) {
      const change = bal.debit - bal.credit;
      if (change === 0) continue;
      operatingLines.push({
        accountCode: acc.code,
        accountName: change > 0 ? `Increase in ${acc.name}` : `Decrease in ${acc.name}`,
        debit: bal.debit,
        credit: bal.credit,
        balance: -change,
      });
    } else if (acc.type === AccountType.LIABILITY) {
      const change = bal.credit - bal.debit;
      if (change === 0) continue;
      operatingLines.push({
        accountCode: acc.code,
        accountName: change > 0 ? `Increase in ${acc.name}` : `Decrease in ${acc.name}`,
        debit: bal.debit,
        credit: bal.credit,
        balance: change,
      });
    }
  }

  const netCashFromOperations = operatingLines.reduce((sum, l) => sum + l.balance, 0);

  const fixedAssetAccounts = await prisma.account.findMany({
    where: { businessId, type: AccountType.ASSET, subType: "FIXED_ASSET" },
    select: { id: true, code: true, name: true },
  });

  const fixedAssetIds = fixedAssetAccounts.map((a) => a.id);
  const fixedAssetBalances = await getAccountBalancesForPeriod(businessId, fixedAssetIds, dateRange);

  const investingLines: StatementLine[] = [];
  for (const acc of fixedAssetAccounts) {
    const bal = fixedAssetBalances.get(acc.id) || { debit: 0, credit: 0 };
    const change = bal.debit - bal.credit;
    if (change !== 0) {
      investingLines.push({
        accountCode: acc.code,
        accountName: change > 0 ? `Purchase of ${acc.name}` : `Disposal of ${acc.name}`,
        debit: bal.debit,
        credit: bal.credit,
        balance: -change,
      });
    }
  }

  const netCashFromInvesting = investingLines.reduce((sum, l) => sum + l.balance, 0);

  const financingAccounts = await prisma.account.findMany({
    where: { businessId, code: { in: ["2100", "2500", "3000"] } },
    select: { id: true, code: true, name: true },
  });

  const financingIds = financingAccounts.map((a) => a.id);
  const financingBalances = await getAccountBalancesForPeriod(businessId, financingIds, dateRange);

  const financingLines: StatementLine[] = [];
  for (const acc of financingAccounts) {
    const bal = financingBalances.get(acc.id) || { debit: 0, credit: 0 };
    const change = bal.credit - bal.debit;
    if (change !== 0) {
      financingLines.push({
        accountCode: acc.code,
        accountName: change > 0 ? `Proceeds from ${acc.name}` : `Repayment of ${acc.name}`,
        debit: bal.debit,
        credit: bal.credit,
        balance: change,
      });
    }
  }

  const netCashFromFinancing = financingLines.reduce((sum, l) => sum + l.balance, 0);
  const netChangeInCash = netCashFromOperations + netCashFromInvesting + netCashFromFinancing;

  const from = dateRange?.from ? dateRange.from.toISOString().split("T")[0] : "All time";
  const to = dateRange?.to ? dateRange.to.toISOString().split("T")[0] : "Present";

  return {
    period: { from, to },
    operatingActivities: { label: "Operating Activities", lines: operatingLines, total: netCashFromOperations },
    netCashFromOperations,
    investingActivities: { label: "Investing Activities", lines: investingLines, total: netCashFromInvesting },
    netCashFromInvesting,
    financingActivities: { label: "Financing Activities", lines: financingLines, total: netCashFromFinancing },
    netCashFromFinancing,
    netChangeInCash,
  };
}

export async function trialBalance(
  businessId: string,
  atDate?: Date
): Promise<{
  asOf: string;
  lines: StatementLine[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}> {
  const accounts = await prisma.account.findMany({
    where: { businessId },
    select: { id: true, code: true, name: true, type: true },
    orderBy: { code: "asc" },
  });

  const accountIds = accounts.map((a) => a.id);
  const dateRange: DateRange | undefined = atDate
    ? { from: new Date(0), to: atDate }
    : undefined;

  const balances = await getAccountBalancesForPeriod(businessId, accountIds, dateRange);

  let totalDebit = 0;
  let totalCredit = 0;
  const lines: StatementLine[] = [];

  for (const acc of accounts) {
    const bal = balances.get(acc.id) || { debit: 0, credit: 0 };
    const net = bal.debit - bal.credit;

    if (net !== 0) {
      lines.push({
        accountCode: acc.code,
        accountName: acc.name,
        debit: bal.debit,
        credit: bal.credit,
        balance: net,
      });

      if (net > 0) {
        totalDebit += net;
      } else {
        totalCredit += Math.abs(net);
      }
    }
  }

  const asOf = atDate ? atDate.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

  return {
    asOf,
    lines,
    totalDebit,
    totalCredit,
    balanced: Math.abs(totalDebit - totalCredit) < 0.01,
  };
}
