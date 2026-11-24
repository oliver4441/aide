import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toAuthError, resolveOrganization } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user, organizationId, businessIds } = await resolveOrganization(null, request);

    const membership = await prisma.businessMembership.findFirst({
      where: { userId: user.id },
      include: { business: { select: { organizationId: true } } },
    });

    if (!membership || membership.business.organizationId !== organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get("warehouseId");

    const where: any = { organizationId };
    if (warehouseId) where.warehouseId = warehouseId;

    const locations = await prisma.stockLocation.findMany({
      where,
      include: {
        warehouse: { select: { id: true, name: true } },
      },
      orderBy: [{ warehouseId: "asc" }, { code: "asc" }],
    });

    return NextResponse.json(locations);
  } catch (err) {
    return toAuthError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, organizationId } = await resolveOrganization(null, request);

    const membership = await prisma.businessMembership.findFirst({
      where: { userId: user.id },
      include: { business: { select: { organizationId: true } } },
    });

    if (!membership || membership.business.organizationId !== organizationId || !hasPermission(membership.role, Permission.SETTINGS_UPDATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const zone = typeof body?.zone === "string" ? body.zone.trim() : null;
    const warehouseId = typeof body?.warehouseId === "string" ? body.warehouseId : null;

    if (!code || !name) {
      return NextResponse.json({ error: "Code and name are required" }, { status: 400 });
    }

    // Validate warehouse belongs to same organization
    if (warehouseId) {
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: warehouseId },
        select: { organizationId: true },
      });
      if (!warehouse || warehouse.organizationId !== organizationId) {
        return NextResponse.json({ error: "Invalid warehouse" }, { status: 400 });
      }
    }

    const location = await prisma.stockLocation.create({
      data: {
        code,
        name,
        zone,
        warehouseId,
        organizationId,
      },
    });

    return NextResponse.json(location, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Stock location code already exists in this organization" }, { status: 409 });
    }
    return toAuthError(err);
  }
}