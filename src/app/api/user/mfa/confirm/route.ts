import { NextRequest, NextResponse } from "next/server";
import { requireUser, toAuthError } from "@/lib/apiAuth";
import { confirmMfaEnrollment } from "@/lib/mfa";

export const dynamic = "force-dynamic";

/** Confirm enrollment with a live TOTP code; returns backup codes once. */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    const code = String(body.code ?? "").replace(/\s/g, "");
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Enter the six-digit code from your app" }, { status: 400 });
    }
    const result = await confirmMfaEnrollment(
      { role: user.role, id: user.id, email: user.email, businessId: user.businessId },
      code
    );
    if (!result.ok) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, backupCodes: result.backupCodes });
  } catch (err) {
    return toAuthError(err);
  }
}
