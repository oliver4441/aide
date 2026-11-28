/**
 * Plan catalogue helpers (AIDE-ADMIN-05).
 *
 * Pure validation and business-language descriptions for plan versions.
 * Publishing always creates a new version; nothing here mutates a version that
 * existing subscribers already reference.
 */

export const PLAN_KEYS = ["starter", "professional", "enterprise"];

export const PLAN_KIND = {
  starter: "Free forever",
  professional: "Self-serve paid",
  enterprise: "Negotiated",
};

export const ENTITLEMENT_LABELS = {
  pos: "Point of sale",
  inventory: "Inventory management",
  reports: "Reports and exports",
  customers: "Customers and receivables",
  suppliers: "Suppliers and payables",
  accounting: "Double-entry accounting",
  approvals: "Approval workflows",
  multi_branch: "Multiple branches",
  offline_mode: "Offline-first mode",
  priority_support: "Priority support",
  data_import: "Bulk data import",
  api_access: "API access",
};

export const LIMIT_LABELS = {
  branches: "Branches",
  members: "Team members",
  warehouses: "Warehouses",
  terminals: "POS terminals",
  products: "Products",
};

/** Turn a snake_case key into "Snake case" for keys without a curated label. */
export function humanizeKey(key) {
  return String(key || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

export function describeEntitlement(key) {
  return ENTITLEMENT_LABELS[key] || humanizeKey(key);
}

export function describeLimit(key) {
  return LIMIT_LABELS[key] || humanizeKey(key);
}

/** @param {Record<string, unknown>|null|undefined} entitlements */
export function summarizeEntitlements(entitlements) {
  if (!entitlements || typeof entitlements !== "object") return [];
  return Object.entries(entitlements)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([key]) => ({ key, label: describeEntitlement(key) }));
}

/** @param {Record<string, unknown>|null|undefined} limits */
export function summarizeLimits(limits) {
  if (!limits || typeof limits !== "object") return [];
  return Object.entries(limits).map(([key, value]) => ({
    key,
    label: describeLimit(key),
    limit: typeof value === "number" ? value : null,
    unlimited: value === null || value === undefined,
  }));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Validate a new plan version before it is published.
 *
 * @param {any} input
 * @param {{planKey?: string, now?: Date|string}} [options]
 * @returns {{ok: true, value: any, warnings: string[]} | {ok: false, errors: Record<string,string>}}
 */
export function validatePlanVersionInput(input, options = {}) {
  const errors = {};
  const warnings = [];
  const data = isPlainObject(input) ? input : {};

  const displayName = String(data.displayName ?? "").trim();
  if (displayName.length < 2 || displayName.length > 80) {
    errors.displayName = "Display name must be between 2 and 80 characters.";
  }

  const description = data.description === undefined || data.description === null
    ? null
    : String(data.description).trim();
  if (description && description.length > 500) {
    errors.description = "Description must be 500 characters or fewer.";
  }

  const price = Number(data.price);
  if (!Number.isFinite(price) || price < 0) {
    errors.price = "Price must be zero or a positive number.";
  } else if (price > 10_000_000) {
    errors.price = "Price is above the supported maximum.";
  } else if (Math.round(price * 100) !== price * 100) {
    errors.price = "Price may have at most two decimal places.";
  } else if (price === 0) {
    warnings.push("Price is zero. Publishing this version makes the plan free.");
  }

  const currency = String(data.currency ?? "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    errors.currency = "Currency must be a three-letter ISO code, for example KES.";
  }

  const interval = String(data.interval ?? "").toUpperCase();
  if (interval !== "MONTHLY" && interval !== "YEARLY") {
    errors.interval = "Billing interval must be monthly or yearly.";
  }

  const trialDays = Number(data.trialDays ?? 0);
  if (!Number.isInteger(trialDays) || trialDays < 0 || trialDays > 365) {
    errors.trialDays = "Trial length must be a whole number between 0 and 365 days.";
  }

  const entitlements = data.entitlements ?? {};
  if (!isPlainObject(entitlements)) {
    errors.entitlements = "Entitlements must be an object of feature switches.";
  } else {
    const entries = Object.entries(entitlements);
    if (entries.length > 40) {
      errors.entitlements = "At most 40 entitlements may be configured.";
    } else if (entries.some(([, value]) => typeof value !== "boolean")) {
      errors.entitlements = "Every entitlement must be true or false.";
    }
  }

  const limits = data.limits ?? {};
  if (!isPlainObject(limits)) {
    errors.limits = "Limits must be an object of numeric limits.";
  } else {
    const entries = Object.entries(limits);
    if (entries.length > 20) {
      errors.limits = "At most 20 limits may be configured.";
    } else {
      for (const [key, value] of entries) {
        if (value === null) continue; // null means unlimited
        if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
          errors.limits = `Limit "${describeLimit(key)}" must be a whole number of 0 or more, or unlimited.`;
          break;
        }
      }
    }
  }

  const reason = String(data.changeReason ?? "").trim();
  if (reason.length < 10) {
    errors.changeReason = "Give a reason of at least 10 characters. It is kept in the audit trail.";
  } else if (reason.length > 500) {
    errors.changeReason = "Reason must be 500 characters or fewer.";
  }

  const now = options.now ? new Date(options.now) : new Date();
  const effectiveFrom = data.effectiveFrom ? new Date(data.effectiveFrom) : now;
  if (Number.isNaN(effectiveFrom.getTime())) {
    errors.effectiveFrom = "Effective date is not a valid date.";
  } else if (effectiveFrom.getTime() < now.getTime() - 86400000) {
    errors.effectiveFrom = "Effective date cannot be more than a day in the past.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    warnings,
    value: {
      displayName,
      description: description || null,
      price,
      currency,
      interval,
      trialDays,
      entitlements,
      limits,
      effectiveFrom,
      changeReason: reason,
    },
  };
}

/**
 * Human summary of what changes between two versions, for the publish preview.
 * @param {any} before
 * @param {any} after
 */
export function diffPlanVersions(before, after) {
  if (!before) return [];
  const changes = [];
  const priceBefore = Number(before.price ?? 0);
  const priceAfter = Number(after.price ?? 0);
  if (priceBefore !== priceAfter) {
    changes.push({
      field: "Price",
      before: `${before.currency ?? ""} ${priceBefore}`.trim(),
      after: `${after.currency ?? ""} ${priceAfter}`.trim(),
    });
  }
  if ((before.interval ?? "") !== (after.interval ?? "")) {
    changes.push({ field: "Billing interval", before: before.interval, after: after.interval });
  }
  if (Number(before.trialDays ?? 0) !== Number(after.trialDays ?? 0)) {
    changes.push({
      field: "Trial length",
      before: `${before.trialDays ?? 0} days`,
      after: `${after.trialDays ?? 0} days`,
    });
  }
  const beforeFeatures = new Set(
    Object.entries(before.entitlements ?? {})
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k)
  );
  const afterFeatures = new Set(
    Object.entries(after.entitlements ?? {})
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k)
  );
  for (const key of afterFeatures) {
    if (!beforeFeatures.has(key)) {
      changes.push({ field: describeEntitlement(key), before: "Not included", after: "Included" });
    }
  }
  for (const key of beforeFeatures) {
    if (!afterFeatures.has(key)) {
      changes.push({ field: describeEntitlement(key), before: "Included", after: "Not included" });
    }
  }
  const limitKeys = new Set([
    ...Object.keys(before.limits ?? {}),
    ...Object.keys(after.limits ?? {}),
  ]);
  for (const key of limitKeys) {
    const b = before.limits?.[key];
    const a = after.limits?.[key];
    if (b !== a) {
      changes.push({
        field: describeLimit(key),
        before: b === null || b === undefined ? "Unlimited" : String(b),
        after: a === null || a === undefined ? "Unlimited" : String(a),
      });
    }
  }
  return changes;
}
