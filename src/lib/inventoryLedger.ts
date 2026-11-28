/**
 * AIDE-10: inventory movement ledger persistence.
 *
 * Every stock-changing operation appends a StockMovement row in the same
 * transaction as the primary write, so stock on hand is always explainable.
 */
import { prisma } from "./prisma";
import { recordAudit } from "./audit";
import { validateTransfer } from "./inventoryLedger.mjs";
import type { StockMovementType } from "@prisma/client";

type Tx = any;
interface MovementInput {
  businessId: string;
  type: string;
  quantityDelta: number;
  unitCost?: string;
  reference?: string | null;
  notes?: string | null;
  productId?: string | null;
  warehouseId?: string | null;
}
interface MovementsOptions {
  productId?: string | null;
  type?: StockMovementType;
  take?: number;
}
interface TransferInput {
  fromWarehouseId: string;
  toWarehouseId: string;
  lines: Array<{ productId: string; productName?: string; quantity: number; unitCost?: string; available?: number }>;
  notes?: string | null;
}

export async function recordMovement(tx: Tx, input: MovementInput) {
  return tx.stockMovement.create({
    data: {
      type: input.type,
      quantityDelta: input.quantityDelta,
      unitCost: input.unitCost ?? "0.0000",
      reference: input.reference ?? null,
      notes: input.notes ?? null,
      businessId: input.businessId,
      productId: input.productId ?? null,
      warehouseId: input.warehouseId ?? null,
    },
  });
}

/** Append SALE movements for each line of a completed sale. */
export async function recordSaleMovements(tx: Tx, { businessId, saleId, items }: { businessId: string; saleId: string; items: Array<{ productId?: string | null; quantity: number; cost?: number | string; isService?: boolean }> }) {
  for (const item of items) {
    if (!item.productId || item.isService) continue;
    await recordMovement(tx, {
      businessId,
      type: "SALE",
      quantityDelta: -Math.abs(item.quantity),
      unitCost: String(item.cost ?? 0),
      reference: `sale:${saleId}`,
      productId: item.productId,
    });
  }
}

/** Append an ADJUSTMENT movement for a stock adjustment line. */
export async function recordAdjustmentMovement(tx: Tx, input: MovementInput & { adjustmentId: string }) {
  return recordMovement(tx, {
    businessId: input.businessId,
    type: "ADJUSTMENT",
    quantityDelta: input.quantityDelta,
    unitCost: input.unitCost ?? "0.0000",
    reference: `adjustment:${input.adjustmentId}`,
    productId: input.productId ?? null,
    notes: input.notes ?? null,
    warehouseId: input.warehouseId ?? null,
  });
}

/** Create an inter-warehouse transfer with paired movements, atomically. */
export async function createTransfer(businessId: string, actorId: string | null | undefined, input: TransferInput) {
  const check = validateTransfer(input);
  if (!check.ok) throw Object.assign(new Error(check.error), { status: 400 });

  const [from, to] = await Promise.all([
    prisma.warehouse.findFirst({ where: { id: input.fromWarehouseId, organization: { businesses: { some: { id: businessId } } } }, select: { id: true } }),
    prisma.warehouse.findFirst({ where: { id: input.toWarehouseId, organization: { businesses: { some: { id: businessId } } } }, select: { id: true } }),
  ]);
  if (!from || !to) throw Object.assign(new Error("Warehouse not found in this business"), { status: 404 });

  const count = await prisma.stockTransfer.count({ where: { businessId } });
  const transferNo = `TRF-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const transfer = await prisma.$transaction(async (tx) => {
    const created = await tx.stockTransfer.create({
      data: {
        transferNo,
        notes: input.notes ?? null,
        businessId,
        fromWarehouseId: from.id,
        toWarehouseId: to.id,
        lines: {
          create: input.lines.map((l: any) => ({
            productName: l.productName ?? "",
            quantity: Number(l.quantity),
            unitCost: String(l.unitCost ?? "0.0000"),
            productId: l.productId ?? null,
          })),
        },
      },
      include: { lines: true },
    });

    for (const line of created.lines) {
      await recordMovement(tx, {
        businessId,
        type: "TRANSFER_OUT",
        quantityDelta: -line.quantity,
        unitCost: String(line.unitCost),
        reference: `transfer:${created.id}`,
        productId: line.productId,
        warehouseId: from.id,
      });
      await recordMovement(tx, {
        businessId,
        type: "TRANSFER_IN",
        quantityDelta: line.quantity,
        unitCost: String(line.unitCost),
        reference: `transfer:${created.id}`,
        productId: line.productId,
        warehouseId: to.id,
      });
      await tx.product.updateMany({
        where: { id: line.productId ?? "", businessId },
        data: { quantity: { decrement: line.quantity } },
      });
    }
    return created;
  });

  await recordAudit({
    action: "stock.transfer",
    entityType: "StockTransfer",
    entityId: transfer.id,
    summary: `Transferred ${transfer.lines.length} line(s) from ${from.id} to ${to.id}`,
    metadata: { transferNo, lines: transfer.lines.length },
    actorId: actorId ?? null,
    businessId,
  });
  return transfer;
}

export async function listMovements(businessId: string, { productId, type, take = 100 }: MovementsOptions = {}) {
  return prisma.stockMovement.findMany({
    where: {
      businessId,
      ...(productId ? { productId } : {}),
      ...(type ? { type } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(Number(take) || 100, 1), 500),
  });
}

export async function listTransfers(businessId: string) {
  return prisma.stockTransfer.findMany({
    where: { businessId },
    include: { lines: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
