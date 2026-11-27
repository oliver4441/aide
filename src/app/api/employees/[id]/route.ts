import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, hasAnyPermission, Permission, canManageRole } from "@/lib/rbac";
import { BusinessRole } from "@prisma/client";
import { recordAudit } from "@/lib/audit";

/**
 * AIDE-03: Employee detail operations.
 *
 * GET    /api/employees/[id] — Get employee details
 * PATCH  /api/employees/[id] — Update role or status
 * DELETE /api/employees/[id] — Remove employee (revoke access)
 */

export const dynamic = "force-dynamic";

/**
 * GET — Get employee details.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const callerMembership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (
      !callerMembership ||
      !hasAnyPermission(callerMembership.role, [Permission.EMPLOYEE_MANAGE, Permission.EMPLOYEE_INVITE])
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { id: true, email: true, name: true, phone: true, createdAt: true },
        },
        membership: {
          select: { role: true, createdAt: true },
        },
        business: {
          select: { id: true, name: true },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    if (employee.businessId !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(employee);
  } catch (err) {
    return toAuthError(err);
  }
}

/**
 * PATCH — Update employee role or status.
 *
 * Body: { role?: BusinessRole, isActive?: boolean }
 * Only OWNER can manage all roles. MANAGER can only manage STAFF.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    // Check permission
    const callerMembership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!callerMembership || !hasPermission(callerMembership.role, Permission.EMPLOYEE_MANAGE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: {
        membership: { select: { role: true } },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    if (employee.businessId !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check role hierarchy — can't manage equal or higher roles
    if (!canManageRole(callerMembership.role, employee.membership.role)) {
      return NextResponse.json({ error: "Cannot manage this role level" }, { status: 403 });
    }

    const body = await request.json();
    const updateData: any = {};

    if (body?.role !== undefined) {
      const newRole = body.role as BusinessRole;
      if (!Object.values(BusinessRole).includes(newRole)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      // Can't promote above own level
      if (!canManageRole(callerMembership.role, newRole)) {
        return NextResponse.json({ error: "Cannot assign this role" }, { status: 403 });
      }
      await prisma.businessMembership.update({
        where: { id: employee.membershipId },
        data: { role: newRole },
      });
      await recordAudit({
        action: "membership.role_change",
        entityType: "Employee",
        entityId: employee.id,
        summary: `Role ${employee.membership.role} -> ${newRole}`,
        metadata: { from: employee.membership.role, to: newRole, userId: employee.userId },
        actorId: user.id,
        businessId,
      });
    }

    if (body?.isActive !== undefined) {
      updateData.isActive = body.isActive;
      await prisma.employee.update({
        where: { id: params.id },
        data: updateData,
      });
      await recordAudit({
        action: body.isActive ? "employee.activate" : "employee.deactivate",
        entityType: "Employee",
        entityId: employee.id,
        summary: body.isActive ? "Employee activated" : "Employee deactivated",
        metadata: { userId: employee.userId },
        actorId: user.id,
        businessId,
      });
    }

    if (body?.phone !== undefined) {
      updateData.phone = body.phone;
      await prisma.employee.update({
        where: { id: params.id },
        data: updateData,
      });
    }

    const updated = await prisma.employee.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, email: true, name: true } },
        membership: { select: { role: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return toAuthError(err);
  }
}

/**
 * DELETE — Remove employee (revoke access).
 *
 * Deletes the membership and deactivates the employee profile.
 * Does not delete the user account — they may belong to other businesses.
 * Only OWNER can remove all roles. MANAGER can only remove STAFF.
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    // Check permission
    const callerMembership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!callerMembership || !hasPermission(callerMembership.role, Permission.EMPLOYEE_MANAGE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: {
        membership: { select: { role: true } },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    if (employee.businessId !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can't remove equal or higher roles
    if (!canManageRole(callerMembership.role, employee.membership.role)) {
      return NextResponse.json({ error: "Cannot remove this role level" }, { status: 403 });
    }

    // Can't remove yourself
    if (employee.userId === user.id) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 409 });
    }

    // Delete membership (cascades employee via onDelete)
    await prisma.businessMembership.delete({
      where: { id: employee.membershipId },
    });

    await recordAudit({
      action: "membership.revoke",
      entityType: "Employee",
      entityId: employee.id,
      summary: "Employee access revoked",
      metadata: { role: employee.membership.role, userId: employee.userId },
      actorId: user.id,
      businessId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return toAuthError(err);
  }
}
