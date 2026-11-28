import { NextRequest, NextResponse } from "next/server";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { createTransfer, listTransfers } from "@/lib/inventoryLedger";

export const dynamic = "force-dynamic";

/** AIDE-10: inter-warehouse stock transfers with paired ledger movements. */
export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);
    return NextResponse.json({ transfers: await listTransfers(businessId) });
  } catch (err) {
    return toAuthError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);
    const body = await request.json();
    const transfer = await createTransfer(businessId, user.id, body);
    return NextResponse.json({ transfer }, { status: 201 });
  } catch (err: any) {
    if (err?.status === 400 || err?.status === 404) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return toAuthError(err);
  }
}
