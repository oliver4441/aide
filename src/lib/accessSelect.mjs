/**
 * Pure tenant / tenant-dimension selection used by both business- and
 * organization-scoped authorization in `apiAuth.ts`.
 *
 * Given the set of ids a caller is allowed to access, return the requested id
 * when the caller may use it; otherwise fall back to the first accessible id.
 * Returns `null` only when the caller has no accessible ids at all (the caller
 * should treat that as "denied").
 *
 * Keeping this logic pure (no DB, no request) makes the cross-tenant isolation
 * rule unit-testable without a database. See scripts/tests/org-access.test.mjs.
 *
 * @param {string | null | undefined} requested
 * @param {string[]} accessible
 * @returns {string | null}
 */
export function selectAccessible(requested, accessible) {
  if (!accessible || accessible.length === 0) return null;
  if (requested && accessible.includes(requested)) return requested;
  return accessible[0];
}
