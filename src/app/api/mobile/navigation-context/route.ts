import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, toAuthError } from "@/lib/apiAuth";
import { selectAccessible } from "@/lib/accessSelect.mjs";
import {
  resolveEffectivePermissions,
  resolveMobileNavigation,
  resolveMobileRoleFromMembership,
} from "@/lib/mobileNavigation.mjs";

export const dynamic = "force-dynamic";

/**
 * AIDE-ANDROID-06: Authoritative mobile workspace, role, location context, and
 * permission-driven navigation endpoint.
 *
 * Resolves all organizations, branches (businesses), warehouses, and terminals
 * the authenticated employee belongs to, checks employee suspension/revocation,
 * and returns the server-governed navigation contract for the active business.
 */
interface MembershipQueryRow {
  id: string;
  role: string;
  businessId: string;
  employee: {
    id: string;
    employeeId: string | null;
    isActive: boolean;
  } | null;
  business: {
    id: string;
    name: string;
    slug: string;
    type: string;
    currency: string;
    taxRate: unknown;
    organization: {
      id: string;
      name: string;
      legalName: string | null;
      slug: string;
      status: string;
    };
    warehouses: Array<{ id: string; name: string; code: string | null; type: string }>;
    terminals: Array<{ id: string; name: string; code: string | null }>;
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const { searchParams } = new URL(request.url);
    const requestedBusinessId = searchParams.get("businessId");
    const requestedPersona = searchParams.get("persona");

    const memberships = await prisma.businessMembership.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            isActive: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            currency: true,
            taxRate: true,
            organization: {
              select: {
                id: true,
                name: true,
                legalName: true,
                slug: true,
                status: true,
              },
            },
            warehouses: {
              orderBy: { name: "asc" },
              select: { id: true, name: true, code: true, type: true },
            },
            terminals: {
              where: { active: true },
              orderBy: { name: "asc" },
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    if (memberships.length === 0) {
      return NextResponse.json(
        {
          user: { id: user.id, email: user.email, name: user.name },
          memberships: [],
          activeBusinessId: null,
          activeNavigation: resolveMobileNavigation({
            role: "CASHIER",
            permissions: [],
            isRevoked: true,
            revokedReason: "No active business membership assigned to this account.",
          }),
        },
        { status: 200 }
      );
    }

    const mappedMemberships = (memberships as MembershipQueryRow[]).map((m) => {
      const orgArchived = m.business.organization?.status === "ARCHIVED";
      const employeeSuspended = m.employee ? !m.employee.isActive : false;
      const isRevoked = orgArchived || employeeSuspended;
      const mobileRole = resolveMobileRoleFromMembership(
        m.role,
        m.businessId === requestedBusinessId || memberships.length === 1
          ? requestedPersona
          : null
      );
      const permissions = resolveEffectivePermissions(mobileRole, { isRevoked });

      return {
        membershipId: m.id,
        businessRole: m.role,
        mobileRole,
        isRevoked,
        revokedReason: orgArchived
          ? "Organization is archived."
          : employeeSuspended
            ? "Employee profile has been deactivated by an administrator."
            : null,
        organization: {
          id: m.business.organization.id,
          name: m.business.organization.name,
          legalName: m.business.organization.legalName,
        },
        branch: {
          id: m.business.id,
          name: m.business.name,
          slug: m.business.slug,
          type: m.business.type,
          currency: m.business.currency,
          taxRate: Number(m.business.taxRate),
        },
        warehouses: m.business.warehouses,
        terminals: m.business.terminals,
        permissions,
      };
    });

    const activeIds = mappedMemberships
      .filter((m) => !m.isRevoked)
      .map((m) => m.branch.id);
    const allIds = mappedMemberships.map((m) => m.branch.id);

    // Never silently switch to an unauthorized business id; honour requestedBusinessId
    // only when the caller is a member of it.
    const selectedBusinessId =
      selectAccessible(requestedBusinessId, allIds) ?? activeIds[0] ?? allIds[0];

    const activeMembership =
      mappedMemberships.find((m) => m.branch.id === selectedBusinessId) ??
      mappedMemberships[0];

    const activeNavigation = resolveMobileNavigation({
      role: activeMembership.mobileRole,
      permissions: activeMembership.permissions,
      isRevoked: activeMembership.isRevoked,
      revokedReason: activeMembership.revokedReason,
    });

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      activeBusinessId: activeMembership.branch.id,
      activeMembership,
      activeNavigation,
      memberships: mappedMemberships,
    });
  } catch (err) {
    return toAuthError(err);
  }
}
