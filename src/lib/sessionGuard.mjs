/**
 * AIDE-03 session revocation primitives.
 *
 * A credential (NextAuth JWT or native bearer token) carries the account's
 * `tokenVersion` at the moment it is minted. Every API request compares that
 * claim with the version currently stored on the account. Bumping the column
 * therefore invalidates every already-issued credential immediately — no
 * blocklist, no waiting for the 30-day JWT to expire.
 *
 * These helpers are deliberately pure so the revocation rule is testable
 * without a database or an HTTP server.
 */

/** The version a freshly minted credential starts from. */
export const INITIAL_TOKEN_VERSION = 0;

/**
 * Strict equality check. A missing or malformed version is rejected: tokens
 * minted before this feature existed must re-authenticate once, rather than
 * being silently treated as current forever.
 */
export function sessionVersionMatches(tokenVersion, currentVersion) {
  return (
    typeof tokenVersion === "number" &&
    Number.isInteger(tokenVersion) &&
    tokenVersion >= 0 &&
    tokenVersion === currentVersion
  );
}

/** Returns the next version. Never decrements or wraps. */
export function nextTokenVersion(version) {
  const current = Number.isInteger(version) && version >= 0 ? version : 0;
  return current + 1;
}
