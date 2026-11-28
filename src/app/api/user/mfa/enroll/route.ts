import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireUser, toAuthError } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { beginMfaEnrollment } from "@/lib/mfa";

export const dynamic = "force-dynamic";

/**
 * Start TOTP enrollment. Requires the current password so a stolen session
 * cannot bind the victim's account to an attacker's authenticator.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    const password = String(body.password ?? "");

    const account = user.role === "admin"
      ? await prisma.admin.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
      : await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
    if (!account?.passwordHash || !(await bcrypt.compare(password, account.passwordHash))) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
    }

    const enrollment = await beginMfaEnrollment({
      role: user.role,
      id: user.id,
      email: user.email,
      businessId: user.businessId,
    });
    return NextResponse.json(enrollment);
  } catch (err) {
    return toAuthError(err);
  }
}
