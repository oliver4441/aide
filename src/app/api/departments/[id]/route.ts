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

    const department = await prisma.department.findUnique({
      where: { id },
      select: { organizationId: true },
    });

    if (!department || department.organizationId !== organizationId) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    const body = await request.json();
    const data: {
      code?: string;
      name?: string;
      description?: string | null;
      parentId?: string | null;
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
    if (body.description !== undefined) {
      data.description = body.description ? String(body.description).trim() : null;
    }
    if (body.parentId !== undefined) {
      if (body.parentId) {
        const parent = await prisma.department.findUnique({
          where: { id: body.parentId },
          select: { organizationId: true },
        });
        if (!parent || parent.organizationId !== organizationId) {
          return NextResponse.json({ error: "Invalid parent department" }, { status: 400 });
        }
        if (body.parentId === id) {
          return NextResponse.json({ error: "Cannot set self as parent" }, { status: 400 });
        }
      }
      data.parentId = body.parentId || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const updated = await prisma.department.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Department code already exists in this organization" }, { status: 409 });
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

    const department = await prisma.department.findUnique({
      where: { id },
      select: { organizationId: true },
    });

    if (!department || department.organizationId !== organizationId) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    // Check for children
    const children = await prisma.department.count({ where: { parentId: id } });
    if (children > 0) {
      return NextResponse.json({ error: "Cannot delete department with sub-departments" }, { status: 400 });
    }

    await prisma.department.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    return toAuthError(err);
  }
}