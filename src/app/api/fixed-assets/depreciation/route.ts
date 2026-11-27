import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { parsePeriod } from "@/lib/accounting/depreciationCore.mjs";
import { runDepreciation, DepreciationError } from "@/lib/accounting/depreciation";
import { recordAudit } from "@/lib/audit";

/**
 * AIDE-07 / ACC-11: post monthly depreciation.
 *
 * POST /api/fixed-assets/depreciation  { year, month }
 * OWNER or MANAGER. Idempotent per asset-period.
 */

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !["OWNER", "MANAGER"].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    let period;
    try {
      period = parsePeriod(body);
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }

    const result = await runDepreciation(businessId, period.year, period.month);

    await recordAudit({
      action: "accounting.depreciation_run",
      entityType: "AccountingPeriod",
      entityId: `${period.year}-${String(period.month).padStart(2, "0")}`,
      summary: `Depreciation ${period.year}-${String(period.month).padStart(2, "0")}: ${result.totalAmount}`,
      metadata: result,
      actorId: user.id,
      businessId,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof DepreciationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return toAuthError(err);
  }
}
