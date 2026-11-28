import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/platformAdmin.mjs";
import {
  BILLABLE_STATUSES,
  mrrFromGroups,
  normalizeRange,
  rangeStart,
  subscriptionSummary,
  totalPages,
} from "@/lib/platformBilling.mjs";
import {
  iso,
  platformErrorResponse,
  recordPlatformAudit,
  requirePlatformAdmin,
} from "@/lib/platformAuth";

export const dynamic = "force-dynamic";

/**
 * Platform overview (AIDE-ADMIN-03).
 *
 * Every figure here comes from platform billing records or an explicitly
 * labelled operational aggregate. Merchant POS sales are returned separately
 * as `merchantVolume` and must never be presented as OMIX revenue.
 */
export async function GET(request: NextRequest) {
  try {
    const { admin, permissions } = await requirePlatformAdmin(PERMISSIONS.VIEW_OVERVIEW);

    const range = normalizeRange(request.nextUrl.searchParams.get("range"));
    const since = rangeStart(range);
    const now = new Date();
    const trialWindowEnd = new Date(now.getTime() + 7 * 86400000);
    const renewalWindowEnd = new Date(now.getTime() + 30 * 86400000);

    const [
      totalOrganizations,
      activeOrganizations,
      starterOrganizations,
      totalBranches,
      totalUsers,
      statusGroups,
      mrrGroups,
      paidActive,
      trialsExpiringSoon,
      upcomingRenewals,
      salesGroups,
      productCount,
      reviewAgg,
      reviewCount,
      failedPayments,
      failedPaymentRows,
      openInvoices,
      overdueInvoices,
      unresolvedEvents,
      failedEventRows,
      trialRows,
      pastDueRows,
      recentOrgs,
      auditRows,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { status: "ACTIVE", businesses: { some: {} } } }),
      prisma.organization.count({ where: { platformSubscription: null } }),
      prisma.business.count(),
      prisma.user.count(),
      prisma.platformSubscription.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.platformSubscription.groupBy({
        by: ["status", "currency", "interval"],
        where: { status: { in: BILLABLE_STATUSES as never } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.platformSubscription.count({ where: { status: "ACTIVE", amount: { gt: 0 } } }),
      prisma.platformSubscription.count({
        where: { status: "TRIALING", trialEnd: { gte: now, lte: trialWindowEnd } },
      }),
      prisma.platformSubscription.count({
        where: {
          status: { in: BILLABLE_STATUSES as never },
          currentPeriodEnd: { gte: now, lte: renewalWindowEnd },
        },
      }),
      prisma.$queryRaw<Array<{ currency: string | null; amount: unknown; sales: number }>>`
        SELECT b."currency" AS currency, SUM(s."total") AS amount, COUNT(*)::int AS sales
        FROM "Sale" s
        JOIN "Business" b ON b."id" = s."businessId"
        WHERE s."createdAt" >= ${since}
        GROUP BY b."currency"
        ORDER BY currency
      `,
      prisma.product.count(),
      prisma.review.aggregate({ _avg: { rating: true } }),
      prisma.review.count(),
      prisma.platformPayment.count({
        where: { status: "FAILED", attemptedAt: { gte: since } },
      }),
      prisma.platformPayment.findMany({
        where: { status: "FAILED", attemptedAt: { gte: since } },
        orderBy: { attemptedAt: "desc" },
        take: 5,
        select: {
          id: true,
          amount: true,
          currency: true,
          failureCode: true,
          attemptedAt: true,
          invoice: {
            select: {
              id: true,
              number: true,
              organization: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.platformInvoice.count({ where: { status: "OPEN" } }),
      prisma.platformInvoice.count({
        where: { status: "OPEN", dueAt: { lt: now } },
      }),
      prisma.platformWebhookEvent.count({
        where: { status: { in: ["FAILED", "DEAD_LETTER"] } },
      }),
      prisma.platformWebhookEvent.findMany({
        where: { status: { in: ["FAILED", "DEAD_LETTER"] } },
        orderBy: { receivedAt: "desc" },
        take: 5,
        select: {
          id: true,
          providerEventId: true,
          type: true,
          status: true,
          attempts: true,
          receivedAt: true,
          organization: { select: { id: true, name: true } },
        },
      }),
      prisma.platformSubscription.findMany({
        where: { status: "TRIALING", trialEnd: { gte: now, lte: trialWindowEnd } },
        orderBy: { trialEnd: "asc" },
        take: 5,
        select: {
          id: true,
          trialEnd: true,
          organization: { select: { id: true, name: true } },
          plan: { select: { name: true } },
        },
      }),
      prisma.platformSubscription.findMany({
        where: { status: { in: ["PAST_DUE", "GRACE_PERIOD"] } },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          amount: true,
          currency: true,
          organization: { select: { id: true, name: true } },
        },
      }),
      prisma.organization.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          _count: { select: { businesses: true } },
          platformSubscription: {
            select: { status: true, plan: { select: { name: true } } },
          },
        },
      }),
      prisma.platformAuditEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          actorEmail: true,
          actorRole: true,
          reason: true,
          createdAt: true,
        },
      }),
    ]);

    const zeroPriceActive = await prisma.platformSubscription.count({
      where: { status: "ACTIVE", amount: 0 },
    });

    /** @type {Record<string, number>} */
    const byStatus: Record<string, number> = {
      TRIALING: 0,
      ACTIVE: 0,
      PAST_DUE: 0,
      GRACE_PERIOD: 0,
      CANCELED: 0,
      EXPIRED: 0,
    };
    for (const group of statusGroups) {
      byStatus[group.status] = group._count._all;
    }

    const summary = subscriptionSummary(
      statusGroups.flatMap((group) =>
        Array.from({ length: group._count._all }, () => ({ status: group.status }))
      ),
      { now }
    );

    const revenueByCurrency = mrrFromGroups(
      mrrGroups.map((group) => ({
        status: group.status,
        currency: group.currency,
        interval: group.interval,
        _sum: { amount: group._sum.amount as unknown as string },
        _count: { _all: group._count._all },
      }))
    );

    const merchantVolume = salesGroups.map((row) => ({
      currency: (row.currency || "KES").toUpperCase().replace(/^KSH$/, "KES"),
      amount: Number(row.amount ?? 0),
      sales: Number(row.sales ?? 0),
    }));

    const attention: Array<{
      id: string;
      kind: string;
      severity: "high" | "medium" | "low";
      title: string;
      detail: string;
      href: string;
    }> = [];

    for (const payment of failedPaymentRows) {
      attention.push({
        id: `payment-${payment.id}`,
        kind: "failed_payment",
        severity: "high",
        title: `Failed payment · ${payment.currency} ${Number(payment.amount).toFixed(2)}`,
        detail: `${payment.invoice.organization.name} · invoice ${payment.invoice.number}${
          payment.failureCode ? ` · ${payment.failureCode}` : ""
        }`,
        href: `/dashboard/admin/billing?q=${encodeURIComponent(payment.invoice.number)}`,
      });
    }
    for (const event of failedEventRows) {
      attention.push({
        id: `event-${event.id}`,
        kind: "webhook_failure",
        severity: event.status === "DEAD_LETTER" ? "high" : "medium",
        title: `${event.status === "DEAD_LETTER" ? "Dead-lettered" : "Failed"} webhook · ${event.type}`,
        detail: `${event.organization?.name ?? "Unlinked event"} · ${event.attempts} attempt${
          event.attempts === 1 ? "" : "s"
        }`,
        href: `/dashboard/admin/billing/events/${event.id}`,
      });
    }
    for (const trial of trialRows) {
      const days = Math.max(
        0,
        Math.ceil(((trial.trialEnd?.getTime() ?? now.getTime()) - now.getTime()) / 86400000)
      );
      attention.push({
        id: `trial-${trial.id}`,
        kind: "trial_expiring",
        severity: days <= 2 ? "medium" : "low",
        title: `Trial ends in ${days} day${days === 1 ? "" : "s"}`,
        detail: `${trial.organization.name} · ${trial.plan.name}`,
        href: `/dashboard/admin/subscriptions/${trial.id}`,
      });
    }
    for (const sub of pastDueRows) {
      attention.push({
        id: `sub-${sub.id}`,
        kind: "billing_state",
        severity: "high",
        title: sub.status === "PAST_DUE" ? "Subscription past due" : "Subscription in grace period",
        detail: `${sub.organization.name} · ${sub.currency} ${Number(sub.amount).toFixed(2)}`,
        href: `/dashboard/admin/subscriptions/${sub.id}`,
      });
    }

    // Viewing the platform overview is an audited action: it exposes
    // cross-organization billing context.
    await recordPlatformAudit({
      admin,
      action: "admin.overview.view",
      entityType: "PlatformOverview",
      metadata: { range },
    });

    return NextResponse.json({
      viewer: { id: admin.id, name: admin.name, email: admin.email, role: admin.role, permissions },
      generatedAt: iso(now),
      range,
      platform: {
        organizations: totalOrganizations,
        activeOrganizations,
        starterOrganizations: starterOrganizations + zeroPriceActive,
        branches: totalBranches,
        users: totalUsers,
        products: productCount,
        reviews: reviewCount,
        avgReviewRating: Math.round((reviewAgg._avg.rating || 0) * 10) / 10,
      },
      subscriptions: {
        total: statusGroups.reduce((sum, group) => sum + group._count._all, 0),
        byStatus,
        paidActive,
        trialing: summary.trialing,
        trialsExpiringSoon,
        upcomingRenewals,
        pastDue: byStatus.PAST_DUE,
        gracePeriod: byStatus.GRACE_PERIOD,
        canceled: byStatus.CANCELED,
        expired: byStatus.EXPIRED,
      },
      revenue: {
        subscription: revenueByCurrency,
        merchantVolume,
        merchantVolumeNote:
          "Merchant sales volume is money businesses recorded in their own POS, grouped by business currency. It is not OMIX revenue.",
      },
      billing: {
        failedPayments,
        openInvoices,
        overdueInvoices,
      },
      events: {
        unresolved: unresolvedEvents,
      },
      attention,
      recentOrganizations: recentOrgs.map((org) => ({
        id: org.id,
        name: org.name,
        status: org.status,
        createdAt: iso(org.createdAt),
        branches: org._count.businesses,
        plan: org.platformSubscription?.plan.name ?? "Starter",
        subscriptionStatus: org.platformSubscription?.status ?? null,
      })),
      activity: auditRows.map((row) => ({
        id: row.id,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        actorEmail: row.actorEmail,
        actorRole: row.actorRole,
        reason: row.reason,
        createdAt: iso(row.createdAt),
      })),
      definitions: {
        MRR: "Monthly recurring revenue from OMIX subscription billing. Active, past-due and grace-period subscriptions count; annual plans are divided by 12. Trials, cancellations and expiries are excluded.",
        ARR: "MRR × 12 for the same subscriptions, in the same currency.",
        ACTIVE_ORGANIZATION: "An organization with status Active that has at least one branch.",
        PAID_SUBSCRIPTION: "An active subscription with a non-zero amount. A trial is not a paid subscription.",
        STARTER_ORGANIZATION:
          "An organization with no subscription record, or an active zero-price subscription.",
        MERCHANT_SALES_VOLUME:
          "Total recorded by businesses' own POS sales, grouped by business currency. Not OMIX revenue.",
        TRIAL_EXPIRING: "A trial ending within the next 7 days.",
      },
      totalPages: totalPages(1, 25),
    });
  } catch (err) {
    return platformErrorResponse(err);
  }
}
