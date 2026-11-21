import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, requireUser, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";

/**
 * AIDE-03: Invitation detail operations.
 *
 * PATCH  /api/invitations/[id] — Accept an invitation
 * DELETE /api/invitations/[id] — Revoke an invitation (OWNER/MANAGER)
 */

export const dynamic = "force-dynamic";

function generateEmployeeId(count: number): string {
  const seq = (count + 1).toString().padStart(3, "0");
  return `EMP-${seq}`;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(request);
    const invitation = await prisma.invitation.findUnique({
      where: { id: params.id },
      include: { business: { select: { id: true, name: true } } },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invitation has expired" }, { status: 410 });
    }

    if (invitation.acceptedAt) {
      return NextResponse.json({ error: "Invitation already accepted" }, { status: 409 });
    }

    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: "Invitation not for this account" }, { status: 403 });
    }

    const businessId = invitation.businessId;

    const outcome = await prisma.$transaction(async (tx) => {
      const claim = await tx.invitation.updateMany({
        where: { id: invitation.id, acceptedAt: null },
        data: { acceptedAt: new Date(), acceptedBy: user.id },
      });
      if (claim.count === 0) {
        return { conflict: "Invitation already accepted" as const };
      }

      const existingMembership = await tx.businessMembership.findUnique({
        where: { userId_businessId: { userId: user.id, businessId } },
      });
      if (existingMembership) {
        return { conflict: "User is already a member" as const };
      }

      const membership = await tx.businessMembership.create({
        data: {
          userId: user.id,
          businessId,
          role: invitation.role,
        },
      });

      const employeeCount = await tx.employee.count({ where: { businessId } });
      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          businessId,
          employeeId: generateEmployeeId(employeeCount),
          membershipId: membership.id,
        },
      });

      return { employee };
    });

    if ("conflict" in outcome) {
      return NextResponse.json({ error: outcome.conflict }, { status: 409 });
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        businessId: invitation.businessId,
      },
      employee: outcome.employee,
      business: invitation.business,
    });
  } catch (err) {
    return toAuthError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.EMPLOYEE_MANAGE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: params.id },
      select: { businessId: true, acceptedAt: true },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (invitation.businessId !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (invitation.acceptedAt) {
      return NextResponse.json({ error: "Cannot revoke accepted invitation" }, { status: 409 });
    }

    await prisma.invitation.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return toAuthError(err);
  }
}
