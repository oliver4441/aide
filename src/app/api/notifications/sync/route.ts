import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

/**
 * Reconcile the in-app notification state between the server and a device.
 *
 * The client sends:
 *  - readIds:     local notifications the user has read
 *  - deletedIds:  local notifications the user has dismissed
 *  - since:       cursor — return server notifications created after this
 *
 * We persist read/deleted server-side (so reads and dismissals propagate to
 * every device), then return server-born notifications the device hasn't seen.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { readIds, deletedIds, since, businessId: requestedBusinessId } = body;

    const { user, businessId } = await requireBusiness(requestedBusinessId, request);

    if (Array.isArray(readIds) && readIds.length > 0) {
      await prisma.notification.updateMany({
        where: { id: { in: readIds }, userId: user.id, businessId, deletedAt: null },
        data: { read: true },
      });
    }

    if (Array.isArray(deletedIds) && deletedIds.length > 0) {
      await prisma.notification.updateMany({
        where: { id: { in: deletedIds }, userId: user.id, businessId },
        data: { deletedAt: new Date() },
      });
    }

    const where: any = {
      userId: user.id,
      businessId,
      channel: "server",
      deletedAt: null,
    };
    if (since) {
      where.createdAt = { gt: new Date(since) };
    }

    const incoming = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ notifications: incoming, serverNow: new Date().toISOString() });
  } catch (err) {
    return toAuthError(err);
  }
}
