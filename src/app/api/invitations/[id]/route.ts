import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, requireUser, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";

/**
 * AIDE-03: Invitation detail operations.
 *
 * PATCH /api/invitations/[id]/accept — Accept an invitation by token
 * DELETE /api/invitations/[id] — Revoke an invitation (OWNER/MANAGER)
 */

export const dynamic = "force-dynamic";

function generateEmployeeId(businessId: string, count: number): string {
  const seq = (count + 1).toString().padStart(3, "0");
  return `EMP-${seq}`;
}

/**
 * PATCH /accept — Accept an invitation.
 *
 * The invitee must be authenticated. If they don't have an account yet,
 * they need to register first via /api/auth/register, then accept.
 */
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

    // Check expiry
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invitation has expired" }, { status: 410 });
    }

    // Check if already accepted
    if (invitation.acceptedAt) {
      return NextResponse.json({ error: "Invitation already accepted" }, { status: 409 });
    }

    // Check email matches
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: "Invitation not for this account" }, { status: 403 });
    }

    const businessId = invitation.businessId;

    // Create membership
    await prisma.businessMembership.create({
      data: {
        userId: user.id,
        businessId,
        role: invitation.role,
      },
    });

    // Count existing employees for sequential ID
    const employeeCount = await prisma.employee.count({ where: { businessId } });

    // Create employee profile
    const employee = await prisma.employee.create({
      data: {
        userId: user.id,
        businessId,
        employeeId: generateEmployeeId(businessId, employeeCount),
        membershipId: (await prisma.businessMembership.findUnique({
          where: { userId_businessId: { userId: user.id, businessId } },
        }))!.id,
      },
    });

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date(), acceptedBy: user.id },
    });

    return NextResponse.json({
      invitation,
      employee,
      business: invitation.business,
    });
  } catch (err) {
    return toAuthError(err);
  }
}

/**
 * DELETE — Revoke an invitation.
 *
 * Only OWNER and MANAGER can revoke (EMPLOYEE_MANAGE permission).
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    // Check permission
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
