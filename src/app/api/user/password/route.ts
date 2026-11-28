import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireUser, toAuthError } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { bumpTokenVersion } from "@/lib/sessionGuard";

export const dynamic = "force-dynamic";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Change the signed-in account's password. Works for both regular users
 * (User table) and platform admins (Admin table). The current password must
 * be supplied and verified before the new one is accepted.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireUser(request);
    const body = await request.json();

    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      );
    }

    const isAdmin = sessionUser.role === "admin";
    const account = isAdmin
      ? await prisma.admin.findUnique({
          where: { id: sessionUser.id },
          select: { id: true, passwordHash: true },
        })
      : await prisma.user.findUnique({
          where: { id: sessionUser.id },
          select: { id: true, passwordHash: true },
        });

    if (!account?.passwordHash) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const isValid = await bcrypt.compare(currentPassword, account.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    if (isAdmin) {
      await prisma.admin.update({ where: { id: account.id }, data: { passwordHash } });
    } else {
      await prisma.user.update({ where: { id: account.id }, data: { passwordHash } });
    }

    // AIDE-03: a password change must invalidate the old-password sessions
    // everywhere. The current request already authenticated; bumping here cuts
    // off every other cookie/bearer token that holds the previous password.
    await bumpTokenVersion(sessionUser.role as "admin" | "user", sessionUser.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toAuthError(err);
  }
}
