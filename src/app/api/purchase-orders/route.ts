import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { gateRequest, approvalResponse } from "@/lib/approvalReplay";
import { hasPermission, Permission } from "@/lib/rbac";

/**
 * AIDE-09: Purchase order management API.
 *
 * GET    /api/purchase-orders — List purchase orders
 * POST   /api/purchase-orders — Create a new purchase order
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.PURCHASE_ORDER_READ)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

    const supplierId = body?.supplierId;
    if (!supplierId) {
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

    const poLines: Array<{ description: string; quantity: number; unitPrice: number; amount: number }> = lines.map((line: any) => {
      const quantity = Number(line?.quantity);
      const unitPrice = Number(line?.unitPrice);
      if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error("Invalid line item quantity or unitPrice");
      }
      return {
        description: String(line.description || "").trim(),
        quantity,
        unitPrice,
        amount: quantity * unitPrice,
      };
    });

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { taxRate: true },
    });
    const taxRate = body?.taxRate !== undefined
      ? Math.max(0, Number(body.taxRate) || 0)
      : (business?.taxRate ? Number(business.taxRate) : 0);

    const subtotal = poLines.reduce((sum, l) => sum + l.amount, 0);
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    const approval = await gateRequest(request, body, {
      businessId,
      userId: user.id,
      actionType: "PURCHASE_ORDER",
      resourceType: "PurchaseOrder",
      amount: total,
    });
    if (approval) return approvalResponse(approval);

    const year = new Date().getFullYear();
    const order = await prisma.$transaction(async (tx) => {
      const latest = await tx.purchaseOrder.findFirst({
        where: { businessId, poNumber: { startsWith: `PO-${year}-` } },
        orderBy: { poNumber: "desc" },
        select: { poNumber: true },
      });
      const match = latest?.poNumber.match(/PO-\d{4}-(\d+)/);
      const seq = match ? parseInt(match[1], 10) + 1 : 1;
      const poNumber = `PO-${year}-${seq.toString().padStart(4, "0")}`;

      return tx.purchaseOrder.create({
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
    });

    return NextResponse.json(order, { status: 201 });
  } catch (err: any) {
    if (err?.message?.includes("Invalid line item")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return toAuthError(err);
  }
}
