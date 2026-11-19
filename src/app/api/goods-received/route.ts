import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";
import { PurchaseOrderStatus } from "@prisma/client";

/**
 * AIDE-09: Goods Received Note (GRN) API.
 *
 * POST   /api/goods-received — Create a GRN against a purchase order
 * GET    /api/goods-received   — List GRNs
 */

export const dynamic = "force-dynamic";

/**
 * GET — List GRNs with optional filters.
 */
export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const { searchParams } = new URL(request.url);
    const purchaseOrderId = searchParams.get("purchaseOrderId");
    const supplierId = searchParams.get("supplierId");

    const where: any = { businessId };
    if (purchaseOrderId) where.purchaseOrderId = purchaseOrderId;
    if (supplierId) where.supplierId = supplierId;

    const grns = await prisma.goodsReceivedNote.findMany({
      where,
      orderBy: { receivedDate: "desc" },
      include: {
        purchaseOrder: {
          select: { id: true, poNumber: true, status: true },
        },
        supplier: {
          select: { id: true, name: true },
        },
        lines: true,
      },
    });

    return NextResponse.json(grns);
  } catch (err) {
    return toAuthError(err);
  }
}

/**
 * POST — Create a GRN against a purchase order.
 *
 * Body: {
 *   purchaseOrderId: string,
 *   lines: [{ description, quantity, unitCost, productMatch? }],
 *   notes?: string
 * }
 *
 * On receive, updates the PO status based on total received vs ordered quantity.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.GOODS_RECEIVE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const purchaseOrderId = body?.purchaseOrderId;
    if (!purchaseOrderId) {
      return NextResponse.json({ error: "purchaseOrderId is required" }, { status: 400 });
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { lines: true },
    });
    if (!po || po.businessId !== businessId) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }
    if (po.status === "CANCELLED") {
      return NextResponse.json({ error: "Cannot receive against cancelled PO" }, { status: 400 });
    }

    const lines = Array.isArray(body?.lines) ? body.lines : [];
    if (lines.length === 0) {
      return NextResponse.json({ error: "At least one line item is required" }, { status: 400 });
    }

    const grnLines = lines.map((line: any, i: number) => ({
      lineOrder: i + 1,
      description: line.description || "",
      quantity: Number(line.quantity) || 0,
      unitCost: Number(line.unitCost) || 0,
      amount: (Number(line.quantity) || 0) * (Number(line.unitCost) || 0),
      productMatch: line?.productMatch?.trim() || null,
    }));

    const year = new Date().getFullYear();
    const count = await prisma.goodsReceivedNote.count({ where: { businessId } });
    const grnNumber = `GRN-${year}-${(count + 1).toString().padStart(4, "0")}`;

    const grn = await prisma.goodsReceivedNote.create({
      data: {
        businessId,
        grnNumber,
        purchaseOrderId,
        supplierId: po.supplierId,
        notes: body?.notes?.trim() || null,
        lines: {
          create: grnLines,
        },
      },
      include: {
        lines: true,
        purchaseOrder: {
          select: { id: true, poNumber: true },
        },
        supplier: {
          select: { id: true, name: true },
        },
      },
    });

    // Update PO status based on received vs ordered quantity
    await updatePurchaseOrderStatus(purchaseOrderId);

    return NextResponse.json(grn, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}

/**
 * Update PO status based on total received quantity across all GRNs.
 */
async function updatePurchaseOrderStatus(purchaseOrderId: string) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    include: {
      lines: true,
      goodsReceived: {
        include: { lines: true },
      },
    },
  });
  if (!po) return;

  // Build a map of ordered quantity by description
  const orderedQty: Map<string, number> = new Map();
  for (const line of po.lines) {
    const key = line.description;
    orderedQty.set(key, (orderedQty.get(key) || 0) + Number(line.quantity));
  }

  // Build a map of received quantity by description
  const receivedQty: Map<string, number> = new Map();
  for (const grn of po.goodsReceived) {
    for (const line of grn.lines) {
      const key = line.description;
      receivedQty.set(key, (receivedQty.get(key) || 0) + Number(line.quantity));
    }
  }

  // Determine status
  let allReceived = true;
  let anyReceived = false;
  for (const [key, ordered] of Array.from(orderedQty.entries())) {
    const received = receivedQty.get(key) || 0;
    if (received >= ordered) {
      anyReceived = true;
    } else {
      allReceived = false;
    }
  }

  let newStatus: PurchaseOrderStatus;
  if (allReceived && orderedQty.size > 0) {
    newStatus = "RECEIVED";
  } else if (anyReceived) {
    newStatus = "PARTIALLY_RECEIVED";
  } else {
    newStatus = po.status === "DRAFT" ? "DRAFT" : po.status;
  }

  if (newStatus !== po.status) {
    await prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { status: newStatus },
    });
  }
}
