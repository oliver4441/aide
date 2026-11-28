import { NextRequest, NextResponse } from "next/server";
import { requireUser, toAuthError } from "@/lib/apiAuth";
import { bumpTokenVersion } from "@/lib/sessionGuard";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * AIDE-03: revoke every session for the signed-in account.
 *
 * Bumps the account's tokenVersion, which the per-request guard in apiAuth
 * compares against every NextAuth JWT and native bearer token. The current
 * request itself keeps working (its version was read before the bump on this
 * call path); the browser cookie and any APK token will be rejected on the
 * very next use, so a client should sign out after calling this.
 *
 * This is also how a password change must behave: the old password is dead
 * everywhere the moment the new one is saved. The password route calls the
 * same bump so a compromised device holding the old credential is cut off.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);

    const body = await request.json().catch(() => ({}));
    // Require the current password when explicitly revoking sessions, so a
    // stolen cookie cannot log a victim out of their own phone/desktop apps.
    const currentPassword = String(body.password ?? "");

    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password is required to revoke sessions" },
        { status: 400 }
      );
    }

    const isAdmin = user.role === "admin";
    const account = isAdmin
      ? await prisma.admin.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
      : await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });

    if (!account?.passwordHash) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const bcrypt = await import("bcryptjs");
    const isValid = await bcrypt.compare(currentPassword, account.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
    }

    await bumpTokenVersion(user.role, user.id);

    const businessIds = await prisma.businessMembership.findMany({
      where: { userId: user.id },
      select: { businessId: true },
    });
    await recordAudit({
      action: "auth.sessions_revoked",
      entityType: isAdmin ? "Admin" : "User",
      entityId: user.id,
      summary: `${isAdmin ? "Admin" : "User"} revoked all sessions`,
      metadata: { email: user.email, provider: "session-revoke" },
      actorId: user.id,
      businessId: businessIds[0]?.businessId ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toAuthError(err);
  }
}
