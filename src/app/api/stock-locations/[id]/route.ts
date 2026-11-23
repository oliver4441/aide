import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toAuthError, resolveOrganization } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, organizationId } = await resolveOrganization(null, request);
    const { id } = await params;

    const membership = await prisma.businessMembership.findFirst({
      where: { userId: user.id },
      include: { business: { select: { organizationId: true } } },
    });

    if (!membership || membership.business.organizationId !== organizationId || !hasPermission(membership.role, Permission.SETTINGS_UPDATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const location = await prisma.stockLocation.findUnique({
      where: { id },
      select: { organizationId: true },
    });

    if (!location || location.organizationId !== organizationId) {
      return NextResponse.json({ error: "Stock location not found" }, { status: 404 });
    }

    const body = await request.json();
    const data: {
      code?: string;
      name?: string;
      type?: string;
      branchId?: string | null;
    } = {};

    if (body.code !== undefined) {
      const code = String(body.code).trim().toUpperCase();
      if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });
      data.code = code;
    }
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
      data.name = name;
    }
    if (body.type !== undefined) {
      const type = String(body.type).toUpperCase();
      const validTypes = ["WAREHOUSE", "STOCK_ROOM", "SHOP_FLOOR", "OTHER"];
      if (!validTypes.includes(type)) {
        return NextResponse.json({ error: "Invalid location type" }, { status: 400 });
      }
      data.type = type;
    }
    if (body.branchId !== undefined) {
      if (body.branchId) {
        const branch = await prisma.business.findUnique({
          where: { id: body.branchId },
          select: { organizationId: true },
        });
        if (!branch || branch.organizationId !== organizationId) {
          return NextResponse.json({ error: "Invalid branch" }, { status: 400 });
        }
      }
      data.branchId = body.branchId || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const updated = await prisma.stockLocation.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Stock location code already exists in this organization" }, { status: 409 });
    }
    return toAuthError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, organizationId } = await resolveOrganization(null, request);
    const { id } = await params;

    const membership = await prisma.businessMembership.findFirst({
      where: { userId: user.id },
      include: { business: { select: { organizationId: true } } },
    });

    if (!membership || membership.business.organizationId !== organizationId || !hasPermission(membership.role, Permission.SETTINGS_UPDATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const location = await prisma.stockLocation.findUnique({
      where: { id },
      select: { organizationId: true },
    });

    if (!location || location.organizationId !== organizationId) {
      return NextResponse.json({ error: "Stock location not found" }, { status: 404 });
    }

    await prisma.stockLocation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    return toAuthError(err);
  }
}