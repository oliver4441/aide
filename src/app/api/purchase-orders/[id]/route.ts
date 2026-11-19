import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";
import { PurchaseOrderStatus } from "@prisma/client";

/**
 * AIDE-09: Purchase order detail operations.
 *
 * GET    /api/purchase-orders/[id] — Get purchase order details
 * PATCH  /api/purchase-orders/[id] — Update status or notes
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const order = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: {
        supplier: {
          select: { id: true, name: true, phone: true, email: true, address: true },
        },
        lines: true,
        goodsReceived: {
          include: {
            lines: true,
          },
          orderBy: { receivedDate: "desc" },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }
    if (order.businessId !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(order);
  } catch (err) {
    return toAuthError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.PURCHASE_ORDER_UPDATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const order = await prisma.purchaseOrder.findUnique({ where: { id: params.id } });
    if (!order) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }
    if (order.businessId !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const updateData: any = {};

    if (body?.status !== undefined) {
      const validStatuses = Object.values(PurchaseOrderStatus);
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updateData.status = body.status;
    }
    if (body?.expectedDate !== undefined) {
      updateData.expectedDate = body.expectedDate ? new Date(body.expectedDate) : null;
    }
    if (body?.notes !== undefined) updateData.notes = body.notes?.trim() || null;

    const updated = await prisma.purchaseOrder.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (err) {
    return toAuthError(err);
  }
}
