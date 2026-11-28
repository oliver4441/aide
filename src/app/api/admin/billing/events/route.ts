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
} from "@/lib/platformAuth";

export const dynamic = "force-dynamic";

const STATUSES = ["PENDING", "PROCESSING", "SUCCEEDED", "FAILED", "DEAD_LETTER"];

/**
 * Provider webhook events (AIDE-ADMIN-06).
 *
 * Payloads are not returned in the list. The detail route returns a redacted
 * projection only; raw provider payloads never reach the browser.
 */
export async function GET(request: NextRequest) {
  try {
    const { admin } = await requirePlatformAdmin(PERMISSIONS.VIEW_EVENTS);
    const params = request.nextUrl.searchParams;

    const q = searchTerm(params.get("q"));
    const status = params.get("status");
    const type = searchTerm(params.get("type"));
    const from = params.get("from");
    const to = params.get("to");
    const pagination = parsePagination({
      page: params.get("page"),
      pageSize: params.get("pageSize"),
    });
    const direction = sortDirection(params.get("dir"));

    const where: Record<string, unknown> = {};
    if (status && STATUSES.includes(status)) where.status = status;
    if (type) where.type = { contains: type, mode: "insensitive" };
    if (q) {
      where.OR = [
        { providerEventId: { contains: q, mode: "insensitive" } },
        { correlationId: { contains: q, mode: "insensitive" } },
        { type: { contains: q, mode: "insensitive" } },
        { organization: { name: { contains: q, mode: "insensitive" } } },
      ];
    }
    if (from || to) {
      const receivedAt: Record<string, Date> = {};
      const fromDate = from ? new Date(from) : null;
      const toDate = to ? new Date(to) : null;
      if (fromDate && !Number.isNaN(fromDate.getTime())) receivedAt.gte = fromDate;
      if (toDate && !Number.isNaN(toDate.getTime())) receivedAt.lte = toDate;
      if (Object.keys(receivedAt).length > 0) where.receivedAt = receivedAt;
    }

    const [total, rows, statusGroups, typeGroups] = await Promise.all([
      prisma.platformWebhookEvent.count({ where: where as never }),
      prisma.platformWebhookEvent.findMany({
        where: where as never,
        orderBy: { receivedAt: direction },
        skip: pagination.skip,
        take: pagination.take,
        select: {
          id: true,
          providerEventId: true,
          type: true,
          status: true,
          attempts: true,
          receivedAt: true,
          processedAt: true,
          lastError: true,
          correlationId: true,
          organization: { select: { id: true, name: true } },
          subscription: { select: { id: true } },
          invoice: { select: { id: true, number: true } },
        },
      }),
      prisma.platformWebhookEvent.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.platformWebhookEvent.groupBy({
        by: ["type"],
        _count: { _all: true },
        orderBy: { _count: { type: "desc" } },
        take: 12,
      }),
    ]);

    await recordPlatformAudit({
      admin,
      action: "admin.billing.events.list",
      entityType: "PlatformWebhookEvent",
      metadata: { q, status, type, page: pagination.page },
    });

    return NextResponse.json({
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: totalPages(total, pagination.pageSize),
      summary: Object.fromEntries(statusGroups.map((group) => [group.status, group._count._all])),
      types: typeGroups.map((group) => ({ type: group.type, count: group._count._all })),
      events: rows.map((event) => ({
        id: event.id,
        providerEventId: event.providerEventId,
        type: event.type,
        status: event.status,
        attempts: event.attempts,
        receivedAt: iso(event.receivedAt),
        processedAt: iso(event.processedAt),
        lastError: event.lastError,
        correlationId: event.correlationId,
        organization: event.organization,
        subscriptionId: event.subscription?.id ?? null,
        invoice: event.invoice,
      })),
    });
  } catch (err) {
    return platformErrorResponse(err);
  }
}
