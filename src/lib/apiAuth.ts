import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "./auth";
import { verifyToken } from "./mobileAuth";
import { verifyReplayToken } from "./internalAuth";
import { prisma } from "./prisma";
import { selectAccessible } from "./accessSelect.mjs";

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role: "admin" | "user";
  businessId?: string | null;
};

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

/**
 * Resolves the caller from a NextAuth session cookie or, for the native
 * clients, an `Authorization: Bearer <token>` header.
 */
export async function resolveUser(request?: NextRequest): Promise<SessionUser | null> {
  if (request) {
    const token = bearerToken(request);
    if (token) {
      try {
        const claims = await verifyToken(token);
        return {
          id: claims.sub,
          email: claims.email,
          name: claims.name,
          role: claims.role,
          businessId: claims.businessId,
        };
      } catch {
        return null;
      }
    }
  }

  // Server-side approval replay only. This header is never set by the browser
  // client and is verified against NEXTAUTH_SECRET.
  if (request) {
    const replay = request.headers.get("x-aide-replay");
    if (replay) {
      const claims = await verifyReplayToken(replay);
      if (claims) {
        return {
          id: claims.userId,
          email: "",
          name: "Approval engine",
          role: "user",
          businessId: claims.businessId,
        };
      }
    }
  }

  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!session || !user?.id) return null;
  return user;
}

/**
 * Returns the authenticated session user, or throws UnauthorizedError.
 */
export async function requireUser(request?: NextRequest): Promise<SessionUser> {
  const user = await resolveUser(request);
  if (!user?.id) {
    throw new UnauthorizedError();
  }
  return user;
}

/**
 * Every business id the caller may read or write. Admins are not granted
 * blanket cross-tenant access here — an admin still acts within a business
 * they belong to, so tenant isolation holds for every role.
 */
export async function getAccessibleBusinessIds(user: SessionUser): Promise<string[]> {
  const memberships = await prisma.businessMembership.findMany({
    where: { userId: user.id },
    select: { businessId: true },
  });
  return memberships.map((m) => m.businessId);
}

/**
 * Resolves the business to operate on and asserts the caller belongs to it.
 *
 * A caller-supplied `businessId` is only honoured when the caller is a
 * member; otherwise we fall back to their first membership. Never returns a
 * business the caller does not own.
 */
export async function requireBusiness(
  requestedBusinessId?: string | null,
  request?: NextRequest
): Promise<{
  user: SessionUser;
  businessId: string;
  businessIds: string[];
}> {
  const user = await requireUser(request);
  const businessIds = await getAccessibleBusinessIds(user);

  if (businessIds.length === 0) {
    throw new UnauthorizedError("No business membership");
  }

  const businessId = selectAccessible(requestedBusinessId, businessIds) ?? businessIds[0];
  return { user, businessId, businessIds };
}

/**
 * True when the caller is a member of the given business. Used to authorise
 * individual record writes where the record may belong to several tenants.
 */
export async function canAccessBusiness(user: SessionUser, businessId?: string | null): Promise<boolean> {
  if (!businessId) return false;
  const membership = await prisma.businessMembership.findUnique({
    where: { userId_businessId: { userId: user.id, businessId } },
    select: { id: true },
  });
  return Boolean(membership);
}

/**
 * The distinct Organizations a user belongs to, derived from their business
 * memberships (Business -> Organization). Null organizationIds are skipped:
 * before the AIDE-02 backfill some legacy rows may still be unlinked, and they
 * simply do not grant organization scope.
 *
 * This is the foundation AIDE-03 (RBAC) builds on — it does not itself enforce
 * any role or permission; it only answers "which orgs can this user see?".
 */
export async function getAccessibleOrganizationIds(user: SessionUser): Promise<string[]> {
  const memberships = await prisma.businessMembership.findMany({
    where: { userId: user.id },
    select: { business: { select: { organizationId: true } } },
  });
  const ids = memberships
    .map((m) => m.business?.organizationId)
    .filter((id): id is string => Boolean(id));
  return Array.from(new Set(ids));
}

/**
 * Resolves the Organization to operate on and asserts the caller belongs to it,
 * mirroring `requireBusiness` but at the company level.
 *
 * A caller-supplied `organizationId` is only honoured when the caller is a
 * member; otherwise we fall back to their first organization. Never returns an
 * organization the caller does not belong to. Cross-organization isolation is
 * enforced here; per-role authorization is AIDE-03.
 */
export async function resolveOrganization(
  requestedOrganizationId?: string | null,
  request?: NextRequest
): Promise<{
  user: SessionUser;
  organizationId: string;
  organizationIds: string[];
  businessIds: string[];
}> {
  const user = await requireUser(request);
  const businessIds = await getAccessibleBusinessIds(user);
  if (businessIds.length === 0) {
    throw new UnauthorizedError("No business membership");
  }

  const organizationIds = await getAccessibleOrganizationIds(user);
  if (organizationIds.length === 0) {
    throw new UnauthorizedError("No organization membership");
  }

  const organizationId = selectAccessible(requestedOrganizationId, organizationIds) ?? organizationIds[0];
  return { user, organizationId, organizationIds, businessIds };
}

export function toAuthError(err: unknown): NextResponse {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  const message = err instanceof Error ? err.message : "Internal error";
  return NextResponse.json({ error: message }, { status: 500 });
}
