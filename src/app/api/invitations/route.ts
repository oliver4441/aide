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
 * AIDE-03: Invitation API.
 *
 * POST /api/invitations — Create an invitation (OWNER/MANAGER)
 * GET  /api/invitations — List pending invitations for the business
 *
 * Accepting an invitation is handled via PATCH /api/invitations/[id]
 * Revoking via DELETE /api/invitations/[id]
 */

export const dynamic = "force-dynamic";

function generateToken(): string {
  return randomBytes(20).toString("hex");
}

/**
 * POST — Create an invitation.
 *
 * Body: { email: string, role?: BusinessRole }
 * Only OWNER and MANAGER can invite (EMPLOYEE_INVITE permission).
 * Invitations always require explicit acceptance by the invitee.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: {
        role: true,
        employee: { select: { roleTemplate: true } },
      },
    });
    if (!membership || !hasPermission(membership.role, Permission.EMPLOYEE_INVITE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const callerTemplate = resolveTemplateId(membership.employee, membership.role);

    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }
    if (isAdminEmail(email)) {
      return NextResponse.json({ error: "Cannot invite a platform admin email" }, { status: 400 });
    }

    // AIDE-03: a named template is authoritative; its coarse base role is
    // persisted on the membership so existing role checks keep working.
    const requestedTemplate: keyof typeof ROLE_TEMPLATES | null =
      typeof body?.roleTemplate === "string" && body.roleTemplate in ROLE_TEMPLATES
        ? body.roleTemplate
        : null;
    if (typeof body?.roleTemplate === "string" && !requestedTemplate) {
      return NextResponse.json({ error: "Invalid role template" }, { status: 400 });
    }
    if (requestedTemplate && !canAssignTemplate(callerTemplate, requestedTemplate)) {
      return NextResponse.json(
        { error: "Cannot invite a role at or above your own level" },
        { status: 403 }
      );
    }
    const targetTemplate = requestedTemplate;
    const role = (requestedTemplate
      ? baseRoleForTemplate(requestedTemplate)
      : ((body?.role as BusinessRole) || BusinessRole.STAFF)) as BusinessRole;
    if (!role || !Object.values(BusinessRole).includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (!canManageRole(membership.role, role)) {
      return NextResponse.json({ error: "Cannot invite a role equal to or higher than your own" }, { status: 403 });
    }

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
    }

    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        businessId,
        email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (existingInvitation) {
      return NextResponse.json({ error: "Pending invitation already exists" }, { status: 409 });
    }

    const invitation = await prisma.invitation.create({
      data: {
        token: generateToken(),
        email,
        role,
        roleTemplate: targetTemplate,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        businessId,
        invitedById: user.id,
      },
      select: {
        id: true,
        email: true,
        role: true,
        roleTemplate: true,
        expiresAt: true,
        acceptedAt: true,
        createdAt: true,
        businessId: true,
        invitedBy: { select: { name: true, email: true } },
        business: { select: { name: true } },
      },
    });

    await recordAudit({
      action: "invitation.create",
      entityType: "Invitation",
      entityId: invitation.id,
      summary: `Invited ${email} as ${targetTemplate ?? role}`,
      metadata: { email, role, roleTemplate: targetTemplate },
      actorId: user.id,
      businessId,
    });

    // If user exists, create membership and employee immediately
    if (existingUser) {
      const newMembership = await prisma.businessMembership.create({
        data: {
          userId: existingUser.id,
          businessId,
          role,
        },
      });
      const employeeCount = await prisma.employee.count({ where: { businessId } });
      const employeeId = `EMP-${(employeeCount + 1).toString().padStart(3, "0")}`;
      await prisma.employee.create({
        data: {
          userId: existingUser.id,
          businessId,
          employeeId,
          membershipId: newMembership.id,
          roleTemplate: targetTemplate,
        },
      });
      // Mark invitation as accepted
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date(), acceptedBy: existingUser.id },
      });
      await recordAudit({
        action: "membership.create",
        entityType: "BusinessMembership",
        entityId: newMembership.id,
        summary: `Added ${email} as ${targetTemplate ?? role}`,
        metadata: { email, role, roleTemplate: targetTemplate, invitationId: invitation.id },
        actorId: user.id,
        businessId,
      });
    }

    return NextResponse.json(invitation, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}

/**
 * GET — List invitations for the business (omits raw token).
 */
export async function GET(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (
      !membership ||
      !hasAnyPermission(membership.role, [Permission.EMPLOYEE_INVITE, Permission.EMPLOYEE_MANAGE])
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invitations = await prisma.invitation.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        roleTemplate: true,
        expiresAt: true,
        acceptedAt: true,
        createdAt: true,
        businessId: true,
        invitedBy: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json(invitations);
  } catch (err) {
    return toAuthError(err);
  }
}
