import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";
import { BusinessRole } from "@prisma/client";
import { randomBytes } from "crypto";

/**
 * AIDE-03: Invitation API.
 *
 * POST /api/invitations — Create an invitation (OWNER/MANAGER)
 * GET  /api/invitations — List pending invitations for the business
 *
 * Accepting an invitation is handled via PATCH /api/invitations/[id]/accept
 * Revoking via DELETE /api/invitations/[id]
 */

export const dynamic = "force-dynamic";

function generateToken(): string {
  return randomBytes(20).toString("hex");
}

function generateEmployeeId(businessId: string, count: number): string {
  const seq = (count + 1).toString().padStart(3, "0");
  return `EMP-${seq}`;
}

/**
 * POST — Create an invitation.
 *
 * Body: { email: string, role?: BusinessRole }
 * Only OWNER and MANAGER can invite (EMPLOYEE_INVITE permission).
 */
export async function POST(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);

    // Check permission
    const membership = await prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
      select: { role: true },
    });
    if (!membership || !hasPermission(membership.role, Permission.EMPLOYEE_INVITE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const role = (body?.role as BusinessRole) || BusinessRole.STAFF;
    if (!Object.values(BusinessRole).includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check if already a member
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

    // Check for existing pending invitation
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

    // Count existing employees for sequential ID
    const employeeCount = await prisma.employee.count({ where: { businessId } });

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        token: generateToken(),
        email,
        role,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        businessId,
        invitedById: user.id,
      },
      include: {
        invitedBy: { select: { name: true, email: true } },
        business: { select: { name: true } },
      },
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
      await prisma.employee.create({
        data: {
          userId: existingUser.id,
          businessId,
          employeeId: generateEmployeeId(businessId, employeeCount),
          membershipId: newMembership.id,
        },
      });
      // Mark invitation as accepted
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date(), acceptedBy: existingUser.id },
      });
    }

    return NextResponse.json(invitation, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}

/**
 * GET — List pending invitations for the business.
 */
export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const invitations = await prisma.invitation.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      include: {
        invitedBy: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json(invitations);
  } catch (err) {
    return toAuthError(err);
  }
}
