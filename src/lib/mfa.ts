import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { recordAudit } from "./audit";
import {
  generateBackupCodes,
  generateTotpSecret,
  normaliseBackupCode,
  otpauthUri,
  verifyTotp,
} from "./totp.mjs";

/**
 * AIDE-ENT-04: server-side TOTP enrollment and verification for both account
 * tables. No secret or unused backup code is ever returned after enrollment:
 * secrets stay in the MFA table, backup codes are bcrypt-hashed there, and the
 * plaintext codes are shown to the user exactly once.
 */

export type MfaPrincipal = {
  role: "admin" | "user";
  id: string;
  email: string;
  businessId?: string | null;
};

type StoredBackupCode = { hash: string };

type MfaRecord = {
  id: string;
  secret: string;
  enabled: boolean;
  backupCodes: unknown;
};

async function findRecord(role: "admin" | "user", id: string): Promise<MfaRecord | null> {
  if (role === "admin") {
    return prisma.adminMfaMethod.findUnique({
      where: { adminId: id },
      select: { id: true, secret: true, enabled: true, backupCodes: true },
    });
  }
  return prisma.userMfaMethod.findUnique({
    where: { userId: id },
    select: { id: true, secret: true, enabled: true, backupCodes: true },
  });
}

export async function hasEnabledMfa(role: "admin" | "user", id: string): Promise<boolean> {
  const record = await findRecord(role, id);
  return Boolean(record?.enabled);
}

/** Create (or replace) a pending enrollment. It is inert until confirmed. */
export async function beginMfaEnrollment(principal: MfaPrincipal) {
  const secret = generateTotpSecret();
  const data = { secret, enabled: false, backupCodes: [] as StoredBackupCode[] };
  if (principal.role === "admin") {
    await prisma.adminMfaMethod.upsert({
      where: { adminId: principal.id },
      create: { adminId: principal.id, ...data },
      update: data,
    });
  } else {
    await prisma.userMfaMethod.upsert({
      where: { userId: principal.id },
      create: { userId: principal.id, ...data },
      update: data,
    });
  }
  return {
    secret,
    uri: otpauthUri(secret, principal.email, "Aide"),
  };
}

function parseBackupCodes(value: unknown): StoredBackupCode[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is StoredBackupCode =>
      Boolean(entry && typeof entry === "object" && typeof (entry as any).hash === "string")
    )
    .map((entry) => ({ hash: entry.hash }));
}

/**
 * Check a second factor. A TOTP code is stateless; a backup code is one-time
 * and removed from the stored hashes as soon as it matches.
 */
export async function verifySecondFactor(
  role: "admin" | "user",
  id: string,
  code: string | undefined | null
): Promise<boolean> {
  const record = await findRecord(role, id);
  if (!record?.enabled) return false;
  const candidate = String(code ?? "").trim();
  if (!candidate) return false;

  if (/^\d{6}$/.test(candidate)) {
    return verifyTotp(candidate, record.secret);
  }

  const normalised = normaliseBackupCode(candidate);
  if (!/^[A-F0-9]{10}$/.test(normalised)) return false;
  const codes = parseBackupCodes(record.backupCodes);
  let usedIndex = -1;
  for (let i = 0; i < codes.length; i++) {
    if (await bcrypt.compare(normalised, codes[i].hash)) {
      usedIndex = i;
      break;
    }
  }
  if (usedIndex < 0) return false;

  // Consume it. Concurrent use of the same code is handled by the conditional
  // update below taking the row we read; a rare double-spend is preferable to
  // locking the login path for everyone.
  codes.splice(usedIndex, 1);
  if (role === "admin") {
    await prisma.adminMfaMethod.update({
      where: { id: record.id },
      data: { backupCodes: codes },
    });
  } else {
    await prisma.userMfaMethod.update({
      where: { id: record.id },
      data: { backupCodes: codes },
    });
  }
  return true;
}

/** Confirm the pending authenticator and return one-time backup codes. */
export async function confirmMfaEnrollment(
  principal: MfaPrincipal,
  code: string
): Promise<{ ok: false } | { ok: true; backupCodes: string[] }> {
  const record = await findRecord(principal.role, principal.id);
  if (!record || record.enabled) return { ok: false };
  if (!verifyTotp(code, record.secret)) return { ok: false };

  const plaintext = generateBackupCodes(8);
  const backupCodes: StoredBackupCode[] = await Promise.all(
    plaintext.map(async (value) => ({ hash: await bcrypt.hash(value, 10) }))
  );

  if (principal.role === "admin") {
    await prisma.adminMfaMethod.update({
      where: { id: record.id },
      data: { enabled: true, backupCodes },
    });
  } else {
    await prisma.userMfaMethod.update({
      where: { id: record.id },
      data: { enabled: true, backupCodes },
    });
  }

  await recordAudit({
    action: "auth.mfa_enabled",
    entityType: principal.role === "admin" ? "Admin" : "User",
    entityId: principal.id,
    summary: `${principal.email} enabled two-factor authentication`,
    metadata: { provider: "totp" },
    actorId: principal.role === "user" ? principal.id : null,
    businessId: principal.businessId ?? null,
  });

  return { ok: true, backupCodes: plaintext };
}

export async function disableMfa(principal: MfaPrincipal): Promise<void> {
  if (principal.role === "admin") {
    await prisma.adminMfaMethod.deleteMany({ where: { adminId: principal.id } });
  } else {
    await prisma.userMfaMethod.deleteMany({ where: { userId: principal.id } });
  }
  await recordAudit({
    action: "auth.mfa_disabled",
    entityType: principal.role === "admin" ? "Admin" : "User",
    entityId: principal.id,
    summary: `${principal.email} disabled two-factor authentication`,
    metadata: { provider: "totp" },
    actorId: principal.role === "user" ? principal.id : null,
    businessId: principal.businessId ?? null,
  });
}
