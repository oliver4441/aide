import { Prisma, PrismaClient, JournalStatus } from "@prisma/client";

/**
 * AIDE-05: Central posting engine for double-entry accounting.
 *
 * Every financial transaction flows through this module. A caller builds a
 * list of postings (account + amount + side) and the engine creates a balanced
 * JournalEntry with JournalLines in a single transaction.
 *
 * Design rules:
 * 1. Debits must equal credits — unbalanced entries are rejected.
 * 2. Each line is either a debit or a credit (never both on the same line).
 * 3. Journal entries are immutable once POSTED.
 * 4. All monetary values use Decimal(19,4) — no floats.
 */

const prisma = new PrismaClient();

export interface Posting {
  /** Account code or ID */
  account: string;
  /** Amount on this side */
  amount: number | Prisma.Decimal;
  /** Which side of the entry */
  side: "debit" | "credit";
  /** Optional description for the line */
  description?: string;
}

export interface PostEntryInput {
  /** Business this entry belongs to */
  businessId: string;
  /** Human-readable description */
  description: string;
  /** Source module that triggered this — sale, purchase, adjustment, etc. */
  sourceType: string;
  /** Optional ID of the source record (e.g. Sale.id) */
  sourceId?: string;
  /** Posting lines — must balance */
  postings: Posting[];
  /** Optional date — defaults to now */
  date?: Date;
}

/**
 * Post a balanced journal entry. Throws if debits !== credits.
 */
export async function postEntry(input: PostEntryInput): Promise<{
  entryId: string;
  entryNumber: string;
}> {
  const { businessId, description, sourceType, sourceId, postings, date } = input;

  if (postings.length === 0) {
    throw new Error("At least one posting is required");
  }

  // Resolve account IDs from codes
  const accountRefs = postings.map((p) => p.account);
  const accounts = await prisma.account.findMany({
    where: {
      businessId,
      OR: [
        { code: { in: accountRefs } },
        { id: { in: accountRefs } },
      ],
      isActive: true,
    },
  });

  const accountMap = new Map<string, string>();
  for (const acc of accounts) {
    accountMap.set(acc.code, acc.id);
    accountMap.set(acc.id, acc.id);
  }

  // Validate all accounts resolved
  for (const p of postings) {
    if (!accountMap.has(p.account)) {
      throw new Error(`Account not found: ${p.account}`);
    }
  }

  // Calculate totals
  let totalDebit = new Prisma.Decimal(0);
  let totalCredit = new Prisma.Decimal(0);

  const lines = postings.map((p, idx) => {
    const amount = new Prisma.Decimal(p.amount);
    if (p.side === "debit") {
      totalDebit = totalDebit.add(amount);
    } else {
      totalCredit = totalCredit.add(amount);
    }
    return {
      lineOrder: idx + 1,
      description: p.description,
      debit: p.side === "debit" ? amount : new Prisma.Decimal(0),
      credit: p.side === "credit" ? amount : new Prisma.Decimal(0),
      debitAccountId: p.side === "debit" ? accountMap.get(p.account) || null : null,
      creditAccountId: p.side === "credit" ? accountMap.get(p.account) || null : null,
    };
  });

  // Enforce double-entry: debits must equal credits
  if (!totalDebit.eq(totalCredit)) {
    throw new Error(
      `Unbalanced entry: debits ${totalDebit.toString()} !== credits ${totalCredit.toString()}`
    );
  }

  // Generate entry number
  const count = await prisma.journalEntry.count({ where: { businessId } });
  const entryNumber = `JE-${String(count + 1).padStart(6, "0")}`;

  // Create entry + lines in one transaction
  const entry = await prisma.journalEntry.create({
    data: {
      businessId,
      entryNumber,
      description,
      sourceType,
      sourceId,
      date: date || new Date(),
      status: JournalStatus.POSTED,
      lines: {
        create: lines,
      },
    },
    include: {
      lines: true,
    },
  });

  return {
    entryId: entry.id,
    entryNumber: entry.entryNumber,
  };
}

/**
 * Post a sale to the general ledger.
 *
 * Standard sale entry:
 *   Dr Cash/Bank (payment method account)
 *   Cr Sales Revenue
 *   Dr COGS
 *   Cr Inventory
 */
export async function postSale(input: {
  businessId: string;
  saleId: string;
  total: number | Prisma.Decimal;
  cost: number | Prisma.Decimal;
  tax: number | Prisma.Decimal;
  paymentMethod: string;
  date?: Date;
}): Promise<{ entryId: string; entryNumber: string }> {
  const total = new Prisma.Decimal(input.total);
  const cost = new Prisma.Decimal(input.cost);
  const tax = new Prisma.Decimal(input.tax);

  // Find the standard accounts for this business
  const accounts = await prisma.account.findMany({
    where: {
      businessId: input.businessId,
      code: { in: ["1000", "1010", "2010", "4001", "5001"] },
      isActive: true,
    },
  });

  const accountByCode = new Map(accounts.map((a) => [a.code, a]));

  // Payment method → account mapping
  const paymentAccountMap: Record<string, string> = {
    CASH: "1000",
    MOBILE_MONEY: "1010",
    CARD: "1000",
    OTHER: "1000",
  };
  const paymentAccountCode = paymentAccountMap[input.paymentMethod] || "1000";

  const postings: Posting[] = [];

  // Debit: Cash received
  postings.push({
    account: paymentAccountCode,
    amount: total,
    side: "debit",
    description: `Sale payment (${input.paymentMethod})`,
  });

  // Credit: Sales Revenue (net of tax)
  const netRevenue = total.sub(tax);
  postings.push({
    account: "4001",
    amount: netRevenue,
    side: "credit",
    description: "Sales revenue",
  });

  // Credit: VAT liability (if tax > 0)
  if (tax.gt(0)) {
    const vatAccount = accountByCode.get("2010");
    if (vatAccount) {
      postings.push({
        account: "2010",
        amount: tax,
        side: "credit",
        description: "VAT liability",
      });
    }
  }

  // Debit: COGS
  if (cost.gt(0)) {
    postings.push({
      account: "5001",
      amount: cost,
      side: "debit",
      description: "Cost of goods sold",
    });

    // Credit: Inventory reduction
    postings.push({
      account: "1100",
      amount: cost,
      side: "credit",
      description: "Inventory reduction",
    });
  }

  return postEntry({
    businessId: input.businessId,
    description: `Sale — ${input.saleId}`,
    sourceType: "sale",
    sourceId: input.saleId,
    postings,
    date: input.date,
  });
}

/**
 * Reverse a previously posted journal entry by creating a mirror entry.
 */
export async function reverseEntry(entryId: string): Promise<{
  entryId: string;
  entryNumber: string;
}> {
  const original = await prisma.journalEntry.findUnique({
    where: { id: entryId },
    include: { lines: { orderBy: { lineOrder: "asc" } } },
  });

  if (!original) {
    throw new Error(`Journal entry not found: ${entryId}`);
  }

  if (original.status === JournalStatus.REVERSED) {
    throw new Error("Entry is already reversed");
  }

  // Mark original as reversed
  await prisma.journalEntry.update({
    where: { id: entryId },
    data: { status: JournalStatus.REVERSED },
  });

  // Create reversing entry (swap debits and credits)
  const postings: Posting[] = original.lines.map((line) => {
    // Resolve account code from the account relation
    const accountId = line.debitAccountId || line.creditAccountId;
    return {
      account: accountId!,
      amount: line.debit.toNumber(),
      side: line.debit.gt(0) ? "credit" : "debit",
      description: `Reversal: ${line.description || ""}`,
    };
  });

  // Rebuild postings properly — swap sides
  const reversedPostings: Posting[] = original.lines.map((line) => {
    const accountId = line.debitAccountId || line.creditAccountId;
    if (line.debit.gt(0)) {
      return {
        account: accountId!,
        amount: line.debit,
        side: "credit" as const,
        description: `Reversal: ${line.description || ""}`,
      };
    } else {
      return {
        account: accountId!,
        amount: line.credit,
        side: "debit" as const,
        description: `Reversal: ${line.description || ""}`,
      };
    }
  });

  return postEntry({
    businessId: original.businessId,
    description: `Reversal of ${original.entryNumber}: ${original.description}`,
    sourceType: original.sourceType,
    sourceId: original.sourceId ?? undefined,
    postings: reversedPostings,
  });
}

/**
 * Get the current balance of an account (sum of debits - sum of credits).
 */
export async function getAccountBalance(businessId: string, account: string): Promise<{
  accountId: string;
  code: string;
  name: string;
  type: string;
  totalDebit: string;
  totalCredit: string;
  balance: string;
}> {
  const accountRecord = await prisma.account.findFirst({
    where: {
      businessId,
      OR: [{ code: account }, { id: account }],
    },
  });

  if (!accountRecord) {
    throw new Error(`Account not found: ${account}`);
  }

  const result = await prisma.journalLine.groupBy({
    by: ["debitAccountId", "creditAccountId"],
    _sum: {
      debit: true,
      credit: true,
    },
    where: {
      OR: [{ debitAccountId: accountRecord.id }, { creditAccountId: accountRecord.id }],
    },
  });

  let totalDebit = new Prisma.Decimal(0);
  let totalCredit = new Prisma.Decimal(0);

  for (const row of result) {
    if (row._sum.debit) totalDebit = totalDebit.add(row._sum.debit);
    if (row._sum.credit) totalCredit = totalCredit.add(row._sum.credit);
  }

  return {
    accountId: accountRecord.id,
    code: accountRecord.code,
    name: accountRecord.name,
    type: accountRecord.type,
    totalDebit: totalDebit.toString(),
    totalCredit: totalCredit.toString(),
    balance: totalDebit.sub(totalCredit).toString(),
  };
}

/**
 * Seed the standard chart of accounts for a new business.
 * Only creates accounts that don't already exist.
 */
export async function seedChartOfAccounts(businessId: string): Promise<number> {
  type StandardAccount = {
    code: string;
    name: string;
    type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
    subType: "CURRENT_ASSET" | "FIXED_ASSET" | "ACCOUNTS_RECEIVABLE" |
      "CURRENT_LIABILITY" | "LONG_TERM_LIABILITY" | "ACCOUNTS_PAYABLE" |
      "OWNER_EQUITY" | "RETAINED_EARNINGS" |
      "SALES_REVENUE" | "SERVICE_REVENUE" | "OTHER_INCOME" |
      "COST_OF_GOODS_SOLD" | "OPERATING_EXPENSE" | "SALARIES_EXPENSE" |
      "UTILITIES_EXPENSE" | "RENT_EXPENSE" | "DEPRECIATION_EXPENSE" | "OTHER_EXPENSE";
    isSystem: boolean;
    description: string;
  };
  const standardAccounts: StandardAccount[] = [
    // Assets (1000s)
    { code: "1000", name: "Cash", type: "ASSET", subType: "CURRENT_ASSET", isSystem: true, description: "Cash on hand and in bank" },
    { code: "1010", name: "Mobile Money", type: "ASSET", subType: "CURRENT_ASSET", isSystem: true, description: "M-Pesa and mobile money balances" },
    { code: "1100", name: "Inventory", type: "ASSET", subType: "CURRENT_ASSET", isSystem: true, description: "Stock on hand at cost" },
    { code: "1200", name: "Accounts Receivable", type: "ASSET", subType: "ACCOUNTS_RECEIVABLE", isSystem: true, description: "Amounts owed by customers" },
    { code: "1500", name: "Fixed Assets", type: "ASSET", subType: "FIXED_ASSET", isSystem: true, description: "Equipment, furniture, vehicles" },

    // Liabilities (2000s)
    { code: "2000", name: "Accounts Payable", type: "LIABILITY", subType: "ACCOUNTS_PAYABLE", isSystem: true, description: "Amounts owed to suppliers" },
    { code: "2010", name: "VAT Payable", type: "LIABILITY", subType: "CURRENT_LIABILITY", isSystem: true, description: "VAT owed to KRA" },
    { code: "2100", name: "Short-term Loan", type: "LIABILITY", subType: "CURRENT_LIABILITY", isSystem: true, description: "Loans due within 12 months" },
    { code: "2500", name: "Long-term Loan", type: "LIABILITY", subType: "LONG_TERM_LIABILITY", isSystem: true, description: "Loans due after 12 months" },

    // Equity (3000s)
    { code: "3000", name: "Owner's Equity", type: "EQUITY", subType: "OWNER_EQUITY", isSystem: true, description: "Owner's capital contribution" },
    { code: "3100", name: "Retained Earnings", type: "EQUITY", subType: "RETAINED_EARNINGS", isSystem: true, description: "Accumulated profits" },

    // Income (4000s)
    { code: "4001", name: "Sales Revenue", type: "INCOME", subType: "SALES_REVENUE", isSystem: true, description: "Revenue from product sales" },
    { code: "4002", name: "Service Revenue", type: "INCOME", subType: "SERVICE_REVENUE", isSystem: true, description: "Revenue from services" },
    { code: "4100", name: "Other Income", type: "INCOME", subType: "OTHER_INCOME", isSystem: true, description: "Miscellaneous income" },

    // Expenses (5000s)
    { code: "5001", name: "Cost of Goods Sold", type: "EXPENSE", subType: "COST_OF_GOODS_SOLD", isSystem: true, description: "Direct cost of products sold" },
    { code: "5100", name: "Salaries & Wages", type: "EXPENSE", subType: "SALARIES_EXPENSE", isSystem: true, description: "Employee compensation" },
    { code: "5200", name: "Rent", type: "EXPENSE", subType: "RENT_EXPENSE", isSystem: true, description: "Shop/office rent" },
    { code: "5300", name: "Utilities", type: "EXPENSE", subType: "UTILITIES_EXPENSE", isSystem: true, description: "Electricity, water, internet" },
    { code: "5400", name: "Operating Expenses", type: "EXPENSE", subType: "OPERATING_EXPENSE", isSystem: true, description: "General operating costs" },
    { code: "5500", name: "Depreciation", type: "EXPENSE", subType: "DEPRECIATION_EXPENSE", isSystem: true, description: "Fixed asset depreciation" },
    { code: "5900", name: "Other Expenses", type: "EXPENSE", subType: "OTHER_EXPENSE", isSystem: true, description: "Miscellaneous expenses" },
  ];

  let created = 0;
  for (const acc of standardAccounts) {
    const existing = await prisma.account.findUnique({
      where: {
        businessId_code: { businessId, code: acc.code },
      },
    });

    if (!existing) {
      await prisma.account.create({
        data: {
          ...acc,
          businessId,
        },
      });
      created++;
    }
  }

  // Seed accounting periods for current and past 12 months
  const now = new Date();
  const months = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  for (let i = 0; i < 13; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const label = `${months[month - 1]} ${year}`;

    await prisma.accountingPeriod.upsert({
      where: {
        businessId_year_month: { businessId, year, month },
      },
      create: {
        businessId,
        year,
        month,
        label,
        status: i === 0 ? "OPEN" : "CLOSED",
      },
      update: {},
    });
  }

  return created;
}
