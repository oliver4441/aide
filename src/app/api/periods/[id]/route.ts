import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, toAuthError } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/periods/[id] — close/lock/unlock an accounting period.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(request);
    const { id } = await params;

    const period = await prisma.accountingPeriod.findUnique({
      where: { id },
    });

    if (!period) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 });
    }

    // Check membership
    const membership = await prisma.businessMembership.findFirst({
      where: { userId: user.id, businessId: period.businessId },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !["OPEN", "CLOSED", "LOCKED"].includes(status)) {
      return NextResponse.json({ error: "status must be OPEN, CLOSED, or LOCKED" }, { status: 400 });
    }

    // Only OWNER or MANAGER can close/lock periods
    if (status === "LOCKED" && membership.role !== "OWNER" && membership.role !== "MANAGER") {
      return NextResponse.json({ error: "Only owner or manager can lock periods" }, { status: 403 });
    }

    const updated = await prisma.accountingPeriod.update({
      where: { id },
      data: {
        status,
        closedAt: status !== "OPEN" ? new Date() : null,
        closedBy: status !== "OPEN" ? user.id : null,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return toAuthError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(request);
    const { id } = await params;

    const period = await prisma.accountingPeriod.findUnique({
      where: { id },
    });

    if (!period) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 });
    }

    const membership = await prisma.businessMembership.findFirst({
      where: { userId: user.id, businessId: period.businessId },
    });

    if (!membership || membership.role !== "OWNER") {
      return NextResponse.json({ error: "Only owner can delete periods" }, { status: 403 });
    }

    // Cannot delete locked periods
    if (period.status === "LOCKED") {
      return NextResponse.json({ error: "Cannot delete locked period" }, { status: 400 });
    }

    await prisma.accountingPeriod.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    return toAuthError(err);
  }
}
