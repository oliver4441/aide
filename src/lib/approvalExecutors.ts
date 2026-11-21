import { NextRequest } from "next/server";
import { StockAdjustmentReason } from "@prisma/client";
import { prisma } from "./prisma";
import { makeReplayToken } from "./internalAuth";
import { resolveReplayBaseUrl } from "./replayUrl.mjs";

/**
 * Executes an approved request exactly once. Only STOCK_ADJUSTMENT has an
 * executor in this first AIDE-12 slice; other action types stay as recorded
 * decisions until their own executor is wired.
 */
export async function executeApproval(requestId: string): Promise<void> {
  const approval = await prisma.approvalRequest.findUnique({ where: { id: requestId } });
  if (!approval || approval.status !== "APPROVED" || approval.executedAt) return;

  const rawPayload = approval.payload as Record<string, unknown> | null;

  // Generic replay: the original route handler performs the write after
  // approval, so its validation, RBAC and tenant checks are never bypassed.
  const replay = rawPayload?.__replay as
    | { method: string; path: string; body: unknown; params?: Record<string, string> }
    | undefined;
  if (replay) {
    const claimedAt = new Date();
    const claimed = await prisma.approvalRequest.updateMany({
      where: { id: requestId, executedAt: null, status: "APPROVED" },
      data: { executedAt: claimedAt },
    });
    if (claimed.count === 0) return;

    try {
      const token = await makeReplayToken(approval.requesterId, approval.businessId, approval.id);
      const handler = await replayHandler(replay.path, replay.method);
      const req = new NextRequest(new URL(replay.path, resolveReplayBaseUrl()), {
        method: replay.method,
        headers: {
          "content-type": "application/json",
          "x-aide-replay": token,
        },
        body: replay.method === "GET" || replay.method === "HEAD" ? undefined : JSON.stringify(replay.body ?? {}),
      });
      const response = await handler(req, { params: replay.params ?? {} });
      if (!response.ok) {
        throw new Error(`Approved action replay failed with ${response.status}`);
      }
      return;
    } catch (err) {
      // Release only our claim so the approval can be retried. Without this a
      // failed replay leaves executedAt set and the action can never run.
      try {
        await prisma.approvalRequest.updateMany({
          where: { id: requestId, executedAt: claimedAt },
          data: { executedAt: null },
        });
      } catch (releaseErr) {
        console.error("Failed to release approval execution claim", releaseErr);
      }
      throw err;
    }
  }

  // Legacy stock-adjustment executor (payload written before replay support).
  if (approval.actionType !== "STOCK_ADJUSTMENT") return;
  const payload = rawPayload as
    | {
        reason?: string;
        notes?: string;
        lines?: Array<{ productId: string; quantityDelta: number; unitCost?: number }>;
      }
    | null;
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

type RouteHandler = (request: NextRequest, context: { params: Record<string, string> }) => Promise<Response>;

async function replayHandler(path: string, method: string): Promise<RouteHandler> {
  let routeModule: Record<string, unknown>;
  if (path.startsWith("/api/purchase-orders")) {
    routeModule = await import("@/app/api/purchase-orders/route");
  } else if (path.startsWith("/api/supplier-payments")) {
    routeModule = await import("@/app/api/supplier-payments/route");
  } else if (path.startsWith("/api/refunds")) {
    routeModule = await import("@/app/api/refunds/route");
  } else if (path.startsWith("/api/journal")) {
    routeModule = await import("@/app/api/journal/route");
  } else if (path.startsWith("/api/periods")) {
    routeModule = await import("@/app/api/periods/[id]/route");
  } else if (path.startsWith("/api/products")) {
    routeModule = await import("@/app/api/products/[id]/route");
  } else if (path.startsWith("/api/stock-adjustments")) {
    routeModule = await import("@/app/api/stock-adjustments/route");
  } else {
    throw new Error(`No approval replay handler for ${path}`);
  }
  const handler = routeModule[method];
  if (typeof handler !== "function") {
    throw new Error(`No ${method} handler for ${path}`);
  }
  return handler as RouteHandler;
}
