export const AIDE_ACCOUNTING_BRANDING = Object.freeze({
  productName: "Aide Accounting",
  shortName: "Accounting",
  routeBase: "/dashboard/financials",
  gatewayProxyPath: "/api/internal/accounting",
  logoPath: "/icons/icon-192.png",
  faviconPath: "/favicon.ico",
  supportEmail: "support@aide.app",
  theme: Object.freeze({
    background: "#F9F7F1",
    foreground: "#111111",
    accent: "#111111",
    muted: "#6B6B6B",
    fontSans: "Inter, system-ui, sans-serif",
  }),
  legalNotices: Object.freeze({
    license: "AGPL-3.0",
    sourceUrl: "https://github.com/oliver4441/aide",
    attributionText:
      "Aide Accounting includes open-source accounting components licensed under AGPL-3.0.",
  }),
});

const FORBIDDEN_BRAND_PATTERNS = [/bigcapital/i];

/**
 * Automated branding smoke check: ensures white-label configuration
 * contains no competing brand strings and preserves required legal notices.
 */
export function validateWhiteLabelConfig(config = AIDE_ACCOUNTING_BRANDING) {
  const errors = [];
  const fieldsToCheck = [
    config.productName,
    config.shortName,
    config.routeBase,
    config.gatewayProxyPath,
    config.supportEmail,
  ];

  for (const value of fieldsToCheck) {
    for (const pattern of FORBIDDEN_BRAND_PATTERNS) {
      if (pattern.test(String(value || ""))) {
        errors.push(`Forbidden brand reference in "${value}"`);
      }
    }
  }

  if (!config.legalNotices?.license || !config.legalNotices?.attributionText) {
    errors.push("Missing required AGPL-3.0 legal notice");
  }

  if (!String(config.routeBase || "").startsWith("/")) {
    errors.push("routeBase must be a relative Aide path");
  }

  return { ok: errors.length === 0, errors };
}
