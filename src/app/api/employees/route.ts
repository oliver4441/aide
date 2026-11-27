import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, hasAnyPermission, Permission, canManageRole } from "@/lib/rbac";
import { isAdminEmail } from "@/lib/adminEmails";
import { BusinessRole } from "@prisma/client";
import { recordAudit } from "@/lib/audit";
import {
  ROLE_TEMPLATES,
  baseRoleForTemplate,
  canAssignTemplate,
  resolveTemplateId,
} from "@/lib/roleTemplates.mjs";

/**
 * AIDE-03: Employee management API.
 *
 * GET    /api/employees — List employees for the business
 * POST   /api/employees — Create employee directly (OWNER only)
 * PATCH  /api/employees/[id] — Update role or status
 * DELETE /api/employees/[id] — Remove employee (revoke access)
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const active = searchParams.get("active");
    const where: any = { businessId };
    if (active === "true") where.isActive = true;
    else if (active === "false") where.isActive = false;

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        employeeId: true,
        isActive: true,
        createdAt: true,
        roleTemplate: true,
        scopeType: true,
        branchId: true,
        departmentId: true,
        warehouseId: true,
        terminalId: true,
        ownRecordsOnly: true,
        user: {
          select: { id: true, email: true, name: true, phone: true },
        },
        membership: {
          select: { role: true, createdAt: true },
        },
      },
    });

    return NextResponse.json(employees);
  } catch (err) {
    return toAuthError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const callerMembership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true, employee: { select: { roleTemplate: true } } },
    });
    if (!callerMembership || !hasPermission(callerMembership.role, Permission.EMPLOYEE_MANAGE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const callerTemplate = resolveTemplateId(callerMembership.employee, callerMembership.role);

    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!email || !name) {
      return NextResponse.json({ error: "Email and name required" }, { status: 400 });
    }

    if (isAdminEmail(email)) {
      return NextResponse.json({ error: "Cannot assign a platform admin email as an employee" }, { status: 400 });
    }

    // AIDE-03: a named template drives the permission set; the coarse base
    // role is stored on the membership so existing checks remain valid.
    const requestedTemplate: keyof typeof ROLE_TEMPLATES | null =
      typeof body?.roleTemplate === "string" && body.roleTemplate in ROLE_TEMPLATES
        ? body.roleTemplate
        : null;
    if (typeof body?.roleTemplate === "string" && !requestedTemplate) {
      return NextResponse.json({ error: "Invalid role template" }, { status: 400 });
    }
    if (requestedTemplate && !canAssignTemplate(callerTemplate, requestedTemplate)) {
      return NextResponse.json(
        { error: "Cannot assign a role at or above your own level" },
        { status: 403 }
      );
    }
    const role = (requestedTemplate
      ? baseRoleForTemplate(requestedTemplate)
      : ((body?.role as BusinessRole) || BusinessRole.STAFF)) as BusinessRole;
    if (!role || !Object.values(BusinessRole).includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (!canManageRole(callerMembership.role, role)) {
      return NextResponse.json({ error: "Cannot assign a role equal to or higher than your own" }, { status: 403 });
    }

    // Optional scope assignments. Values are validated against the canonical
    // scope vocabulary; a null template means legacy coarse-role behaviour.
    const scopeType = typeof body?.scopeType === "string" ? body.scopeType.toUpperCase() : null;
    const ownRecordsOnly = Boolean(body?.ownRecordsOnly);

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      const alreadyMember = await prisma.businessMembership.findUnique({
        where: { userId_businessId: { userId: existingUser.id, businessId } },
        select: { id: true },
      });
      if (alreadyMember) {
        return NextResponse.json({ error: "User is already a member" }, { status: 409 });
      }

      const employee = await prisma.$transaction(async (tx) => {
        const employeeCount = await tx.employee.count({ where: { businessId } });
        const employeeId = `EMP-${(employeeCount + 1).toString().padStart(3, "0")}`;

        const membership = await tx.businessMembership.create({
          data: {
            userId: existingUser.id,
            businessId,
            role,
          },
        });

        return tx.employee.create({
          data: {
            userId: existingUser.id,
            businessId,
            employeeId,
            membershipId: membership.id,
            roleTemplate: requestedTemplate,
            scopeType,
            ownRecordsOnly,
          },
          include: {
            user: { select: { id: true, email: true, name: true } },
            membership: { select: { role: true } },
          },
        });
      });

      return NextResponse.json(employee, { status: 201 });
    }

    const bcrypt = await import("bcryptjs");
    const tempPassword = randomBytes(24).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const employee = await prisma.$transaction(async (tx) => {
      const employeeCount = await tx.employee.count({ where: { businessId } });
      const employeeId = `EMP-${(employeeCount + 1).toString().padStart(3, "0")}`;

      const newUser = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
        },
      });

      const newMembership = await tx.businessMembership.create({
        data: {
          userId: newUser.id,
          businessId,
          role,
        },
      });

      const employee = await tx.employee.create({
        data: {
          userId: newUser.id,
          businessId,
          employeeId,
          membershipId: newMembership.id,
          roleTemplate: requestedTemplate,
          scopeType,
          ownRecordsOnly,
        },
        include: {
          user: { select: { id: true, email: true, name: true } },
          membership: { select: { role: true } },
        },
      });

      await recordAudit({
        action: "membership.create",
        entityType: "Employee",
        entityId: employee.id,
        summary: `Added ${email} as ${requestedTemplate ?? role}`,
        metadata: { email, role, roleTemplate: requestedTemplate, scopeType, ownRecordsOnly },
        actorId: user.id,
        businessId,
      });

      return employee;
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}

