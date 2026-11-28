import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/platformAdmin.mjs";
import { diffPlanVersions, validatePlanVersionInput } from "@/lib/platformPlans.mjs";
import { iso, platformErrorResponse, recordPlatformAudit, requirePlatformAdmin } from "@/lib/platformAuth";

export const dynamic = "force-dynamic";

/**
 * Publish a new immutable plan version (AIDE-ADMIN-05).
 *
 * Existing subscribers keep the version they were sold: the new row applies to
 * future subscriptions only. Migrating existing subscribers would be a
 * separate, explicit workflow.
 */
export async function POST(request: NextRequest, { params }: { params: { key: string } }) {
  try {
    const { admin } = await requirePlatformAdmin(PERMISSIONS.PUBLISH_PLANS);

    const plan = await prisma.platformPlan.findUnique({
      where: { key: params.key },
      select: {
        id: true,
        key: true,
        name: true,
        versions: {
          orderBy: { version: "desc" },
          take: 1,
          select: {
            id: true,
            version: true,
            price: true,
            currency: true,
            interval: true,
            trialDays: true,
            entitlements: true,
            limits: true,
          },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const validation = validatePlanVersionInput(body);
    if (!validation.ok) {
      return NextResponse.json(
        { error: "Some values need attention.", errors: validation.errors },
        { status: 400 }
      );
    }

    const latest = plan.versions[0] ?? null;
    const nextVersion = (latest?.version ?? 0) + 1;
    const value = validation.value;

    const created = await prisma.platformPlanVersion.create({
      data: {
        planId: plan.id,
        version: nextVersion,
        status: "PUBLISHED",
        displayName: value.displayName,
        description: value.description,
        price: value.price,
        currency: value.currency,
        interval: value.interval,
        trialDays: value.trialDays,
        entitlements: value.entitlements,
        limits: value.limits,
        effectiveFrom: value.effectiveFrom,
        publishedAt: new Date(),
        createdBy: admin.email,
        changeReason: value.changeReason,
      },
      select: {
        id: true,
        version: true,
        status: true,
        displayName: true,
        price: true,
        currency: true,
        interval: true,
        trialDays: true,
        entitlements: true,
        limits: true,
        effectiveFrom: true,
        publishedAt: true,
        createdBy: true,
        changeReason: true,
      },
    });

    const subscriberCount = await prisma.platformSubscription.count({
      where: { planId: plan.id },
    });

    await recordPlatformAudit({
      admin,
      action: "admin.plan.publish",
      entityType: "PlatformPlanVersion",
      entityId: created.id,
      reason: value.changeReason,
      before: latest
        ? {
            version: latest.version,
            price: Number(latest.price),
            currency: latest.currency,
            interval: latest.interval,
            trialDays: latest.trialDays,
            entitlements: latest.entitlements,
            limits: latest.limits,
          }
        : null,
      after: {
        version: created.version,
        price: Number(created.price),
        currency: created.currency,
        interval: created.interval,
        trialDays: created.trialDays,
        entitlements: created.entitlements,
        limits: created.limits,
      },
      metadata: { planKey: plan.key, subscriberCount },
    });

    return NextResponse.json(
      {
        version: {
          ...created,
          price: Number(created.price),
          effectiveFrom: iso(created.effectiveFrom),
          publishedAt: iso(created.publishedAt),
        },
        warnings: validation.warnings,
        appliesTo: "new_subscribers",
        existingSubscribers: subscriberCount,
        changes: latest ? diffPlanVersions(latest, created) : [],
      },
      { status: 201 }
    );
  } catch (err) {
    return platformErrorResponse(err);
  }
}
