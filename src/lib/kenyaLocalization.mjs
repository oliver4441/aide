export const KENYA_DEFAULTS = Object.freeze({
  currency: "KES",
  timezone: "Africa/Nairobi",
  locale: "en-KE",
  vatStandardRate: 0.16,
  vatZeroRate: 0,
  withholdingServiceRate: 0.05,
});

export function computeKenyaVat(netAmountStr, rate = KENYA_DEFAULTS.vatStandardRate) {
  const netCents = Math.round(Number(netAmountStr ?? 0) * 100);
  if (!Number.isFinite(netCents)) throw new Error(`Invalid net amount: ${netAmountStr}`);
  const vatCents = Math.round(netCents * rate);
  return {
    net: (netCents / 100).toFixed(2),
    vat: (vatCents / 100).toFixed(2),
    gross: ((netCents + vatCents) / 100).toFixed(2),
    currency: KENYA_DEFAULTS.currency,
  };
}

export function formatNairobiDate(isoDate) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(KENYA_DEFAULTS.locale, {
    timeZone: KENYA_DEFAULTS.timezone,
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

function escapeCsvCell(value) {
  const raw = String(value ?? "");
  // Neutralize spreadsheet formula injection
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function buildFinancialCsv(rows, columns) {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvCell(row[c.key])).join(",")
  );
  return [header, ...lines].join("\n");
}
