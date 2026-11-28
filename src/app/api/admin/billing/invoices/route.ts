import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/platformAdmin.mjs";
import { parsePagination, totalPages } from "@/lib/platformBilling.mjs";
import {
  iso,
  platformErrorResponse,
  recordPlatformAudit,
  requirePlatformAdmin,
  searchTerm,
  sortDirection,
  sortKey,
} from "@/lib/platformAuth";

export const dynamic = "force-dynamic";

const SORT_KEYS = ["issuedAt", "amount"] as const;
const STATUSES = ["DRAFT", "OPEN", "PAID", "VOID", "UNCOLLECTIBLE"];

/**
 * OMIX subscription invoices (AIDE-ADMIN-06).
 *
 * These are platform invoices only. Merchant invoices live in the business
 * accounting module and must never appear in this workspace.
 */
export async function GET(request: NextRequest) {
  try {
    const { admin } = await requirePlatformAdmin(PERMISSIONS.VIEW_BILLING);
    const params = request.nextUrl.searchParams;

    const q = searchTerm(params.get("q"));
    const status = params.get("status");
    const currency = searchTerm(params.get("currency"))?.toUpperCase();
    const from = params.get("from");
    const to = params.get("to");
    const minAmount = Number(params.get("min"));
    const maxAmount = Number(params.get("max"));
    const pagination = parsePagination({
      page: params.get("page"),
      pageSize: params.get("pageSize"),
    });
    const sort = sortKey(params.get("sort"), SORT_KEYS, "issuedAt");
    const direction = sortDirection(params.get("dir"));

    const where: Record<string, unknown> = {};
    if (status && STATUSES.includes(status)) where.status = status;
    if (currency) where.currency = currency;
    if (q) {
      where.OR = [
        { number: { contains: q, mode: "insensitive" } },
        { providerInvoiceId: { contains: q, mode: "insensitive" } },
        { organization: { name: { contains: q, mode: "insensitive" } } },
        { organization: { slug: { contains: q, mode: "insensitive" } } },
      ];
    }
    if (from || to) {
      const issuedAt: Record<string, Date> = {};
      const fromDate = from ? new Date(from) : null;
      const toDate = to ? new Date(to) : null;
      if (fromDate && !Number.isNaN(fromDate.getTime())) issuedAt.gte = fromDate;
      if (toDate && !Number.isNaN(toDate.getTime())) issuedAt.lte = toDate;
      if (Object.keys(issuedAt).length > 0) where.issuedAt = issuedAt;
    }
    if (Number.isFinite(minAmount) || Number.isFinite(maxAmount)) {
      const amount: Record<string, number> = {};
      if (Number.isFinite(minAmount)) amount.gte = minAmount;
      if (Number.isFinite(maxAmount)) amount.lte = maxAmount;
      if (Object.keys(amount).length > 0) where.amount = amount;
    }

    const [total, rows, statusGroups, currencyGroups] = await Promise.all([
      prisma.platformInvoice.count({ where: where as never }),
      prisma.platformInvoice.findMany({
        where: where as never,
        orderBy: { [sort]: direction } as never,
        skip: pagination.skip,
        take: pagination.take,
        select: {
          id: true,
          number: true,
          providerInvoiceId: true,
          status: true,
          amount: true,
          amountPaid: true,
          currency: true,
          issuedAt: true,
          dueAt: true,
          paidAt: true,
          hostedUrl: true,
          organization: { select: { id: true, name: true } },
          subscription: {
            select: { id: true, status: true, plan: { select: { name: true } } },
          },
          payments: {
            orderBy: { attemptedAt: "desc" },
            take: 3,
            select: {
              id: true,
              status: true,
              amount: true,
              currency: true,
              failureCode: true,
              attemptedAt: true,
            },
          },
        },
      }),
      prisma.platformInvoice.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.platformInvoice.groupBy({
        by: ["currency", "status"],
        _sum: { amount: true },
      }),
    ]);

    await recordPlatformAudit({
      admin,
      action: "admin.billing.invoices.list",
      entityType: "PlatformInvoice",
      metadata: { q, status, currency, page: pagination.page },
    });

    // Outstanding value per currency, never summed across currencies.
    const outstandingByCurrency = Object.values(
      currencyGroups.reduce<Record<string, { currency: string; outstanding: number }>>(
        (acc, group) => {
          if (group.status === "PAID" || group.status === "VOID") return acc;
          const key = group.currency.toUpperCase();
          if (!acc[key]) acc[key] = { currency: key, outstanding: 0 };
          acc[key].outstanding += Number(group._sum.amount ?? 0);
          return acc;
        },
        {}
      )
    ).sort((a, b) => a.currency.localeCompare(b.currency));

    return NextResponse.json({
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: totalPages(total, pagination.pageSize),
      summary: Object.fromEntries(statusGroups.map((group) => [group.status, group._count._all])),
      outstandingByCurrency,
      invoices: rows.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        providerInvoiceId: invoice.providerInvoiceId,
        status: invoice.status,
        amount: Number(invoice.amount),
        amountPaid: Number(invoice.amountPaid),
        currency: invoice.currency,
        issuedAt: iso(invoice.issuedAt),
        dueAt: iso(invoice.dueAt),
        paidAt: iso(invoice.paidAt),
        hostedUrl: invoice.hostedUrl,
        organization: invoice.organization,
        subscription: invoice.subscription,
        payments: invoice.payments.map((payment) => ({
          ...payment,
          amount: Number(payment.amount),
          attemptedAt: iso(payment.attemptedAt),
        })),
      })),
    });
  } catch (err) {
    return platformErrorResponse(err);
  }
}
