import crypto from "node:crypto";

export const TENANT_LIFECYCLE = Object.freeze({
  ACTIVE: "active",
  SUSPENDED: "suspended",
  DEACTIVATED: "deactivated",
});

const ROLE_MAP = Object.freeze({
  OWNER: "admin",
  ADMIN: "accountant",
  ACCOUNTANT: "accountant",
  MANAGER: "viewer",
  CASHIER: "none",
  STAFF: "none",
});

/**
 * Maps an Aide business role + membership status to least-privilege
 * accounting access. Suspended or deactivated users always receive "none".
 */
export function mapAideRoleToAccountingRole(aideRole, status = "active") {
  if (status !== TENANT_LIFECYCLE.ACTIVE) {
    return "none";
  }
  const normalized = String(aideRole || "").toUpperCase();
  return ROLE_MAP[normalized] ?? "none";
}

/**
 * Resolves the accounting tenant solely from trusted server context.
 * Never trusts a client-supplied accountingTenantId; only accepts an orgId
 * that the caller is authorized to access.
 */
export function resolveTrustedAccountingTenant(accessibleOrgIds, requestedOrgId) {
  if (!Array.isArray(accessibleOrgIds) || accessibleOrgIds.length === 0) {
    return null;
  }
  if (!requestedOrgId) {
    return accessibleOrgIds[0];
  }
  return accessibleOrgIds.includes(requestedOrgId) ? requestedOrgId : null;
}

/**
 * Idempotent tenant provisioning against an in-memory or backing store map.
 */
export function provisionAccountingTenant(store, { orgId, name, actorId }) {
  if (!orgId) {
    throw new Error("orgId is required");
  }
  const existing = store.get(orgId);
  if (existing) {
    return { created: false, tenant: existing };
  }
  const tenant = {
    orgId,
    accountingTenantId: `acct_${crypto.createHash("sha256").update(orgId).digest("hex").slice(0, 16)}`,
    name: name || orgId,
    status: TENANT_LIFECYCLE.ACTIVE,
    createdAt: new Date().toISOString(),
    createdBy: actorId || "system",
  };
  store.set(orgId, tenant);
  return { created: true, tenant };
}

export function deactivateAccountingTenant(store, orgId) {
  const existing = store.get(orgId);
  if (!existing) return null;
  const updated = {
    ...existing,
    status: TENANT_LIFECYCLE.DEACTIVATED,
    deactivatedAt: new Date().toISOString(),
  };
  store.set(orgId, updated);
  return updated;
}

/**
 * Signs a service-to-service bridge payload with HMAC-SHA256.
 */
export function signBridgeRequest(payload, secret) {
  if (!secret) throw new Error("Bridge signing secret is required");
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

export function verifyBridgeSignature(payload, signature, secret) {
  if (!secret || !signature) return false;
  const expected = signBridgeRequest(payload, secret);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(String(signature), "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
