import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MOBILE_ROLES,
  MOBILE_PERMISSIONS,
  resolveEffectivePermissions,
  resolveMobileNavigation,
  resolveMobileRoleFromMembership,
  canAccessDestination,
  authorizeMobileAction,
} from "../../src/lib/mobileNavigation.mjs";

test("all 7 documented mobile personas resolve distinct task-oriented primary tabs and actions", () => {
  const expectedPrimary = {
    [MOBILE_ROLES.OWNER_ADMIN]: ["home", "sell", "stock", "workspace"],
    [MOBILE_ROLES.BRANCH_MANAGER]: ["home", "tasks", "sell", "workspace"],
    [MOBILE_ROLES.CASHIER]: ["home", "sell", "lookup", "shifts"],
    [MOBILE_ROLES.WAREHOUSE_OPERATOR]: ["home", "receive-goods", "stock-count", "tasks"],
    [MOBILE_ROLES.RECEIVING_CLERK]: ["home", "receive-goods", "lookup", "tasks"],
    [MOBILE_ROLES.INVENTORY_CONTROLLER]: ["home", "stock", "stock-count", "workspace"],
    [MOBILE_ROLES.ACCOUNTANT]: ["home", "reports", "expenses", "workspace"],
  };

  for (const [role, tabs] of Object.entries(expectedPrimary)) {
    const nav = resolveMobileNavigation({ role });
    assert.equal(nav.isBlocked, false, `${role} should not be blocked`);
    assert.deepEqual(nav.primaryTabs, tabs, `${role} primary tabs mismatch`);
    assert.ok(nav.quickActions.length >= 4, `${role} should surface high-frequency quick actions`);
  }
});

test("cashier sees checkout, lookup, and shift controls but never reports, expenses, or product editing", () => {
  const nav = resolveMobileNavigation({ role: MOBILE_ROLES.CASHIER });
  assert.ok(nav.allowedRoutes.includes("sell"));
  assert.ok(nav.allowedRoutes.includes("lookup"));
  assert.ok(nav.allowedRoutes.includes("shifts"));
  assert.ok(nav.allowedRoutes.includes("approvals"));
  assert.ok(!nav.allowedRoutes.includes("reports"));
  assert.ok(!nav.allowedRoutes.includes("expenses"));
  assert.ok(!nav.allowedRoutes.includes("stock"));
  assert.ok(!nav.allowedRoutes.includes("receive-goods"));
  assert.ok(!nav.permissions.includes(MOBILE_PERMISSIONS.SETTINGS_UPDATE));
  assert.ok(canAccessDestination(nav.permissions, "receipt/sale-123"));
});

test("warehouse operator and receiving clerk never see POS checkout or financial reports", () => {
  for (const role of [MOBILE_ROLES.WAREHOUSE_OPERATOR, MOBILE_ROLES.RECEIVING_CLERK]) {
    const nav = resolveMobileNavigation({ role });
    assert.ok(nav.allowedRoutes.includes("receive-goods"));
    assert.ok(!nav.allowedRoutes.includes("sell"));
    assert.ok(!nav.allowedRoutes.includes("reports"));
    assert.ok(!nav.allowedRoutes.includes("expenses"));
    assert.ok(!nav.allowedRoutes.includes("customers"));
  }
});

test("accountant sees reports, expenses, and AR directory without POS sale or stock mutation routes", () => {
  const nav = resolveMobileNavigation({ role: MOBILE_ROLES.ACCOUNTANT });
  assert.ok(nav.allowedRoutes.includes("reports"));
  assert.ok(nav.allowedRoutes.includes("expenses"));
  assert.ok(nav.allowedRoutes.includes("customers"));
  assert.ok(nav.allowedRoutes.includes("calculator"));
  assert.ok(!nav.allowedRoutes.includes("sell"));
  assert.ok(!nav.allowedRoutes.includes("receive-goods"));
  assert.ok(!nav.allowedRoutes.includes("stock-count"));
  assert.ok(!nav.allowedRoutes.includes("stock"));
});

test("server-driven permission narrowing dynamically removes unauthorized tabs and quick actions", () => {
  const narrowed = resolveEffectivePermissions(MOBILE_ROLES.CASHIER, {
    revokedPermissions: [MOBILE_PERMISSIONS.SALE_CREATE],
  });
  const nav = resolveMobileNavigation({
    role: MOBILE_ROLES.CASHIER,
    permissions: narrowed,
  });

  assert.equal(nav.isBlocked, false);
  assert.ok(!nav.primaryTabs.includes("sell"));
  assert.ok(!nav.quickActions.some((a) => a.id === "START_SALE"));
  assert.ok(nav.primaryTabs.includes("lookup"));
});

test("suspended or revoked membership fails closed and blocks all routes", () => {
  const nav = resolveMobileNavigation({
    role: MOBILE_ROLES.OWNER_ADMIN,
    isRevoked: true,
    revokedReason: "Employee suspended",
  });

  assert.equal(nav.isBlocked, true);
  assert.equal(nav.blockedReason, "Employee suspended");
  assert.deepEqual(nav.permissions, []);
  assert.deepEqual(nav.primaryTabs, []);
  assert.deepEqual(nav.allowedRoutes, []);
  assert.equal(canAccessDestination(nav.permissions, "home", true), false);
});

test("STAFF database role cannot privilege-escalate to OWNER_ADMIN, BRANCH_MANAGER, or ACCOUNTANT", () => {
  assert.equal(
    resolveMobileRoleFromMembership("STAFF", MOBILE_ROLES.OWNER_ADMIN),
    MOBILE_ROLES.CASHIER
  );
  assert.equal(
    resolveMobileRoleFromMembership("STAFF", MOBILE_ROLES.BRANCH_MANAGER),
    MOBILE_ROLES.CASHIER
  );
  assert.equal(
    resolveMobileRoleFromMembership("STAFF", MOBILE_ROLES.ACCOUNTANT),
    MOBILE_ROLES.CASHIER
  );
  assert.equal(
    resolveMobileRoleFromMembership("STAFF", MOBILE_ROLES.WAREHOUSE_OPERATOR),
    MOBILE_ROLES.WAREHOUSE_OPERATOR
  );
  assert.equal(
    resolveMobileRoleFromMembership("MANAGER", MOBILE_ROLES.OWNER_ADMIN),
    MOBILE_ROLES.BRANCH_MANAGER
  );
});

test("server-side authorizeMobileAction enforces tenant match, permissions, revocation, and separation of duties", () => {
  const managerMembership = {
    businessId: "biz-westlands",
    isRevoked: false,
    employeeActive: true,
    permissions: resolveEffectivePermissions(MOBILE_ROLES.BRANCH_MANAGER),
  };

  assert.equal(
    authorizeMobileAction({
      membership: managerMembership,
      targetBusinessId: "biz-westlands",
      requiredPermission: MOBILE_PERMISSIONS.GOODS_RECEIVE,
    }).allowed,
    true
  );

  // Cross-tenant rejection
  assert.equal(
    authorizeMobileAction({
      membership: managerMembership,
      targetBusinessId: "biz-mombasa",
      requiredPermission: MOBILE_PERMISSIONS.GOODS_RECEIVE,
    }).allowed,
    false
  );

  // Missing permission rejection
  assert.equal(
    authorizeMobileAction({
      membership: managerMembership,
      targetBusinessId: "biz-westlands",
      requiredPermission: MOBILE_PERMISSIONS.SETTINGS_UPDATE,
    }).allowed,
    false
  );

  // Separation of duties on approval decision
  assert.equal(
    authorizeMobileAction({
      membership: managerMembership,
      targetBusinessId: "biz-westlands",
      requiredPermission: MOBILE_PERMISSIONS.APPROVAL_DECIDE,
      actorUserId: "user-1",
      approvalRequesterId: "user-1",
    }).allowed,
    false
  );
  assert.equal(
    authorizeMobileAction({
      membership: managerMembership,
      targetBusinessId: "biz-westlands",
      requiredPermission: MOBILE_PERMISSIONS.APPROVAL_DECIDE,
      actorUserId: "user-2",
      approvalRequesterId: "user-1",
    }).allowed,
    true
  );
});
