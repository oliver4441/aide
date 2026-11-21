import { NextRequest, NextResponse } from "next/server";
import { StockAdjustmentReason } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";
import { gateRequest, approvalResponse } from "@/lib/approvalReplay";

/**
 * AIDE-10: Stock adjustment management API.
 *
 * GET    /api/stock-adjustments — List stock adjustments
 * POST   /api/stock-adjustments — Create a new stock adjustment
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.STOCK_ADJUST_READ)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
    const reason = body?.reason as StockAdjustmentReason;
    if (!reason || !Object.values(StockAdjustmentReason).includes(reason)) {
      return NextResponse.json({ error: "Valid stock adjustment reason is required" }, { status: 400 });
    }

    const lines = Array.isArray(body?.lines) ? body.lines : [];
    if (lines.length === 0) {
      return NextResponse.json({ error: "At least one line item is required" }, { status: 400 });
    }

    const productIds: string[] = Array.from(
      new Set<string>(
        lines
          .map((l: any) => l?.productId)
          .filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
      )
    );
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, businessId },
    });
    if (products.length !== productIds.length) {
      return NextResponse.json({ error: "One or more products not found" }, { status: 404 });
    }
    const productMap = new Map(products.map((p) => [p.id, p]));

    const adjustmentLines = lines.map((line: any) => {
      const product = line.productId ? productMap.get(String(line.productId)) : undefined;
      const quantityDelta = parseInt(String(line.quantityDelta), 10);
      if (!Number.isInteger(quantityDelta) || quantityDelta === 0) {
        throw new Error("quantityDelta must be a non-zero integer");
      }
      const unitCost =
        line.unitCost !== undefined && line.unitCost !== null
          ? Number(line.unitCost)
          : (product?.buyingPrice ? Number(product.buyingPrice) : 0);
      return {
        productName: product?.name || String(line.productName || ""),
        quantityDelta,
        unitCost,
        productId: product ? product.id : null,
      };
    });

    const amount = adjustmentLines.reduce(
      (sum: number, line: { quantityDelta: number; unitCost: number }) =>
        sum + Math.abs(line.quantityDelta) * line.unitCost,
      0
    );

    const approval = await gateRequest(request, body, {
      businessId,
      userId: user.id,
      actionType: "STOCK_ADJUSTMENT",
      resourceType: "StockAdjustment",
      amount,
    });
    if (approval) return approvalResponse(approval);

    const year = new Date().getFullYear();

    const fullAdjustment = await prisma.$transaction(async (tx) => {
      const latest = await tx.stockAdjustment.findFirst({
        where: { businessId, adjustmentNo: { startsWith: `SAJ-${year}-` } },
        orderBy: { adjustmentNo: "desc" },
        select: { adjustmentNo: true },
      });
      const match = latest?.adjustmentNo.match(/SAJ-\d{4}-(\d+)/);
      const seq = match ? parseInt(match[1], 10) + 1 : 1;
      const adjustmentNo = `SAJ-${year}-${seq.toString().padStart(4, "0")}`;

      for (const line of adjustmentLines) {
        if (!line.productId) continue;
        if (line.quantityDelta < 0) {
          const res = await tx.product.updateMany({
            where: {
              id: line.productId,
              businessId,
              quantity: { gte: Math.abs(line.quantityDelta) },
            },
            data: { quantity: { increment: line.quantityDelta } },
          });
          if (res.count === 0) {
            throw new Error(`Insufficient stock for product ${line.productName}`);
          }
        } else {
          await tx.product.updateMany({
            where: { id: line.productId, businessId },
            data: { quantity: { increment: line.quantityDelta } },
          });
        }
      }

      return tx.stockAdjustment.create({
        data: {
          businessId,
          adjustmentNo,
          reason,
          notes: body?.notes?.trim() || null,
          lines: {
            create: adjustmentLines,
          },
        },
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
    });

    return NextResponse.json(fullAdjustment, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Insufficient stock")) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof Error && err.message.includes("quantityDelta")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return toAuthError(err);
  }
}
