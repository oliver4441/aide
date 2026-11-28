import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, hasAnyPermission, Permission, canManageRole } from "@/lib/rbac";
import { BusinessRole } from "@prisma/client";
import { recordAudit } from "@/lib/audit";
import { bumpUserTokenVersion } from "@/lib/sessionGuard";
import {
  ROLE_TEMPLATES,
  baseRoleForTemplate,
  canAssignTemplate,
  resolveTemplateId,
} from "@/lib/roleTemplates.mjs";

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
      select: {
        id: true,
        employeeId: true,
        isActive: true,
        createdAt: true,
        businessId: true,
        userId: true,
        membershipId: true,
        roleTemplate: true,
        scopeType: true,
        branchId: true,
        departmentId: true,
        warehouseId: true,
        terminalId: true,
        ownRecordsOnly: true,
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
      select: { role: true, employee: { select: { roleTemplate: true } } },
    });
    if (!callerMembership || !hasPermission(callerMembership.role, Permission.EMPLOYEE_MANAGE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const callerTemplate = resolveTemplateId(callerMembership.employee, callerMembership.role);

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

    // AIDE-03: template changes re-derive the coarse role and are checked
    // against the caller's own tier before any write.
    const requestedTemplate: keyof typeof ROLE_TEMPLATES | null =
      typeof body?.roleTemplate === "string" && body.roleTemplate in ROLE_TEMPLATES
        ? body.roleTemplate
        : null;
    if (typeof body?.roleTemplate === "string" && !requestedTemplate) {
      return NextResponse.json({ error: "Invalid role template" }, { status: 400 });
    }
    if (requestedTemplate && !canAssignTemplate(callerTemplate, requestedTemplate)) {
      return NextResponse.json({ error: "Cannot assign this role template" }, { status: 403 });
    }

    if (body?.role !== undefined || requestedTemplate) {
      const newRole = (requestedTemplate
        ? baseRoleForTemplate(requestedTemplate)
        : (body.role as BusinessRole)) as BusinessRole;
      if (!newRole || !Object.values(BusinessRole).includes(newRole)) {
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
      // AIDE-03: privilege changes take effect immediately; the old JWT is
      // still signed with claims from before this promotion/demotion.
      await bumpUserTokenVersion(employee.userId);
      const fromTemplate = resolveTemplateId(employee, employee.membership.role);
      if (requestedTemplate) {
        updateData.roleTemplate = requestedTemplate;
      }
      await recordAudit({
        action: "membership.role_change",
        entityType: "Employee",
        entityId: employee.id,
        summary: `Role ${fromTemplate ?? employee.membership.role} -> ${requestedTemplate ?? newRole}`,
        metadata: {
          from: employee.membership.role,
          to: newRole,
          fromTemplate,
          toTemplate: requestedTemplate ?? null,
          userId: employee.userId,
        },
        actorId: user.id,
        businessId,
      });
    }

    // AIDE-03: scope changes are audited as permission changes.
    const scopeFields = [
      "scopeType",
      "branchId",
      "departmentId",
      "warehouseId",
      "terminalId",
      "ownRecordsOnly",
    ] as const;
    const scopeChanges: Record<string, unknown> = {};
    for (const field of scopeFields) {
      if (body?.[field] !== undefined) {
        updateData[field] = body[field];
        scopeChanges[field] = body[field];
      }
    }
    if (Object.keys(scopeChanges).length > 0) {
      await recordAudit({
        action: "employee.scope_change",
        entityType: "Employee",
        entityId: employee.id,
        summary: "Employee access scope updated",
        metadata: scopeChanges,
        actorId: user.id,
        businessId,
      });
    }

    if (body?.isActive !== undefined) {
      updateData.isActive = body.isActive;
      if (!body.isActive) {
        await bumpUserTokenVersion(employee.userId);
      }
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
    }

    // One atomic employee write for every accepted field. Previously the
    // write only happened inside the isActive/phone branches, so template and
    // scope updates were audited but never persisted.
    if (Object.keys(updateData).length > 0) {
      await prisma.employee.update({
        where: { id: params.id },
        data: updateData,
      });
    }

    const updated = await prisma.employee.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        employeeId: true,
        isActive: true,
        roleTemplate: true,
        scopeType: true,
        branchId: true,
        departmentId: true,
        warehouseId: true,
        terminalId: true,
        ownRecordsOnly: true,
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

    // AIDE-03: the revoked member's already-issued credentials die with the
    // membership. Nothing further needs to wait for JWT expiry.
    await bumpUserTokenVersion(employee.userId);

    await recordAudit({
      action: "membership.revoke",
      entityType: "Employee",
      entityId: employee.id,
      summary: "Employee access revoked",
      metadata: {
        role: employee.membership.role,
        roleTemplate: employee.roleTemplate,
        userId: employee.userId,
      },
      actorId: user.id,
      businessId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return toAuthError(err);
  }
}
