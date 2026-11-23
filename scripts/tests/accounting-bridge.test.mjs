import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TENANT_LIFECYCLE,
  mapAideRoleToAccountingRole,
  resolveTrustedAccountingTenant,
  provisionAccountingTenant,
  deactivateAccountingTenant,
  signBridgeRequest,
  verifyBridgeSignature,
} from '../../src/lib/accountingBridge.mjs';

test('provisionAccountingTenant is idempotent for the same orgId', () => {
  const store = new Map();
  const first = provisionAccountingTenant(store, { orgId: 'org-1', name: 'Shop A', actorId: 'u-1' });
  const second = provisionAccountingTenant(store, { orgId: 'org-1', name: 'Shop A', actorId: 'u-1' });

  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(first.tenant.accountingTenantId, second.tenant.accountingTenantId);
  assert.equal(second.tenant.status, TENANT_LIFECYCLE.ACTIVE);
});

test('deactivateAccountingTenant marks tenant deactivated without deleting it', () => {
  const store = new Map();
  provisionAccountingTenant(store, { orgId: 'org-2', name: 'Shop B', actorId: 'u-1' });
  const updated = deactivateAccountingTenant(store, 'org-2');

  assert.equal(updated.status, TENANT_LIFECYCLE.DEACTIVATED);
  assert.ok(updated.deactivatedAt);
});

test('resolveTrustedAccountingTenant rejects cross-tenant orgIds', () => {
  assert.equal(resolveTrustedAccountingTenant(['org-1', 'org-2'], 'org-2'), 'org-2');
  assert.equal(resolveTrustedAccountingTenant(['org-1'], 'org-999'), null);
  assert.equal(resolveTrustedAccountingTenant([], 'org-1'), null);
});

test('mapAideRoleToAccountingRole enforces least privilege and revokes on suspension', () => {
  assert.equal(mapAideRoleToAccountingRole('OWNER', 'active'), 'admin');
  assert.equal(mapAideRoleToAccountingRole('ADMIN', 'active'), 'accountant');
  assert.equal(mapAideRoleToAccountingRole('MANAGER', 'active'), 'viewer');
  assert.equal(mapAideRoleToAccountingRole('CASHIER', 'active'), 'none');
  assert.equal(mapAideRoleToAccountingRole('OWNER', 'suspended'), 'none');
  assert.equal(mapAideRoleToAccountingRole('ADMIN', 'deactivated'), 'none');
});

test('signBridgeRequest and verifyBridgeSignature validate HMAC-SHA256 signatures', () => {
  const secret = 'test-bridge-secret';
  const payload = { orgId: 'org-1', action: 'sync' };
  const sig = signBridgeRequest(payload, secret);

  assert.equal(verifyBridgeSignature(payload, sig, secret), true);
  assert.equal(verifyBridgeSignature(payload, sig, 'wrong-secret'), false);
  assert.equal(verifyBridgeSignature({ orgId: 'org-2', action: 'sync' }, sig, secret), false);
});
