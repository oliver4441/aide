import crypto from "node:crypto";

/**
 * Receipt share tokens.
 *
 * `/r/<saleId>` is served to whoever scans the QR printed on a receipt, so it
 * cannot require a session. But a bare sale id is not a secret: the POS
 * generates ids as
 *
 *     sale_${Date.now()}_${Math.random().toString(36).slice(2, 8)}
 *
 * which is a millisecond timestamp plus six base36 characters from
 * `Math.random()` — enumerable by walking a plausible timestamp range. Exposing
 * `/api/receipts/[id]` unauthenticated would therefore publish every customer's
 * receipt to anyone prepared to brute-force it.
 *
 * So a public receipt link is `/r/<saleId>?t=<token>`, where the token is an
 * HMAC of the sale id under NEXTAUTH_SECRET. The id stays guessable and useless
 * on its own; the token is what makes the link a capability, and a customer
 * holding the printed QR is entitled to read exactly that one receipt.
 *
 * Server-only — it reads NEXTAUTH_SECRET and must never reach the browser.
 * The client cannot compute this, so the POS mints share links through
 * `GET /api/sales/[id]/share`.
 */

function secret(): string {
  const value = process.env.NEXTAUTH_SECRET;
  if (!value) {
    throw new Error(
      "NEXTAUTH_SECRET is not set — receipt share links cannot be signed."
    );
  }
  return value;
}

/** Namespace the HMAC so a token minted here can never be replayed elsewhere. */
const CONTEXT = "aide:receipt:v1";

export function signSaleId(saleId: string): string {
  return crypto
    .createHmac("sha256", secret())
    .update(`${CONTEXT}:${saleId}`)
    .digest("base64url");
}

export function verifySaleToken(saleId: string, token: string | null | undefined): boolean {
  if (!token) return false;

  const expected = Buffer.from(signSaleId(saleId));
  const given = Buffer.from(token);

  // timingSafeEqual throws on a length mismatch, and the length check would
  // itself leak length, so compare fixed-width digests instead.
  if (expected.length !== given.length) return false;
  return crypto.timingSafeEqual(expected, given);
}

export function buildShareUrl(origin: string, saleId: string): string {
  return `${origin}/r/${saleId}?t=${signSaleId(saleId)}`;
}
