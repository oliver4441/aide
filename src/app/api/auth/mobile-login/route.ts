import { NextRequest, NextResponse } from "next/server";
import { authenticate, issueToken } from "@/lib/mobileAuth";

export const dynamic = "force-dynamic";

/**
 * JSON login for the Android/desktop clients, which cannot complete the
 * NextAuth browser flow. Returns a bearer token to send as
 * `Authorization: Bearer <token>`.
 */
export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = (body.email || "").trim();
  const password = body.password || "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const identity = await authenticate(email, password);
  if (!identity) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = await issueToken(identity);

  return NextResponse.json({
    token,
    user: {
      id: identity.sub,
      email: identity.email,
      name: identity.name,
      role: identity.role,
      businessId: identity.businessId,
    },
  });
}
