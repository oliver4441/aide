import { prisma } from "@/lib/prisma";

/**
 * AIDE-09: Accounts Payable library.
 *
 * Provides AP aging reports and supplier statements for the business.
 */

/**
 * AP Aging Report — 5-bucket breakdown of outstanding supplier invoices.
 *
 * Buckets: current, 1-30, 31-60, 61-90, 90+ days overdue.
 */
export async function getAPAgingReport(businessId: string, asOf?: Date) {
  const date = asOf || new Date();

  const invoices = await prisma.supplierInvoice.findMany({
    where: {
      businessId,
      status: { notIn: ["PAID", "CANCELLED"] },
    },
    include: {
      supplier: {
        select: { id: true, name: true, supplierCode: true },
      },
    },
  });

  type BucketEntry = { invoices: typeof invoices; total: number };
  const buckets: Record<string, BucketEntry> = {
    current: { invoices: [], total: 0 },
    "1-30": { invoices: [], total: 0 },
    "31-60": { invoices: [], total: 0 },
    "61-90": { invoices: [], total: 0 },
    "90+": { invoices: [], total: 0 },
  };

  for (const inv of invoices) {
    const dueDate = new Date(inv.dueDate);
    const daysOverdue = Math.floor((date.getTime() - dueDate.getTime()) / 86400000);
    const balance = Number(inv.balanceDue);

    let bucket: string;
    if (daysOverdue <= 0) bucket = "current";
    else if (daysOverdue <= 30) bucket = "1-30";
    else if (daysOverdue <= 60) bucket = "31-60";
    else if (daysOverdue <= 90) bucket = "61-90";
    else bucket = "90+";

    buckets[bucket].invoices.push(inv);
    buckets[bucket].total += balance;
  }

  const grandTotal = Object.values(buckets).reduce((sum, b) => sum + b.total, 0);

  return {
    asOf: date,
    buckets,
    grandTotal,
    supplierSummary: buildSupplierSummary(invoices),
  };
}

/**
 * Supplier Statement — transaction history with running balance.
 */
export async function getSupplierStatement(
  businessId: string,
  supplierId: string,
  from?: Date,
  to?: Date
) {
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { id: true, name: true, supplierCode: true, balance: true, businessId: true },
  });
  if (!supplier || supplier.businessId !== businessId) {
    return null;
  }

  const where: any = { supplierId, businessId };
  if (from) where.issueDate = { gte: from };
  if (to) where.issueDate = { ...where.issueDate, lte: to };

  const invoices = await prisma.supplierInvoice.findMany({
    where,
    orderBy: { issueDate: "asc" },
    select: {
      id: true,
      invoiceNumber: true,
      issueDate: true,
      dueDate: true,
      total: true,
      amountPaid: true,
      balanceDue: true,
      status: true,
    },
  });

  const payments = await prisma.supplierPayment.findMany({
    where: { supplierId, businessId },
    orderBy: { paidAt: "asc" },
    select: {
      id: true,
      amount: true,
      paidAt: true,
      paymentMethod: true,
      reference: true,
      invoiceId: true,
    },
  });

  // Build combined transaction list with running balance
  const transactions: Array<{
    date: Date;
    type: "invoice" | "payment";
    reference: string;
    debit: number;
    credit: number;
    balance: number;
  }> = [];

  let runningBalance = 0;

  // Merge invoices and payments by date
  const allDates = new Map<string, { invoices: typeof invoices; payments: typeof payments }>();

  for (const inv of invoices) {
    const key = inv.issueDate.toISOString().slice(0, 10);
    const entry = allDates.get(key) || { invoices: [], payments: [] };
    entry.invoices.push(inv);
    allDates.set(key, entry);
  }

  for (const pay of payments) {
    const key = pay.paidAt.toISOString().slice(0, 10);
    const entry = allDates.get(key) || { invoices: [], payments: [] };
    entry.payments.push(pay);
    allDates.set(key, entry);
  }

  for (const [dateStr, entry] of Array.from(allDates.entries()).sort()) {
    for (const inv of entry.invoices) {
      runningBalance += Number(inv.total);
      transactions.push({
        date: inv.issueDate,
        type: "invoice",
        reference: inv.invoiceNumber,
        debit: Number(inv.total),
        credit: 0,
        balance: runningBalance,
      });
    }
    for (const pay of entry.payments) {
      runningBalance -= Number(pay.amount);
      transactions.push({
        date: pay.paidAt,
        type: "payment",
        reference: pay.reference || pay.paymentMethod,
        debit: 0,
        credit: Number(pay.amount),
        balance: runningBalance,
      });
    }
  }

  return {
    supplier,
    transactions,
    currentBalance: Number(supplier.balance),
    from,
    to,
  };
}

function buildSupplierSummary(invoices: any[]) {
  const summary = new Map<string, { name: string; code: string; count: number; total: number }>();

  for (const inv of invoices) {
    const key = inv.supplier.id;
    const existing = summary.get(key);
    if (existing) {
      existing.count++;
      existing.total += Number(inv.balanceDue);
    } else {
      summary.set(key, {
        name: inv.supplier.name,
        code: inv.supplier.supplierCode,
        count: 1,
        total: Number(inv.balanceDue),
      });
    }
  }

  return Array.from(summary.values());
}
