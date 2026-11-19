import { NextRequest, NextResponse } from "next/server";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { getCustomerStatement } from "@/lib/accounting/ar";

/**
 * AIDE-08: Customer statement API.
 *
 * GET /api/ar/statement?customerId=xxx&from=xxx&to=xxx
 */

export const dynamic = "force-dynamic";

/**
 * GET — Get customer statement (transaction history).
 *
 * Query params:
 * - customerId: required
 * - from: ISO date string (optional)
 * - to: ISO date string (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }

    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const from = fromParam ? new Date(fromParam) : undefined;
    const to = toParam ? new Date(toParam) : undefined;

    const statement = await getCustomerStatement(businessId, customerId, from, to);

    return NextResponse.json(statement);
  } catch (err) {
    return toAuthError(err);
  }
}
