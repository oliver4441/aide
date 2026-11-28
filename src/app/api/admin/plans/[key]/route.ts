import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, hasPermission } from "@/lib/platformAdmin.mjs";
import { PLAN_KIND } from "@/lib/platformPlans.mjs";
import { iso, platformErrorResponse, recordPlatformAudit, requirePlatformAdmin } from "@/lib/platformAuth";

export const dynamic = "force-dynamic";

/** Plan detail with its full version history (AIDE-ADMIN-05). */
export async function GET(_request: NextRequest, { params }: { params: { key: string } }) {
  try {
    const { admin } = await requirePlatformAdmin(PERMISSIONS.VIEW_PLANS);

    const plan = await prisma.platformPlan.findUnique({
      where: { key: params.key },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
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
            _count: { select: { subscriptions: true } },
          },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    return NextResponse.json({
      canPublish: hasPermission(admin.role, PERMISSIONS.PUBLISH_PLANS),
      plan: {
        id: plan.id,
        key: plan.key,
        name: plan.name,
        description: plan.description,
        kind: PLAN_KIND[plan.key] ?? "Plan",
        createdAt: iso(plan.createdAt),
        updatedAt: iso(plan.updatedAt),
        versions: plan.versions.map((version) => ({
          ...version,
          price: Number(version.price),
          effectiveFrom: iso(version.effectiveFrom),
          publishedAt: iso(version.publishedAt),
          archivedAt: iso(version.archivedAt),
          subscriberCount: version._count.subscriptions,
        })),
      },
    });
  } catch (err) {
    return platformErrorResponse(err);
  }
}

/** Rename or re-describe a plan family. Commercial values live on versions. */
export async function PATCH(request: NextRequest, { params }: { params: { key: string } }) {
  try {
    const { admin } = await requirePlatformAdmin(PERMISSIONS.PUBLISH_PLANS);
    const body = await request.json().catch(() => ({}));

    const plan = await prisma.platformPlan.findUnique({
      where: { key: params.key },
      select: { id: true, name: true, description: true },
    });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    const data: { name?: string; description?: string | null } = {};
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 2 || name.length > 80) {
        return NextResponse.json(
          { error: "Plan name must be between 2 and 80 characters." },
          { status: 400 }
        );
      }
      data.name = name;
    }
    if (body.description !== undefined) {
      const description = String(body.description ?? "").trim();
      if (description.length > 500) {
        return NextResponse.json(
          { error: "Plan description must be 500 characters or fewer." },
          { status: 400 }
        );
      }
      data.description = description || null;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const updated = await prisma.platformPlan.update({
      where: { id: plan.id },
      data,
      select: { id: true, key: true, name: true, description: true },
    });

    await recordPlatformAudit({
      admin,
      action: "admin.plan.update",
      entityType: "PlatformPlan",
      entityId: plan.id,
      reason: typeof body.changeReason === "string" ? body.changeReason.slice(0, 500) : null,
      before: { name: plan.name, description: plan.description },
      after: { name: updated.name, description: updated.description },
    });

    return NextResponse.json({ plan: updated });
  } catch (err) {
    return platformErrorResponse(err);
  }
}
