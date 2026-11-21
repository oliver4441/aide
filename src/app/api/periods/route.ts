import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.ACCOUNT_READ)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.ACCOUNT_EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const year = parseInt(String(body?.year), 10);
    const month = parseInt(String(body?.month), 10);

    if (!Number.isInteger(year) || !Number.isInteger(month)) {
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
