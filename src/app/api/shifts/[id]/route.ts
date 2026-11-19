import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";

/**
 * AIDE-11: Shift detail and close.
 *
 * GET    /api/shifts/[id] — Get shift details with summary
 * PATCH  /api/shifts/[id] — Close a shift with cash count
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const shift = await prisma.cashierShift.findUnique({
      where: { id: params.id },
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

    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }
    if (shift.businessId !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Calculate summary
    const totalSales = shift.sales.reduce(
      (sum: number, s: any) => sum + Number(s.total),
      0
    );
    const totalTips = shift.sales.reduce(
      (sum: number, s: any) => sum + Number(s.tipAmount),
      0
    );
    const cashSales = shift.sales
      .filter((s: any) => s.paymentMethod === "CASH")
      .reduce((sum: number, s: any) => sum + Number(s.total), 0);

    const expectedCash = Number(shift.openingCash) + cashSales + totalTips;

    return NextResponse.json({
      ...shift,
      summary: {
        totalSales,
        totalTips,
        cashSales,
        expectedCash,
        salesCount: shift.sales.length,
      },
    });
  } catch (err) {
    return toAuthError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.SHIFT_CLOSE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const shift = await prisma.cashierShift.findUnique({
      where: { id: params.id },
      include: {
        sales: {
          select: {
            total: true,
            paymentMethod: true,
            tipAmount: true,
          },
        },
      },
    });

    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }
    if (shift.businessId !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (shift.status !== "OPEN") {
      return NextResponse.json(
        { error: "Only open shifts can be closed" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const cashCount = body?.cashCount ? Number(body.cashCount) : null;

    // Calculate expected cash
    const cashSales = shift.sales
      .filter((s: any) => s.paymentMethod === "CASH")
      .reduce((sum: number, s: any) => sum + Number(s.total), 0);
    const totalTips = shift.sales.reduce(
      (sum: number, s: any) => sum + Number(s.tipAmount),
      0
    );
    const totalSales = shift.sales.reduce(
      (sum: number, s: any) => sum + Number(s.total),
      0
    );

    const expectedCash = Number(shift.openingCash) + cashSales + totalTips;
    const cashDifference = cashCount !== null ? cashCount - expectedCash : null;

    const updated = await prisma.cashierShift.update({
      where: { id: params.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        totalSales,
        totalTips,
        expectedCash: cashCount !== null ? expectedCash : null,
        closingCash: cashCount,
        cashDifference,
        notes: body?.notes ? `${shift.notes || ""} ${body.notes}`.trim() : shift.notes,
      },
      include: {
        cashier: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return toAuthError(err);
  }
}
