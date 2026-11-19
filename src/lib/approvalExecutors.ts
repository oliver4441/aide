import { StockAdjustmentReason } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Executes an approved request exactly once. Only STOCK_ADJUSTMENT has an
 * executor in this first AIDE-12 slice; other action types stay as recorded
 * decisions until their own executor is wired.
 */
export async function executeApproval(requestId: string): Promise<void> {
  const approval = await prisma.approvalRequest.findUnique({ where: { id: requestId } });
  if (!approval || approval.status !== "APPROVED" || approval.executedAt) return;
  if (approval.actionType !== "STOCK_ADJUSTMENT") return;

  const payload = approval.payload as {
    reason?: string;
    notes?: string;
    lines?: Array<{ productId: string; quantityDelta: number; unitCost?: number }>;
  } | null;
  const lines = Array.isArray(payload?.lines) ? payload.lines : [];
  const reasons: string[] = Object.values(StockAdjustmentReason);
  if (!payload?.reason || !reasons.includes(payload.reason) || lines.length === 0) return;

  await prisma.$transaction(async (tx) => {
    // Atomic claim: only one caller can execute a given approval.
    const claimed = await tx.approvalRequest.updateMany({
      where: { id: requestId, executedAt: null, status: "APPROVED" },
      data: { executedAt: new Date() },
    });
    if (claimed.count === 0) return;

    const productIds = lines.map((line) => line.productId).filter(Boolean);
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, businessId: approval.businessId },
    });
    if (products.length !== productIds.length) {
      throw new Error("One or more products not found");
    }

    const year = new Date().getFullYear();
    const count = await tx.stockAdjustment.count({ where: { businessId: approval.businessId } });
    const adjustmentNo = `SAJ-${year}-${(count + 1).toString().padStart(4, "0")}`;

    const adjustmentLines = lines.map((line) => {
      const product = products.find((p) => p.id === line.productId);
      return {
        productName: product?.name || "",
        quantityDelta: Number(line.quantityDelta) || 0,
        unitCost: line.unitCost ? Number(line.unitCost) : product?.buyingPrice ? Number(product.buyingPrice) : 0,
        productId: line.productId,
      };
    });

    await tx.stockAdjustment.create({
      data: {
        businessId: approval.businessId,
        adjustmentNo,
        reason: payload.reason as StockAdjustmentReason,
        notes: payload.notes?.trim() || null,
        lines: { create: adjustmentLines },
      },
    });

    for (const line of adjustmentLines) {
      if (!line.productId) continue;
      const product = await tx.product.findUnique({ where: { id: line.productId } });
      if (!product || product.businessId !== approval.businessId) continue;
      const newQty = product.quantity + line.quantityDelta;
      if (newQty < 0) throw new Error(`Insufficient stock for product ${product.name}`);
      await tx.product.update({ where: { id: line.productId }, data: { quantity: newQty } });
    }
  });
}
