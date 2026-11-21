import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";
import { trialBalance } from "@/lib/accounting/statements";

export const dynamic = "force-dynamic";

function parseEndDate(raw: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T23:59:59.999Z`) : new Date(raw);
}

export async function GET(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.REPORT_READ)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const atDate = searchParams.get("atDate");
    const date = atDate ? parseEndDate(atDate) : undefined;

    const statement = await trialBalance(businessId, date);

    return NextResponse.json(statement);
  } catch (err) {
    return toAuthError(err);
  }
}
