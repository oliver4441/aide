import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PERMISSIONS,
  PLATFORM_ROLES,
  denialMessage,
  hasPermission,
  isPlatformRole,
  permissionMatrix,
  permissionsFor,
  roleLabel,
} from "../../src/lib/platformAdmin.mjs";

// AIDE-ADMIN-01: the role/action matrix is the server-side authorization
// source of truth. These tests pin the separation between SUPER_ADMIN, ADMIN
// and SUPPORT so a refactor cannot quietly widen what support staff can do.

test("super admin holds every permission", () => {
  const all = Object.values(PERMISSIONS);
  for (const permission of all) {
    assert.equal(hasPermission("SUPER_ADMIN", permission), true, permission);
  }
  assert.equal(permissionsFor("SUPER_ADMIN").length, all.length);
});

test("admin can manage subscriptions but cannot publish plans or replay events", () => {
  assert.equal(hasPermission("ADMIN", PERMISSIONS.MANAGE_SUBSCRIPTIONS), true);
  assert.equal(hasPermission("ADMIN", PERMISSIONS.RECORD_NOTES), true);
  assert.equal(hasPermission("ADMIN", PERMISSIONS.PUBLISH_PLANS), false);
  assert.equal(hasPermission("ADMIN", PERMISSIONS.REPLAY_EVENTS), false);
});

test("support is read-only plus notes", () => {
  for (const permission of [
    PERMISSIONS.VIEW_OVERVIEW,
    PERMISSIONS.VIEW_ORGANIZATIONS,
    PERMISSIONS.VIEW_SUBSCRIPTIONS,
    PERMISSIONS.VIEW_PLANS,
    PERMISSIONS.VIEW_BILLING,
    PERMISSIONS.VIEW_EVENTS,
    PERMISSIONS.VIEW_REVIEWS,
  ]) {
    assert.equal(hasPermission("SUPPORT", permission), true, permission);
  }
  for (const permission of [
    PERMISSIONS.MANAGE_SUBSCRIPTIONS,
    PERMISSIONS.PUBLISH_PLANS,
    PERMISSIONS.REPLAY_EVENTS,
    PERMISSIONS.EXPORT_DATA,
  ]) {
    assert.equal(hasPermission("SUPPORT", permission), false, permission);
  }
  assert.equal(hasPermission("SUPPORT", PERMISSIONS.RECORD_NOTES), true);
});

test("unknown or business roles are denied everything", () => {
  for (const role of [undefined, null, "", "admin", "user", "OWNER", "MANAGER", "SUPPORT_ADMIN"]) {
    assert.equal(isPlatformRole(role), false);
    assert.equal(hasPermission(role, PERMISSIONS.VIEW_OVERVIEW), false);
    assert.deepEqual(permissionsFor(role), []);
  }
});

test("the matrix exposes exactly the three platform roles", () => {
  const matrix = permissionMatrix();
  assert.deepEqual(
    matrix.map((row) => row.role),
    [...PLATFORM_ROLES]
  );
  const support = matrix.find((row) => row.role === "SUPPORT");
  assert.equal(support.permissions.includes(PERMISSIONS.PUBLISH_PLANS), false);
});

test("denial messages are role-specific and never mention record existence", () => {
  const message = denialMessage("SUPPORT", PERMISSIONS.REPLAY_EVENTS);
  assert.match(message, /Support/);
  assert.match(message, /replay or reconcile webhook events/);
  assert.doesNotMatch(message, /not found|does not exist/i);
  assert.equal(roleLabel("SUPER_ADMIN"), "Super admin");
  assert.equal(roleLabel("nope"), "Unknown role");
});
