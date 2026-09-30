import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

const CATEGORIES = ["sales", "inventory", "customers", "system", "business"];

/** List the caller's notifications for a business (optionally since cursor). */
export async function GET(request: NextRequest) {
  try {
    const businessIdParam = request.nextUrl.searchParams.get("businessId");
    const since = request.nextUrl.searchParams.get("since");
    const { user, businessId } = await requireBusiness(businessIdParam, request);

    const where: any = {
      userId: user.id,
      businessId,
      deletedAt: null,
    };
    if (since) {
      where.createdAt = { gt: new Date(since) };
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ notifications });
  } catch (err) {
    return toAuthError(err);
  }
}

/** Create a server-side notification for the caller (e.g. low stock, summary). */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, message, data, businessId: requestedBusinessId } = body;
    if (!type || !title || !message) {
      return NextResponse.json({ error: "type, title and message are required" }, { status: 400 });
    }

    const { user, businessId } = await requireBusiness(requestedBusinessId, request);

    const pref = await prisma.notificationPreference.findUnique({
      where: {
        userId_businessId_type: { userId: user.id, businessId, type },
      },
    });
    const enabled = pref ? pref.enabled : true;
    if (!enabled) {
      return NextResponse.json({ skipped: true });
    }

    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        businessId,
        type: CATEGORIES.includes(type) ? type : "system",
        channel: "server",
        title,
        message,
        data: data ?? undefined,
      },
    });

    return NextResponse.json({ notification });
  } catch (err) {
    return toAuthError(err);
  }
}

/** Mark one or more notifications as read. */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, businessId: requestedBusinessId } = body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array required" }, { status: 400 });
    }

    const { user, businessId } = await requireBusiness(requestedBusinessId, request);

    const { count } = await prisma.notification.updateMany({
      where: { id: { in: ids }, userId: user.id, businessId, deletedAt: null },
      data: { read: true },
    });

    return NextResponse.json({ updated: count });
  } catch (err) {
    return toAuthError(err);
  }
}
