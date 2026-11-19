import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";
import { gateAction } from "@/lib/approvalGate";

/**
 * AIDE-10: Stock adjustment management API.
 *
 * GET    /api/stock-adjustments — List stock adjustments
 * POST   /api/stock-adjustments — Create a new stock adjustment
 */

export const dynamic = "force-dynamic";

/**
 * GET — List all stock adjustments for the business.
 */
export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const { searchParams } = new URL(request.url);
    const reason = searchParams.get("reason");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    const where: any = { businessId };
    if (reason) where.reason = reason;
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = new Date(fromDate);
      if (toDate) where.date.lte = new Date(toDate);
    }

    const adjustments = await prisma.stockAdjustment.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        lines: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
    });

    return NextResponse.json(adjustments);
  } catch (err) {
    return toAuthError(err);
  }
}

/**
 * POST — Create a new stock adjustment.
 *
 * Body: { reason, notes?, lines: [{productId, quantityDelta, unitCost?}] }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.STOCK_ADJUST_CREATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const reason = body?.reason;
    if (!reason) {
      return NextResponse.json({ error: "reason is required" }, { status: 400 });
    }

    const lines = Array.isArray(body?.lines) ? body.lines : [];
    if (lines.length === 0) {
      return NextResponse.json({ error: "At least one line item is required" }, { status: 400 });
    }

    // AIDE-12: an active policy gates the write on the server. Direct API
    // calls cannot skip approval; the action is executed only after a quorum.
    const amount = lines.reduce(
      (sum: number, line: any) =>
        sum + Math.abs(Number(line.quantityDelta) || 0) * (Number(line.unitCost) || 0),
      0
    );
    const approval = await gateAction({
      businessId,
      requesterId: user.id,
      actionType: "STOCK_ADJUSTMENT",
      resourceType: "StockAdjustment",
      amount,
      payload: { reason, notes: body?.notes, lines },
    });
    if (approval) {
      return NextResponse.json(
        { approvalRequired: true, requestId: approval.id, status: approval.status },
        { status: 202 }
      );
    }

    // Validate all products exist and belong to the business
    const productIds = lines.map((l: any) => l.productId).filter(Boolean);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, businessId },
    });
    if (products.length !== productIds.length) {
      return NextResponse.json({ error: "One or more products not found" }, { status: 404 });
    }

    // Auto-generate adjustment number
    const year = new Date().getFullYear();
    const count = await prisma.stockAdjustment.count({ where: { businessId } });
    const adjustmentNo = `SAJ-${year}-${(count + 1).toString().padStart(4, "0")}`;

    // Build adjustment lines with product snapshots
    const adjustmentLines = lines.map((line: any, i: number) => {
      const product = products.find((p) => p.id === line.productId);
      return {
        productName: product?.name || line.productName || "",
        quantityDelta: Number(line.quantityDelta) || 0,
        unitCost: line.unitCost ? Number(line.unitCost) : (product?.buyingPrice ? Number(product.buyingPrice) : 0),
        productId: line.productId || null,
      };
    });

    // Create the adjustment header
    const adjustment = await prisma.stockAdjustment.create({
      data: {
        businessId,
        adjustmentNo,
        reason,
        notes: body?.notes?.trim() || null,
        lines: {
          create: adjustmentLines,
        },
      },
    });

    // Apply stock changes to products
    const updatePromises = adjustmentLines
      .filter((l: any) => l.productId)
      .map(async (line: any) => {
        const product = await prisma.product.findUnique({
          where: { id: line.productId! },
        });
        if (!product || product.businessId !== businessId) return;

        const newQty = product.quantity + line.quantityDelta;
        if (newQty < 0) {
          throw new Error(`Insufficient stock for product ${product.name}: current ${product.quantity}, delta ${line.quantityDelta}`);
        }

        return prisma.product.update({
          where: { id: line.productId! },
          data: { quantity: newQty },
        });
      });

    const results = await Promise.all(updatePromises);

    // Check for any errors
    for (const result of results) {
      if (result instanceof Error) throw result;
    }

    // Fetch the full adjustment with lines
    const fullAdjustment = await prisma.stockAdjustment.findUnique({
      where: { id: adjustment.id },
      include: {
        lines: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
    });

    return NextResponse.json(fullAdjustment, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Insufficient stock")) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return toAuthError(err);
  }
}
