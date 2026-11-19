import { NextRequest, NextResponse } from "next/server";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { getAgingReport } from "@/lib/accounting/ar";

/**
 * AIDE-08: Accounts Receivable aging report API.
 *
 * GET /api/ar/aging — Get aging report for the business
 */

export const dynamic = "force-dynamic";

/**
 * GET — Get the AR aging report.
 *
 * Query params:
 * - asOf: ISO date string (defaults to today)
 */
export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const { searchParams } = new URL(request.url);
    const asOfParam = searchParams.get("asOf");
    const asOf = asOfParam ? new Date(asOfParam) : undefined;

    const report = await getAgingReport(businessId, asOf);

    return NextResponse.json(report);
  } catch (err) {
    return toAuthError(err);
  }
}
