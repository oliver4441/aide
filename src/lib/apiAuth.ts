import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "./auth";
import { verifyToken } from "./mobileAuth";
import { prisma } from "./prisma";

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

  if (requestedBusinessId && businessIds.includes(requestedBusinessId)) {
    return { user, businessId: requestedBusinessId, businessIds };
  }

  return { user, businessId: businessIds[0], businessIds };
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

export function toAuthError(err: unknown): NextResponse {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  const message = err instanceof Error ? err.message : "Internal error";
  return NextResponse.json({ error: message }, { status: 500 });
}
