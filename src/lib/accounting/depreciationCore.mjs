/**
 * AIDE-07 / ACC-11: straight-line depreciation math.
 *
 * 4-decimal fixed-point BigInt arithmetic keeps schedules exact. All functions
 * are pure so the schedule rules are unit-tested without a database.
 */

const SCALE = 10000n;

export function toUnits(value) {
  if (typeof value === "bigint") return value;
  const raw = String(value ?? "0").trim();
  if (!/^-?\d+(\.\d+)?$/.test(raw)) {
    throw new Error(`Invalid monetary amount: ${raw}`);
  }
  const negative = raw.startsWith("-");
  const [intPart, fracPart = ""] = raw.replace("-", "").split(".");
  const frac = (fracPart + "0000").slice(0, 4);
  const units = BigInt(intPart) * SCALE + BigInt(frac);
  return negative ? -units : units;
}

export function fromUnits(units) {
  const negative = units < 0n;
  const abs = negative ? -units : units;
  const whole = abs / SCALE;
  const frac = (abs % SCALE).toString().padStart(4, "0");
  return `${negative ? "-" : ""}${whole}.${frac}`;
}

function roundDiv(numerator, denominator) {
  if (denominator <= 0n) throw new Error("usefulLifeMonths must be positive");
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  return remainder * 2n >= denominator ? quotient + 1n : quotient;
}

export function depreciableBase({ cost, salvageValue }) {
  const base = toUnits(cost) - toUnits(salvageValue);
  if (base < 0n) throw new Error("salvageValue cannot exceed cost");
  return base;
}

/** Straight-line monthly amount, rounded half-up to 4 dp. */
export function monthlyDepreciation({ cost, salvageValue, usefulLifeMonths }) {
  const life = BigInt(Math.trunc(Number(usefulLifeMonths)));
  if (life <= 0n) throw new Error("usefulLifeMonths must be positive");
  return fromUnits(roundDiv(depreciableBase({ cost, salvageValue }), life));
}

function periodIndex(acquisitionDate, year, month) {
  const acquired = acquisitionDate instanceof Date ? acquisitionDate : new Date(acquisitionDate);
  if (Number.isNaN(acquired.getTime())) throw new Error("Invalid acquisitionDate");
  const acqYear = acquired.getUTCFullYear();
  const acqMonth = acquired.getUTCMonth() + 1;
  return (year - acqYear) * 12 + (month - acqMonth);
}

/**
 * Depreciation for one asset in one period.
 *
 * Returns 0 before acquisition and once fully depreciated. The final month of
 * the life takes whatever remains so the schedule sums exactly to the
 * depreciable base despite per-month rounding.
 */
export function depreciationForPeriod({
  cost,
  salvageValue,
  usefulLifeMonths,
  acquisitionDate,
  year,
  month,
  accumulated = "0",
}) {
  const life = Math.trunc(Number(usefulLifeMonths));
  if (life <= 0) throw new Error("usefulLifeMonths must be positive");

  const index = periodIndex(acquisitionDate, year, month);
  if (index < 0 || index >= life) return "0.0000";

  const base = depreciableBase({ cost, salvageValue });
  const already = toUnits(accumulated);
  const remaining = base - (already > 0n ? already : 0n);
  if (remaining <= 0n) return "0.0000";

  if (index === life - 1) return fromUnits(remaining);

  const monthly = roundDiv(base, BigInt(life));
  return fromUnits(monthly < remaining ? monthly : remaining);
}

/** Net book value = cost − accumulated depreciation. */
export function bookValue({ cost, accumulated }) {
  const value = toUnits(cost) - toUnits(accumulated);
  return fromUnits(value < 0n ? 0n : value);
}

/** Validate and normalise a fixed-asset create payload. Throws on bad input. */
export function parseAssetInput(body) {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) throw new Error("name is required");

  const cost = toUnits(body?.cost);
  if (cost <= 0n) throw new Error("cost must be greater than zero");

  const salvage = toUnits(body?.salvageValue);
  if (salvage < 0n) throw new Error("salvageValue cannot be negative");
  if (salvage > cost) throw new Error("salvageValue cannot exceed cost");

  const life = Math.trunc(Number(body?.usefulLifeMonths));
  if (!Number.isFinite(life) || life < 1 || life > 1200) {
    throw new Error("usefulLifeMonths must be between 1 and 1200");
  }

  const acquisitionDate = new Date(body?.acquisitionDate);
  if (Number.isNaN(acquisitionDate.getTime())) throw new Error("acquisitionDate is required");

  const method = body?.method || "STRAIGHT_LINE";
  if (method !== "STRAIGHT_LINE") throw new Error("Unsupported depreciation method");

  return {
    name,
    category: typeof body?.category === "string" && body.category.trim() ? body.category.trim() : null,
    description:
      typeof body?.description === "string" && body.description.trim() ? body.description.trim() : null,
    acquisitionDate,
    cost: fromUnits(cost),
    salvageValue: fromUnits(salvage),
    usefulLifeMonths: life,
    method,
  };
}

export function parsePeriod(body) {
  const year = Math.trunc(Number(body?.year));
  const month = Math.trunc(Number(body?.month));
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    throw new Error("year must be between 2000 and 2100");
  }
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error("month must be between 1 and 12");
  }
  return { year, month };
}
