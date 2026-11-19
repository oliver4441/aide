import { prisma } from "@/lib/prisma";

/**
 * AIDE-08: Accounts Receivable aging report.
 *
 * Groups outstanding invoice balances by age buckets:
 * - Current: not yet due
 * - 1-30 days overdue
 * - 31-60 days overdue
 * - 61-90 days overdue
 * - 90+ days overdue
 *
 * Returns per-customer breakdown and totals.
 */

interface AgingBucket {
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  days90Plus: number;
  total: number;
}

interface CustomerAgingRow {
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  totalBalance: number;
  buckets: AgingBucket;
}

interface AgingReport {
  asOf: Date;
  customers: CustomerAgingRow[];
  totals: AgingBucket;
}

export async function getAgingReport(businessId: string, asOf?: Date): Promise<AgingReport> {
  const date = asOf || new Date();

  // Get all unpaid invoices for the business
  const unpaidInvoices = await prisma.invoice.findMany({
    where: {
      businessId,
      status: { notIn: ["PAID", "CANCELLED", "WRITTEN_OFF"] },
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
  });

  // Group by customer
  const customerMap = new Map<string, { name: string; phone: string | null; buckets: AgingBucket }>();

  for (const invoice of unpaidInvoices) {
    const balanceDue = Number(invoice.balanceDue);
    if (balanceDue <= 0) continue;

    const customerId = invoice.customerId;
    const customer = invoice.customer;

    if (!customerMap.has(customerId)) {
      customerMap.set(customerId, {
        name: customer.name,
        phone: customer.phone,
        buckets: { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days90Plus: 0, total: 0 },
      });
    }

    const entry = customerMap.get(customerId)!;

    // Calculate days overdue
    const dueDate = new Date(invoice.dueDate);
    const diffTime = date.getTime() - dueDate.getTime();
    const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysOverdue <= 0) {
      entry.buckets.current += balanceDue;
    } else if (daysOverdue <= 30) {
      entry.buckets.days1_30 += balanceDue;
    } else if (daysOverdue <= 60) {
      entry.buckets.days31_60 += balanceDue;
    } else if (daysOverdue <= 90) {
      entry.buckets.days61_90 += balanceDue;
    } else {
      entry.buckets.days90Plus += balanceDue;
    }
    entry.buckets.total += balanceDue;
  }

  // Build customer rows
  const customers: CustomerAgingRow[] = [];
  const totals: AgingBucket = { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days90Plus: 0, total: 0 };

  for (const [customerId, data] of Array.from(customerMap.entries())) {
    if (data.buckets.total <= 0) continue;

    customers.push({
      customerId,
      customerName: data.name,
      customerPhone: data.phone,
      totalBalance: data.buckets.total,
      buckets: data.buckets,
    });

    totals.current += data.buckets.current;
    totals.days1_30 += data.buckets.days1_30;
    totals.days31_60 += data.buckets.days31_60;
    totals.days61_90 += data.buckets.days61_90;
    totals.days90Plus += data.buckets.days90Plus;
    totals.total += data.buckets.total;
  }

  // Sort by total balance descending
  customers.sort((a, b) => b.totalBalance - a.totalBalance);

  return {
    asOf: date,
    customers,
    totals,
  };
}

/**
 * AIDE-08: Customer statement — transaction history for a customer.
 *
 * Returns all invoices and payments for a customer within a date range.
 */

interface StatementTransaction {
  date: Date;
  type: "invoice" | "payment";
  reference: string;
  description: string;
  amount: number;
  balance: number;
}

export async function getCustomerStatement(
  businessId: string,
  customerId: string,
  from?: Date,
  to?: Date
): Promise<{ customerId: string; customerName: string; transactions: StatementTransaction[]; endingBalance: number }> {
  // Verify customer belongs to business
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { name: true, businessId: true },
  });

  if (!customer || customer.businessId !== businessId) {
    throw new Error("Customer not found");
  }

  const dateWhere: any = {};
  if (from) dateWhere.gte = from;
  if (to) dateWhere.lte = to;

  // Get invoices
  const invoices = await prisma.invoice.findMany({
    where: { customerId, issueDate: dateWhere },
    orderBy: { issueDate: "asc" },
  });

  // Get payments
  const payments = await prisma.paymentAllocation.findMany({
    where: { customerId, paidAt: dateWhere },
    orderBy: { paidAt: "asc" },
  });

  // Merge and sort by date
  const transactions: StatementTransaction[] = [];
  let runningBalance = 0;

  const allEvents = [
    ...invoices.map((inv) => ({
      date: new Date(inv.issueDate),
      type: "invoice" as const,
      reference: inv.invoiceNumber,
      description: `Invoice ${inv.invoiceNumber}`,
      amount: Number(inv.total),
    })),
    ...payments.map((pay) => ({
      date: new Date(pay.paidAt),
      type: "payment" as const,
      reference: pay.reference || "Payment",
      description: `Payment (${pay.paymentMethod})`,
      amount: -Number(pay.amount),
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const event of allEvents) {
    runningBalance += event.amount;
    transactions.push({
      ...event,
      balance: runningBalance,
    });
  }

  return {
    customerId,
    customerName: customer.name,
    transactions,
    endingBalance: runningBalance,
  };
}
