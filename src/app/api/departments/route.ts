import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toAuthError, resolveOrganization } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user, organizationId } = await resolveOrganization(null, request);

    const membership = await prisma.businessMembership.findFirst({
      where: { userId: user.id },
      include: { business: { select: { organizationId: true } } },
    });

    if (!membership || membership.business.organizationId !== organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const departments = await prisma.department.findMany({
      where: { organizationId },
      orderBy: [{ parentId: "asc" }, { code: "asc" }],
    });

    return NextResponse.json(departments);
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
    const description = typeof body?.description === "string" ? body.description.trim() : null;
    const parentId = typeof body?.parentId === "string" ? body.parentId : null;

    if (!code || !name) {
      return NextResponse.json({ error: "Code and name are required" }, { status: 400 });
    }

    // Validate parent exists and belongs to same organization
    if (parentId) {
      const parent = await prisma.department.findUnique({
        where: { id: parentId },
        select: { organizationId: true },
      });
      if (!parent || parent.organizationId !== organizationId) {
        return NextResponse.json({ error: "Invalid parent department" }, { status: 400 });
      }
    }

    const department = await prisma.department.create({
      data: {
        code,
        name,
        description,
        parentId,
        organizationId,
      },
    });

    return NextResponse.json(department, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Department code already exists in this organization" }, { status: 409 });
    }
    return toAuthError(err);
  }
}