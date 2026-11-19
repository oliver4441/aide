import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { gateRequest, approvalResponse } from "@/lib/approvalReplay";
import { hasPermission, Permission } from "@/lib/rbac";
import { PurchaseOrderStatus } from "@prisma/client";

/**
 * AIDE-09: Purchase order management API.
 *
 * GET    /api/purchase-orders — List purchase orders
 * POST   /api/purchase-orders — Create a new purchase order
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const supplierId = searchParams.get("supplierId");

    const where: any = { businessId };
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const orders = await prisma.purchaseOrder.findMany({
      where,
      orderBy: { orderDate: "desc" },
      include: {
        supplier: {
          select: { id: true, name: true, phone: true, email: true },
        },
        lines: true,
      },
    });

    return NextResponse.json(orders);
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
    if (!membership || !hasPermission(membership.role, Permission.PURCHASE_ORDER_CREATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const approval = await gateRequest(request, body, {
      businessId,
      userId: user.id,
      actionType: "PURCHASE_ORDER",
      resourceType: "PurchaseOrder",
      amount: Number(body.total) || 0,
    });
    if (approval) return approvalResponse(approval);

    const supplierId = body?.supplierId;
    if (!body?.supplierId) {
      return NextResponse.json({ error: "supplierId is required" }, { status: 400 });
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });
    if (!supplier || supplier.businessId !== businessId) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const lines = Array.isArray(body?.lines) ? body.lines : [];
    if (lines.length === 0) {
      return NextResponse.json({ error: "At least one line item is required" }, { status: 400 });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { taxRate: true },
    });
    const taxRate = business?.taxRate ? Number(business.taxRate) : 0;

    const poLines = lines.map((line: any, i: number) => ({
      lineOrder: i + 1,
      description: line.description || "",
      quantity: Number(line.quantity) || 0,
      unitPrice: Number(line.unitPrice) || 0,
      amount: (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0),
    }));

    const subtotal = poLines.reduce((sum: number, l: any) => sum + l.amount, 0);
    const tax = subtotal * (taxRate / (100 + taxRate));
    const total = subtotal + tax;

    const year = new Date().getFullYear();
    const count = await prisma.purchaseOrder.count({ where: { businessId } });
    const poNumber = `PO-${year}-${(count + 1).toString().padStart(4, "0")}`;

    const order = await prisma.purchaseOrder.create({
      data: {
        businessId,
        poNumber,
        supplierId,
        subtotal,
        tax,
        total,
        expectedDate: body?.expectedDate ? new Date(body.expectedDate) : null,
        notes: body?.notes?.trim() || null,
        lines: {
          create: poLines,
        },
      },
      include: {
        lines: true,
        supplier: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}
