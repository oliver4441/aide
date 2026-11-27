/**
 * Cloudflare Turnstile — server-side verification.
 *
 * The browser obtains a token from the Turnstile widget on the login/signup
 * form and submits it with the request. We verify it here, inside the
 * existing handler, before any credential check or account creation.
 *
 * Env:
 *   TURNSTILE_SECRET_KEY             server secret (enforcement)
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY   widget site key (public)
 *   TURNSTILE_HOSTNAMES              comma-separated allowed frontend hosts
 *
 * Tokens are single-use: a replayed token fails siteverify and is rejected.
 */
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileResult {
  ok: boolean;
  error?: string;
}

function allowedHostnames(): string[] {
  return (process.env.TURNSTILE_HOSTNAMES ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Verify a Turnstile token for a given action.
 *
 * Fail-open only when no secret is configured (local dev / staged deploys
 * without keys). Production must set TURNSTILE_SECRET_KEY + TURNSTILE_HOSTNAMES.
 */
export async function verifyTurnstile(
  token: unknown,
  action: "login" | "signup",
  remoteIp?: string | null
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true };

  const hosts = allowedHostnames();
  if (
    typeof token !== "string" ||
    token.length === 0 ||
    token.length > 2048 ||
    hosts.length === 0
  ) {
    return { ok: false, error: "Security check is required. Please try again." };
  }

  let result: { success?: boolean; action?: string; hostname?: string; error_codes?: string[] };
  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        remoteip: remoteIp ?? "",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`siteverify ${response.status}`);
    result = await response.json();
  } catch {
    return { ok: false, error: "Security check is unavailable. Please try again." };
  }

  const hostname = String(result.hostname ?? "").toLowerCase();
  if (
    !result.success ||
    result.action !== action ||
    !hosts.includes(hostname)
  ) {
    return { ok: false, error: "Security check failed. Please try again." };
  }
  return { ok: true };
}

/** True when server-side enforcement is active. */
export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}
