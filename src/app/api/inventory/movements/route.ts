import { NextRequest, NextResponse } from "next/server";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { listMovements } from "@/lib/inventoryLedger";

export const dynamic = "force-dynamic";

/** AIDE-10: read the append-only inventory movement ledger. */
export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);
    const q = request.nextUrl.searchParams;
    const movements = await listMovements(businessId, {
      productId: q.get("productId"),
      type: (q.get("type") as any) ?? undefined,
      take: Number(q.get("take") ?? 100),
    });
    return NextResponse.json({ movements });
  } catch (err) {
    return toAuthError(err);
  }
}
