import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";
import { postEntry } from "@/lib/accounting/post";

/**
 * AIDE-11: Refund detail and status update.
 *
 * GET    /api/refunds/[id] — Get refund details
 * PATCH  /api/refunds/[id] — Update refund status (approve/reject)
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.REFUND_READ)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const refund = await prisma.refund.findUnique({
      where: { id: params.id },
      include: {
        sale: {
          select: {
            id: true,
            total: true,
            createdAt: true,
            cashier: true,
            items: true,
          },
        },
        lines: true,
      },
    });

    if (!refund) {
      return NextResponse.json({ error: "Refund not found" }, { status: 404 });
    }
    if (refund.businessId !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(refund);
  } catch (err) {
    return toAuthError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.SALE_REFUND)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const status = body?.status;

    if (status !== "APPROVED" && status !== "REJECTED") {
      return NextResponse.json({ error: "status must be APPROVED or REJECTED" }, { status: 400 });
    }

    const outcome = await prisma.$transaction(async (tx) => {
      const refund = await tx.refund.findUnique({
        where: { id: params.id },
        include: { lines: true },
      });

      if (!refund) return { error: "Refund not found", code: 404 as const };
      if (refund.businessId !== businessId) return { error: "Forbidden", code: 403 as const };
      if (refund.status !== "PENDING") {
        return { error: "Only pending refunds can be updated", code: 409 as const };
      }

      const targetStatus = status === "APPROVED" ? "COMPLETED" : "REJECTED";
      const claimed = await tx.refund.updateMany({
        where: { id: params.id, status: "PENDING" },
        data: { status: targetStatus },
      });
      if (claimed.count === 0) {
        return { error: "Refund was already processed", code: 409 as const };
      }

      if (status === "APPROVED") {
        const sale = await tx.sale.findUnique({
          where: { id: refund.saleId },
          include: { items: true },
        });

        if (sale) {
          for (const line of refund.lines) {
            const saleItem = sale.items.find((si) => si.name === line.name);
            if (saleItem?.productId) {
              await tx.product.updateMany({
                where: { id: saleItem.productId, businessId },
                data: { quantity: { increment: line.quantity } },
              });
            }
          }

          const accountCount = await tx.account.count({ where: { businessId } });
          if (accountCount > 0) {
            const refundedTotal = Number(refund.refundedTotal);
            const refundedTax = Number(refund.refundedTax);
            const netRevenue = refundedTotal - refundedTax;
            const postings: Array<{ account: string; amount: number; side: "debit" | "credit"; description: string }> = [];

            if (netRevenue > 0) {
              postings.push({
                account: "4001",
                amount: netRevenue,
                side: "debit",
                description: `Refund revenue reversal (${refund.refundNo})`,
              });
            }
            if (refundedTax > 0) {
              postings.push({
                account: "2010",
                amount: refundedTax,
                side: "debit",
                description: `Refund VAT reversal (${refund.refundNo})`,
              });
            }
            if (refundedTotal > 0) {
              postings.push({
                account: "1000",
                amount: refundedTotal,
                side: "credit",
                description: `Refund cash out (${refund.refundNo})`,
              });
            }
            const totalCost = refund.lines.reduce(
              (sum, l) => sum + Number(l.cost) * l.quantity,
              0
            );
            if (totalCost > 0) {
              postings.push({
                account: "1100",
                amount: totalCost,
                side: "debit",
                description: `Refund inventory restore (${refund.refundNo})`,
              });
              postings.push({
                account: "5001",
                amount: totalCost,
                side: "credit",
                description: `Refund COGS reversal (${refund.refundNo})`,
              });
            }
            if (postings.length > 0) {
              await postEntry({
                businessId,
                description: `Refund ${refund.refundNo} — ${sale.cashier || "unknown"}`,
                sourceType: "refund",
                sourceId: refund.id,
                postings,
                tx,
              });
            }
          }
        }
      }

      const updated = await tx.refund.findUnique({
        where: { id: params.id },
        include: { lines: true },
      });
      return { updated };
    });

    if ("error" in outcome) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.code });
    }

    return NextResponse.json(outcome.updated);
  } catch (err) {
    return toAuthError(err);
  }
}
