/**
 * ENT-09: machine API key lifecycle.
 *
 * Keys are shown once at creation; only a SHA-256 hash is persisted. Every
 * lookup is scoped by businessId (and optionally organizationId) so a key
 * can never reach another tenant.
 */
import { prisma } from "./prisma";
import { recordAudit } from "./audit";
import {
  generateApiKey,
  hashApiKey,
  parseApiKey,
  hashesEqual,
  normalizeScopes,
  hasScope,
} from "./apiKeyCore.mjs";

export interface CreateKeyInput {
  name: string;
  scopes: unknown;
  businessId: string;
  organizationId?: string | null;
  createdById?: string | null;
  expiresAt?: Date | null;
}

/**
 * Create a key. Returns the plaintext key once — callers must persist it in
 * their secret store because it cannot be retrieved again.
 */
export async function createApiKey(input: CreateKeyInput) {
  const name = String(input.name ?? "").trim().slice(0, 100);
  const scopes = normalizeScopes(input.scopes);
  if (!name) throw new Error("Key name is required");
  if (!scopes || scopes.length === 0) throw new Error("At least one valid scope is required");

  const { key, prefix, hash } = generateApiKey();
  const record = await prisma.apiKey.create({
    data: {
      name,
      prefix,
      hashedKey: hash,
      scopes,
      businessId: input.businessId,
      organizationId: input.organizationId ?? null,
      createdById: input.createdById ?? null,
      expiresAt: input.expiresAt ?? null,
    },
    select: { id: true, name: true, prefix: true, scopes: true, createdAt: true, expiresAt: true },
  });

  await recordAudit({
    action: "api_key.create",
    entityType: "ApiKey",
    entityId: record.id,
    summary: `Created API key ${name}`,
    metadata: { prefix, scopes, businessId: input.businessId },
    actorId: input.createdById ?? null,
    businessId: input.businessId,
    organizationId: input.organizationId ?? null,
  });

  return { key, record };
}

export interface KeyIdentity {
  id: string;
  businessId: string;
  organizationId: string | null;
  scopes: string[];
  name: string;
  prefix: string;
}

/**
 * Resolve a plaintext key to its identity. Returns null for malformed,
 * unknown, revoked or expired keys. Updates lastUsedAt on success.
 */
export async function resolveApiKey(key: string): Promise<KeyIdentity | null> {
  const parsed = parseApiKey(key);
  if (!parsed) return null;

  const record = await prisma.apiKey.findUnique({
    where: { prefix: parsed.prefix },
  });
  if (!record || !hashesEqual(record.hashedKey, parsed.hash)) return null;
  if (record.revokedAt) return null;
  if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) return null;

  const scopes = Array.isArray(record.scopes)
    ? (record.scopes as unknown[]).filter((s): s is string => typeof s === "string")
    : [];
  await prisma.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => undefined);

  return {
    id: record.id,
    businessId: record.businessId,
    organizationId: record.organizationId,
    scopes,
    name: record.name,
    prefix: record.prefix,
  };
}

/** Assert a resolved key carries a scope; throws on failure. */
export function requireScope(identity: KeyIdentity, scope: string) {
  if (!hasScope(identity.scopes, scope)) {
    const err: any = new Error(`Missing scope: ${scope}`);
    err.status = 403;
    throw err;
  }
}

export async function revokeApiKey(id: string, businessId: string, actorId?: string | null) {
  const record = await prisma.apiKey.findFirst({ where: { id, businessId } });
  if (!record) return null;
  if (record.revokedAt) return record;
  const updated = await prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
    select: { id: true, name: true, prefix: true, revokedAt: true },
  });
  await recordAudit({
    action: "api_key.revoke",
    entityType: "ApiKey",
    entityId: id,
    summary: `Revoked API key ${record.name}`,
    metadata: { prefix: record.prefix },
    actorId: actorId ?? null,
    businessId,
    organizationId: record.organizationId,
  });
  return updated;
}

/** Rotate: revoke the old key and mint a new one with the same scopes. */
export async function rotateApiKey(id: string, businessId: string, actorId?: string | null) {
  const record = await prisma.apiKey.findFirst({ where: { id, businessId } });
  if (!record) return null;
  if (record.revokedAt) return null;

  const scopes = Array.isArray(record.scopes)
    ? (record.scopes as unknown[]).filter((s): s is string => typeof s === "string")
    : [];
  const created = await createApiKey({
    name: record.name,
    scopes,
    businessId,
    organizationId: record.organizationId,
    createdById: actorId ?? record.createdById,
    expiresAt: record.expiresAt,
  });
  await revokeApiKey(id, businessId, actorId);
  return created;
}

export async function listApiKeys(businessId: string) {
  return prisma.apiKey.findMany({
    where: { businessId },
    select: {
      id: true, name: true, prefix: true, scopes: true,
      lastUsedAt: true, expiresAt: true, revokedAt: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
