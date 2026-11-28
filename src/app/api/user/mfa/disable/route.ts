import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireUser, toAuthError } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { disableMfa, hasEnabledMfa, verifySecondFactor } from "@/lib/mfa";

export const dynamic = "force-dynamic";

/** Disable MFA. Requires both the password and a current second factor. */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    const password = String(body.password ?? "");
    const code = String(body.code ?? "");

    const account = user.role === "admin"
      ? await prisma.admin.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
      : await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
    if (!account?.passwordHash || !(await bcrypt.compare(password, account.passwordHash))) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
    }
    if (await hasEnabledMfa(user.role, user.id)) {
      if (!(await verifySecondFactor(user.role, user.id, code))) {
        return NextResponse.json({ error: "Invalid authenticator code" }, { status: 400 });
      }
    }
    await disableMfa({ role: user.role, id: user.id, email: user.email, businessId: user.businessId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toAuthError(err);
  }
}
