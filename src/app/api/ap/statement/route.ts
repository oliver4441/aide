import { NextRequest, NextResponse } from "next/server";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { getSupplierStatement } from "@/lib/accounting/ap";

/**
 * AIDE-09: Supplier Statement API.
 *
 * GET /api/ap/statement?supplierId=...&from=...&to=...
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");
    if (!supplierId) {
      return NextResponse.json({ error: "supplierId is required" }, { status: 400 });
    }

    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const from = fromParam ? new Date(fromParam) : undefined;
    const to = toParam ? new Date(toParam) : undefined;

    const statement = await getSupplierStatement(businessId, supplierId, from, to);
    if (!statement) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json(statement);
  } catch (err) {
    return toAuthError(err);
  }
}
