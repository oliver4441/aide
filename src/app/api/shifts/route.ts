import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";

/**
 * AIDE-11: Cashier shift management API (POS-13).
 *
 * GET    /api/shifts — List shifts
 * POST   /api/shifts — Open a new shift
 */

export const dynamic = "force-dynamic";

/**
 * GET — List shifts for the business.
 */
export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const cashierId = searchParams.get("cashierId");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    const where: any = { businessId };
    if (status) where.status = status;
    if (cashierId) where.cashierId = cashierId;
    if (fromDate || toDate) {
      where.openedAt = {};
      if (fromDate) where.openedAt.gte = new Date(fromDate);
      if (toDate) where.openedAt.lte = new Date(toDate);
    }

    const shifts = await prisma.cashierShift.findMany({
      where,
      orderBy: { openedAt: "desc" },
      include: {
        cashier: {
          select: { id: true, name: true, email: true },
        },
        sales: {
          select: {
            id: true,
            total: true,
            paymentMethod: true,
            tipAmount: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json(shifts);
  } catch (err) {
    return toAuthError(err);
  }
}

/**
 * POST — Open a new cashier shift.
 *
 * Body: { openingCash?, notes? }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.SHIFT_OPEN)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check for existing open shift for this cashier
    const existingOpen = await prisma.cashierShift.findFirst({
      where: {
        businessId,
        cashierId: user.id,
        status: "OPEN",
      },
    });

    if (existingOpen) {
      return NextResponse.json(
        { error: "You already have an open shift. Close it first." },
        { status: 409 }
      );
    }

    const body = await request.json();
    const openingCash = body?.openingCash ? Number(body.openingCash) : 0;

    // Auto-generate shift number
    const year = new Date().getFullYear();
    const count = await prisma.cashierShift.count({ where: { businessId } });
    const shiftNo = `SH-${year}-${(count + 1).toString().padStart(4, "0")}`;

    const shift = await prisma.cashierShift.create({
      data: {
        businessId,
        cashierId: user.id,
        shiftNo,
        openingCash,
        notes: body?.notes?.trim() || null,
      },
      include: {
        cashier: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(shift, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}
