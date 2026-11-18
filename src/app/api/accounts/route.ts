import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { seedChartOfAccounts } from "@/lib/accounting/post";

export const dynamic = "force-dynamic";

/**
 * GET /api/accounts
 * Return the chart of accounts for the authenticated business.
 */
export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

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

/**
 * POST /api/accounts
 * Create a new account in the chart of accounts.
 */
export async function POST(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const body = await request.json();

    // If this is the first account, seed the standard chart
    const count = await prisma.account.count({ where: { businessId } });
    if (count === 0) {
      const seeded = await seedChartOfAccounts(businessId);
      if (seeded > 0) {
        return NextResponse.json({ seeded, message: `${seeded} standard accounts created` }, { status: 201 });
      }
    }

    const account = await prisma.account.create({
      data: {
        code: body.code,
        name: body.name,
        type: body.type,
        subType: body.subType || "OTHER_EXPENSE",
        description: body.description || null,
        currency: body.currency || "KES",
        isActive: body.isActive !== undefined ? body.isActive : true,
        isSystem: body.isSystem || false,
        businessId,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}
