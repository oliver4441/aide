export const DEFAULT_ACCOUNT_MAP = Object.freeze({
  cash: "1010",
  bank: "1020",
  mpesaClearing: "1030",
  mpesaFees: "6150",
  accountsReceivable: "1100",
  inventory: "1200",
  cogs: "5000",
  salesRevenue: "4000",
  salesDiscount: "4050",
  vatPayable: "2100",
  accountsPayable: "2000",
  expenseDefault: "6000",
});

function toCents(decimalStr) {
  const num = Number(decimalStr ?? 0);
  if (!Number.isFinite(num)) throw new Error(`Invalid monetary amount: ${decimalStr}`);
  return Math.round(num * 100);
}

function fromCents(cents) {
  return (cents / 100).toFixed(2);
}

export function shouldPostOperation(entityType, status) {
  const s = String(status || "").toLowerCase();
  if (s === "draft" || s === "cancelled" || s === "void") return false;
  if (entityType === "supplier_bill") return s === "approved" || s === "posted";
  return s === "completed" || s === "posted";
}

export function assertBalancedJournal(lines) {
  let debit = 0;
  let credit = 0;
  for (const line of lines) {
    debit += toCents(line.debit ?? "0.00");
    credit += toCents(line.credit ?? "0.00");
  }
  if (debit !== credit) {
    throw new Error(`Unbalanced journal: debit=${fromCents(debit)} credit=${fromCents(credit)}`);
  }
  return { balanced: true, total: fromCents(debit) };
}

/**
 * Builds a balanced double-entry journal for a completed POS sale,
 * supporting split payments (cash, card/bank, mpesa, credit/AR),
 * discounts, VAT, and COGS/inventory.
 */
export function buildPosSaleJournal(sale, accountMap = DEFAULT_ACCOUNT_MAP) {
  const lines = [];
  const grossCents = toCents(sale.grossTotal);
  const discountCents = toCents(sale.discountTotal ?? "0.00");
  const taxCents = toCents(sale.taxTotal ?? "0.00");
  const cogsCents = toCents(sale.cogsTotal ?? "0.00");

  for (const p of sale.payments ?? []) {
    const amt = toCents(p.amount);
    if (amt <= 0) continue;
    const method = String(p.method || "cash").toLowerCase();
    const account =
      method === "mpesa"
        ? accountMap.mpesaClearing
        : method === "card" || method === "bank"
          ? accountMap.bank
          : method === "credit" || method === "ar"
            ? accountMap.accountsReceivable
            : accountMap.cash;
    lines.push({ account, debit: fromCents(amt), credit: "0.00", memo: `POS ${method}` });
  }

  if (discountCents > 0) {
    lines.push({
      account: accountMap.salesDiscount,
      debit: fromCents(discountCents),
      credit: "0.00",
      memo: "Sales discount",
    });
  }

  const netRevenueCents = grossCents - taxCents;
  if (netRevenueCents > 0) {
    lines.push({
      account: accountMap.salesRevenue,
      debit: "0.00",
      credit: fromCents(netRevenueCents),
      memo: "Sales revenue",
    });
  }

  if (taxCents > 0) {
    lines.push({
      account: accountMap.vatPayable,
      debit: "0.00",
      credit: fromCents(taxCents),
      memo: "VAT output",
    });
  }

  if (cogsCents > 0) {
    lines.push({ account: accountMap.cogs, debit: fromCents(cogsCents), credit: "0.00", memo: "COGS" });
    lines.push({ account: accountMap.inventory, debit: "0.00", credit: fromCents(cogsCents), memo: "Inventory" });
  }

  assertBalancedJournal(lines);

  return {
    sourceEntity: "pos_sale",
    sourceId: sale.id,
    branchId: sale.branchId ?? null,
    terminalId: sale.terminalId ?? null,
    cashierId: sale.cashierId ?? null,
    currency: sale.currency ?? "KES",
    lines,
  };
}

/**
 * Builds a non-destructive reversal journal for a refund/return.
 */
export function buildRefundReversalJournal(refund, accountMap = DEFAULT_ACCOUNT_MAP) {
  const totalCents = toCents(refund.total);
  const taxCents = toCents(refund.taxTotal ?? "0.00");
  const netCents = totalCents - taxCents;

  const lines = [
    { account: accountMap.salesRevenue, debit: fromCents(netCents), credit: "0.00", memo: "Refund reversal" },
  ];
  if (taxCents > 0) {
    lines.push({ account: accountMap.vatPayable, debit: fromCents(taxCents), credit: "0.00", memo: "VAT reversal" });
  }
  lines.push({ account: accountMap.cash, debit: "0.00", credit: fromCents(totalCents), memo: "Refund payout" });

  assertBalancedJournal(lines);
  return { sourceEntity: "refund", sourceId: refund.id, currency: refund.currency ?? "KES", lines };
}

/**
 * Settles M-Pesa clearing into bank, recording settlement fees separately.
 */
export function buildMpesaSettlementJournal(settlement, accountMap = DEFAULT_ACCOUNT_MAP) {
  const grossCents = toCents(settlement.grossAmount);
  const feeCents = toCents(settlement.feeAmount ?? "0.00");
  const netCents = grossCents - feeCents;

  const lines = [
    { account: accountMap.bank, debit: fromCents(netCents), credit: "0.00", memo: "M-Pesa bank settlement" },
  ];
  if (feeCents > 0) {
    lines.push({ account: accountMap.mpesaFees, debit: fromCents(feeCents), credit: "0.00", memo: "M-Pesa fee" });
  }
  lines.push({
    account: accountMap.mpesaClearing,
    debit: "0.00",
    credit: fromCents(grossCents),
    memo: "Clear M-Pesa receivable",
  });

  assertBalancedJournal(lines);
  return { sourceEntity: "mpesa_settlement", sourceId: settlement.id, currency: "KES", lines };
}
