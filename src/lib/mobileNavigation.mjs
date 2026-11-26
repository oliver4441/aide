// AIDE-ANDROID-06: Authoritative server-side mobile role, permission, and
// task-oriented navigation policy.
// Kept pure (no Prisma/Next runtime imports) so both API routes and automated
// unit tests evaluate the exact same invariants.

export const MOBILE_ROLES = Object.freeze({
  OWNER_ADMIN: "OWNER_ADMIN",
  BRANCH_MANAGER: "BRANCH_MANAGER",
  CASHIER: "CASHIER",
  WAREHOUSE_OPERATOR: "WAREHOUSE_OPERATOR",
  RECEIVING_CLERK: "RECEIVING_CLERK",
  INVENTORY_CONTROLLER: "INVENTORY_CONTROLLER",
  ACCOUNTANT: "ACCOUNTANT",
});

export const MOBILE_PERMISSIONS = Object.freeze({
  SALE_CREATE: "SALE_CREATE",
  SALE_READ: "SALE_READ",
  SALE_REFUND: "SALE_REFUND",
  SHIFT_OPEN: "SHIFT_OPEN",
  SHIFT_CLOSE: "SHIFT_CLOSE",
  SHIFT_MANAGE: "SHIFT_MANAGE",
  PRODUCT_READ: "PRODUCT_READ",
  PRODUCT_CREATE: "PRODUCT_CREATE",
  PRODUCT_UPDATE: "PRODUCT_UPDATE",
  PRODUCT_DELETE: "PRODUCT_DELETE",
  GOODS_RECEIVE: "GOODS_RECEIVE",
  PURCHASE_ORDER_READ: "PURCHASE_ORDER_READ",
  STOCK_COUNT_PERFORM: "STOCK_COUNT_PERFORM",
  STOCK_ADJUST_CREATE: "STOCK_ADJUST_CREATE",
  STOCK_ADJUST_READ: "STOCK_ADJUST_READ",
  CUSTOMER_READ: "CUSTOMER_READ",
  CUSTOMER_CREATE: "CUSTOMER_CREATE",
  CUSTOMER_UPDATE: "CUSTOMER_UPDATE",
  CUSTOMER_DELETE: "CUSTOMER_DELETE",
  EXPENSE_READ: "EXPENSE_READ",
  EXPENSE_CREATE: "EXPENSE_CREATE",
  ACCOUNT_READ: "ACCOUNT_READ",
  JOURNAL_READ: "JOURNAL_READ",
  REPORT_READ: "REPORT_READ",
  REPORT_EXPORT: "REPORT_EXPORT",
  TASK_VIEW: "TASK_VIEW",
  TASK_COMPLETE: "TASK_COMPLETE",
  APPROVAL_REQUEST: "APPROVAL_REQUEST",
  APPROVAL_DECIDE: "APPROVAL_DECIDE",
  SETTINGS_READ: "SETTINGS_READ",
  SETTINGS_UPDATE: "SETTINGS_UPDATE",
  CONTEXT_SWITCH: "CONTEXT_SWITCH",
});

/** Canonical permission templates per mobile employee persona. */
export const MOBILE_ROLE_PERMISSIONS = Object.freeze({
  [MOBILE_ROLES.OWNER_ADMIN]: Object.freeze(Object.values(MOBILE_PERMISSIONS)),
  [MOBILE_ROLES.BRANCH_MANAGER]: Object.freeze([
    MOBILE_PERMISSIONS.SALE_CREATE,
    MOBILE_PERMISSIONS.SALE_READ,
    MOBILE_PERMISSIONS.SALE_REFUND,
    MOBILE_PERMISSIONS.SHIFT_OPEN,
    MOBILE_PERMISSIONS.SHIFT_CLOSE,
    MOBILE_PERMISSIONS.SHIFT_MANAGE,
    MOBILE_PERMISSIONS.PRODUCT_READ,
    MOBILE_PERMISSIONS.PRODUCT_CREATE,
    MOBILE_PERMISSIONS.PRODUCT_UPDATE,
    MOBILE_PERMISSIONS.GOODS_RECEIVE,
    MOBILE_PERMISSIONS.PURCHASE_ORDER_READ,
    MOBILE_PERMISSIONS.STOCK_COUNT_PERFORM,
    MOBILE_PERMISSIONS.STOCK_ADJUST_CREATE,
    MOBILE_PERMISSIONS.STOCK_ADJUST_READ,
    MOBILE_PERMISSIONS.CUSTOMER_READ,
    MOBILE_PERMISSIONS.CUSTOMER_CREATE,
    MOBILE_PERMISSIONS.CUSTOMER_UPDATE,
    MOBILE_PERMISSIONS.EXPENSE_READ,
    MOBILE_PERMISSIONS.EXPENSE_CREATE,
    MOBILE_PERMISSIONS.ACCOUNT_READ,
    MOBILE_PERMISSIONS.JOURNAL_READ,
    MOBILE_PERMISSIONS.REPORT_READ,
    MOBILE_PERMISSIONS.REPORT_EXPORT,
    MOBILE_PERMISSIONS.TASK_VIEW,
    MOBILE_PERMISSIONS.TASK_COMPLETE,
    MOBILE_PERMISSIONS.APPROVAL_REQUEST,
    MOBILE_PERMISSIONS.APPROVAL_DECIDE,
    MOBILE_PERMISSIONS.SETTINGS_READ,
    MOBILE_PERMISSIONS.CONTEXT_SWITCH,
  ]),
  [MOBILE_ROLES.CASHIER]: Object.freeze([
    MOBILE_PERMISSIONS.SALE_CREATE,
    MOBILE_PERMISSIONS.SALE_READ,
    MOBILE_PERMISSIONS.SHIFT_OPEN,
    MOBILE_PERMISSIONS.SHIFT_CLOSE,
    MOBILE_PERMISSIONS.PRODUCT_READ,
    MOBILE_PERMISSIONS.CUSTOMER_READ,
    MOBILE_PERMISSIONS.CUSTOMER_CREATE,
    MOBILE_PERMISSIONS.TASK_VIEW,
    MOBILE_PERMISSIONS.TASK_COMPLETE,
    MOBILE_PERMISSIONS.APPROVAL_REQUEST,
    MOBILE_PERMISSIONS.SETTINGS_READ,
    MOBILE_PERMISSIONS.CONTEXT_SWITCH,
  ]),
  [MOBILE_ROLES.WAREHOUSE_OPERATOR]: Object.freeze([
    MOBILE_PERMISSIONS.PRODUCT_READ,
    MOBILE_PERMISSIONS.GOODS_RECEIVE,
    MOBILE_PERMISSIONS.PURCHASE_ORDER_READ,
    MOBILE_PERMISSIONS.STOCK_COUNT_PERFORM,
    MOBILE_PERMISSIONS.STOCK_ADJUST_READ,
    MOBILE_PERMISSIONS.TASK_VIEW,
    MOBILE_PERMISSIONS.TASK_COMPLETE,
    MOBILE_PERMISSIONS.APPROVAL_REQUEST,
    MOBILE_PERMISSIONS.SETTINGS_READ,
    MOBILE_PERMISSIONS.CONTEXT_SWITCH,
  ]),
  [MOBILE_ROLES.RECEIVING_CLERK]: Object.freeze([
    MOBILE_PERMISSIONS.PRODUCT_READ,
    MOBILE_PERMISSIONS.GOODS_RECEIVE,
    MOBILE_PERMISSIONS.PURCHASE_ORDER_READ,
    MOBILE_PERMISSIONS.TASK_VIEW,
    MOBILE_PERMISSIONS.TASK_COMPLETE,
    MOBILE_PERMISSIONS.APPROVAL_REQUEST,
    MOBILE_PERMISSIONS.SETTINGS_READ,
    MOBILE_PERMISSIONS.CONTEXT_SWITCH,
  ]),
  [MOBILE_ROLES.INVENTORY_CONTROLLER]: Object.freeze([
    MOBILE_PERMISSIONS.PRODUCT_READ,
    MOBILE_PERMISSIONS.PRODUCT_CREATE,
    MOBILE_PERMISSIONS.PRODUCT_UPDATE,
    MOBILE_PERMISSIONS.GOODS_RECEIVE,
    MOBILE_PERMISSIONS.PURCHASE_ORDER_READ,
    MOBILE_PERMISSIONS.STOCK_COUNT_PERFORM,
    MOBILE_PERMISSIONS.STOCK_ADJUST_CREATE,
    MOBILE_PERMISSIONS.STOCK_ADJUST_READ,
    MOBILE_PERMISSIONS.TASK_VIEW,
    MOBILE_PERMISSIONS.TASK_COMPLETE,
    MOBILE_PERMISSIONS.APPROVAL_REQUEST,
    MOBILE_PERMISSIONS.SETTINGS_READ,
    MOBILE_PERMISSIONS.CONTEXT_SWITCH,
  ]),
  [MOBILE_ROLES.ACCOUNTANT]: Object.freeze([
    MOBILE_PERMISSIONS.SALE_READ,
    MOBILE_PERMISSIONS.SHIFT_MANAGE,
    MOBILE_PERMISSIONS.PRODUCT_READ,
    MOBILE_PERMISSIONS.PURCHASE_ORDER_READ,
    MOBILE_PERMISSIONS.STOCK_ADJUST_READ,
    MOBILE_PERMISSIONS.CUSTOMER_READ,
    MOBILE_PERMISSIONS.EXPENSE_READ,
    MOBILE_PERMISSIONS.EXPENSE_CREATE,
    MOBILE_PERMISSIONS.ACCOUNT_READ,
    MOBILE_PERMISSIONS.JOURNAL_READ,
    MOBILE_PERMISSIONS.REPORT_READ,
    MOBILE_PERMISSIONS.REPORT_EXPORT,
    MOBILE_PERMISSIONS.TASK_VIEW,
    MOBILE_PERMISSIONS.TASK_COMPLETE,
    MOBILE_PERMISSIONS.APPROVAL_REQUEST,
    MOBILE_PERMISSIONS.SETTINGS_READ,
    MOBILE_PERMISSIONS.CONTEXT_SWITCH,
  ]),
});

export const MOBILE_DESTINATIONS = Object.freeze({
  home: {
    route: "home",
    label: "Home",
    group: "PRIMARY",
    requiredAny: [],
  },
  sell: {
    route: "sell",
    label: "Sell",
    group: "DAILY_OPERATIONS",
    requiredAny: [MOBILE_PERMISSIONS.SALE_CREATE],
  },
  stock: {
    route: "stock",
    label: "Stock",
    group: "DAILY_OPERATIONS",
    requiredAny: [MOBILE_PERMISSIONS.PRODUCT_CREATE, MOBILE_PERMISSIONS.PRODUCT_UPDATE],
  },
  lookup: {
    route: "lookup",
    label: "Lookup",
    group: "DAILY_OPERATIONS",
    requiredAny: [MOBILE_PERMISSIONS.PRODUCT_READ],
  },
  "receive-goods": {
    route: "receive-goods",
    label: "Receive",
    group: "DAILY_OPERATIONS",
    requiredAny: [MOBILE_PERMISSIONS.GOODS_RECEIVE],
  },
  "stock-count": {
    route: "stock-count",
    label: "Count",
    group: "DAILY_OPERATIONS",
    requiredAny: [MOBILE_PERMISSIONS.STOCK_COUNT_PERFORM, MOBILE_PERMISSIONS.STOCK_ADJUST_CREATE],
  },
  tasks: {
    route: "tasks",
    label: "Tasks",
    group: "DAILY_OPERATIONS",
    requiredAny: [MOBILE_PERMISSIONS.TASK_VIEW],
  },
  shifts: {
    route: "shifts",
    label: "Shift",
    group: "DAILY_OPERATIONS",
    requiredAny: [
      MOBILE_PERMISSIONS.SHIFT_OPEN,
      MOBILE_PERMISSIONS.SHIFT_CLOSE,
      MOBILE_PERMISSIONS.SHIFT_MANAGE,
    ],
  },
  approvals: {
    route: "approvals",
    label: "Approvals",
    group: "DAILY_OPERATIONS",
    requiredAny: [MOBILE_PERMISSIONS.APPROVAL_REQUEST, MOBILE_PERMISSIONS.APPROVAL_DECIDE],
  },
  customers: {
    route: "customers",
    label: "Customers",
    group: "CUSTOMERS_AND_FINANCE",
    requiredAny: [MOBILE_PERMISSIONS.CUSTOMER_READ],
  },
  expenses: {
    route: "expenses",
    label: "Expenses",
    group: "CUSTOMERS_AND_FINANCE",
    requiredAny: [MOBILE_PERMISSIONS.EXPENSE_READ, MOBILE_PERMISSIONS.EXPENSE_CREATE],
  },
  reports: {
    route: "reports",
    label: "Reports",
    group: "CUSTOMERS_AND_FINANCE",
    requiredAny: [MOBILE_PERMISSIONS.REPORT_READ],
  },
  calculator: {
    route: "calculator",
    label: "Margin Calculator",
    group: "CUSTOMERS_AND_FINANCE",
    requiredAny: [MOBILE_PERMISSIONS.PRODUCT_UPDATE, MOBILE_PERMISSIONS.REPORT_READ],
  },
  settings: {
    route: "settings",
    label: "Settings",
    group: "WORKSPACE_AND_DEVICE",
    requiredAny: [MOBILE_PERMISSIONS.SETTINGS_READ, MOBILE_PERMISSIONS.SETTINGS_UPDATE],
  },
  workspace: {
    route: "workspace",
    label: "Workspace",
    group: "PRIMARY",
    requiredAny: [MOBILE_PERMISSIONS.SETTINGS_READ, MOBILE_PERMISSIONS.TASK_VIEW],
  },
});

/** Preferred primary 4-tab bar order per persona (filtered by actual permissions). */
const PREFERRED_PRIMARY_TABS = Object.freeze({
  [MOBILE_ROLES.OWNER_ADMIN]: ["home", "sell", "stock", "workspace"],
  [MOBILE_ROLES.BRANCH_MANAGER]: ["home", "tasks", "sell", "workspace"],
  [MOBILE_ROLES.CASHIER]: ["home", "sell", "lookup", "shifts"],
  [MOBILE_ROLES.WAREHOUSE_OPERATOR]: ["home", "receive-goods", "stock-count", "tasks"],
  [MOBILE_ROLES.RECEIVING_CLERK]: ["home", "receive-goods", "lookup", "tasks"],
  [MOBILE_ROLES.INVENTORY_CONTROLLER]: ["home", "stock", "stock-count", "workspace"],
  [MOBILE_ROLES.ACCOUNTANT]: ["home", "reports", "expenses", "workspace"],
});

/** Ordered quick-action definitions per persona (filtered by actual permissions). */
const QUICK_ACTIONS = Object.freeze([
  {
    id: "START_SALE",
    label: "Start Sale",
    route: "sell",
    permission: MOBILE_PERMISSIONS.SALE_CREATE,
  },
  {
    id: "SCAN_SEARCH_PRODUCT",
    label: "Scan / Search Product",
    route: "lookup",
    permission: MOBILE_PERMISSIONS.PRODUCT_READ,
  },
  {
    id: "RECEIVE_GOODS",
    label: "Receive Goods",
    route: "receive-goods",
    permission: MOBILE_PERMISSIONS.GOODS_RECEIVE,
  },
  {
    id: "COUNT_STOCK",
    label: "Count Stock",
    route: "stock-count",
    permission: MOBILE_PERMISSIONS.STOCK_COUNT_PERFORM,
  },
  {
    id: "VIEW_ASSIGNED_TASKS",
    label: "View Assigned Tasks",
    route: "tasks",
    permission: MOBILE_PERMISSIONS.TASK_VIEW,
  },
  {
    id: "REVIEW_APPROVALS",
    label: "Review Approvals",
    route: "approvals",
    permission: MOBILE_PERMISSIONS.APPROVAL_DECIDE,
  },
  {
    id: "REQUEST_APPROVAL",
    label: "Request Approval",
    route: "approvals",
    permission: MOBILE_PERMISSIONS.APPROVAL_REQUEST,
  },
  {
    id: "CLOSE_OR_OPEN_SHIFT",
    label: "Open / Close Shift",
    route: "shifts",
    permission: MOBILE_PERMISSIONS.SHIFT_CLOSE,
  },
  {
    id: "VIEW_REPORTS",
    label: "Financial Reports",
    route: "reports",
    permission: MOBILE_PERMISSIONS.REPORT_READ,
  },
  {
    id: "RECORD_EXPENSE",
    label: "Record Expense",
    route: "expenses",
    permission: MOBILE_PERMISSIONS.EXPENSE_CREATE,
  },
]);

const ROLE_QUICK_ACTION_ORDER = Object.freeze({
  [MOBILE_ROLES.OWNER_ADMIN]: [
    "START_SALE",
    "REVIEW_APPROVALS",
    "SCAN_SEARCH_PRODUCT",
    "RECEIVE_GOODS",
    "COUNT_STOCK",
    "CLOSE_OR_OPEN_SHIFT",
  ],
  [MOBILE_ROLES.BRANCH_MANAGER]: [
    "REVIEW_APPROVALS",
    "START_SALE",
    "COUNT_STOCK",
    "RECEIVE_GOODS",
    "CLOSE_OR_OPEN_SHIFT",
    "VIEW_ASSIGNED_TASKS",
  ],
  [MOBILE_ROLES.CASHIER]: [
    "START_SALE",
    "SCAN_SEARCH_PRODUCT",
    "CLOSE_OR_OPEN_SHIFT",
    "REQUEST_APPROVAL",
    "VIEW_ASSIGNED_TASKS",
  ],
  [MOBILE_ROLES.WAREHOUSE_OPERATOR]: [
    "SCAN_SEARCH_PRODUCT",
    "RECEIVE_GOODS",
    "COUNT_STOCK",
    "VIEW_ASSIGNED_TASKS",
    "REQUEST_APPROVAL",
  ],
  [MOBILE_ROLES.RECEIVING_CLERK]: [
    "RECEIVE_GOODS",
    "SCAN_SEARCH_PRODUCT",
    "VIEW_ASSIGNED_TASKS",
    "REQUEST_APPROVAL",
  ],
  [MOBILE_ROLES.INVENTORY_CONTROLLER]: [
    "COUNT_STOCK",
    "SCAN_SEARCH_PRODUCT",
    "RECEIVE_GOODS",
    "VIEW_ASSIGNED_TASKS",
    "REQUEST_APPROVAL",
  ],
  [MOBILE_ROLES.ACCOUNTANT]: [
    "VIEW_REPORTS",
    "RECORD_EXPENSE",
    "VIEW_ASSIGNED_TASKS",
    "REQUEST_APPROVAL",
  ],
});

/**
 * Maps a database `BusinessRole` (`OWNER`, `MANAGER`, `STAFF`) plus an optional
 * requested mobile persona hint into a valid mobile role without allowing
 * privilege escalation beyond the database role ceiling.
 *
 * @param {string} businessRole
 * @param {string | null | undefined} [requestedPersona]
 * @returns {string}
 */
export function resolveMobileRoleFromMembership(businessRole, requestedPersona) {
  const normalized = typeof requestedPersona === "string" ? requestedPersona.trim().toUpperCase() : "";
  if (businessRole === "OWNER") {
    if (normalized && Object.values(MOBILE_ROLES).includes(normalized)) {
      return normalized;
    }
    return MOBILE_ROLES.OWNER_ADMIN;
  }
  if (businessRole === "MANAGER") {
    const allowedForManager = new Set([
      MOBILE_ROLES.BRANCH_MANAGER,
      MOBILE_ROLES.INVENTORY_CONTROLLER,
      MOBILE_ROLES.ACCOUNTANT,
      MOBILE_ROLES.WAREHOUSE_OPERATOR,
      MOBILE_ROLES.RECEIVING_CLERK,
      MOBILE_ROLES.CASHIER,
    ]);
    if (allowedForManager.has(normalized)) return normalized;
    return MOBILE_ROLES.BRANCH_MANAGER;
  }
  // STAFF ceiling: cannot escalate to OWNER_ADMIN or BRANCH_MANAGER.
  const allowedForStaff = new Set([
    MOBILE_ROLES.CASHIER,
    MOBILE_ROLES.WAREHOUSE_OPERATOR,
    MOBILE_ROLES.RECEIVING_CLERK,
  ]);
  if (allowedForStaff.has(normalized)) return normalized;
  return MOBILE_ROLES.CASHIER;
}

/**
 * Resolves effective permissions for a role, intersecting with any server-side
 * explicit grant overrides and failing closed when the membership is revoked.
 *
 * @param {string} mobileRole
 * @param {{ isRevoked?: boolean, allowedPermissions?: string[] | null, revokedPermissions?: string[] }} [options]
 * @returns {string[]}
 */
export function resolveEffectivePermissions(mobileRole, options = {}) {
  const { isRevoked = false, allowedPermissions = null, revokedPermissions = [] } = options;
  if (isRevoked) return [];

  const template = MOBILE_ROLE_PERMISSIONS[mobileRole] ?? [];
  const revokedSet = new Set(revokedPermissions);
  const base =
    Array.isArray(allowedPermissions)
      ? template.filter((p) => allowedPermissions.includes(p))
      : [...template];

  return base.filter((p) => !revokedSet.has(p));
}

export function canAccessDestination(permissions, route, isRevoked = false) {
  if (isRevoked) return false;
  const normalized = String(route || "").trim().toLowerCase();
  const alias = normalized === "more" ? "workspace" : normalized;

  if (alias.startsWith("receipt/")) {
    return permissions.includes(MOBILE_PERMISSIONS.SALE_CREATE) ||
      permissions.includes(MOBILE_PERMISSIONS.SALE_READ);
  }

  const dest = MOBILE_DESTINATIONS[alias];
  if (!dest) return false;
  if (dest.requiredAny.length === 0) return permissions.length > 0;
  return dest.requiredAny.some((perm) => permissions.includes(perm));
}

/**
 * Computes the complete permission-driven navigation contract for an active
 * employee membership context.
 *
 * @param {{
 *   role: string,
 *   permissions?: string[],
 *   isRevoked?: boolean,
 *   revokedReason?: string | null
 * }} input
 */
export function resolveMobileNavigation({
  role,
  permissions,
  isRevoked = false,
  revokedReason,
}) {
  const effectiveRole = Object.values(MOBILE_ROLES).includes(role)
    ? role
    : MOBILE_ROLES.CASHIER;
  const permList = isRevoked
    ? []
    : Array.isArray(permissions)
      ? permissions
      : resolveEffectivePermissions(effectiveRole);

  if (isRevoked || permList.length === 0) {
    return {
      role: effectiveRole,
      isBlocked: true,
      blockedReason:
        revokedReason || "Your access to this business workspace has been suspended or revoked.",
      permissions: [],
      primaryTabs: [],
      quickActions: [],
      workspaceGroups: [],
      allowedRoutes: [],
    };
  }

  const preferred = PREFERRED_PRIMARY_TABS[effectiveRole] || ["home", "tasks", "workspace"];
  const primaryTabs = preferred.filter((r) => canAccessDestination(permList, r, false));
  if (!primaryTabs.includes("home")) primaryTabs.unshift("home");
  if (!primaryTabs.includes("workspace") && primaryTabs.length < 4 && canAccessDestination(permList, "workspace", false)) {
    primaryTabs.push("workspace");
  }

  const allowedRoutes = Object.keys(MOBILE_DESTINATIONS).filter((r) =>
    canAccessDestination(permList, r, false)
  );

  const actionById = new Map(QUICK_ACTIONS.map((a) => [a.id, a]));
  const orderedIds = ROLE_QUICK_ACTION_ORDER[effectiveRole] || [];
  const quickActions = orderedIds
    .map((id) => actionById.get(id))
    .filter(
      (action) =>
        action &&
        permList.includes(action.permission) &&
        canAccessDestination(permList, action.route, false)
    );

  const groupMeta = [
    { id: "DAILY_OPERATIONS", title: "Store & Warehouse Operations" },
    { id: "CUSTOMERS_AND_FINANCE", title: "Customers & Finance" },
    { id: "WORKSPACE_AND_DEVICE", title: "Workspace & Device" },
  ];

  const workspaceGroups = groupMeta
    .map((group) => ({
      id: group.id,
      title: group.title,
      destinations: Object.values(MOBILE_DESTINATIONS)
        .filter(
          (d) =>
            d.group === group.id &&
            canAccessDestination(permList, d.route, false)
        )
        .map((d) => ({ route: d.route, label: d.label })),
    }))
    .filter((g) => g.destinations.length > 0);

  return {
    role: effectiveRole,
    isBlocked: false,
    blockedReason: null,
    permissions: permList,
    primaryTabs,
    quickActions,
    workspaceGroups,
    allowedRoutes,
  };
}

/**
 * Server-side independent authorization check for mobile mutations.
 * Fails closed when membership is missing, suspended/revoked, mismatched
 * against the active business scope, or missing the required permission.
 *
 * @param {{
 *   membership: { businessId?: string, permissions?: string[], isRevoked?: boolean, employeeActive?: boolean } | null | undefined,
 *   targetBusinessId: string | null | undefined,
 *   requiredPermission: string,
 *   actorUserId?: string | null,
 *   approvalRequesterId?: string | null,
 *   requireSeparation?: boolean
 * }} params
 */
export function authorizeMobileAction({
  membership,
  targetBusinessId,
  requiredPermission,
  actorUserId,
  approvalRequesterId,
  requireSeparation = true,
}) {
  if (!membership || membership.isRevoked || membership.employeeActive === false) {
    return { allowed: false, status: 403, reason: "Membership suspended or missing" };
  }
  if (!targetBusinessId || membership.businessId !== targetBusinessId) {
    return { allowed: false, status: 403, reason: "Cross-business operation denied" };
  }
  const perms = Array.isArray(membership.permissions) ? membership.permissions : [];
  if (!perms.includes(requiredPermission)) {
    return {
      allowed: false,
      status: 403,
      reason: `Missing required permission: ${requiredPermission}`,
    };
  }
  if (
    requiredPermission === MOBILE_PERMISSIONS.APPROVAL_DECIDE &&
    requireSeparation &&
    actorUserId &&
    approvalRequesterId &&
    actorUserId === approvalRequesterId
  ) {
    return {
      allowed: false,
      status: 403,
      reason: "Separation of duties blocks approving your own request",
    };
  }
  return { allowed: true, status: 200, reason: null };
}
