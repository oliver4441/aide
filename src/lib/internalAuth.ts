import { SignJWT, jwtVerify } from "jose";

/**
 * Short-lived token used only when the approval engine replays an already
 * approved action through the same route handler. Never accepted from users.
 */
function key() {
  const secret = process.env.NEXTAUTH_SECRET || process.env.APP_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for approval replay");
  return new TextEncoder().encode(secret);
}

export async function makeReplayToken(userId: string, businessId: string, requestId: string) {
  return new SignJWT({ userId, businessId, requestId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(key());
}

export async function verifyReplayToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, key());
    if (!payload.userId || !payload.businessId || !payload.requestId) return null;
    return payload as { userId: string; businessId: string; requestId: string };
  } catch {
    return null;
  }
}
