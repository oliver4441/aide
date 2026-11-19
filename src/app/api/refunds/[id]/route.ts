import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";

/**
 * AIDE-11: Refund detail and status update.
 *
 * GET    /api/refunds/[id] — Get refund details
 * PATCH  /api/refunds/[id] — Update refund status (approve/reject)
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { businessId } = await requireBusiness(null, request);

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
    if (!membership || !hasPermission(membership.role, Permission.REFUND_CREATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const refund = await prisma.refund.findUnique({
      where: { id: params.id },
      include: { lines: true },
    });

    if (!refund) {
      return NextResponse.json({ error: "Refund not found" }, { status: 404 });
    }
    if (refund.businessId !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const status = body?.status;

    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    if (refund.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending refunds can be updated" },
        { status: 400 }
      );
    }

    const updated = await prisma.refund.update({
      where: { id: params.id },
      data: { status },
    });

    // If approved, complete the refund (restock + GL)
    if (status === "APPROVED") {
      const sale = await prisma.sale.findUnique({
        where: { id: refund.saleId },
        include: { items: true },
      });

      if (sale) {
        // Restock items — we need to fetch the sale items to map back to products
        for (const line of refund.lines) {
          const saleItem = sale.items.find((si) => si.name === line.name);
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

        // Mark as completed
        await prisma.refund.update({
          where: { id: params.id },
          data: { status: "COMPLETED" },
        });
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    return toAuthError(err);
  }
}
