import { NextRequest, NextResponse } from "next/server";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { profitAndLoss } from "@/lib/accounting/statements";

export const dynamic = "force-dynamic";

/**
 * GET /api/statements/pl — Profit & Loss statement.
 *
 * Query params: from (ISO date), to (ISO date) — optional date range.
 */
export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const dateRange = from && to
      ? { from: new Date(from), to: new Date(to) }
      : undefined;

    const statement = await profitAndLoss(businessId, dateRange);

    return NextResponse.json(statement);
  } catch (err) {
    return toAuthError(err);
  }
}
