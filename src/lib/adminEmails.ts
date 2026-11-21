/**
 * Platform admin email allowlist.
 * Accounts matching this list authenticate against the Admin table (see src/lib/auth.ts)
 * and must never be registered or reassigned as standard User accounts.
 */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "kipkiruigideon890@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email.trim().toLowerCase());
}
