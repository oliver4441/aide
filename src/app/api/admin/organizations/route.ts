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

const SORT_KEYS = ["name", "createdAt", "branches"] as const;

/**
 * Organization directory (AIDE-ADMIN-04).
 *
 * Search and filtering are server-side so the console never downloads the
 * whole platform. `q` matches name, legal name, slug, tax id and billing email.
 */
export async function GET(request: NextRequest) {
  try {
    const { admin } = await requirePlatformAdmin(PERMISSIONS.VIEW_ORGANIZATIONS);
    const params = request.nextUrl.searchParams;

    const q = searchTerm(params.get("q"));
    const status = params.get("status");
    const plan = searchTerm(params.get("plan"));
    const subscription = params.get("subscription");
    const createdAfter = params.get("createdAfter");
    const pagination = parsePagination({
      page: params.get("page"),
      pageSize: params.get("pageSize"),
    });
    const sort = sortKey(params.get("sort"), SORT_KEYS, "createdAt");
    const direction = sortDirection(params.get("dir"));

    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { legalName: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { taxId: { contains: q, mode: "insensitive" } },
        { billingEmail: { contains: q, mode: "insensitive" } },
      ];
    }
    if (status === "ACTIVE" || status === "ARCHIVED") where.status = status;

    const subscriptionWhere: Record<string, unknown> = {};
    if (subscription === "none") {
      where.platformSubscription = null;
    } else {
      if (plan) subscriptionWhere.plan = { key: plan };
      if (subscription) subscriptionWhere.status = subscription;
      if (Object.keys(subscriptionWhere).length > 0) where.platformSubscription = subscriptionWhere;
    }

    if (createdAfter) {
      const date = new Date(createdAfter);
      if (!Number.isNaN(date.getTime())) where.createdAt = { gte: date };
    }

    const orderBy =
      sort === "name"
        ? { name: direction }
        : sort === "branches"
          ? { businesses: { _count: direction } }
          : { createdAt: direction };

    const [total, rows] = await Promise.all([
      prisma.organization.count({ where: where as never }),
      prisma.organization.findMany({
        where: where as never,
        orderBy: orderBy as never,
        skip: pagination.skip,
        take: pagination.take,
        select: {
          id: true,
          name: true,
          legalName: true,
          slug: true,
          status: true,
          baseCurrency: true,
          billingEmail: true,
          createdAt: true,
          _count: { select: { businesses: true } },
          platformSubscription: {
            select: {
              id: true,
              status: true,
              amount: true,
              currency: true,
              interval: true,
              trialEnd: true,
              currentPeriodEnd: true,
              cancelAtPeriodEnd: true,
              plan: { select: { key: true, name: true } },
            },
          },
          businesses: {
            take: 1,
            orderBy: { createdAt: "asc" },
            select: {
              name: true,
              memberships: {
                where: { role: "OWNER" },
                take: 1,
                select: { user: { select: { name: true, email: true } } },
              },
            },
          },
        },
      }),
    ]);

    await recordPlatformAudit({
      admin,
      action: "admin.organizations.list",
      entityType: "Organization",
      metadata: { q, status, plan, subscription, page: pagination.page },
    });

    return NextResponse.json({
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: totalPages(total, pagination.pageSize),
      organizations: rows.map((org) => {
        const owner = org.businesses[0]?.memberships[0]?.user ?? null;
        return {
          id: org.id,
          name: org.name,
          legalName: org.legalName,
          slug: org.slug,
          status: org.status,
          baseCurrency: org.baseCurrency,
          billingEmail: org.billingEmail,
          createdAt: iso(org.createdAt),
          branches: org._count.businesses,
          ownerName: owner?.name ?? null,
          ownerEmail: owner?.email ?? null,
          plan: org.platformSubscription?.plan.name ?? "Starter",
          planKey: org.platformSubscription?.plan.key ?? "starter",
          subscriptionId: org.platformSubscription?.id ?? null,
          subscriptionStatus: org.platformSubscription?.status ?? null,
          amount: org.platformSubscription ? Number(org.platformSubscription.amount) : 0,
          currency: org.platformSubscription?.currency ?? org.baseCurrency,
          interval: org.platformSubscription?.interval ?? null,
          trialEnd: iso(org.platformSubscription?.trialEnd),
          currentPeriodEnd: iso(org.platformSubscription?.currentPeriodEnd),
          cancelAtPeriodEnd: org.platformSubscription?.cancelAtPeriodEnd ?? false,
        };
      }),
    });
  } catch (err) {
    return platformErrorResponse(err);
  }
}
