/**
 * Platform-admin role and permission matrix (AIDE-ADMIN-01 / AIDE-ADMIN-02).
 *
 * Pure and dependency-free so the matrix can be unit-tested and shared by
 * server routes and UI without importing Prisma into a client bundle.
 *
 * The matrix is the *authorization* source of truth, but only the server
 * enforces it: the UI uses it to hide or explain controls, never to grant
 * access. Every admin API route re-checks the caller's Admin row.
 */

/** Platform roles stored on the Admin table. */
export const PLATFORM_ROLES = /** @type {const} */ (["SUPER_ADMIN", "ADMIN", "SUPPORT"]);

/** Every action-level permission the console knows about. */
export const PERMISSIONS = /** @type {const} */ ({
  VIEW_OVERVIEW: "view.overview",
  VIEW_ORGANIZATIONS: "view.organizations",
  VIEW_SUBSCRIPTIONS: "view.subscriptions",
  VIEW_PLANS: "view.plans",
  VIEW_BILLING: "view.billing",
  VIEW_EVENTS: "view.events",
  VIEW_REVIEWS: "view.reviews",
  MANAGE_SUBSCRIPTIONS: "manage.subscriptions",
  PUBLISH_PLANS: "manage.plans",
  REPLAY_EVENTS: "manage.events",
  RECORD_NOTES: "notes.create",
  EXPORT_DATA: "data.export",
});

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

const READ_ONLY = [
  PERMISSIONS.VIEW_OVERVIEW,
  PERMISSIONS.VIEW_ORGANIZATIONS,
  PERMISSIONS.VIEW_SUBSCRIPTIONS,
  PERMISSIONS.VIEW_PLANS,
  PERMISSIONS.VIEW_BILLING,
  PERMISSIONS.VIEW_EVENTS,
  PERMISSIONS.VIEW_REVIEWS,
];

/** role -> granted permissions. */
const ROLE_PERMISSIONS = {
  SUPER_ADMIN: [...ALL_PERMISSIONS],
  // Full support operations, but pricing/entitlement publication and provider
  // replay stay with SUPER_ADMIN.
  ADMIN: [
    ...READ_ONLY,
    PERMISSIONS.MANAGE_SUBSCRIPTIONS,
    PERMISSIONS.RECORD_NOTES,
    PERMISSIONS.EXPORT_DATA,
  ],
  // Investigation only: read everything, write a note, change nothing.
  SUPPORT: [...READ_ONLY, PERMISSIONS.RECORD_NOTES],
};

/** Human-readable label for a permission, used in denial messages and docs. */
const PERMISSION_LABELS = {
  [PERMISSIONS.VIEW_OVERVIEW]: "view the platform overview",
  [PERMISSIONS.VIEW_ORGANIZATIONS]: "view organizations",
  [PERMISSIONS.VIEW_SUBSCRIPTIONS]: "view subscriptions",
  [PERMISSIONS.VIEW_PLANS]: "view plans and entitlements",
  [PERMISSIONS.VIEW_BILLING]: "view billing and invoices",
  [PERMISSIONS.VIEW_EVENTS]: "view webhook events",
  [PERMISSIONS.VIEW_REVIEWS]: "view reviews",
  [PERMISSIONS.MANAGE_SUBSCRIPTIONS]: "manage subscriptions",
  [PERMISSIONS.PUBLISH_PLANS]: "publish plan versions",
  [PERMISSIONS.REPLAY_EVENTS]: "replay or reconcile webhook events",
  [PERMISSIONS.RECORD_NOTES]: "record support notes",
  [PERMISSIONS.EXPORT_DATA]: "export platform data",
};

const ROLE_LABELS = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Admin",
  SUPPORT: "Support",
};

/**
 * @param {unknown} role
 * @returns {role is "SUPER_ADMIN" | "ADMIN" | "SUPPORT"}
 */
export function isPlatformRole(role) {
  return typeof role === "string" && PLATFORM_ROLES.includes(/** @type {any} */ (role));
}

/**
 * @param {unknown} role
 * @returns {string[]}
 */
export function permissionsFor(role) {
  if (!isPlatformRole(role)) return [];
  return [...ROLE_PERMISSIONS[role]];
}

/**
 * @param {unknown} role
 * @param {string} permission
 * @returns {boolean}
 */
export function hasPermission(role, permission) {
  if (!isPlatformRole(role)) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Safe explanation of why an action is unavailable. Never reveals whether a
 * record exists, only what the caller's own role may do.
 *
 * @param {unknown} role
 * @param {string} permission
 * @returns {string}
 */
export function denialMessage(role, permission) {
  const label = PERMISSION_LABELS[permission] || "perform this action";
  const roleLabel = isPlatformRole(role) ? ROLE_LABELS[role] : "Unknown role";
  return `Your platform role (${roleLabel}) cannot ${label}. Ask a super admin if this is required.`;
}

/** @param {unknown} role */
export function roleLabel(role) {
  return isPlatformRole(role) ? ROLE_LABELS[role] : "Unknown role";
}

/**
 * The role/action matrix as data, for the operator guide and the console's
 * permission explanation panel.
 */
export function permissionMatrix() {
  return PLATFORM_ROLES.map((role) => ({
    role,
    label: ROLE_LABELS[role],
    permissions: permissionsFor(role),
  }));
}
