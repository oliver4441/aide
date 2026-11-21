import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, hasAnyPermission, Permission } from "@/lib/rbac";
import { PurchaseOrderStatus, Prisma } from "@prisma/client";

/**
 * AIDE-09: Goods Received Note (GRN) API.
 *
 * POST   /api/goods-received — Create a GRN against a purchase order
 * GET    /api/goods-received — List GRNs
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (
      !membership ||
      !hasAnyPermission(membership.role, [Permission.GOODS_RECEIVE, Permission.PURCHASE_ORDER_READ])
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

    const grnLines = lines.map((line: any) => {
      const quantity = Number(line?.quantity);
      const unitCost = Number(line?.unitCost);
      if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitCost) || unitCost < 0) {
        throw new Error("Invalid line item quantity or unitCost");
      }
      return {
        description: String(line.description || "").trim(),
        quantity,
        unitCost,
        amount: quantity * unitCost,
        productMatch: line?.productMatch?.trim() || null,
      };
    });

    const year = new Date().getFullYear();

    const grn = await prisma.$transaction(async (tx) => {
      const latest = await tx.goodsReceivedNote.findFirst({
        where: { businessId, grnNumber: { startsWith: `GRN-${year}-` } },
        orderBy: { grnNumber: "desc" },
        select: { grnNumber: true },
      });
      const match = latest?.grnNumber.match(/GRN-\d{4}-(\d+)/);
      const seq = match ? parseInt(match[1], 10) + 1 : 1;
      const grnNumber = `GRN-${year}-${seq.toString().padStart(4, "0")}`;

      const created = await tx.goodsReceivedNote.create({
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

      await updatePurchaseOrderStatus(tx, purchaseOrderId);
      return created;
    });

    return NextResponse.json(grn, { status: 201 });
  } catch (err: any) {
    if (err?.message?.includes("Invalid line item")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return toAuthError(err);
  }
}

async function updatePurchaseOrderStatus(
  tx: Prisma.TransactionClient,
  purchaseOrderId: string
) {
  const po = await tx.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    include: {
      lines: true,
      goodsReceived: {
        include: { lines: true },
      },
    },
  });
  if (!po) return;

  const orderedQty: Map<string, number> = new Map();
  for (const line of po.lines) {
    const key = line.description;
    orderedQty.set(key, (orderedQty.get(key) || 0) + Number(line.quantity));
  }

  const receivedQty: Map<string, number> = new Map();
  for (const grn of po.goodsReceived) {
    for (const line of grn.lines) {
      const key = line.description;
      receivedQty.set(key, (receivedQty.get(key) || 0) + Number(line.quantity));
    }
  }

  let allReceived = orderedQty.size > 0;
  let anyReceived = false;
  for (const [key, ordered] of Array.from(orderedQty.entries())) {
    const received = receivedQty.get(key) || 0;
    if (received > 0) {
      anyReceived = true;
    }
    if (received < ordered) {
      allReceived = false;
    }
  }

  let newStatus: PurchaseOrderStatus;
  if (allReceived) {
    newStatus = "RECEIVED";
  } else if (anyReceived) {
    newStatus = "PARTIALLY_RECEIVED";
  } else {
    newStatus = po.status === "DRAFT" ? "DRAFT" : po.status;
  }

  if (newStatus !== po.status) {
    await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { status: newStatus },
    });
  }
}
