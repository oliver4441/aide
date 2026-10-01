import type { MetadataRoute } from "next";

const BASE = "https://aide.omixsystems.store";

/**
 * Public, indexable routes only.
 *
 * Dashboard pages sit behind NextAuth middleware and shared receipts
 * (`/r/[id]`) are per-sale permalinks, so neither belongs in the sitemap.
 * Keeping the list here (rather than a hand-edited public/sitemap.xml) means a
 * new public page cannot go missing from it.
 *
 * `lastModified` is pinned to a real date per route instead of `new Date()`.
 * Every build previously stamped "now" on all six URLs, which is not true and
 * trains crawlers to ignore the field. Bump these when the page meaningfully
 * changes.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes: {
    path: string;
    lastModified: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }[] = [
    { path: "/", lastModified: "2026-10-01", changeFrequency: "weekly", priority: 1.0 },
    { path: "/downloads", lastModified: "2026-09-30", changeFrequency: "weekly", priority: 0.9 },
    { path: "/help", lastModified: "2026-10-01", changeFrequency: "monthly", priority: 0.8 },
    { path: "/privacy", lastModified: "2026-09-30", changeFrequency: "yearly", priority: 0.4 },
    { path: "/terms", lastModified: "2026-09-30", changeFrequency: "yearly", priority: 0.4 },
    { path: "/login", lastModified: "2026-09-30", changeFrequency: "monthly", priority: 0.6 },
  ];

  return routes.map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified: new Date(r.lastModified),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}