// AIDE-03: canonical business role templates.
//
// The database stores a coarse `BusinessRole` (OWNER / MANAGER / STAFF) on
// BusinessMembership. A template is the fine-grained overlay the issue asks
// for: a named job function, an exact permission set, a default access scope,
// and a place in the management hierarchy.
//
// This module is deliberately pure (no Prisma/Next imports) so the same
// matrix is used by API routes, invitation creation, and unit tests. Keeping
// templates out of the Prisma enum avoids a destructive enum migration and
// keeps the sync engine's persisted role values stable.

export const ACCESS_SCOPE = Object.freeze({
  ORGANIZATION: "ORGANIZATION",
  BRANCH: "BRANCH",
  DEPARTMENT: "DEPARTMENT",
  WAREHOUSE: "WAREHOUSE",
  TERMINAL: "TERMINAL",
  OWN_RECORDS: "OWN_RECORDS",
});

/** Management tiers. Higher tiers may manage strictly lower tiers. */
export const ROLE_TIER = Object.freeze({
  OWNER: 4,
  ADMIN: 3,
  MANAGER: 2,
  STAFF: 1,
  AUDIT: 0,
});

/**
 * The 12 templates named in AIDE-03 plus OWNER (13 total). Each `base` is the
 * BusinessRole persisted on the membership; `permissions` are granular
 * Permission enum values; `scope` is the default data boundary.
 */
export const ROLE_TEMPLATES = Object.freeze({
  OWNER: Object.freeze({
    id: "OWNER",
    label: "Owner",
    description: "Full, unrestricted access to the organization.",
    base: "OWNER",
    tier: ROLE_TIER.OWNER,
    scope: ACCESS_SCOPE.ORGANIZATION,
    permissions: "ALL",
  }),
  HQ_ADMIN: Object.freeze({
    id: "HQ_ADMIN",
    label: "HQ admin",
    description: "Organization-wide administration except ownership transfer.",
    base: "MANAGER",
    tier: ROLE_TIER.ADMIN,
    scope: ACCESS_SCOPE.ORGANIZATION,
    permissions: "ADMIN",
  }),
  FINANCE: Object.freeze({
    id: "FINANCE",
    label: "Finance",
    description: "Accounts, journal, payments and financial reports.",
    base: "MANAGER",
    tier: ROLE_TIER.MANAGER,
    scope: ACCESS_SCOPE.ORGANIZATION,
    permissions: "FINANCE",
  }),
  ACCOUNTANT: Object.freeze({
    id: "ACCOUNTANT",
    label: "Accountant",
    description: "Read and prepare accounting records and reports.",
    base: "STAFF",
    tier: ROLE_TIER.STAFF,
    scope: ACCESS_SCOPE.ORGANIZATION,
    permissions: "ACCOUNTANT",
  }),
  BRANCH_MANAGER: Object.freeze({
    id: "BRANCH_MANAGER",
    label: "Branch/store manager",
    description: "Runs one branch or store, including its staff and stock.",
    base: "MANAGER",
    tier: ROLE_TIER.MANAGER,
    scope: ACCESS_SCOPE.BRANCH,
    permissions: "BRANCH_MANAGER",
  }),
  STORE_MANAGER: Object.freeze({
    id: "STORE_MANAGER",
    label: "Store manager",
    description: "Runs a single store; narrower purchasing than branch manager.",
    base: "MANAGER",
    tier: ROLE_TIER.MANAGER,
    scope: ACCESS_SCOPE.BRANCH,
    permissions: "STORE_MANAGER",
  }),
  PROCUREMENT: Object.freeze({
    id: "PROCUREMENT",
    label: "Procurement",
    description: "Suppliers, purchase orders and goods receiving.",
    base: "STAFF",
    tier: ROLE_TIER.STAFF,
    scope: ACCESS_SCOPE.ORGANIZATION,
    permissions: "PROCUREMENT",
  }),
  INVENTORY: Object.freeze({
    id: "INVENTORY",
    label: "Inventory controller",
    description: "Product catalogue, stock adjustments and counts.",
    base: "STAFF",
    tier: ROLE_TIER.STAFF,
    scope: ACCESS_SCOPE.WAREHOUSE,
    permissions: "INVENTORY",
  }),
  WAREHOUSE: Object.freeze({
    id: "WAREHOUSE",
    label: "Warehouse operator",
    description: "Receives goods and moves stock within a warehouse.",
    base: "STAFF",
    tier: ROLE_TIER.STAFF,
    scope: ACCESS_SCOPE.WAREHOUSE,
    permissions: "WAREHOUSE",
  }),
  CASHIER: Object.freeze({
    id: "CASHIER",
    label: "Cashier",
    description: "Sells at one terminal, opens/closes shifts, no back-office.",
    base: "STAFF",
    tier: ROLE_TIER.STAFF,
    scope: ACCESS_SCOPE.TERMINAL,
    permissions: "CASHIER",
  }),
  CASH_OFFICE: Object.freeze({
    id: "CASH_OFFICE",
    label: "Cash office",
    description: "Reconciles cash drawers, shifts and refunds.",
    base: "STAFF",
    tier: ROLE_TIER.STAFF,
    scope: ACCESS_SCOPE.BRANCH,
    permissions: "CASH_OFFICE",
  }),
  SALESPERSON: Object.freeze({
    id: "SALESPERSON",
    label: "Salesperson",
    description: "Creates sales and manages only their own customers.",
    base: "STAFF",
    tier: ROLE_TIER.STAFF,
    scope: ACCESS_SCOPE.OWN_RECORDS,
    permissions: "SALESPERSON",
  }),
  AUDITOR: Object.freeze({
    id: "AUDITOR",
    label: "Auditor",
    description: "Read-only access to records, reports and the audit trail.",
    base: "STAFF",
    tier: ROLE_TIER.AUDIT,
    scope: ACCESS_SCOPE.ORGANIZATION,
    permissions: "AUDITOR",
  }),
});

/** All granular permission values (kept in sync with Prisma `Permission`). */
const ALL_PERMISSIONS = Object.freeze([
  "SALE_CREATE", "SALE_READ", "SALE_DELETE", "SALE_REFUND",
  "PRODUCT_CREATE", "PRODUCT_READ", "PRODUCT_UPDATE", "PRODUCT_DELETE",
  "CUSTOMER_CREATE", "CUSTOMER_READ", "CUSTOMER_UPDATE", "CUSTOMER_DELETE",
  "SUPPLIER_CREATE", "SUPPLIER_READ", "SUPPLIER_UPDATE", "SUPPLIER_DELETE",
  "PURCHASE_ORDER_CREATE", "PURCHASE_ORDER_READ", "PURCHASE_ORDER_UPDATE", "GOODS_RECEIVE",
  "SUPPLIER_INVOICE_CREATE", "SUPPLIER_INVOICE_READ", "SUPPLIER_INVOICE_UPDATE",
  "SUPPLIER_PAYMENT_CREATE", "SUPPLIER_PAYMENT_READ",
  "ACCOUNT_READ", "ACCOUNT_EDIT", "JOURNAL_CREATE", "JOURNAL_READ",
  "REPORT_READ", "REPORT_EXPORT", "SETTINGS_READ", "SETTINGS_UPDATE",
  "EMPLOYEE_INVITE", "EMPLOYEE_MANAGE", "SHIFT_MANAGE",
  "STOCK_ADJUST_CREATE", "STOCK_ADJUST_READ",
  "SHIFT_OPEN", "SHIFT_CLOSE", "REFUND_CREATE", "REFUND_READ",
]);

/** Least-privilege permission sets for each template. */
const PERMISSION_SETS = Object.freeze({
  ADMIN: ALL_PERMISSIONS,
  FINANCE: Object.freeze([
    "SALE_READ", "CUSTOMER_READ", "ACCOUNT_READ", "ACCOUNT_EDIT",
    "JOURNAL_CREATE", "JOURNAL_READ", "REPORT_READ", "REPORT_EXPORT",
    "SETTINGS_READ", "SUPPLIER_INVOICE_READ", "SUPPLIER_PAYMENT_READ",
    "SUPPLIER_PAYMENT_CREATE", "REFUND_READ",
  ]),
  ACCOUNTANT: Object.freeze([
    "SALE_READ", "CUSTOMER_READ", "ACCOUNT_READ", "JOURNAL_READ",
    "REPORT_READ", "REPORT_EXPORT", "SETTINGS_READ",
    "SUPPLIER_INVOICE_READ", "SUPPLIER_PAYMENT_READ", "REFUND_READ",
  ]),
  BRANCH_MANAGER: Object.freeze([
    "SALE_CREATE", "SALE_READ", "SALE_DELETE", "SALE_REFUND",
    "PRODUCT_CREATE", "PRODUCT_READ", "PRODUCT_UPDATE", "PRODUCT_DELETE",
    "CUSTOMER_CREATE", "CUSTOMER_READ", "CUSTOMER_UPDATE", "CUSTOMER_DELETE",
    "SUPPLIER_READ", "PURCHASE_ORDER_CREATE", "PURCHASE_ORDER_READ", "PURCHASE_ORDER_UPDATE",
    "GOODS_RECEIVE", "SUPPLIER_INVOICE_READ", "SUPPLIER_PAYMENT_READ",
    "ACCOUNT_READ", "JOURNAL_READ", "REPORT_READ", "REPORT_EXPORT",
    "SETTINGS_READ", "EMPLOYEE_INVITE", "EMPLOYEE_MANAGE", "SHIFT_MANAGE",
    "STOCK_ADJUST_CREATE", "STOCK_ADJUST_READ", "SHIFT_OPEN", "SHIFT_CLOSE",
    "REFUND_CREATE", "REFUND_READ",
  ]),
  STORE_MANAGER: Object.freeze([
    "SALE_CREATE", "SALE_READ", "SALE_DELETE", "SALE_REFUND",
    "PRODUCT_CREATE", "PRODUCT_READ", "PRODUCT_UPDATE", "PRODUCT_DELETE",
    "CUSTOMER_CREATE", "CUSTOMER_READ", "CUSTOMER_UPDATE",
    "SUPPLIER_READ", "PURCHASE_ORDER_READ", "GOODS_RECEIVE",
    "ACCOUNT_READ", "REPORT_READ", "REPORT_EXPORT", "SETTINGS_READ",
    "SHIFT_MANAGE", "STOCK_ADJUST_CREATE", "STOCK_ADJUST_READ",
    "SHIFT_OPEN", "SHIFT_CLOSE", "REFUND_CREATE", "REFUND_READ",
  ]),
  PROCUREMENT: Object.freeze([
    "PRODUCT_READ", "SUPPLIER_CREATE", "SUPPLIER_READ", "SUPPLIER_UPDATE",
    "PURCHASE_ORDER_CREATE", "PURCHASE_ORDER_READ", "PURCHASE_ORDER_UPDATE",
    "GOODS_RECEIVE", "SUPPLIER_INVOICE_READ", "SUPPLIER_PAYMENT_READ",
    "REPORT_READ", "SETTINGS_READ", "STOCK_ADJUST_READ",
  ]),
  INVENTORY: Object.freeze([
    "PRODUCT_CREATE", "PRODUCT_READ", "PRODUCT_UPDATE", "PRODUCT_DELETE",
    "PURCHASE_ORDER_READ", "GOODS_RECEIVE", "STOCK_ADJUST_CREATE",
    "STOCK_ADJUST_READ", "REPORT_READ", "SETTINGS_READ",
  ]),
  WAREHOUSE: Object.freeze([
    "PRODUCT_READ", "PURCHASE_ORDER_READ", "GOODS_RECEIVE",
    "STOCK_ADJUST_CREATE", "STOCK_ADJUST_READ", "REPORT_READ", "SETTINGS_READ",
  ]),
  CASHIER: Object.freeze([
    "SALE_CREATE", "SALE_READ", "PRODUCT_READ", "CUSTOMER_READ", "CUSTOMER_CREATE",
    "SHIFT_OPEN", "SHIFT_CLOSE", "REPORT_READ", "SETTINGS_READ", "REFUND_READ",
  ]),
  CASH_OFFICE: Object.freeze([
    "SALE_READ", "SHIFT_MANAGE", "SHIFT_OPEN", "SHIFT_CLOSE",
    "REFUND_CREATE", "REFUND_READ", "ACCOUNT_READ", "REPORT_READ",
    "REPORT_EXPORT", "SETTINGS_READ", "CUSTOMER_READ",
  ]),
  SALESPERSON: Object.freeze([
    "SALE_CREATE", "SALE_READ", "PRODUCT_READ", "CUSTOMER_READ", "CUSTOMER_CREATE",
    "CUSTOMER_UPDATE", "REPORT_READ", "SETTINGS_READ", "REFUND_READ",
  ]),
  AUDITOR: Object.freeze([
    "SALE_READ", "PRODUCT_READ", "CUSTOMER_READ", "SUPPLIER_READ",
    "PURCHASE_ORDER_READ", "SUPPLIER_INVOICE_READ", "SUPPLIER_PAYMENT_READ",
    "ACCOUNT_READ", "JOURNAL_READ", "REPORT_READ", "REPORT_EXPORT",
    "SETTINGS_READ", "STOCK_ADJUST_READ", "SHIFT_MANAGE", "REFUND_READ",
  ]),
});

/** Resolve a template's exact permission list (frozen, stable order). */
export function permissionsForTemplate(templateId) {
  const template = ROLE_TEMPLATES[templateId];
  if (!template) return Object.freeze([]);
  if (template.permissions === "ALL") return ALL_PERMISSIONS;
  return PERMISSION_SETS[template.permissions] ?? Object.freeze([]);
}

/** Does the named template hold `permission`? */
export function templateHasPermission(templateId, permission) {
  return permissionsForTemplate(templateId).includes(permission);
}

/** Templates whose default scope is limited to the caller's own records. */
export function isOwnRecordsOnly(templateId) {
  return ROLE_TEMPLATES[templateId]?.scope === ACCESS_SCOPE.OWN_RECORDS;
}

/** The database BusinessRole a template maps to. */
export function baseRoleForTemplate(templateId) {
  return ROLE_TEMPLATES[templateId]?.base ?? null;
}

/**
 * Templates a caller may assign. AUDITOR and OWNER can only be assigned by an
 * owner; a caller cannot assign a template at or above their own tier.
 */
export function assignableTemplates(callerTemplateId) {
  const caller = ROLE_TEMPLATES[callerTemplateId];
  if (!caller) return Object.freeze([]);
  const allowed = Object.values(ROLE_TEMPLATES)
    .filter((t) => t.tier < caller.tier)
    .map((t) => t.id);
  return Object.freeze(allowed);
}

export function canAssignTemplate(callerTemplateId, targetTemplateId) {
  if (callerTemplateId === "OWNER" && targetTemplateId === "OWNER") return true;
  return assignableTemplates(callerTemplateId).includes(targetTemplateId);
}

/** All template ids — handy for validation and documentation tests. */
export const TEMPLATE_IDS = Object.freeze(Object.keys(ROLE_TEMPLATES));

/** Legacy callers with no assigned template inherit this template's tier. */
export function defaultTemplateForBaseRole(baseRole) {
  switch (baseRole) {
    case "OWNER":
      return "OWNER";
    case "MANAGER":
      return "BRANCH_MANAGER";
    case "STAFF":
      return "CASHIER";
    default:
      return null;
  }
}

/** Resolve the effective template id for an employee/membership pair. */
export function resolveTemplateId(employee, baseRole) {
  if (employee?.roleTemplate && ROLE_TEMPLATES[employee.roleTemplate]) {
    return employee.roleTemplate;
  }
  return defaultTemplateForBaseRole(baseRole);
}
