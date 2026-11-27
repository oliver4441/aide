import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import {
  ForbiddenError,
  UnauthorizedError,
  requireBusiness,
  type SessionUser,
} from "./apiAuth";
import { hasPermission, Permission } from "./rbac";
import { permissionsForTemplate } from "./roleTemplates.mjs";
import { isWithinScope } from "./rbacScope.mjs";

/**
 * AIDE-03: server-side authorization context for the calling user.
 *
 * Resolves the tenant-scoped business, the caller's membership and employee
 * profile, and exposes permission/scope decisions. UI visibility is never
 * consulted — every check re-reads the membership from the database.
 */
export type RbacContext = {
  user: SessionUser;
  businessId: string;
  businessIds: string[];
  organizationIds: string[];
  role: string;
  employee: {
    id: string;
    userId: string;
    roleTemplate: string | null;
    scopeType: string | null;
    branchId: string | null;
    departmentId: string | null;
    warehouseId: string | null;
    terminalId: string | null;
    ownRecordsOnly: boolean;
    isActive: boolean;
  } | null;
};

export async function resolveRbacContext(
  requestedBusinessId?: string | null,
  request?: NextRequest
): Promise<RbacContext> {
  const { user, businessId, businessIds } = await requireBusiness(requestedBusinessId, request);

  const membership = await prisma.businessMembership.findUnique({
    where: { userId_businessId: { userId: user.id, businessId } },
    select: {
      role: true,
      employee: {
        select: {
          id: true,
          userId: true,
          roleTemplate: true,
          scopeType: true,
          branchId: true,
          departmentId: true,
          warehouseId: true,
          terminalId: true,
          ownRecordsOnly: true,
          isActive: true,
        },
      },
    },
  });
  if (!membership) throw new ForbiddenError("No business membership");

  // Offboarding deletes the membership; a deactivated employee cannot act
  // even if a stale session token is replayed.
  if (membership.employee && !membership.employee.isActive) {
    throw new ForbiddenError("Employee access is suspended");
  }

  const orgs = await prisma.business.findMany({
    where: { id: { in: businessIds } },
    select: { organizationId: true },
  });

  return {
    user,
    businessId,
    businessIds,
    organizationIds: Array.from(new Set(orgs.map((b) => b.organizationId))),
    role: membership.role,
    employee: membership.employee,
  };
}

/**
 * Throws ForbiddenError when the caller lacks `permission`.
 *
 * An assigned role template is authoritative and overrides the coarse role;
 * otherwise the existing BusinessRole → Permission matrix applies. This keeps
 * all pre-template routes working unchanged.
 */
export function assertPermission(context: RbacContext, permission: Permission): void {
  const template = context.employee?.roleTemplate;
  if (template) {
    if (permissionsForTemplate(template).includes(permission)) return;
    throw new ForbiddenError(`Missing permission ${permission}`);
  }
  if (!hasPermission(context.role as never, permission)) {
    throw new ForbiddenError(`Missing permission ${permission}`);
  }
}

/** Non-throwing variant for conditional UI payloads (still server-computed). */
export function hasContextPermission(context: RbacContext, permission: Permission): boolean {
  const template = context.employee?.roleTemplate;
  if (template) return permissionsForTemplate(template).includes(permission);
  return hasPermission(context.role as never, permission);
}

/**
 * Throws ForbiddenError when the resource lies outside the caller's branch /
 * department / warehouse / terminal / own-record scope. Tenant isolation is
 * included: a resource from another business is always denied.
 */
export function assertWithinScope(
  context: RbacContext,
  resource: {
    businessId: string;
    organizationId?: string | null;
    branchId?: string | null;
    departmentId?: string | null;
    warehouseId?: string | null;
    terminalId?: string | null;
    ownerId?: string | null;
  }
): void {
  const allowed = isWithinScope(
    {
      userId: context.user.id,
      businessIds: context.businessIds,
      organizationIds: context.organizationIds,
      employee: context.employee,
    },
    resource
  );
  if (!allowed) throw new ForbiddenError("Resource is outside your access scope");
}

export { UnauthorizedError, ForbiddenError };
