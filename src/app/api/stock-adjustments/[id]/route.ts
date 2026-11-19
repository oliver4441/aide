import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";

/**
 * AIDE-10: Stock adjustment detail.
 *
 * GET    /api/stock-adjustments/[id] — Get adjustment details
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const adjustment = await prisma.stockAdjustment.findUnique({
      where: { id: params.id },
      include: {
        lines: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, buyingPrice: true, quantity: true },
            },
          },
        },
      },
    });

    if (!adjustment) {
      return NextResponse.json({ error: "Stock adjustment not found" }, { status: 404 });
    }
    if (adjustment.businessId !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(adjustment);
  } catch (err) {
    return toAuthError(err);
  }
}
