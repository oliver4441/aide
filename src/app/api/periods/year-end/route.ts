import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { closeYear, YearEndError } from "@/lib/accounting/yearEnd";
import { recordAudit } from "@/lib/audit";

/**
 * AIDE-07 / ACC-10: year-end closing.
 *
 * POST /api/periods/year-end  { year: number }
 *
 * OWNER or MANAGER only. Requires every period in the year (including
 * December) to be CLOSED or LOCKED. Posts one balanced entry that zeroes income
 * and expense accounts and transfers the net result to Retained Earnings.
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
    const year = Number(body?.year);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "year must be an integer between 2000 and 2100" }, { status: 400 });
    }

    const result = await closeYear(businessId, year);

    await recordAudit({
      action: "accounting.year_end",
      entityType: "FiscalYear",
      entityId: String(year),
      summary: `Closed fiscal year ${year} (net ${result.netProfit})`,
      metadata: { year, netProfit: result.netProfit, entryNumber: result.entryNumber },
      actorId: user.id,
      businessId,
    });

    return NextResponse.json(result, { status: result.entryId ? 201 : 200 });
  } catch (err) {
    if (err instanceof YearEndError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return toAuthError(err);
  }
}
