import { PrismaClient, AccountType, JournalStatus } from "@prisma/client";

/**
 * AIDE-07: Financial statement generators.
 *
 * Queries the general ledger (JournalEntry + JournalLine) and aggregates
 * balances by account to produce the three core financial statements:
 *   1. Profit & Loss (P&L) — Income minus Expenses for a period
 *   2. Balance Sheet — Assets = Liabilities + Equity at a point in time
 *   3. Cash Flow — operating, investing, financing activities
 *
 * All statements are scoped to a business and optionally filtered by date range.
 */

const prisma = new PrismaClient();

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

/**
 * Get the net balance for an account within a date range.
 * Returns (debit - credit) for the period.
 */
async function getAccountBalancesForPeriod(
  businessId: string,
  accountIds: string[],
  dateRange?: DateRange
): Promise<Map<string, { debit: number; credit: number }>> {
  const balances = new Map<string, { debit: number; credit: number }>();

  if (accountIds.length === 0) return balances;

  const where: any = {
    OR: [
      { debitAccountId: { in: accountIds } },
      { creditAccountId: { in: accountIds } },
    ],
  };

  // Filter by journal entry date
  if (dateRange) {
    where.entry = {
      date: {
        gte: dateRange.from,
        lte: dateRange.to,
      },
      status: JournalStatus.POSTED,
    };
  } else {
    where.entry = {
      status: JournalStatus.POSTED,
    };
  }

  const results = await prisma.journalLine.groupBy({
    by: ["debitAccountId", "creditAccountId"],
    _sum: {
      debit: true,
      credit: true,
    },
    where,
  });

  for (const accId of accountIds) {
    balances.set(accId, { debit: 0, credit: 0 });
  }

  for (const row of results) {
    if (row.debitAccountId && balances.has(row.debitAccountId)) {
      const entry = balances.get(row.debitAccountId)!;
      entry.debit += (row._sum.debit?.toNumber() || 0);
      balances.set(row.debitAccountId, entry);
    }
    if (row.creditAccountId && balances.has(row.creditAccountId)) {
      const entry = balances.get(row.creditAccountId)!;
      entry.credit += (row._sum.credit?.toNumber() || 0);
      balances.set(row.creditAccountId, entry);
    }
  }

  return balances;
}

/**
 * Build a section of statement lines from accounts and their balances.
 */
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

/**
 * Profit & Loss Statement (Income Statement).
 *
 * Shows revenue and expenses for a period, resulting in net profit/loss.
 * Income accounts normally have credit balances.
 * Expense accounts normally have debit balances.
 */
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
  // Fetch income and expense accounts
  const incomeAccounts = await prisma.account.findMany({
    where: { businessId, type: AccountType.INCOME, isActive: true },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  const cogsAccounts = await prisma.account.findMany({
    where: { businessId, type: AccountType.EXPENSE, subType: "COST_OF_GOODS_SOLD", isActive: true },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  const expenseAccounts = await prisma.account.findMany({
    where: {
      businessId,
      type: AccountType.EXPENSE,
      subType: { not: "COST_OF_GOODS_SOLD" },
      isActive: true,
    },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

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

/**
 * Balance Sheet.
 *
 * Shows assets, liabilities, and equity at a point in time.
 * Assets normally have debit balances.
 * Liabilities and Equity normally have credit balances.
 *
 * The balance sheet uses cumulative balances (all time) plus the current
 * period's net profit flowing into retained earnings.
 */
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
  // For balance sheet, we need cumulative balances (all time up to the date)
  const dateRange: DateRange | undefined = atDate
    ? { from: new Date(0), to: atDate }
    : undefined;

  // Fetch all balance sheet accounts
  const currentAssets = await prisma.account.findMany({
    where: { businessId, type: AccountType.ASSET, subType: { in: ["CURRENT_ASSET", "ACCOUNTS_RECEIVABLE"] }, isActive: true },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  const fixedAssets = await prisma.account.findMany({
    where: { businessId, type: AccountType.ASSET, subType: "FIXED_ASSET", isActive: true },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  const currentLiabilities = await prisma.account.findMany({
    where: {
      businessId,
      type: AccountType.LIABILITY,
      subType: { in: ["CURRENT_LIABILITY", "ACCOUNTS_PAYABLE"] },
      isActive: true,
    },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  const longTermLiabilities = await prisma.account.findMany({
    where: { businessId, type: AccountType.LIABILITY, subType: "LONG_TERM_LIABILITY", isActive: true },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  const equityAccounts = await prisma.account.findMany({
    where: {
      businessId,
      type: AccountType.EQUITY,
      subType: "OWNER_EQUITY",
      isActive: true,
    },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

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

  // Calculate retained earnings (cumulative net profit)
  // Get all income and expense accounts for cumulative net profit
  const incomeAccounts = await prisma.account.findMany({
    where: { businessId, type: AccountType.INCOME, isActive: true },
    select: { id: true },
  });
  const expenseAccounts = await prisma.account.findMany({
    where: { businessId, type: AccountType.EXPENSE, isActive: true },
    select: { id: true },
  });

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

/**
 * Cash Flow Statement.
 *
 * Simplified indirect method: starts with net profit and adjusts for
 * non-cash items and changes in working capital.
 *
 * Categories:
 * - Operating activities: net profit + non-cash adjustments + working capital changes
 * - Investing activities: fixed asset changes
 * - Financing activities: loan and equity changes
 */
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
  // Get net profit for the period
  const pAndL = await profitAndLoss(businessId, dateRange);
  const netProfit = pAndL.netProfit;

  // Operating activities: start with net profit
  const operatingLines: StatementLine[] = [
    {
      accountCode: "NET",
      accountName: "Net Profit",
      debit: 0,
      credit: 0,
      balance: netProfit,
    },
  ];

  // Add depreciation (non-cash expense)
  const depreciationAccounts = await prisma.account.findMany({
    where: { businessId, type: AccountType.EXPENSE, subType: "DEPRECIATION_EXPENSE", isActive: true },
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

  // Working capital changes: AR, Inventory, AP
  const workingCapitalAccounts = await prisma.account.findMany({
    where: {
      businessId,
      subType: { in: ["ACCOUNTS_RECEIVABLE", "ACCOUNTS_PAYABLE"] },
      isActive: true,
    },
    select: { id: true, code: true, name: true, subType: true },
  });

  const wcIds = workingCapitalAccounts.map((a) => a.id);
  const wcBalances = await getAccountBalancesForPeriod(businessId, wcIds, dateRange);

  for (const acc of workingCapitalAccounts) {
    const bal = wcBalances.get(acc.id) || { debit: 0, credit: 0 };
    const change = bal.debit - bal.credit;

    // Increase in AR = cash outflow (negative)
    // Increase in AP = cash inflow (positive)
    let cashFlowImpact: number;
    let label: string;

    if (acc.subType === "ACCOUNTS_RECEIVABLE") {
      cashFlowImpact = -change;
      label = change > 0
        ? `Increase in ${acc.name}`
        : `Decrease in ${acc.name}`;
    } else if (acc.subType === "ACCOUNTS_PAYABLE") {
      cashFlowImpact = change;
      label = change > 0
        ? `Increase in ${acc.name}`
        : `Decrease in ${acc.name}`;
    } else {
      continue;
    }

    operatingLines.push({
      accountCode: acc.code,
      accountName: label,
      debit: 0,
      credit: 0,
      balance: cashFlowImpact,
    });
  }

  const netCashFromOperations = operatingLines.reduce((sum, l) => sum + l.balance, 0);

  // Investing activities: fixed asset changes
  const fixedAssetAccounts = await prisma.account.findMany({
    where: { businessId, type: AccountType.ASSET, subType: "FIXED_ASSET", isActive: true },
    select: { id: true, code: true, name: true },
  });

  const fixedAssetIds = fixedAssetAccounts.map((a) => a.id);
  const fixedAssetBalances = await getAccountBalancesForPeriod(businessId, fixedAssetIds, dateRange);

  const investingLines: StatementLine[] = [];
  for (const acc of fixedAssetAccounts) {
    const bal = fixedAssetBalances.get(acc.id) || { debit: 0, credit: 0 };
    const change = bal.debit - bal.credit;
    if (change !== 0) {
      // Debit to fixed asset = purchase (cash outflow)
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

  // Financing activities: loans and equity changes
  const financingAccountCodes = ["2100", "2500", "3000"];
  const financingAccounts = await prisma.account.findMany({
    where: { businessId, code: { in: financingAccountCodes }, isActive: true },
    select: { id: true, code: true, name: true },
  });

  const financingIds = financingAccounts.map((a) => a.id);
  const financingBalances = await getAccountBalancesForPeriod(businessId, financingIds, dateRange);

  const financingLines: StatementLine[] = [];
  for (const acc of financingAccounts) {
    const bal = financingBalances.get(acc.id) || { debit: 0, credit: 0 };
    const change = bal.credit - bal.debit;
    if (change !== 0) {
      // Credit to liability/equity = inflow
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

/**
 * Trial Balance — lists all account balances to verify debits = credits.
 */
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
    where: { businessId, isActive: true },
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
