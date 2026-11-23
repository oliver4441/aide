/**
 * AIDE-22: Data import engine.
 *
 * Pure, dependency-free parsing/validation logic shared by the import API
 * routes and the unit tests. No Prisma, no Next.js — everything here works on
 * plain arrays/objects so it can run anywhere.
 *
 * Precision rules: monetary values are kept as exact decimal strings
 * (4 decimal places, round-half-up, string arithmetic — never binary
 * floating point) so imports round-trip into Prisma Decimal(19,4) cleanly.
 */

export const IMPORT_LIMITS = Object.freeze({
  maxRows: 2000,
  maxFileBytes: 5 * 1024 * 1024, // 5 MB, enforced client-side before parsing
  previewRows: 10,
  errorSampleSize: 100,
  maxNameLength: 200,
  maxSkuLength: 64,
  maxCodeLength: 32,
  maxNotesLength: 500,
});

export const IMPORT_ENTITIES = Object.freeze(["products", "customers"]);

export const DUPLICATE_STRATEGIES = Object.freeze(["skip", "merge"]);

/**
 * Field definitions per entity. `type` drives parsing/validation:
 *   string | decimal | int | boolean | email | phone
 * `aliases` (normalised lowercase) power auto-detection of column headers.
 */
export const FIELD_DEFS = Object.freeze({
  products: [
    { key: "name", label: "Name", required: true, type: "string", maxLength: IMPORT_LIMITS.maxNameLength,
      aliases: ["name", "product", "product name", "item", "item name", "description", "productname", "product description", "goods"] },
    { key: "sku", label: "SKU", type: "string", maxLength: IMPORT_LIMITS.maxSkuLength,
      aliases: ["sku", "code", "item code", "product code", "barcode", "article", "article number", "sku code"] },
    { key: "buyingPrice", label: "Buying price", type: "decimal", min: "0",
      aliases: ["buying price", "buy price", "cost", "cost price", "purchase price", "buyingprice", "unit cost"] },
    { key: "sellingPrice", label: "Selling price", type: "decimal", min: "0", required: true,
      aliases: ["selling price", "sell price", "price", "unit price", "retail price", "sellingprice", "sale price", "sales price", "amount"] },
    { key: "quantity", label: "Stock quantity", type: "int", min: 0, defaultValue: 0,
      aliases: ["quantity", "qty", "stock", "stock qty", "stock quantity", "on hand", "stock on hand", "units", "qty in stock", "balance qty"] },
    { key: "lowStock", label: "Low-stock alert", type: "int", min: 0, defaultValue: 5,
      aliases: ["low stock", "low stock level", "reorder level", "reorder point", "min stock", "lowstock", "minimum stock"] },
    { key: "category", label: "Category", type: "string", maxLength: 100,
      aliases: ["category", "group", "department", "type", "product group", "class", "section"] },
    { key: "isService", label: "Is service", type: "boolean", defaultValue: false,
      aliases: ["is service", "service", "issiservice", "is_service", "service item"] },
  ],
  customers: [
    { key: "name", label: "Name", required: true, type: "string", maxLength: IMPORT_LIMITS.maxNameLength,
      aliases: ["name", "customer", "customer name", "full name", "client", "client name", "customername", "contact name"] },
    { key: "customerCode", label: "Customer code", type: "string", maxLength: IMPORT_LIMITS.maxCodeLength,
      aliases: ["customer code", "code", "id", "customer id", "client code", "account number", "account no", "acct"] },
    { key: "email", label: "Email", type: "email", maxLength: 254,
      aliases: ["email", "e-mail", "email address", "e mail", "mail"] },
    { key: "phone", label: "Phone", type: "phone",
      aliases: ["phone", "phone number", "mobile", "telephone", "tel", "contact", "phone no", "mobile number", "cell"] },
    { key: "address", label: "Address", type: "string", maxLength: IMPORT_LIMITS.maxNotesLength,
      aliases: ["address", "addr", "street", "location", "physical address"] },
    { key: "city", label: "City", type: "string", maxLength: 100,
      aliases: ["city", "town"] },
    { key: "notes", label: "Notes", type: "string", maxLength: IMPORT_LIMITS.maxNotesLength,
      aliases: ["notes", "note", "comment", "comments", "remarks"] },
    { key: "creditLimit", label: "Credit limit", type: "decimal", min: "0", defaultValue: "0.0000",
      aliases: ["credit limit", "creditlimit", "limit", "credit", "max credit"] },
  ],
});

export function isImportEntity(entity) {
  return IMPORT_ENTITIES.includes(entity);
}

export function fieldDefsFor(entity) {
  const defs = FIELD_DEFS[entity];
  if (!defs) throw new Error(`Unknown import entity: ${entity}`);
  return defs;
}

/** Normalise a header/alias for fuzzy comparison. */
export function normalizeHeader(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Auto-detect a { fieldKey: columnIndex } mapping from spreadsheet headers.
 * Two passes: exact match on normalised header === normalised alias, then a
 * containment match (e.g. "Selling price (KES)" → sellingPrice). Each column
 * is used at most once.
 */
export function autoDetectMapping(headers, entity) {
  const defs = fieldDefsFor(entity);
  const normHeaders = headers.map(normalizeHeader);
  const used = new Set();
  const mapping = {};

  const pick = (def, predicate) => {
    for (const alias of def.aliases) {
      const n = normalizeHeader(alias);
      for (let i = 0; i < normHeaders.length; i++) {
        if (used.has(i) || !normHeaders[i]) continue;
        if (predicate(normHeaders[i], n)) return i;
      }
    }
    return -1;
  };

  // Pass 1 — exact matches only, in field order
  for (const def of defs) {
    const idx = pick(def, (h, n) => h === n);
    if (idx !== -1) {
      mapping[def.key] = idx;
      used.add(idx);
    }
  }
  // Pass 2 — containment matches for fields still unmapped
  for (const def of defs) {
    if (mapping[def.key] !== undefined) continue;
    const idx = pick(def, (h, n) => n.length >= 3 && (h.includes(n) || n.includes(h)));
    if (idx !== -1) {
      mapping[def.key] = idx;
      used.add(idx);
    }
  }
  return mapping;
}

/**
 * Round a canonical non-negative/negative decimal string to `scale` places,
 * round-half-up, using pure string arithmetic (no floats). Input must match
 * /^-?\d+(\.\d+)?$/.
 */
export function roundDecimalString(input, scale = 4) {
  if (typeof input !== "string" || !/^-?\d+(\.\d+)?$/.test(input)) {
    throw new Error(`roundDecimalString: invalid decimal string "${input}"`);
  }
  const negative = input.startsWith("-");
  const body = negative ? input.slice(1) : input;
  const dot = body.indexOf(".");
  const intPart = dot === -1 ? body : body.slice(0, dot);
  const fracPart = dot === -1 ? "" : body.slice(dot + 1);

  if (fracPart.length <= scale) {
    return `${negative ? "-" : ""}${intPart}.${fracPart.padEnd(scale, "0")}`;
  }

  const keep = fracPart.slice(0, scale).split("").map(Number);
  const roundDigit = Number(fracPart[scale]);
  if (roundDigit >= 5) {
    let i = keep.length - 1;
    for (; i >= 0; i--) {
      if (keep[i] < 9) {
        keep[i] += 1;
        break;
      }
      keep[i] = 0;
    }
    if (i < 0) {
      // Carried past the most significant fractional digit
      return `${negative ? "-" : ""}${(BigInt(intPart) + 1n).toString()}.${"0".repeat(scale)}`;
    }
  }
  return `${negative ? "-" : ""}${intPart}.${keep.join("")}`;
}

/** Strip common currency symbols, codes, thousands separators and spaces. */
function normalizeNumericCell(value) {
  return String(value ?? "")
    .replace(/[\u00A0\u202F\u2007]/g, " ")
    .replace(/KES|KSh|USD|TZS|UGX|\$|£|€|¥/gi, "")
    .replace(/,/g, "")
    .replace(/\s+/g, "")
    .trim();
}

/**
 * Parse a monetary/quantity cell into a canonical 4dp decimal string.
 * Empty cell → { ok: true, value: null }. Throws nothing.
 */
export function parseDecimalStrict(value) {
  const raw = normalizeNumericCell(value);
  if (raw === "" || raw === "-") return { ok: true, value: null };
  // Parentheses mean negative in accounting exports: (100.00) → -100.00
  const paren = /^\((\d+(\.\d+)?)\)$/.exec(raw);
  const cleaned = paren ? `-${paren[1]}` : raw;
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    return { ok: false, error: `"${String(value)}" is not a valid number` };
  }
  // Reject absurd magnitudes before BigInt math (Decimal(19,4) headroom)
  const intDigits = cleaned.replace(/^-/, "").split(".")[0].replace(/^0+/, "").length;
  if (intDigits > 14) {
    return { ok: false, error: `"${String(value)}" exceeds the maximum supported value` };
  }
  return { ok: true, value: roundDecimalString(cleaned, 4) };
}

/** Parse an integer cell. Empty → { ok: true, value: null }. Accepts "5" and "5.0". */
export function parseIntStrict(value) {
  const raw = normalizeNumericCell(value);
  if (raw === "" || raw === "-") return { ok: true, value: null };
  if (!/^-?\d+(\.0+)?$/.test(raw)) {
    return { ok: false, error: `"${String(value)}" is not a whole number` };
  }
  const intValue = raw.split(".")[0];
  const n = Number(intValue);
  if (!Number.isSafeInteger(n)) {
    return { ok: false, error: `"${String(value)}" exceeds the maximum supported value` };
  }
  return { ok: true, value: n };
}

/** Parse a boolean cell (yes/no/true/false/1/0). Empty → { ok: true, value: null }. */
export function parseBooleanStrict(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "") return { ok: true, value: null };
  if (["yes", "y", "true", "1", "t"].includes(raw)) return { ok: true, value: true };
  if (["no", "n", "false", "0", "f"].includes(raw)) return { ok: true, value: false };
  return { ok: false, error: `"${String(value)}" is not yes/no` };
}

/** Normalise a phone number to +digits (leading + preserved). Returns null if empty. */
export function normalizePhone(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const hadPlus = raw.startsWith("+");
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  return (hadPlus ? "+" : "") + digits;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  return raw || null;
}

/**
 * Dedupe key for a parsed row. Products: SKU (lowercase) else name.
 * Customers: customer code else phone (digits only) else email else name.
 */
export function dedupeKey(entity, data) {
  if (entity === "products") {
    if (data.sku) return `sku:${String(data.sku).trim().toLowerCase().replace(/\s+/g, "")}`;
    if (data.name) return `name:${String(data.name).trim().toLowerCase()}`;
    return null;
  }
  if (entity === "customers") {
    if (data.customerCode) return `code:${String(data.customerCode).trim().toLowerCase()}`;
    if (data.phone) {
      const digits = String(data.phone).replace(/[^\d]/g, "");
      if (digits) return `phone:${digits}`;
    }
    if (data.email) return `email:${String(data.email).trim().toLowerCase()}`;
    if (data.name) return `name:${String(data.name).trim().toLowerCase()}`;
    return null;
  }
  return null;
}

/** Extract the raw (unvalidated) field values for a row using the mapping. */
export function extractRow(mapping, rawRow) {
  const out = {};
  for (const [fieldKey, colIndex] of Object.entries(mapping ?? {})) {
    if (colIndex === null || colIndex === undefined) continue;
    out[fieldKey] = rawRow[Number(colIndex)] ?? "";
  }
  return out;
}

/**
 * Validate one row's extracted values. Returns { data, errors } where `data`
 * contains canonical values (decimals as 4dp strings) ready to persist and
 * `errors` is a list of human-readable messages (empty when valid).
 */
export function validateRowData(entity, extracted) {
  const defs = fieldDefsFor(entity);
  const errors = [];
  const data = {};

  for (const def of defs) {
    const raw = extracted[def.key];
    const empty = raw === undefined || raw === null || String(raw).trim() === "";

    if (empty) {
      if (def.required) {
        errors.push(`${def.label} is required`);
        continue;
      }
      if (def.defaultValue !== undefined) {
        data[def.key] = def.defaultValue;
      } else {
        data[def.key] = null;
      }
      continue;
    }

    switch (def.type) {
      case "string": {
        const value = String(raw).trim();
        if (def.maxLength && value.length > def.maxLength) {
          errors.push(`${def.label} exceeds ${def.maxLength} characters`);
          continue;
        }
        data[def.key] = value;
        break;
      }
      case "decimal": {
        const parsed = parseDecimalStrict(raw);
        if (!parsed.ok) {
          errors.push(`${def.label}: ${parsed.error}`);
          continue;
        }
        if (parsed.value !== null && def.min !== undefined && compareDecimalStrings(parsed.value, def.min) < 0) {
          errors.push(`${def.label} must not be negative`);
          continue;
        }
        data[def.key] = parsed.value;
        break;
      }
      case "int": {
        const parsed = parseIntStrict(raw);
        if (!parsed.ok) {
          errors.push(`${def.label}: ${parsed.error}`);
          continue;
        }
        if (parsed.value !== null && def.min !== undefined && parsed.value < def.min) {
          errors.push(`${def.label} must not be negative`);
          continue;
        }
        data[def.key] = parsed.value;
        break;
      }
      case "boolean": {
        const parsed = parseBooleanStrict(raw);
        if (!parsed.ok) {
          errors.push(`${def.label}: ${parsed.error}`);
          continue;
        }
        data[def.key] = parsed.value ?? def.defaultValue ?? false;
        break;
      }
      case "email": {
        const value = normalizeEmail(raw);
        if (value && !EMAIL_RE.test(value)) {
          errors.push(`Email "${value}" is not valid`);
          continue;
        }
        data[def.key] = value;
        break;
      }
      case "phone": {
        const value = normalizePhone(raw);
        if (value && !/^\+?\d{7,16}$/.test(value)) {
          errors.push(`Phone "${value}" is not a valid number (7–16 digits)`);
          continue;
        }
        data[def.key] = value;
        break;
      }
      default:
        data[def.key] = String(raw).trim();
    }
  }

  // Friendly aliases so downstream code reads naturally
  if (entity === "products") {
    data.buyingPrice = data.buyingPrice ?? "0.0000";
    data.quantity = data.quantity ?? 0;
    data.lowStock = data.lowStock ?? 5;
    data.isService = data.isService ?? false;
  } else if (entity === "customers") {
    data.creditLimit = data.creditLimit ?? "0.0000";
  }

  return { data, errors };
}

/** Compare two decimal strings. Negative when a < b, 0 when equal. */
export function compareDecimalStrings(a, b) {
  const norm = (v) => {
    const s = roundDecimalString(String(v), 4);
    return { neg: s.startsWith("-"), body: s.replace("-", "") };
  };
  const x = norm(a);
  const y = norm(b);
  if (x.neg !== y.neg) return x.neg ? -1 : 1;
  const cmp = compareUnsigned(x.body, y.body);
  return x.neg ? -cmp : cmp;
}

function compareUnsigned(a, b) {
  const [ai, af = ""] = a.split(".");
  const [bi, bf = ""] = b.split(".");
  const aInt = ai.replace(/^0+/, "") || "0";
  const bInt = bi.replace(/^0+/, "") || "0";
  if (aInt.length !== bInt.length) return aInt.length - bInt.length;
  if (aInt !== bInt) return aInt < bInt ? -1 : 1;
  const aFrac = af.padEnd(4, "0");
  const bFrac = bf.padEnd(4, "0");
  if (aFrac === bFrac) return 0;
  return aFrac < bFrac ? -1 : 1;
}

/** True when every cell in the row is blank/whitespace. */
export function isEmptyRow(rawRow) {
  if (!Array.isArray(rawRow)) return true;
  return rawRow.every((cell) => cell === null || cell === undefined || String(cell).trim() === "");
}

/** Validate mapping sanity: known fields, indexes in range, no column reuse. */
export function validateMapping(entity, mapping, columnCount) {
  const defs = fieldDefsFor(entity);
  const known = new Set(defs.map((d) => d.key));
  const errors = [];
  const usedCols = new Map();
  for (const [fieldKey, colIndex] of Object.entries(mapping ?? {})) {
    if (!known.has(fieldKey)) {
      errors.push(`Unknown field "${fieldKey}"`);
      continue;
    }
    if (colIndex === null || colIndex === undefined) continue;
    const idx = Number(colIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx >= columnCount) {
      errors.push(`Column index ${colIndex} for ${fieldKey} is out of range`);
      continue;
    }
    if (usedCols.has(idx)) {
      errors.push(`Column ${idx + 1} is mapped to both "${usedCols.get(idx)}" and "${fieldKey}"`);
      continue;
    }
    usedCols.set(idx, fieldKey);
  }
  const requiredMapped = defs.filter((d) => d.required).every((d) => {
    const c = mapping?.[d.key];
    return c !== null && c !== undefined;
  });
  if (!requiredMapped) {
    errors.push("Required fields are not mapped");
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Run the full dry-run analysis over raw rows.
 *
 * @param {object} args
 * @param {"products"|"customers"} args.entity
 * @param {string[]} args.headers      spreadsheet header cells
 * @param {any[][]}  args.rows         spreadsheet data rows (excluding header)
 * @param {Record<string, number|null>} args.mapping  fieldKey → column index
 * @returns {{ ok: boolean, error?: string, ... }} dry-run report
 */
export function buildDryRun({ entity, headers, rows, mapping }) {
  if (!isImportEntity(entity)) {
    return { ok: false, error: `Unsupported import entity "${entity}"` };
  }
  if (!Array.isArray(headers) || headers.length === 0) {
    return { ok: false, error: "No headers found in the file" };
  }
  if (!Array.isArray(rows)) {
    return { ok: false, error: "No data rows provided" };
  }
  if (rows.length > IMPORT_LIMITS.maxRows) {
    return {
      ok: false,
      error: `File has ${rows.length} data rows; the limit is ${IMPORT_LIMITS.maxRows} rows per import. Split the file and try again.`,
    };
  }

  const mappingCheck = validateMapping(entity, mapping, headers.length);
  if (!mappingCheck.ok) {
    return { ok: false, error: mappingCheck.errors.join("; ") };
  }

  const seen = new Map(); // dedupeKey → first row index
  const outRows = [];
  let validCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;
  let emptyCount = 0;

  for (let index = 0; index < rows.length; index++) {
    const rawRow = Array.isArray(rows[index]) ? rows[index] : [rows[index]];
    const rowNumber = index + 2; // 1-based + header row
    if (isEmptyRow(rawRow)) {
      emptyCount++;
      outRows.push({ row: rowNumber, index, status: "empty", errors: [], data: null });
      continue;
    }
    const extracted = extractRow(mapping, rawRow);
    const { data, errors } = validateRowData(entity, extracted);
    // Fields whose raw cell was present and non-empty. The merge path only
    // overwrites provided fields — blank cells never clobber existing data.
    const provided = Object.keys(extracted).filter(
      (k) => String(extracted[k] ?? "").trim() !== ""
    );
    let status = errors.length ? "error" : "ok";
    let duplicateOf = null;
    let key = null;

    if (errors.length === 0) {
      key = dedupeKey(entity, data);
      if (key && seen.has(key)) {
        status = "duplicate";
        duplicateOf = seen.get(key) + 2; // human row number of the first occurrence
        duplicateCount++;
      } else if (key) {
        seen.set(key, index);
      }
    }

    if (status === "ok") validCount++;
    else if (status === "error") errorCount++;

    outRows.push({ row: rowNumber, index, status, errors, data, duplicateOf, dedupeKey: key, provided });
  }

  const errorReport = outRows
    .filter((r) => r.status === "error")
    .map((r) => ({ row: r.row, errors: r.errors }));

  return {
    ok: true,
    entity,
    totalRows: rows.length,
    validCount,
    errorCount,
    duplicateCount,
    emptyCount,
    rows: outRows,
    errorReport,
  };
}

/**
 * Decide how a dry-run row should be persisted.
 *   - "create" | "update" | "skip-duplicate" | "skip-empty" | "fail"
 */
export function planRow(row, { strategy = "skip" } = {}) {
  if (row.status === "empty") return { action: "skip-empty" };
  if (row.status === "error") return { action: "fail", errors: row.errors };
  if (row.status === "duplicate") {
    // Duplicates against an existing database row can be merged; duplicates
    // within the file itself are always skipped (nothing sensible to merge).
    const dbExisting = row.existingId && strategy === "merge";
    return dbExisting ? { action: "update", existingId: row.existingId } : { action: "skip-duplicate" };
  }
  return { action: "create" };
}
