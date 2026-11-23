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
    const branchId = searchParams.get("branchId");

    const where: any = { organizationId };
    if (branchId) where.branchId = branchId;

    const locations = await prisma.stockLocation.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
      },
      orderBy: [{ branchId: "asc" }, { code: "asc" }],
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
    const type = typeof body?.type === "string" ? body.type.toUpperCase() : "WAREHOUSE";
    const branchId = typeof body?.branchId === "string" ? body.branchId : null;

    if (!code || !name) {
      return NextResponse.json({ error: "Code and name are required" }, { status: 400 });
    }

    const validTypes = ["WAREHOUSE", "STOCK_ROOM", "SHOP_FLOOR", "OTHER"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid location type" }, { status: 400 });
    }

    // Validate branch belongs to same organization
    if (branchId) {
      const branch = await prisma.business.findUnique({
        where: { id: branchId },
        select: { organizationId: true },
      });
      if (!branch || branch.organizationId !== organizationId) {
        return NextResponse.json({ error: "Invalid branch" }, { status: 400 });
      }
    }

    const location = await prisma.stockLocation.create({
      data: {
        code,
        name,
        type,
        branchId,
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