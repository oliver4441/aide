import { prisma } from "./prisma";
import { sessionVersionMatches, nextTokenVersion } from "./sessionGuard.mjs";

/**
 * Server-side session revocation (AIDE-03). A credential is current only while
 * the version it carries equals the version on the account row. Bumping the
 * row invalidates the NextAuth JWT and every native bearer token at once.
 */

export type SessionIdentity = {
  id: string;
  role: "admin" | "user";
  tokenVersion?: number;
};

export async function currentTokenVersion(
  role: "admin" | "user",
  id: string
): Promise<number | null> {
  const record =
    role === "admin"
      ? await prisma.admin.findUnique({ where: { id }, select: { tokenVersion: true } })
      : await prisma.user.findUnique({ where: { id }, select: { tokenVersion: true } });
  return record?.tokenVersion ?? null;
}

/** Rejects legacy credentials with no version so they re-authenticate once. */
export async function isSessionCurrent(identity: SessionIdentity): Promise<boolean> {
  const current = await currentTokenVersion(identity.role, identity.id);
  return current !== null && sessionVersionMatches(identity.tokenVersion, current);
}

/** Bump once and return the new version. No-op for unknown accounts. */
export async function bumpTokenVersion(
  role: "admin" | "user",
  id: string
): Promise<number | null> {
  const current = await currentTokenVersion(role, id);
  if (current === null) return null;
  const tokenVersion = nextTokenVersion(current);
  if (role === "admin") {
    await prisma.admin.update({ where: { id }, data: { tokenVersion } });
  } else {
    await prisma.user.update({ where: { id }, data: { tokenVersion } });
  }
  return tokenVersion;
}

export async function bumpUserTokenVersion(userId: string): Promise<void> {
  await bumpTokenVersion("user", userId);
}
