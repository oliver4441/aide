import { NextRequest, NextResponse } from "next/server";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { getAPAgingReport } from "@/lib/accounting/ap";

/**
 * AIDE-09: AP Aging Report API.
 *
 * GET /api/ap/aging — Accounts payable aging report
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const { searchParams } = new URL(request.url);
    const asOfParam = searchParams.get("asOf");
    const asOf = asOfParam ? new Date(asOfParam) : undefined;

    const report = await getAPAgingReport(businessId, asOf);

    return NextResponse.json(report);
  } catch (err) {
    return toAuthError(err);
  }
}
