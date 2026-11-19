import { NextRequest, NextResponse } from "next/server";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { getInventoryValuation, getLowStockValuation } from "@/lib/accounting/valuation";

/**
 * AIDE-10: Inventory valuation report API (INV-17, RPT-07).
 *
 * GET /api/inventory/valuation — Full inventory valuation report
 * GET /api/inventory/valuation/low-stock — Low stock valuation only
 */

export const dynamic = "force-dynamic";

/**
 * GET — Full inventory valuation report.
 */
export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const lowStockOnly = searchParams.get("lowStockOnly") === "true";

    const valuation = await getInventoryValuation(businessId, {
      categoryId: categoryId || undefined,
      lowStockOnly,
    });

    return NextResponse.json(valuation);
  } catch (err) {
    return toAuthError(err);
  }
}
