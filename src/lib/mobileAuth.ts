import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { isAdminEmail } from "./adminEmails";
import { currentTokenVersion } from "./sessionGuard";
import { hasEnabledMfa, verifySecondFactor } from "./mfa";

// Matches the NextAuth session lifetime (see authOptions.session.maxAge).
const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

function secretKey(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required");
  }
  return new TextEncoder().encode(secret);
}

export type TokenClaims = {
  sub: string;
  email: string;
  name: string;
  role: "admin" | "user";
  businessId: string | null;
  tokenVersion?: number;
};

export async function issueToken(claims: TokenClaims): Promise<string> {
  return new SignJWT({
    email: claims.email,
    name: claims.name,
    role: claims.role,
    businessId: claims.businessId,
    tokenVersion: claims.tokenVersion,
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
    tokenVersion: typeof payload.tokenVersion === "number" ? payload.tokenVersion : undefined,
  };
}

/**
 * Validates email/password against the Admin or User table and returns the
 * identity to mint a token for, or null when the credentials do not match.
 *
 * When the account has MFA enabled this returns a partial shell carrying
 * `mfaRequired`, and no token is signed until the caller supplies the code.
 */
export async function authenticate(
  emailRaw: string,
  password: string
): Promise<TokenClaims | null> {
  return authenticateWithMfa(emailRaw, password, undefined);
}

export type MfaLoginResult =
  | { ok: true; claims: TokenClaims }
  | { ok: false; reason: "invalid-credentials" | "mfa-required" | "mfa-invalid" };

/**
 * AIDE-ENT-04: password plus TOTP/backup code, with an explicit challenge
 * result so the native client can prompt for the code without guessing.
 */
export async function authenticateForToken(
  emailRaw: string,
  password: string,
  mfaCode?: string
): Promise<MfaLoginResult> {
  const claims = await authenticateWithMfa(emailRaw, password, mfaCode);
  if (!claims) {
    const email = emailRaw.toLowerCase().trim();
    const role = isAdminEmail(email) ? "admin" : "user";
    const id = await lookupAccountId(role, email);
    if (id && (await hasEnabledMfa(role, id))) {
      return { ok: false, reason: mfaCode ? "mfa-invalid" : "mfa-required" };
    }
    return { ok: false, reason: "invalid-credentials" };
  }
  return { ok: true, claims };
}

async function lookupAccountId(
  role: "admin" | "user",
  email: string
): Promise<string | null> {
  const record =
    role === "admin"
      ? await prisma.admin.findUnique({ where: { email }, select: { id: true } })
      : await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return record?.id ?? null;
}

export async function authenticateWithMfa(
  emailRaw: string,
  password: string,
  mfaCode?: string
): Promise<TokenClaims | null> {
  const email = emailRaw.toLowerCase().trim();

  if (isAdminEmail(email)) {
    const admin = await prisma.admin.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, passwordHash: true, tokenVersion: true },
    });
    if (!admin?.passwordHash) {
      await bcrypt.compare(
        password,
        "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
      );
      return null;
    }

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return null;

    if (await hasEnabledMfa("admin", admin.id)) {
      if (!(await verifySecondFactor("admin", admin.id, mfaCode))) return null;
    }

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
      tokenVersion: admin.tokenVersion,
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      tokenVersion: true,
      businesses: { select: { businessId: true } },
    },
  });

  if (!user?.passwordHash) {
    await bcrypt.compare(
      password,
      "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
    );
    return null;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  if (await hasEnabledMfa("user", user.id)) {
    if (!(await verifySecondFactor("user", user.id, mfaCode))) return null;
  }

  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: "user",
    businessId: user.businesses[0]?.businessId ?? null,
  };
}
