import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "kipkiruigideon890@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Matches the NextAuth session lifetime (see authOptions.session.maxAge).
const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

function secretKey(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export type TokenClaims = {
  sub: string;
  email: string;
  name: string;
  role: "admin" | "user";
  businessId: string | null;
};

export async function issueToken(claims: TokenClaims): Promise<string> {
  return new SignJWT({
    email: claims.email,
    name: claims.name,
    role: claims.role,
    businessId: claims.businessId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setIssuer("aide")
    .setAudience("aide-mobile")
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifyToken(token: string): Promise<TokenClaims> {
  const { payload } = await jwtVerify(token, secretKey(), {
    issuer: "aide",
    audience: "aide-mobile",
  });

  if (!payload.sub) throw new Error("Token missing subject");

  return {
    sub: payload.sub,
    email: String(payload.email ?? ""),
    name: String(payload.name ?? ""),
    role: (payload.role as "admin" | "user") ?? "user",
    businessId: (payload.businessId as string | null) ?? null,
  };
}

/**
 * Validates email/password against the Admin or User table and returns the
 * identity to mint a token for, or null when the credentials do not match.
 */
export async function authenticate(
  emailRaw: string,
  password: string
): Promise<TokenClaims | null> {
  const email = emailRaw.toLowerCase().trim();

  if (ADMIN_EMAILS.includes(email)) {
    const admin = await prisma.admin.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, passwordHash: true },
    });
    if (!admin?.passwordHash) return null;

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return null;

    const firstBusiness = await prisma.business.findFirst({
      where: { adminId: admin.id },
      select: { id: true },
    });

    return {
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      role: "admin",
      businessId: firstBusiness?.id ?? null,
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      businesses: { select: { businessId: true } },
    },
  });

  if (!user?.passwordHash) {
    // Compare against a dummy hash so a missing account and a wrong password
    // take similar time, avoiding an account-enumeration oracle.
    await bcrypt.compare(
      password,
      "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
    );
    return null;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: "user",
    businessId: user.businesses[0]?.businessId ?? null,
  };
}
