import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import {
  denialMessage,
  hasPermission,
  permissionsFor,
} from "./platformAdmin.mjs";

/**
 * Platform console authorization (AIDE-ADMIN-01 / AIDE-ADMIN-02).
 *
 * The session's `role === "admin"` flag only says "this account signed in
 * through the Admin table". It is NOT the authorization decision: every
 * request re-reads the Admin row so a role change, demotion or deletion takes
 * effect immediately instead of waiting for the 30-day JWT to expire.
 */

export type PlatformAdminIdentity = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export class PlatformUnauthorizedError extends Error {
  constructor(message = "Sign in with a platform admin account to use the console.") {
    super(message);
    this.name = "PlatformUnauthorizedError";
  }
}

export class PlatformForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlatformForbiddenError";
  }
}

export async function requirePlatformAdmin(permission?: string): Promise<{
  admin: PlatformAdminIdentity;
  permissions: string[];
}> {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; role?: string } | undefined;

  if (!sessionUser?.id || sessionUser.role !== "admin") {
    throw new PlatformUnauthorizedError();
  }

  const admin = await prisma.admin.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!admin) {
    // The session is still valid but the Admin row is gone. Fail closed.
    throw new PlatformUnauthorizedError(
      "This account no longer has platform access. Sign in again or contact a super admin."
    );
  }

  if (permission && !hasPermission(admin.role, permission)) {
    throw new PlatformForbiddenError(denialMessage(admin.role, permission));
  }

  return { admin, permissions: permissionsFor(admin.role) };
}

export function platformErrorResponse(err: unknown): NextResponse {
  if (err instanceof PlatformUnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof PlatformForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  console.error("platform admin request failed", err);
  return NextResponse.json(
    { error: "The console could not complete this request. Try again." },
    { status: 500 }
  );
}

/**
 * Append-only platform audit entry. Like recordAudit, a failure here must not
 * break the operation it describes, so errors are logged and swallowed.
 */
export async function recordPlatformAudit(input: {
  admin: PlatformAdminIdentity;
  action: string;
  entityType: string;
  entityId?: string | null;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
}): Promise<void> {
  try {
    await prisma.platformAuditEvent.create({
      data: {
        actorId: input.admin.id,
        actorEmail: input.admin.email,
        actorRole: input.admin.role,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        reason: input.reason ?? null,
        before: (input.before ?? undefined) as never,
        after: (input.after ?? undefined) as never,
        metadata: (input.metadata ?? undefined) as never,
      },
    });
  } catch (err) {
    console.error("platform audit write failed", err);
  }
}

/** Shared `?q=` normaliser: trims, caps length, returns undefined when empty. */
export function searchTerm(value: string | null): string | undefined {
  const trimmed = (value || "").trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, 120);
}

/** Only allow known sort keys, falling back to a safe default. */
export function sortKey<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function sortDirection(value: string | null): "asc" | "desc" {
  return value === "asc" ? "asc" : "desc";
}

export function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
