/**
 * Resolve the base URL for the synthetic request used to replay an approved
 * action through its original route handler.
 *
 * Production deployments must provide one of AIDE_APP_URL, NEXTAUTH_URL, or
 * VERCEL_URL. The localhost fallback exists only for development so tests and
 * `next dev` work without configuration.
 */
export function resolveReplayBaseUrl(env = process.env) {
  const configured = env.AIDE_APP_URL || env.NEXTAUTH_URL || env.NEXT_PUBLIC_APP_URL;
  if (typeof configured === "string" && configured.trim()) {
    return configured.trim().replace(/\/+$/, "");
  }

  if (typeof env.VERCEL_URL === "string" && env.VERCEL_URL.trim()) {
    const host = env.VERCEL_URL.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    return `https://${host}`;
  }

  if (env.NODE_ENV === "production") {
    throw new Error(
      "AIDE_APP_URL, NEXTAUTH_URL, or VERCEL_URL must be set to replay approved actions"
    );
  }

  return "http://localhost:3000";
}
