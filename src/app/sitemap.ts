import type { MetadataRoute } from "next";

const BASE = "https://aide.omixsystems.store";

/**
 * Public, indexable routes only.
 *
 * Dashboard pages sit behind NextAuth middleware and shared receipts
 * (`/r/[id]`) are per-sale permalinks, so neither belongs in the sitemap.
 * Keeping the list here (rather than a hand-edited public/sitemap.xml) means a
 * new public page cannot go missing from it.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const routes: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
    { path: "/", changeFrequency: "weekly", priority: 1.0 },
    { path: "/downloads", changeFrequency: "weekly", priority: 0.9 },
    { path: "/help", changeFrequency: "monthly", priority: 0.8 },
    { path: "/login", changeFrequency: "monthly", priority: 0.6 },
  ];

  return routes.map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
