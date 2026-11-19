import { BusinessRole } from "@prisma/client";

/**
 * AIDE-03: Permission enum values (mirrors Prisma Permission enum).
 * Defined here so the RBAC library compiles before the migration runs.
 */
export const Permission = {
  SALE_CREATE: "SALE_CREATE",
  SALE_READ: "SALE_READ",
  SALE_DELETE: "SALE_DELETE",
  SALE_REFUND: "SALE_REFUND",
  PRODUCT_CREATE: "PRODUCT_CREATE",
  PRODUCT_READ: "PRODUCT_READ",
  PRODUCT_UPDATE: "PRODUCT_UPDATE",
  PRODUCT_DELETE: "PRODUCT_DELETE",
  CUSTOMER_CREATE: "CUSTOMER_CREATE",
  CUSTOMER_READ: "CUSTOMER_READ",
  CUSTOMER_UPDATE: "CUSTOMER_UPDATE",
  CUSTOMER_DELETE: "CUSTOMER_DELETE",
  ACCOUNT_READ: "ACCOUNT_READ",
  ACCOUNT_EDIT: "ACCOUNT_EDIT",
  JOURNAL_CREATE: "JOURNAL_CREATE",
  JOURNAL_READ: "JOURNAL_READ",
  REPORT_READ: "REPORT_READ",
  REPORT_EXPORT: "REPORT_EXPORT",
  SETTINGS_READ: "SETTINGS_READ",
  SETTINGS_UPDATE: "SETTINGS_UPDATE",
  EMPLOYEE_INVITE: "EMPLOYEE_INVITE",
  EMPLOYEE_MANAGE: "EMPLOYEE_MANAGE",
  SHIFT_MANAGE: "SHIFT_MANAGE",
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

/**
 * AIDE-03: Role-based access control.
 *
 * Maps BusinessRole (OWNER, MANAGER, STAFF) to granular Permission values.
 * Used by API routes to check whether a user may perform an action.
 */

export const ROLE_PERMISSIONS: Record<BusinessRole, Permission[]> = {
  OWNER: [
    // Full access
    Permission.SALE_CREATE,
    Permission.SALE_READ,
    Permission.SALE_DELETE,
    Permission.SALE_REFUND,
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_READ,
    Permission.PRODUCT_UPDATE,
    Permission.PRODUCT_DELETE,
    Permission.CUSTOMER_CREATE,
    Permission.CUSTOMER_READ,
    Permission.CUSTOMER_UPDATE,
    Permission.CUSTOMER_DELETE,
    Permission.ACCOUNT_READ,
    Permission.ACCOUNT_EDIT,
    Permission.JOURNAL_CREATE,
    Permission.JOURNAL_READ,
    Permission.REPORT_READ,
    Permission.REPORT_EXPORT,
    Permission.SETTINGS_READ,
    Permission.SETTINGS_UPDATE,
    Permission.EMPLOYEE_INVITE,
    Permission.EMPLOYEE_MANAGE,
    Permission.SHIFT_MANAGE,
  ],
  MANAGER: [
    // Can manage sales, products, customers, reports — but not employees or settings
    Permission.SALE_CREATE,
    Permission.SALE_READ,
    Permission.SALE_DELETE,
    Permission.SALE_REFUND,
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_READ,
    Permission.PRODUCT_UPDATE,
    Permission.PRODUCT_DELETE,
    Permission.CUSTOMER_CREATE,
    Permission.CUSTOMER_READ,
    Permission.CUSTOMER_UPDATE,
    Permission.CUSTOMER_DELETE,
    Permission.ACCOUNT_READ,
    Permission.JOURNAL_READ,
    Permission.REPORT_READ,
    Permission.REPORT_EXPORT,
    Permission.SETTINGS_READ,
    Permission.SHIFT_MANAGE,
  ],
  STAFF: [
    // Limited to creating and reading sales, reading products
    Permission.SALE_CREATE,
    Permission.SALE_READ,
    Permission.PRODUCT_READ,
    Permission.CUSTOMER_READ,
    Permission.ACCOUNT_READ,
    Permission.JOURNAL_READ,
    Permission.REPORT_READ,
  ],
};

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: BusinessRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has all of the given permissions.
 */
export function hasAllPermissions(role: BusinessRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Check if a role has any of the given permissions.
 */
export function hasAnyPermission(role: BusinessRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Role hierarchy — higher roles can manage lower roles.
 * OWNER > MANAGER > STAFF
 */
const ROLE_LEVEL: Record<BusinessRole, number> = {
  OWNER: 3,
  MANAGER: 2,
  STAFF: 1,
};

/**
 * Check if `managerRole` can manage users with `targetRole`.
 * A role can manage roles strictly below it.
 */
export function canManageRole(managerRole: BusinessRole, targetRole: BusinessRole): boolean {
  return ROLE_LEVEL[managerRole] > ROLE_LEVEL[targetRole];
}
