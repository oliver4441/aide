import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

/**
 * AIDE-07: Accounting period controls.
 *
 * GET  /api/periods          — list all periods for the business
 * POST /api/periods          — create a new period
 * PATCH /api/periods/:id     — close/lock/unlock a period
 */

export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const periods = await prisma.accountingPeriod.findMany({
      where: { businessId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return NextResponse.json(periods);
  } catch (err) {
    return toAuthError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const body = await request.json();
    const { year, month } = body;

    if (!year || !month) {
      return NextResponse.json({ error: "year and month are required" }, { status: 400 });
    }

    const months = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];

    if (month < 1 || month > 12) {
      return NextResponse.json({ error: "month must be 1-12" }, { status: 400 });
    }

    const label = `${months[month - 1]} ${year}`;

    const period = await prisma.accountingPeriod.upsert({
      where: {
        businessId_year_month: { businessId, year, month },
      },
      create: { businessId, year, month, label, status: "OPEN" },
      update: {},
    });

    return NextResponse.json(period, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}
