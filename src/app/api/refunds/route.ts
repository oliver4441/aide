import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { gateRequest, approvalResponse } from "@/lib/approvalReplay";
import { hasPermission, Permission } from "@/lib/rbac";

/**
 * AIDE-11: Refund management API (POS-10).
 *
 * GET    /api/refunds — List refunds
 * POST   /api/refunds — Create a new refund
 */

export const dynamic = "force-dynamic";

/**
 * GET — List all refunds for the business.
 */
export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

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

/**
 * POST — Create a new refund.
 *
 * Body: { saleId, reason, notes?, lines: [{saleItemId, quantity, price, cost?}] }
 *
 * On approval (OWNER/MANAGER), this automatically:
 * - Restocks refunded items
 * - Creates a reversing GL entry
 */
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

    const approval = await gateRequest(request, body, {
      businessId,
      userId: user.id,
      actionType: "REFUND",
      resourceType: "Refund",
      amount: Number(body.total) || 0,
    });
    if (approval) return approvalResponse(approval);

    if (!saleId) {
      return NextResponse.json({ error: "saleId is required" }, { status: 400 });
    }

    const reason = body?.reason;
    if (!reason) {
      return NextResponse.json({ error: "reason is required" }, { status: 400 });
    }

    const lines = Array.isArray(body?.lines) ? body.lines : [];
    if (lines.length === 0) {
      return NextResponse.json({ error: "At least one line item is required" }, { status: 400 });
    }

    // Validate sale exists and belongs to the business
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: true,
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }
    if (sale.businessId !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate refund doesn't exceed original sale
    const existingRefunds = await prisma.refund.findMany({
      where: { saleId, status: { in: ["APPROVED", "COMPLETED"] } },
      select: { refundedTotal: true },
    });
    const alreadyRefunded = existingRefunds.reduce(
      (sum: number, r: any) => sum + Number(r.refundedTotal),
      0
    );

    // Build refund lines and calculate totals
    let refundedTotal = 0;
    let refundedTax = 0;
    const refundLines = lines.map((line: any, i: number) => {
      const saleItem = sale.items.find((si) => si.id === line.saleItemId);
      if (!saleItem) {
        throw new Error(`Sale item not found: ${line.saleItemId}`);
      }

      // Validate quantity doesn't exceed original
      const alreadyRefundedQty = existingRefunds.length > 0 ? 0 : 0; // Simplified — could track per-item
      if (line.quantity > saleItem.quantity + alreadyRefundedQty) {
        throw new Error(
          `Refund quantity (${line.quantity}) exceeds sold quantity (${saleItem.quantity})`
        );
      }

      const price = Number(line.price || saleItem.price);
      const cost = Number(line.cost || saleItem.cost);
      const lineTotal = line.quantity * price;
      refundedTotal += lineTotal;

      return {
        name: saleItem.name,
        quantity: line.quantity,
        price,
        cost,
        saleItemId: line.saleItemId || null,
      };
    });

    // Check total doesn't exceed sale total
    if (alreadyRefunded + refundedTotal > Number(sale.total)) {
      return NextResponse.json(
        { error: "Refund total exceeds original sale amount" },
        { status: 400 }
      );
    }

    // Calculate tax portion
    if (Number(sale.taxRate) > 0) {
      refundedTax = refundedTotal - refundedTotal / (1 + Number(sale.taxRate) / 100);
    }

    // Auto-generate refund number
    const year = new Date().getFullYear();
    const count = await prisma.refund.count({ where: { businessId } });
    const refundNo = `RFD-${year}-${(count + 1).toString().padStart(4, "0")}`;

    // Determine status based on role
    const status = membership.role === "OWNER" ? "COMPLETED" : "PENDING";

    // Create the refund
    const refund = await prisma.refund.create({
      data: {
        businessId,
        saleId,
        refundNo,
        reason,
        status,
        refundedTotal: refundedTotal,
        refundedTax,
        notes: body?.notes?.trim() || null,
        lines: {
          create: refundLines,
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

    // If completed, apply stock reversal and GL entry
    if (status === "COMPLETED") {
      // Restock items
      for (const line of refundLines) {
        if (line.saleItemId) {
          const saleItem = sale.items.find((si) => si.id === line.saleItemId);
          if (saleItem && saleItem.productId) {
            await prisma.product.update({
              where: { id: saleItem.productId },
              data: {
                quantity: {
                  increment: line.quantity,
                },
              },
            });
          }
        }
      }

      // Create reversing GL entry
      try {
        await prisma.$transaction(async (tx) => {
          // Credit: Sales Revenue (reverse)
          const netRevenue = refundedTotal - refundedTax;
          const postings: any[] = [
            {
              account: "4001",
              amount: netRevenue,
              side: "debit",
              description: `Refund revenue reversal (${refundNo})`,
            },
            {
              account: "1000",
              amount: refundedTotal,
              side: "credit",
              description: `Refund cash out (${refundNo})`,
            },
          ];

          if (refundedTax > 0) {
            postings.push({
              account: "2010",
              amount: refundedTax,
              side: "debit",
              description: `Refund VAT reversal (${refundNo})`,
            });
          }

          // Reverse COGS and inventory
          const totalCost = refundLines.reduce(
            (sum: number, l: any) => sum + l.cost * l.quantity,
            0
          );
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

          // Use the posting engine
          const { postEntry } = await import("@/lib/accounting/post");
          await postEntry({
            businessId,
            description: `Refund ${refundNo} — ${sale.cashier || "unknown"}`,
            sourceType: "refund",
            sourceId: refund.id,
            postings: postings as any,
          });
        });
      } catch (glError) {
        // Log but don't fail the refund
        console.error("GL posting failed for refund:", glError);
      }
    }

    return NextResponse.json(refund, { status: 201 });
  } catch (err: any) {
    if (err?.message?.includes("Sale item not found") ||
        err?.message?.includes("Refund quantity") ||
        err?.message?.includes("Refund total")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return toAuthError(err);
  }
}
