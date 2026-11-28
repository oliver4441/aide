import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasEnabledMfa } from "@/lib/mfa";
import { isAdminEmail } from "@/lib/adminEmails";

export const dynamic = "force-dynamic";

/**
 * Public pre-flight used by the login form to decide whether to show the
 * authenticator input. It never reveals the secret and responds uniformly for
 * unknown accounts (mfaRequired: false), so it is not an account oracle.
 */
export async function POST(request: NextRequest) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ mfaRequired: false });
  }

  const email = String(body.email ?? "").toLowerCase().trim();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ mfaRequired: false });
  }

  const role = isAdminEmail(email) ? "admin" : "user";
  const record =
    role === "admin"
      ? await prisma.admin.findUnique({ where: { email }, select: { id: true } })
      : await prisma.user.findUnique({ where: { email }, select: { id: true } });

  if (!record?.id) return NextResponse.json({ mfaRequired: false });
  return NextResponse.json({ mfaRequired: await hasEnabledMfa(role, record.id) });
}
