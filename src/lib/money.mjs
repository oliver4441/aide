/**
 * AIDE-04: Exact-decimal money arithmetic for runtime calculation paths.
 *
 * Storage is already exact (Prisma Decimal(19,4) on the server, scaled Long
 * on Android). This module removes the remaining binary floating-point math
 * from the browser POS and any calculation that derives amounts, cost, profit
 * and tax from stored decimals.
 *
 * All math is BigInt against a fixed 4-decimal place grid (matching
 * DECIMAL(19,4) and the Android x10000 converters), so values beyond
 * Number.MAX_SAFE_INTEGER keep every digit and 0.1 + 0.2 is exactly 0.3000.
 *
 * Convention:
 *   - arithmetic returns canonical 4dp strings (matches storage)
 *   - roundTo() rounds half-up to a target dp as the final display step
 *   - allocate() carries any rounding remainder to the last part so split
 *     payments always sum back to the original total
 */

const ZERO = BigInt(0);
const SCALE = BigInt(10000); // 10^4 — 4 decimal places
const HUNDRED = BigInt(100);

const TOKEN_RE = /-?\d+(?:\.\d+)?/;

/** @typedef {bigint} MoneyUnits */

/** Parse an amount string into fixed-point ten-thousandths (scaled Long). */
export function toUnits(amount) {
  const raw = String(amount ?? "").trim();
  const m = raw.match(TOKEN_RE);
  if (!m) return ZERO;
  const token = m[0];
  const neg = token.startsWith("-");
  const body = token.replace("-", "");
  const dot = body.indexOf(".");
  const whole = dot === -1 ? body : body.slice(0, dot);
  const frac = dot === -1 ? "" : body.slice(dot + 1);
  let u =
    BigInt(whole === "" ? "0" : whole) * SCALE +
    BigInt((frac + "0000").slice(0, 4));
  // Inputs with sub-4dp precision are rounded half-up once, at the boundary,
  // so a value like 9.99995 becomes 10.0000 rather than truncating.
  if (frac.length > 4 && Number(frac[4]) >= 5) u += BigInt(1);
  return neg ? -u : u;
}

/** Convert fixed-point ten-thousandths back to a canonical 4dp string. */
export function fromUnits(units) {
  const neg = units < ZERO;
  const abs = neg ? -units : units;
  const whole = abs / SCALE;
  const frac = (abs % SCALE).toString().padStart(4, "0");
  return `${neg ? "-" : ""}${whole}.${frac}`;
}

/** Normalise any amount to a canonical 4dp string. */
export function norm(amount) {
  return fromUnits(toUnits(amount));
}

/** Exact addition. */
export function add(a, b) {
  return fromUnits(toUnits(a) + toUnits(b));
}

/** Exact subtraction. */
export function subtract(a, b) {
  return fromUnits(toUnits(a) - toUnits(b));
}

/** Exact multiplication by an integer quantity. */
export function multiply(amount, qty) {
  const q = BigInt(String(qty).trim().split(".")[0] || "0");
  return fromUnits(toUnits(amount) * q);
}

/** Exact comparison: -1, 0, 1. */
export function compare(a, b) {
  const x = toUnits(a);
  const y = toUnits(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

/** True when a >= b. */
export function gte(a, b) {
  return toUnits(a) >= toUnits(b);
}

/** Round a canonical 4dp amount half-up to `dp` decimal places for display. */
export function roundTo(amount, dp = 2) {
  const u = toUnits(amount);
  if (dp >= 4) return fromUnits(u);
  const grid = SCALE / BigInt(10 ** dp);
  const neg = u < ZERO;
  const abs = neg ? -u : u;
  const rounded = ((abs + grid / BigInt(2)) / grid) * grid; // half-up away from zero
  const r = neg ? -rounded : rounded;
  const [w, f = ""] = fromUnits(r).replace("-", "").split(".");
  const frac = f.slice(0, dp).padEnd(dp, "0");
  return `${neg ? "-" : ""}${w}.${frac}`;
}

/** Sum a list of amounts exactly. */
export function sumAmounts(amounts) {
  return fromUnits(amounts.reduce((acc, a) => acc + toUnits(a), ZERO));
}

/**
 * VAT where the price already includes tax:
 *   tax = total − total / (1 + rate/100)
 * Computed at SCALE² precision so integer division keeps 4dp accuracy.
 */
export function taxInclusive(total, ratePercent) {
  const totalU = toUnits(total);
  const rate = toUnits(String(ratePercent ?? ""));
  if (rate <= ZERO) return fromUnits(ZERO);
  // r = ratePercent = rateUnits / SCALE, so
  // vatUnits = totalUnits * r / (100 + r)
  //          = totalUnits * rateUnits / (100*SCALE + rateUnits)
  const num = totalU * rate;
  const den = rate + HUNDRED * SCALE;
  if (den <= ZERO) return fromUnits(ZERO);
  const neg = num < ZERO;
  const absNum = neg ? -num : num;
  const rounded = (absNum + den / BigInt(2)) / den; // half-up away from zero
  return fromUnits(neg ? -rounded : rounded);
}

/** Change = max(0, given − due). Exact. */
export function changeDue(given, due) {
  const c = toUnits(given) - toUnits(due);
  return fromUnits(c > ZERO ? c : ZERO);
}

/**
 * Allocate `total` over integer weights, distributing the rounding remainder
 * to the last part so the split always sums back to the original total.
 */
export function allocate(total, weights) {
  const totalU = toUnits(total);
  if (weights.length === 0) return [];
  const wTotal = weights.reduce((s, w) => s + w, 0);
  if (wTotal <= 0) return [];
  const units = weights.map(
    (w) => (totalU * BigInt(Math.round(w))) / BigInt(wTotal)
  );
  const assigned = units.reduce((s, u) => s + u, ZERO);
  const parts = units.map((u) => fromUnits(u));
  const remainder = totalU - assigned;
  if (remainder !== ZERO) {
    parts[weights.length - 1] = fromUnits(toUnits(parts[parts.length - 1]) + remainder);
  }
  return parts;
}
