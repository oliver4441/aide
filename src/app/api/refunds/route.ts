import { NextRequest, NextResponse } from "next/server";
import { RefundReason } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { gateRequest, approvalResponse } from "@/lib/approvalReplay";
import { hasPermission, Permission } from "@/lib/rbac";
import { postEntry } from "@/lib/accounting/post";

/**
 * AIDE-11: Refund management API (POS-10).
 *
 * GET    /api/refunds — List refunds
 * POST   /api/refunds — Create a new refund
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.REFUND_READ)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const saleId = searchParams.get("saleId");

    const where: any = { businessId };
    if (status) where.status = status;
    if (saleId) where.saleId = saleId;

    const refunds = await prisma.refund.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        sale: {
          select: {
            id: true,
            total: true,
            createdAt: true,
            cashier: true,
          },
        },
        lines: true,
      },
    });

    return NextResponse.json(refunds);
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
    if (!membership || !hasPermission(membership.role, Permission.REFUND_CREATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const saleId = body?.saleId;
    if (!saleId) {
      return NextResponse.json({ error: "saleId is required" }, { status: 400 });
    }

    const reason = body?.reason as RefundReason;
    if (!reason || !Object.values(RefundReason).includes(reason)) {
      return NextResponse.json({ error: "Valid refund reason is required" }, { status: 400 });
    }

    const lines = Array.isArray(body?.lines) ? body.lines : [];
    if (lines.length === 0) {
      return NextResponse.json({ error: "At least one line item is required" }, { status: 400 });
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { items: true },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }
    if (sale.businessId !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingRefunds = await prisma.refund.findMany({
      where: { saleId, status: { in: ["PENDING", "APPROVED", "COMPLETED"] } },
      include: { lines: true },
    });
    const alreadyRefunded = existingRefunds.reduce(
      (sum, r) => sum + Number(r.refundedTotal),
      0
    );
    const refundedQtyByName = new Map<string, number>();
    for (const r of existingRefunds) {
      for (const rl of r.lines) {
        refundedQtyByName.set(rl.name, (refundedQtyByName.get(rl.name) || 0) + rl.quantity);
      }
    }

    let refundedTotal = 0;
    const requestedQtyByItem = new Map<string, number>();
    const refundLines: Array<{
      name: string;
      quantity: number;
      price: number;
      cost: number;
      productId: string | null;
    }> = lines.map((line: any) => {
      const saleItem = sale.items.find((si) => si.id === line.saleItemId);
      if (!saleItem) {
        throw new Error(`Sale item not found: ${line.saleItemId}`);
      }
      const quantity = parseInt(String(line.quantity), 10);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error("Refund quantity must be a positive integer");
      }

      const prevForItem =
        (refundedQtyByName.get(saleItem.name) || 0) +
        (requestedQtyByItem.get(saleItem.id) || 0);
      if (prevForItem + quantity > saleItem.quantity) {
        throw new Error(
          `Refund quantity (${prevForItem + quantity}) exceeds sold quantity (${saleItem.quantity})`
        );
      }
      requestedQtyByItem.set(saleItem.id, (requestedQtyByItem.get(saleItem.id) || 0) + quantity);

      const price = Number(saleItem.price);
      const cost = Number(saleItem.cost);
      refundedTotal += quantity * price;

      return {
        name: saleItem.name,
        quantity,
        price,
        cost,
        productId: saleItem.productId,
      };
    });

    if (alreadyRefunded + refundedTotal > Number(sale.total) + 0.01) {
      return NextResponse.json(
        { error: "Refund total exceeds original sale amount" },
        { status: 400 }
      );
    }

    // Gate on the server-computed refund amount, never client-supplied body.total.
    const approval = await gateRequest(request, body, {
      businessId,
      userId: user.id,
      actionType: "REFUND",
      resourceType: "Refund",
      amount: refundedTotal,
    });
    if (approval) return approvalResponse(approval);

    const refundedTax =
      Number(sale.taxRate) > 0
        ? refundedTotal - refundedTotal / (1 + Number(sale.taxRate) / 100)
        : 0;

    const year = new Date().getFullYear();
    const status = membership.role === "OWNER" ? "COMPLETED" : "PENDING";

    const refund = await prisma.$transaction(async (tx) => {
      const latest = await tx.refund.findFirst({
        where: { businessId, refundNo: { startsWith: `RFD-${year}-` } },
        orderBy: { refundNo: "desc" },
        select: { refundNo: true },
      });
      const match = latest?.refundNo.match(/RFD-\d{4}-(\d+)/);
      const seq = match ? parseInt(match[1], 10) + 1 : 1;
      const refundNo = `RFD-${year}-${seq.toString().padStart(4, "0")}`;

      const created = await tx.refund.create({
        data: {
          businessId,
          saleId,
          refundNo,
          reason,
          status,
          refundedTotal,
          refundedTax,
          notes: body?.notes?.trim() || null,
          lines: {
            create: refundLines.map(({ productId: _pid, ...l }) => l),
          },
        },
        include: {
          lines: true,
          sale: {
            select: {
              id: true,
              total: true,
              createdAt: true,
              cashier: true,
            },
          },
        },
      });

      if (status === "COMPLETED") {
        for (const line of refundLines) {
          if (line.productId) {
            await tx.product.updateMany({
              where: { id: line.productId, businessId },
              data: { quantity: { increment: line.quantity } },
            });
          }
        }

        const accountCount = await tx.account.count({ where: { businessId } });
        if (accountCount > 0) {
          const netRevenue = refundedTotal - refundedTax;
          const postings: Array<{ account: string; amount: number; side: "debit" | "credit"; description: string }> = [];
          if (netRevenue > 0) {
            postings.push({
              account: "4001",
              amount: netRevenue,
              side: "debit",
              description: `Refund revenue reversal (${refundNo})`,
            });
          }
          if (refundedTax > 0) {
            postings.push({
              account: "2010",
              amount: refundedTax,
              side: "debit",
              description: `Refund VAT reversal (${refundNo})`,
            });
          }
          if (refundedTotal > 0) {
            postings.push({
              account: "1000",
              amount: refundedTotal,
              side: "credit",
              description: `Refund cash out (${refundNo})`,
            });
          }

          const totalCost = refundLines.reduce((sum, l) => sum + l.cost * l.quantity, 0);
          if (totalCost > 0) {
            postings.push({
              account: "1100",
              amount: totalCost,
              side: "debit",
              description: `Refund inventory restore (${refundNo})`,
            });
            postings.push({
              account: "5001",
              amount: totalCost,
              side: "credit",
              description: `Refund COGS reversal (${refundNo})`,
            });
          }

          if (postings.length > 0) {
            await postEntry({
              businessId,
              description: `Refund ${refundNo} — ${sale.cashier || "unknown"}`,
              sourceType: "refund",
              sourceId: created.id,
              postings,
              tx,
            });
          }
        }
      }

      return created;
    });

    return NextResponse.json(refund, { status: 201 });
  } catch (err: any) {
    if (
      err?.message?.includes("Sale item not found") ||
      err?.message?.includes("Refund quantity") ||
      err?.message?.includes("Refund total")
    ) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return toAuthError(err);
  }
}
