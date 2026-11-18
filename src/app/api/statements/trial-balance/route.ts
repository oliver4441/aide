import { NextRequest, NextResponse } from "next/server";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { trialBalance } from "@/lib/accounting/statements";

export const dynamic = "force-dynamic";

/**
 * GET /api/statements/trial-balance — Trial Balance.
 *
 * Query params: atDate (ISO date) — optional, defaults to now.
 */
export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const { searchParams } = new URL(request.url);
    const atDate = searchParams.get("atDate");

    const date = atDate ? new Date(atDate) : undefined;

    const statement = await trialBalance(businessId, date);

    return NextResponse.json(statement);
  } catch (err) {
    return toAuthError(err);
  }
}
