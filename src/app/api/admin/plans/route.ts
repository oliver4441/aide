import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, hasPermission } from "@/lib/platformAdmin.mjs";
import { PLAN_KIND } from "@/lib/platformPlans.mjs";
import { iso, platformErrorResponse, recordPlatformAudit, requirePlatformAdmin } from "@/lib/platformAuth";

export const dynamic = "force-dynamic";

/** Plan catalogue (AIDE-ADMIN-05). Read-only listing of plans and versions. */
export async function GET() {
  try {
    const { admin, permissions } = await requirePlatformAdmin(PERMISSIONS.VIEW_PLANS);

    const [plans, subscriberGroups] = await Promise.all([
      prisma.platformPlan.findMany({
        orderBy: { key: "asc" },
        select: {
          id: true,
          key: true,
          name: true,
          description: true,
          createdAt: true,
          versions: {
            orderBy: { version: "desc" },
            select: {
              id: true,
              version: true,
              status: true,
              displayName: true,
              description: true,
              price: true,
              currency: true,
              interval: true,
              trialDays: true,
              entitlements: true,
              limits: true,
              effectiveFrom: true,
              publishedAt: true,
              archivedAt: true,
              createdBy: true,
              changeReason: true,
            },
          },
        },
      }),
      prisma.platformSubscription.groupBy({ by: ["planId"], _count: { _all: true } }),
    ]);

    const subscriberCounts = new Map(
      subscriberGroups.map((group) => [group.planId, group._count._all])
    );

    await recordPlatformAudit({
      admin,
      action: "admin.plans.list",
      entityType: "PlatformPlan",
    });

    return NextResponse.json({
      canPublish: hasPermission(admin.role, PERMISSIONS.PUBLISH_PLANS),
      plans: plans.map((plan) => ({
        id: plan.id,
        key: plan.key,
        name: plan.name,
        description: plan.description,
        kind: PLAN_KIND[plan.key] ?? "Plan",
        createdAt: iso(plan.createdAt),
        subscriberCount: subscriberCounts.get(plan.id) ?? 0,
        versions: plan.versions.map((version) => ({
          ...version,
          price: Number(version.price),
          effectiveFrom: iso(version.effectiveFrom),
          publishedAt: iso(version.publishedAt),
          archivedAt: iso(version.archivedAt),
        })),
      })),
    });
  } catch (err) {
    return platformErrorResponse(err);
  }
}
