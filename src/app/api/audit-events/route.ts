import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { BusinessRole } from "@prisma/client";

/**
 * AIDE-19: read-only audit trail for a business.
 *
 * GET /api/audit-events?limit=50&action=...&entityType=...
 * OWNER and MANAGER only. The trail is append-only; there is no write route.
 */

export const dynamic = "force-dynamic";

const READ_ROLES: BusinessRole[] = [BusinessRole.OWNER, BusinessRole.MANAGER];

export async function GET(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !READ_ROLES.includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const limitRaw = Number(url.searchParams.get("limit") ?? "50");
    const take = Number.isFinite(limitRaw)
      ? Math.min(Math.max(Math.trunc(limitRaw), 1), 100)
      : 50;
    const action = url.searchParams.get("action") ?? undefined;
    const entityType = url.searchParams.get("entityType") ?? undefined;

    const events = await prisma.auditEvent.findMany({
      where: {
        businessId,
        ...(action ? { action } : {}),
        ...(entityType ? { entityType } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        summary: true,
        metadata: true,
        createdAt: true,
        actor: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ events });
  } catch (err) {
    return toAuthError(err);
  }
}
