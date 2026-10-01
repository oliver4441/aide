import type { Metadata } from "next";

import { docHref, getDocPage, type DocPage } from "@/lib/docs-nav";
import { SITE_URL } from "@/lib/site";

/**
 * Per-page metadata for every docs route.
 *
 * Built from the page registry so a page cannot ship without a title, a
 * description and a self-referencing canonical. Titles use the `Docs` suffix so
 * they read "Authentication · Docs | Aide" rather than the root template's
 * "| Aide".
 */
export function docsMetadata(page: DocPage): Metadata {
  const url = `${SITE_URL}${docHref(page.slug)}`;
  const title =
    page.slug === "" ? "Documentation" : `${page.title} · Docs`;

  return {
    title,
    description: page.description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: page.description,
      url,
    },
    twitter: {
      title,
      description: page.description,
    },
  };
}

export function buildMetadata(slug: string): Metadata {
  const page = getDocPage(slug);
  // generateMetadata only runs for known slugs (dynamicParams is false), so
  // this is a type guard rather than a real branch.
  if (!page) return {};
  return docsMetadata(page);
}