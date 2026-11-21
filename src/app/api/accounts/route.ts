import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";
import { seedChartOfAccounts } from "@/lib/accounting/post";

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
    const type = searchParams.get("type");

    const where: any = { businessId, isActive: true };
    if (type) where.type = type;

    const accounts = await prisma.account.findMany({
      where,
      orderBy: [{ type: "asc" }, { code: "asc" }],
    });

    return NextResponse.json(accounts);
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

    const count = await prisma.account.count({ where: { businessId } });
    if (count === 0) {
      const seeded = await seedChartOfAccounts(businessId);
      if (seeded > 0 && !body?.code) {
        return NextResponse.json({ seeded, message: `${seeded} standard accounts created` }, { status: 201 });
      }
    }

    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!code || !name || !body?.type) {
      return NextResponse.json({ error: "code, name, and type are required" }, { status: 400 });
    }

    const account = await prisma.account.create({
      data: {
        code,
        name,
        type: body.type,
        subType: body.subType || "OTHER_EXPENSE",
        description: body.description || null,
        currency: body.currency || "KES",
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
        isSystem: Boolean(body.isSystem),
        businessId,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}
