import { NextRequest, NextResponse } from "next/server";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { profitMargin } from "@/lib/inventoryLedger.mjs";

export const dynamic = "force-dynamic";

/** AIDE-10 / RPT-06: profit margin by product from sale items. */
export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);
    const grouped = await prisma.saleItem.groupBy({
      by: ["productId", "name"],
      where: { sale: { businessId } },
      _sum: { quantity: true, price: true, cost: true },
    });
    const rows = profitMargin(
      grouped
        .filter((g) => g.productId)
        .map((g) => ({
          productId: g.productId,
          name: g.name,
          quantity: g._sum.quantity ?? 0,
          revenue: Number(g._sum.price ?? 0),
          cost: Number(g._sum.cost ?? 0),
        }))
    );
    return NextResponse.json({ rows });
  } catch (err) {
    return toAuthError(err);
  }
}
