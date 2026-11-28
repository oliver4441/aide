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

const SORT_KEYS = ["renewal", "created", "amount"] as const;

/** Subscription directory (AIDE-ADMIN-04). */
export async function GET(request: NextRequest) {
  try {
    const { admin } = await requirePlatformAdmin(PERMISSIONS.VIEW_SUBSCRIPTIONS);
    const params = request.nextUrl.searchParams;

    const q = searchTerm(params.get("q"));
    const status = params.get("status");
    const plan = searchTerm(params.get("plan"));
    const interval = params.get("interval");
    const pagination = parsePagination({
      page: params.get("page"),
      pageSize: params.get("pageSize"),
    });
    const sort = sortKey(params.get("sort"), SORT_KEYS, "renewal");
    const direction = sortDirection(params.get("dir"));

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (interval === "MONTHLY" || interval === "YEARLY") where.interval = interval;
    if (plan) where.plan = { key: plan };
    if (q) {
      where.OR = [
        { organization: { name: { contains: q, mode: "insensitive" } } },
        { organization: { slug: { contains: q, mode: "insensitive" } } },
        { providerSubscriptionId: { contains: q, mode: "insensitive" } },
      ];
    }

    const orderBy =
      sort === "created"
        ? { createdAt: direction }
        : sort === "amount"
          ? { amount: direction }
          : { currentPeriodEnd: direction };

    const [total, rows, statusGroups] = await Promise.all([
      prisma.platformSubscription.count({ where: where as never }),
      prisma.platformSubscription.findMany({
        where: where as never,
        orderBy: orderBy as never,
        skip: pagination.skip,
        take: pagination.take,
        select: {
          id: true,
          status: true,
          amount: true,
          currency: true,
          interval: true,
          trialStart: true,
          trialEnd: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          canceledAt: true,
          endedAt: true,
          provider: true,
          providerSubscriptionId: true,
          localOverrideNote: true,
          createdAt: true,
          organization: { select: { id: true, name: true, status: true } },
          plan: { select: { key: true, name: true } },
          planVersion: { select: { version: true, displayName: true } },
        },
      }),
      prisma.platformSubscription.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);

    await recordPlatformAudit({
      admin,
      action: "admin.subscriptions.list",
      entityType: "PlatformSubscription",
      metadata: { q, status, plan, interval, page: pagination.page },
    });

    return NextResponse.json({
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: totalPages(total, pagination.pageSize),
      summary: Object.fromEntries(statusGroups.map((group) => [group.status, group._count._all])),
      subscriptions: rows.map((sub) => ({
        id: sub.id,
        status: sub.status,
        amount: Number(sub.amount),
        currency: sub.currency,
        interval: sub.interval,
        trialStart: iso(sub.trialStart),
        trialEnd: iso(sub.trialEnd),
        currentPeriodStart: iso(sub.currentPeriodStart),
        currentPeriodEnd: iso(sub.currentPeriodEnd),
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        canceledAt: iso(sub.canceledAt),
        endedAt: iso(sub.endedAt),
        provider: sub.provider,
        providerSubscriptionId: sub.providerSubscriptionId,
        localOverrideNote: sub.localOverrideNote,
        createdAt: iso(sub.createdAt),
        organization: sub.organization,
        plan: sub.plan,
        planVersion: sub.planVersion,
      })),
    });
  } catch (err) {
    return platformErrorResponse(err);
  }
}
