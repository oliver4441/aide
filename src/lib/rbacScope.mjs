// AIDE-03: pure scope enforcement helpers.
//
// These functions encode the rule that a role's default scope and an
// employee's assigned scope bound what records may be read or written. They
// are DB-free so API routes and tests run the exact same logic. Authorization
// always happens server-side; UI visibility is never an input.

import { ACCESS_SCOPE, ROLE_TEMPLATES, permissionsForTemplate } from "./roleTemplates.mjs";

/**
 * Effective scope of an employee. Falls back to the template default, then to
 * BRANCH (the narrowest safe boundary) when neither is explicitly set.
 */
export function resolveEmployeeScope(employee) {
  if (!employee) return ACCESS_SCOPE.BRANCH;
  if (employee.ownRecordsOnly) return ACCESS_SCOPE.OWN_RECORDS;
  const explicit = employee.scopeType;
  if (explicit && Object.values(ACCESS_SCOPE).includes(explicit)) return explicit;
  const template = ROLE_TEMPLATES[employee.roleTemplate];
  return template?.scope ?? ACCESS_SCOPE.BRANCH;
}

/** The branch an employee is confined to, if any. */
export function scopedBranchId(employee, fallbackBusinessId) {
  return employee?.branchId ?? fallbackBusinessId ?? null;
}

/**
 * Decide whether `resource` is inside the employee's data boundary.
 *
 * resource: { businessId, organizationId?, branchId?, departmentId?,
 *             warehouseId?, terminalId?, ownerId? }
 * actor:    { userId, businessIds?, organizationIds?, employee }
 */
export function isWithinScope(actor, resource) {
  if (!actor || !resource) return false;

  // Tenant boundary first, always. An accessible business id is mandatory.
  const businessIds = actor.businessIds ?? [];
  if (!resource.businessId || !businessIds.includes(resource.businessId)) return false;

  const employee = actor.employee;
  const scope = resolveEmployeeScope(employee);

  if (scope === ACCESS_SCOPE.ORGANIZATION) {
    if (!resource.organizationId) return true; // legacy resource without org: business check suffices
    const orgs = actor.organizationIds ?? [];
    return orgs.includes(resource.organizationId);
  }
  if (scope === ACCESS_SCOPE.BRANCH) {
    const branch = scopedBranchId(employee, resource.businessId);
    // The record's tenant must be the scoped branch itself; a resource from
    // another business that merely carries the same branch label is denied.
    if (resource.businessId !== branch) return false;
    return !resource.branchId || resource.branchId === branch;
  }
  if (scope === ACCESS_SCOPE.DEPARTMENT) {
    if (!employee?.departmentId) return false;
    return !resource.departmentId || resource.departmentId === employee.departmentId;
  }
  if (scope === ACCESS_SCOPE.WAREHOUSE) {
    if (!employee?.warehouseId) return false;
    return !resource.warehouseId || resource.warehouseId === employee.warehouseId;
  }
  if (scope === ACCESS_SCOPE.TERMINAL) {
    if (!employee?.terminalId) return false;
    return !resource.terminalId || resource.terminalId === employee.terminalId;
  }
  if (scope === ACCESS_SCOPE.OWN_RECORDS) {
    const owner = resource.ownerId ?? null;
    return owner === actor.userId;
  }
  return false;
}

/**
 * Effective permission for a caller. An explicit template is authoritative;
 * otherwise the caller's coarse BusinessRole permissions apply (handled by
 * the caller via hasPermission).
 */
export function effectivePermissions(employee) {
  return permissionsForTemplate(employee?.roleTemplate);
}

/**
 * Offboarding/suspension rule. A missing Employee profile (the business
 * owner) is active by default; an existing profile is active only when its
 * isActive flag is true. Pure so the revocation rule is directly testable.
 */
export function isEmployeeActive(employee) {
  return !employee || employee.isActive !== false;
}

export { ACCESS_SCOPE };
