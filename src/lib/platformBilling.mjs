/**
 * Platform subscription billing maths and redaction (AIDE-ADMIN-03/06).
 *
 * Pure and dependency-free so MRR/ARR rules, status buckets, pagination and
 * payload redaction are testable without a database. These helpers are only
 * ever applied to OMIX subscription records (Platform* tables), never to
 * merchant sales, invoices or payments.
 */

/** Statuses that still represent contracted, billable revenue. */
export const BILLABLE_STATUSES = ["ACTIVE", "PAST_DUE", "GRACE_PERIOD"];

export const SUBSCRIPTION_STATUSES = [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "GRACE_PERIOD",
  "CANCELED",
  "EXPIRED",
];

export const STATUS_LABELS = {
  TRIALING: "Trialing",
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  GRACE_PERIOD: "Grace period",
  CANCELED: "Canceled",
  EXPIRED: "Expired",
  PENDING: "Pending",
  PROCESSING: "Processing",
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
  DEAD_LETTER: "Dead letter",
  OPEN: "Open",
  PAID: "Paid",
  VOID: "Void",
  UNCOLLECTIBLE: "Uncollectible",
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
  REFUNDED: "Refunded",
  ACTIVE_ORG: "Active",
};

/** Statuses that count as a paid (non-trial) subscription. */
export function isPaidSubscription(sub) {
  return (
    Boolean(sub) &&
    sub.status === "ACTIVE" &&
    toNumber(sub.amount) > 0
  );
}

function toNumber(value) {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toTime(value) {
  if (!value) return null;
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * Normalize a plan price to a monthly figure.
 * YEARLY plans are divided by 12 so MRR and ARR stay comparable across plans.
 *
 * @param {number|string} amount
 * @param {"MONTHLY"|"YEARLY"|string} interval
 * @returns {number}
 */
export function monthlyAmount(amount, interval) {
  const value = toNumber(amount);
  if (interval === "YEARLY") return value / 12;
  return value;
}

/**
 * MRR grouped by currency. Unlike currencies are never summed into one
 * figure: each bucket is returned separately and ARR is 12x its MRR.
 *
 * Rules (documented for the operator guide):
 * - ACTIVE, PAST_DUE and GRACE_PERIOD subscriptions are contracted revenue and
 *   are counted; PAST_DUE is still expected to collect.
 * - TRIALING subscriptions are excluded: no revenue has been recognised yet.
 * - CANCELED subscriptions are excluded, even when access continues until the
 *   period end, because the contract will not renew.
 * - EXPIRED subscriptions are excluded.
 * - Amounts are the subscription's invoiced amount after discounts, in its own
 *   currency. Annual plans are normalized to a monthly figure.
 *
 * @param {Array<{status?: string, amount?: number|string, currency?: string, interval?: string}>} subscriptions
 */
export function mrrByCurrency(subscriptions) {
  /** @type {Record<string, {currency: string, mrr: number, arr: number, counted: number}>} */
  const buckets = {};
  for (const sub of subscriptions || []) {
    if (!sub || !BILLABLE_STATUSES.includes(sub.status)) continue;
    const currency = (sub.currency || "KES").toUpperCase();
    const mrr = monthlyAmount(sub.amount, sub.interval);
    if (!buckets[currency]) buckets[currency] = { currency, mrr: 0, arr: 0, counted: 0 };
    buckets[currency].mrr += mrr;
    buckets[currency].counted += 1;
  }
  return Object.values(buckets)
    .map((b) => ({
      currency: b.currency,
      mrr: round2(b.mrr),
      arr: round2(b.mrr * 12),
      counted: b.counted,
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Same rules as `mrrByCurrency`, but fed by a Prisma `groupBy` result so the
 * overview never loads every subscription row into memory.
 *
 * @param {Array<{status?: string, currency?: string, interval?: string, _sum?: {amount?: number|string|null}, _count?: {_all?: number}|number}>} groups
 */
export function mrrFromGroups(groups) {
  const buckets = {};
  for (const group of groups || []) {
    if (!group || !BILLABLE_STATUSES.includes(group.status)) continue;
    const currency = (group.currency || "KES").toUpperCase();
    const summed = group._sum?.amount ?? 0;
    const count =
      typeof group._count === "number" ? group._count : toNumber(group._count?._all);
    if (!buckets[currency]) buckets[currency] = { currency, mrr: 0, arr: 0, counted: 0 };
    buckets[currency].mrr += monthlyAmount(summed, group.interval);
    buckets[currency].counted += count;
  }
  return Object.values(buckets)
    .map((b) => ({
      currency: b.currency,
      mrr: round2(b.mrr),
      arr: round2(b.mrr * 12),
      counted: b.counted,
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

/**
 * Bucket subscriptions by lifecycle status and derive the operational counts
 * the overview and attention queue need.
 *
 * @param {Array<any>} subscriptions
 * @param {{now?: Date|string, trialWindowDays?: number, renewalWindowDays?: number}} [options]
 */
export function subscriptionSummary(subscriptions, options = {}) {
  const now = toTime(options.now) ?? Date.now();
  const trialWindow = (options.trialWindowDays ?? 7) * 86400000;
  const renewalWindow = (options.renewalWindowDays ?? 30) * 86400000;

  /** @type {Record<string, number>} */
  const byStatus = {};
  for (const status of SUBSCRIPTION_STATUSES) byStatus[status] = 0;

  let trialsExpiringSoon = 0;
  let upcomingRenewals = 0;
  let paidActive = 0;

  for (const sub of subscriptions || []) {
    if (!sub) continue;
    if (sub.status in byStatus) byStatus[sub.status] += 1;
    if (isPaidSubscription(sub)) paidActive += 1;
    if (sub.status === "TRIALING") {
      const end = toTime(sub.trialEnd);
      if (end !== null && end >= now && end - now <= trialWindow) trialsExpiringSoon += 1;
    }
    if (BILLABLE_STATUSES.includes(sub.status)) {
      const end = toTime(sub.currentPeriodEnd);
      if (end !== null && end >= now && end - now <= renewalWindow) upcomingRenewals += 1;
    }
  }

  return {
    total: (subscriptions || []).length,
    byStatus,
    paidActive,
    trialing: byStatus.TRIALING,
    trialsExpiringSoon,
    pastDue: byStatus.PAST_DUE,
    gracePeriod: byStatus.GRACE_PERIOD,
    canceled: byStatus.CANCELED,
    expired: byStatus.EXPIRED,
    upcomingRenewals,
  };
}

/**
 * Starter/free organizations are those without a subscription row at all, plus
 * explicit zero-amount subscriptions. Organizations with no row are implicitly
 * on the free tier.
 *
 * @param {number} totalOrganizations
 * @param {number} subscribedOrganizations
 */
export function implicitFreeOrganizations(totalOrganizations, subscribedOrganizations) {
  const total = Math.max(0, toNumber(totalOrganizations));
  const subscribed = Math.max(0, toNumber(subscribedOrganizations));
  return Math.max(0, total - subscribed);
}

/**
 * Parse `page` / `pageSize` search params into a bounded Prisma window.
 * @param {{page?: string|number|null, pageSize?: string|number|null}} params
 */
export function parsePagination(params = {}) {
  const page = Math.max(1, Math.floor(toNumber(params.page) || 1));
  const rawSize = Math.floor(toNumber(params.pageSize) || 25);
  const pageSize = Math.min(100, Math.max(5, rawSize));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/** @param {number} total @param {number} pageSize */
export function totalPages(total, pageSize) {
  if (!pageSize || pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(toNumber(total) / pageSize));
}

/** Inclusive lower bound for a 7/30/90-day filter. */
export function rangeStart(days, now = new Date()) {
  const allowed = [7, 30, 90];
  const span = allowed.includes(Number(days)) ? Number(days) : 30;
  return new Date(new Date(now).getTime() - span * 86400000);
}

/** @param {unknown} days */
export function normalizeRange(days) {
  const n = Number(days);
  return [7, 30, 90].includes(n) ? n : 30;
}

const SECRET_KEY_PATTERN = /(secret|token|password|authorization|api[_-]?key|card|cvc|cvv|pan|client_secret|webhook)/i;

/**
 * Remove anything that could be a payment secret or card number from a string
 * that is stored or displayed.
 * @param {unknown} value
 * @param {number} [maxLength]
 */
export function sanitizeFailureMessage(value, maxLength = 240) {
  if (value === null || value === undefined) return null;
  let text = String(value);
  text = text.replace(/\b(?:sk|pk|rk|whsec)_[A-Za-z0-9_]+/g, "[redacted key]");
  text = text.replace(/\b(?:\d[ -]?){13,19}\b/g, "[redacted number]");
  text = text.replace(/(cvc|cvv|card[_-]?number)\s*[:=]\s*\S+/gi, "$1=[redacted]");
  text = text.replace(/(bearer\s+)[A-Za-z0-9._\-]+/gi, "$1[redacted]");
  text = text.replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

/**
 * Deep-redact a provider payload for display or storage. Keys that name a
 * secret, card field or token are dropped entirely; remaining strings are
 * scrubbed with the same rules as failure messages. Depth and breadth are
 * bounded so a hostile payload cannot blow up the response.
 *
 * @param {unknown} payload
 * @param {{depth?: number, maxArray?: number, maxString?: number}} [options]
 */
export function redactPayload(payload, options = {}) {
  const depth = options.depth ?? 4;
  const maxArray = options.maxArray ?? 20;
  const maxString = options.maxString ?? 200;

  function walk(value, level) {
    if (value === null || value === undefined) return value;
    if (level > depth) return "[truncated]";
    if (Array.isArray(value)) {
      return value.slice(0, maxArray).map((item) => walk(item, level + 1));
    }
    if (typeof value === "object") {
      /** @type {Record<string, unknown>} */
      const out = {};
      for (const [key, child] of Object.entries(value)) {
        if (SECRET_KEY_PATTERN.test(key)) {
          out[key] = "[redacted]";
          continue;
        }
        out[key] = walk(child, level + 1);
      }
      return out;
    }
    if (typeof value === "string") {
      const cleaned = sanitizeFailureMessage(value, maxString);
      return cleaned ?? "";
    }
    return value;
  }

  return walk(payload, 0);
}

/** Percentage of a whole, rounded to one decimal. Zero-safe. */
export function percent(part, whole) {
  const w = toNumber(whole);
  if (w <= 0) return 0;
  return Math.round((toNumber(part) / w) * 1000) / 10;
}

/** Billing-health label derived from the subscription status. */
export function billingHealth(status) {
  switch (status) {
    case "ACTIVE":
      return "healthy";
    case "TRIALING":
      return "trial";
    case "PAST_DUE":
      return "at-risk";
    case "GRACE_PERIOD":
      return "at-risk";
    case "CANCELED":
    case "EXPIRED":
      return "churned";
    default:
      return "unknown";
  }
}

/**
 * Days remaining until a date, floored. Negative values mean overdue.
 * @param {Date|string|null|undefined} date
 * @param {Date|string} [now]
 */
export function daysUntil(date, now = new Date()) {
  const t = toTime(date);
  if (t === null) return null;
  return Math.floor((t - toTime(now)) / 86400000);
}
