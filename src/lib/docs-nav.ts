/**
 * The documentation table of contents.
 *
 * This module is pure data with no Node-only imports so the client-side sidebar
 * can import it without dragging `node:fs` into the browser bundle. Reading the
 * Markdown bodies lives in `src/lib/docs.ts`.
 *
 * Every page listed here must have a matching file in `src/content/docs`.
 * `slug` is the URL segment after `/docs`, so `api/products` is served at
 * `/docs/api/products`; the empty slug is the docs index at `/docs`.
 */

export type DocCategoryId = "start" | "concepts" | "guides" | "api" | "reference";

export type DocPage = {
  slug: string;
  title: string;
  /** Shorter label for the sidebar when the full title is long. */
  navTitle?: string;
  /** Meta description. Also used as the page subtitle. */
  description: string;
  category: DocCategoryId;
  /** File name (without extension) inside `src/content/docs`. */
  file: string;
  /** ISO date, pinned rather than `new Date()` so the sitemap stays truthful. */
  lastModified: string;
};

export type DocNavItem = {
  title: string;
  href: string;
  slug: string;
};

export type DocNavGroup = {
  id: DocCategoryId;
  title: string;
  items: DocNavItem[];
};

export const DOC_CATEGORIES: { id: DocCategoryId; title: string }[] = [
  { id: "start", title: "Getting started" },
  { id: "concepts", title: "Core concepts" },
  { id: "guides", title: "Guides" },
  { id: "api", title: "API reference" },
  { id: "reference", title: "Reference" },
];

export const DOC_PAGES: DocPage[] = [
  {
    slug: "",
    title: "Aide documentation",
    description:
      "Everything you need to run Aide: install the app, set up your business, sell at the point of sale, manage stock, and integrate with the Aide HTTP API.",
    category: "start",
    file: "overview",
    lastModified: "2026-10-01",
  },
  {
    slug: "getting-started/installation",
    title: "Installation",
    navTitle: "Install the app",
    description:
      "Install Aide on Android, Windows or the browser as a progressive web app, and verify the build you downloaded.",
    category: "start",
    file: "getting-started/installation",
    lastModified: "2026-10-01",
  },
  {
    slug: "getting-started/setup",
    title: "Set up your business",
    description:
      "Create an account, configure your business name, currency and tax rate, and set your categories and products ready for trading.",
    category: "start",
    file: "getting-started/setup",
    lastModified: "2026-10-01",
  },
  {
    slug: "getting-started/first-sale",
    title: "Make your first sale",
    description:
      "Ring up a sale at the point of sale, take payment, print or share the receipt, and see it appear in reports.",
    category: "start",
    file: "getting-started/first-sale",
    lastModified: "2026-10-01",
  },
  {
    slug: "concepts/offline-first",
    title: "How Aide stores your data",
    description:
      "Aide writes every change to the device first and syncs to the server when a connection is available. Learn what that means for reliability, performance and privacy.",
    category: "concepts",
    file: "concepts/offline-first",
    lastModified: "2026-10-01",
  },
  {
    slug: "concepts/sync",
    title: "Sync and conflict resolution",
    description:
      "How Aide pushes local changes, pulls server changes, and resolves conflicts between devices using timestamps and a stock movement ledger.",
    category: "concepts",
    file: "concepts/sync",
    lastModified: "2026-10-01",
  },
  {
    slug: "concepts/businesses",
    title: "Businesses, staff and permissions",
    description:
      "Every record belongs to a business. Aide scopes every request to the businesses you are a member of, and platform administrators get no wider access.",
    category: "concepts",
    file: "concepts/businesses",
    lastModified: "2026-10-01",
  },
  {
    slug: "guides/products",
    title: "Products and categories",
    description:
      "Create categories, track stock and pricing, set low-stock thresholds, and handle services that should not decrement inventory.",
    category: "guides",
    file: "guides/products",
    lastModified: "2026-10-01",
  },
  {
    slug: "guides/pos",
    title: "Point of sale",
    description:
      "Run the till: search or scan items, apply discounts, split payments, record cash, card and M-Pesa sales, and reprint receipts.",
    category: "guides",
    file: "guides/pos",
    lastModified: "2026-10-01",
  },
  {
    slug: "guides/reports",
    title: "Reports and analytics",
    description:
      "Read sales, profit and inventory reports, filter by date range, and export the numbers behind your business decisions.",
    category: "guides",
    file: "guides/reports",
    lastModified: "2026-10-01",
  },
  {
    slug: "guides/notifications",
    title: "Notifications",
    description:
      "Choose which alerts you receive — sales, inventory, customers, business and system — and control how they are delivered.",
    category: "guides",
    file: "guides/notifications",
    lastModified: "2026-10-01",
  },
  {
    slug: "api/introduction",
    title: "API introduction",
    description:
      "Base URL, request and response conventions, authentication methods, content types and status codes for the Aide API.",
    category: "api",
    file: "api/introduction",
    lastModified: "2026-10-01",
  },
  {
    slug: "api/authentication",
    title: "Authentication",
    description:
      "Authenticate with a NextAuth session cookie or a bearer token from /api/auth/mobile-login, and understand session claims and expiry.",
    category: "api",
    file: "api/authentication",
    lastModified: "2026-10-01",
  },
  {
    slug: "api/business",
    title: "Business",
    description:
      "Read the business profile for the authenticated user, or create one for users who do not have a business yet.",
    category: "api",
    file: "api/business",
    lastModified: "2026-10-01",
  },
  {
    slug: "api/products",
    title: "Products",
    description:
      "List, create, read, update and soft-delete products, including category filtering, name search and low-stock thresholds.",
    category: "api",
    file: "api/products",
    lastModified: "2026-10-01",
  },
  {
    slug: "api/categories",
    title: "Categories",
    description: "List and create product categories, ordered by sortOrder, with a product count per category.",
    category: "api",
    file: "api/categories",
    lastModified: "2026-10-01",
  },
  {
    slug: "api/sales",
    title: "Sales",
    description:
      "Record sales with line items, compute totals, cost and profit server-side, decrement stock, and page through sales history.",
    category: "api",
    file: "api/sales",
    lastModified: "2026-10-01",
  },
  {
    slug: "api/sync",
    title: "Sync",
    description:
      "Push local mutations and pull server changes. The endpoint the offline-first clients use, including conflict reporting.",
    category: "api",
    file: "api/sync",
    lastModified: "2026-10-01",
  },
  {
    slug: "api/notifications",
    title: "Notifications",
    description:
      "List, create, mark as read, dismiss and reconcile notifications across devices.",
    category: "api",
    file: "api/notifications",
    lastModified: "2026-10-01",
  },
  {
    slug: "api/receipts",
    title: "Receipts",
    description:
      "Fetch a sale receipt by id together with the business details needed to render it.",
    category: "api",
    file: "api/receipts",
    lastModified: "2026-10-01",
  },
  {
    slug: "api/dashboard",
    title: "Dashboard",
    description:
      "Today's sales, profit, sale count, product totals, low-stock items, recent sales and yesterday's comparison.",
    category: "api",
    file: "api/dashboard",
    lastModified: "2026-10-01",
  },
  {
    slug: "api/releases",
    title: "Releases",
    description:
      "Public endpoints that expose published Aide builds from GitHub Releases, including the latest APK.",
    category: "api",
    file: "api/releases",
    lastModified: "2026-10-01",
  },
  {
    slug: "api/errors",
    title: "Errors and status codes",
    description:
      "Every status code the Aide API returns, what causes it, and how to handle it in a client.",
    category: "api",
    file: "api/errors",
    lastModified: "2026-10-01",
  },
  {
    slug: "reference/changelog",
    title: "Changelog",
    description:
      "Notable changes to Aide, where to read the full release history, and how releases are published.",
    category: "reference",
    file: "reference/changelog",
    lastModified: "2026-10-01",
  },
];

export function docHref(slug: string): string {
  return slug ? `/docs/${slug}` : "/docs";
}

export function getDocPage(slug: string): DocPage | undefined {
  return DOC_PAGES.find((page) => page.slug === slug);
}

/** Sidebar shape, derived from DOC_PAGES so the two can never drift. */
export const DOC_NAV: DocNavGroup[] = DOC_CATEGORIES.map((category) => ({
  id: category.id,
  title: category.title,
  items: DOC_PAGES.filter((page) => page.category === category.id).map((page) => ({
    title: page.navTitle ?? page.title,
    href: docHref(page.slug),
    slug: page.slug,
  })),
}));

/** Flat reading order, used for the previous/next pager. */
export const DOC_ORDER: string[] = DOC_PAGES.map((page) => page.slug);