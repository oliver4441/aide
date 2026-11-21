import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";
import { getAccountBalance } from "@/lib/accounting/post";

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
