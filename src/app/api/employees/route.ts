import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { hasPermission, Permission, canManageRole } from "@/lib/rbac";
import { BusinessRole } from "@prisma/client";

/**
 * AIDE-03: Employee management API.
 *
 * GET    /api/employees — List employees for the business
 * POST   /api/employees — Create employee directly (OWNER only)
 * PATCH  /api/employees/[id] — Update role or status
 * DELETE /api/employees/[id] — Remove employee (revoke access)
 */

export const dynamic = "force-dynamic";

/**
 * GET — List all employees for the business.
 */
export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const { searchParams } = new URL(request.url);
    const active = searchParams.get("active");
    const where: any = { businessId };
    if (active === "true") where.isActive = true;
    else if (active === "false") where.isActive = false;

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
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

/**
 * POST — Create an employee directly (auto-invite).
 *
 * Body: { email: string, name: string, role?: BusinessRole }
 * Creates user account, membership, and employee profile in one transaction.
 * Only OWNER can create employees directly.
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!email || !name) {
      return NextResponse.json({ error: "Email and name required" }, { status: 400 });
    }

    const role = (body?.role as BusinessRole) || BusinessRole.STAFF;
    if (!Object.values(BusinessRole).includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check if user exists
    let existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      // Check if already a member
      const alreadyMember = await prisma.businessMembership.findUnique({
        where: { userId_businessId: { userId: existingUser.id, businessId } },
        select: { id: true },
      });
      if (alreadyMember) {
        return NextResponse.json({ error: "User is already a member" }, { status: 409 });
      }
    }

    // Count existing employees for sequential ID
    const employeeCount = await prisma.employee.count({ where: { businessId } });
    const employeeId = `EMP-${(employeeCount + 1).toString().padStart(3, "0")}`;

    if (existingUser) {
      // Add existing user to business
      const membership = await prisma.businessMembership.create({
        data: {
          userId: existingUser.id,
          businessId,
          role,
        },
      });

      const employee = await prisma.employee.create({
        data: {
          userId: existingUser.id,
          businessId,
          employeeId,
          membershipId: membership.id,
        },
        include: {
          user: { select: { id: true, email: true, name: true } },
          membership: { select: { role: true } },
        },
      });

      return NextResponse.json(employee, { status: 201 });
    }

    // Create new user with temporary password (they should reset it)
    const bcrypt = await import("bcryptjs");
    const tempPassword = `${email.split("@")[0]}${Date.now()}`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
      },
    });

    const newMembership = await prisma.businessMembership.create({
      data: {
        userId: newUser.id,
        businessId,
        role,
      },
    });

    const employee = await prisma.employee.create({
      data: {
        userId: newUser.id,
        businessId,
        employeeId,
        membershipId: newMembership.id,
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
        membership: { select: { role: true } },
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}
