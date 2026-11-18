import { NextRequest, NextResponse } from "next/server";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { getAccountBalance } from "@/lib/accounting/post";

export const dynamic = "force-dynamic";

/**
 * GET /api/accounts/balance?account=1000
 * Return the current balance of an account.
 */
export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const { searchParams } = new URL(request.url);
    const account = searchParams.get("account");

    if (!account) {
      return NextResponse.json({ error: "account parameter is required" }, { status: 400 });
    }

    const balance = await getAccountBalance(businessId, account);
    return NextResponse.json(balance);
  } catch (err) {
    return toAuthError(err);
  }
}
