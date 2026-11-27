import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ROLE_TEMPLATES,
  TEMPLATE_IDS,
  ACCESS_SCOPE,
  permissionsForTemplate,
  templateHasPermission,
  canAssignTemplate,
  assignableTemplates,
  baseRoleForTemplate,
  defaultTemplateForBaseRole,
  resolveTemplateId,
} from "../../src/lib/roleTemplates.mjs";
import {
  resolveEmployeeScope,
  isWithinScope,
  isEmployeeActive,
} from "../../src/lib/rbacScope.mjs";

// AIDE-03 acceptance: "Permission matrix is documented and testable" and
// "Unauthorized cross-tenant and cross-branch requests are denied server-side".

test("all 12 named templates plus OWNER exist with unique ids and labels", () => {
  const expected = [
    "OWNER", "HQ_ADMIN", "FINANCE", "ACCOUNTANT", "BRANCH_MANAGER",
    "STORE_MANAGER", "PROCUREMENT", "INVENTORY", "WAREHOUSE", "CASHIER",
    "CASH_OFFICE", "SALESPERSON", "AUDITOR",
  ];
  assert.deepEqual([...TEMPLATE_IDS].sort(), [...expected].sort());
  for (const id of expected) {
    assert.equal(ROLE_TEMPLATES[id].id, id);
    assert.ok(ROLE_TEMPLATES[id].label, `${id} needs a label`);
    assert.ok(ROLE_TEMPLATES[id].description, `${id} needs a description`);
    assert.ok(["OWNER", "MANAGER", "STAFF"].includes(ROLE_TEMPLATES[id].base));
  }
});

test("every template has a non-empty permission set drawn from the known grid", () => {
  for (const id of TEMPLATE_IDS) {
    const perms = permissionsForTemplate(id);
    assert.ok(perms.length > 0, `${id} must grant at least one permission`);
    assert.ok(perms.every((p) => /^[A-Z_]+$/.test(p)), `${id} has a malformed permission`);
  }
});

test("least privilege: cashier cannot edit products, manage employees or update settings", () => {
  for (const p of ["PRODUCT_CREATE", "PRODUCT_UPDATE", "PRODUCT_DELETE", "EMPLOYEE_MANAGE", "SETTINGS_UPDATE"]) {
    assert.equal(templateHasPermission("CASHIER", p), false, `cashier must not have ${p}`);
  }
  assert.equal(templateHasPermission("CASHIER", "SALE_CREATE"), true);
  assert.equal(templateHasPermission("CASHIER", "SHIFT_OPEN"), true);
});

test("auditor is read-only, salesperson is own-records scoped, owner has everything", () => {
  assert.equal(templateHasPermission("AUDITOR", "ACCOUNT_READ"), true);
  assert.equal(templateHasPermission("AUDITOR", "ACCOUNT_EDIT"), false);
  assert.equal(templateHasPermission("AUDITOR", "SALE_CREATE"), false);
  assert.equal(resolveEmployeeScope({ roleTemplate: "SALESPERSON" }), ACCESS_SCOPE.OWN_RECORDS);
  assert.equal(resolveEmployeeScope({ roleTemplate: "OWNER" }), ACCESS_SCOPE.ORGANIZATION);
  assert.equal(permissionsForTemplate("OWNER").length, permissionsForTemplate("HQ_ADMIN").length);
});

test("template base roles stay compatible with the stored BusinessRole enum", () => {
  for (const id of TEMPLATE_IDS) {
    assert.ok(["OWNER", "MANAGER", "STAFF"].includes(baseRoleForTemplate(id)));
  }
  assert.equal(defaultTemplateForBaseRole("OWNER"), "OWNER");
  assert.equal(defaultTemplateForBaseRole("MANAGER"), "BRANCH_MANAGER");
  assert.equal(defaultTemplateForBaseRole("STAFF"), "CASHIER");
  // Legacy employees (no template) keep the coarse-role default.
  assert.equal(resolveTemplateId({}, "MANAGER"), "BRANCH_MANAGER");
  assert.equal(resolveTemplateId({ roleTemplate: "FINANCE" }, "MANAGER"), "FINANCE");
});

test("role hierarchy prevents privilege escalation when assigning templates", () => {
  assert.equal(canAssignTemplate("OWNER", "HQ_ADMIN"), true);
  assert.equal(canAssignTemplate("OWNER", "OWNER"), true);
  assert.equal(canAssignTemplate("HQ_ADMIN", "OWNER"), false);
  assert.equal(canAssignTemplate("BRANCH_MANAGER", "HQ_ADMIN"), false);
  assert.equal(canAssignTemplate("BRANCH_MANAGER", "CASHIER"), true);
  assert.equal(canAssignTemplate("CASHIER", "SALESPERSON"), false);
  // Auditors are the lowest tier and cannot assign anyone.
  assert.deepEqual(assignableTemplates("AUDITOR"), []);
});

test("cross-tenant access is denied even when the employee has an organization-wide template", () => {
  const actor = {
    userId: "u1",
    businessIds: ["b1"],
    organizationIds: ["org1"],
    employee: { roleTemplate: "HQ_ADMIN" },
  };
  assert.equal(isWithinScope(actor, { businessId: "b1", organizationId: "org1" }), true);
  assert.equal(isWithinScope(actor, { businessId: "b2", organizationId: "org1" }), false);
  assert.equal(isWithinScope(actor, { businessId: "b2" }), false);
});

test("cross-branch access is denied for a branch-scoped manager", () => {
  const actor = {
    userId: "u1",
    businessIds: ["b1", "b2"],
    organizationIds: ["org1"],
    employee: { roleTemplate: "BRANCH_MANAGER", branchId: "b1" },
  };
  assert.equal(isWithinScope(actor, { businessId: "b1", branchId: "b1" }), true);
  assert.equal(isWithinScope(actor, { businessId: "b2", branchId: "b2" }), false);
  // An explicit branch override also confines the actor.
  assert.equal(
    isWithinScope(
      { ...actor, employee: { ...actor.employee, branchId: "b1" } },
      { businessId: "b2", branchId: "b1" }
    ),
    false
  );
});

test("warehouse and terminal scopes confine records to the assigned unit", () => {
  const wh = {
    userId: "u1",
    businessIds: ["b1"],
    employee: { roleTemplate: "WAREHOUSE", warehouseId: "wh1" },
  };
  assert.equal(isWithinScope(wh, { businessId: "b1", warehouseId: "wh1" }), true);
  assert.equal(isWithinScope(wh, { businessId: "b1", warehouseId: "wh2" }), false);
  assert.equal(isWithinScope(wh, { businessId: "b1" }), true); // legacy record without unit

  const cashier = {
    userId: "u1",
    businessIds: ["b1"],
    employee: { roleTemplate: "CASHIER", terminalId: "t1" },
  };
  assert.equal(isWithinScope(cashier, { businessId: "b1", terminalId: "t1" }), true);
  assert.equal(isWithinScope(cashier, { businessId: "b1", terminalId: "t2" }), false);
});

test("own-records scope confines reads and writes to the caller's own sales", () => {
  const actor = {
    userId: "u1",
    businessIds: ["b1"],
    employee: { roleTemplate: "SALESPERSON" },
  };
  assert.equal(isWithinScope(actor, { businessId: "b1", ownerId: "u1" }), true);
  assert.equal(isWithinScope(actor, { businessId: "b1", ownerId: "u2" }), false);
  assert.equal(isWithinScope(actor, { businessId: "b1" }), false); // missing owner is not "mine"

  // ownRecordsOnly overrides even an otherwise organization-wide template.
  assert.equal(
    resolveEmployeeScope({ roleTemplate: "HQ_ADMIN", ownRecordsOnly: true }),
    ACCESS_SCOPE.OWN_RECORDS
  );
});

test("offboarding and suspension revoke active access", () => {
  assert.equal(isEmployeeActive(null), true); // owner has no Employee profile
  assert.equal(isEmployeeActive({ isActive: true }), true);
  assert.equal(isEmployeeActive({ isActive: false }), false);
  // Deleting the membership removes the employee entirely; a stale token
  // cannot resolve a business from it (enforced in requireBusiness).
});

test("the documented permission matrix covers every template", async () => {
  const { readFileSync } = await import("node:fs");
  const doc = readFileSync(new URL("../../docs/architecture/rbac-matrix.md", import.meta.url), "utf8");
  for (const id of TEMPLATE_IDS) {
    assert.ok(doc.includes(`\`${id}\``), `matrix documentation must list ${id}`);
  }
  assert.ok(doc.includes("## Scope semantics"));
  assert.ok(doc.includes("## Audit"));
});
