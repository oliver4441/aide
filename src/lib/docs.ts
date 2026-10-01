import fs from "node:fs";
import path from "node:path";

import { DOC_CATEGORIES, DOC_ORDER, DOC_PAGES, docHref, type DocPage } from "./docs-nav";
import { renderMarkdown, type RenderedDoc } from "./markdown";

/**
 * Server-side helpers for the documentation section.
 *
 * Doc bodies are Markdown files under `src/content/docs`. They are read at build
 * time and pre-rendered, so the filesystem read only happens during `next build`
 * — never at request time.
 */

const CONTENT_DIR = path.join(process.cwd(), "src", "content", "docs");

function readMarkdown(page: DocPage): string {
  const file = path.join(CONTENT_DIR, `${page.file}.md`);
  return fs.readFileSync(file, "utf8");
}

export function getRenderedDoc(page: DocPage): RenderedDoc {
  return renderMarkdown(readMarkdown(page));
}

export function getDocSlugs(): string[] {
  return DOC_PAGES.filter((page) => page.slug !== "").map((page) => page.slug);
}

export type Breadcrumb = {
  name: string;
  href: string;
};

/** Home / Docs / category / page — the trail rendered above the article. */
export function getBreadcrumbs(page: DocPage): Breadcrumb[] {
  const crumbs: Breadcrumb[] = [
    { name: "Home", href: "/" },
    { name: "Docs", href: "/docs" },
  ];

  const category = DOC_CATEGORIES.find((c) => c.id === page.category);
  if (category) {
    const firstInGroup = DOC_PAGES.find((p) => p.category === page.category);
    crumbs.push({
      name: category.title,
      href: firstInGroup ? docHref(firstInGroup.slug) : "/docs",
    });
  }

  if (page.slug !== "") {
    crumbs.push({ name: page.title, href: docHref(page.slug) });
  }

  return crumbs;
}

export type DocPagerLinks = {
  previous: { title: string; href: string } | null;
  next: { title: string; href: string } | null;
};

export function getPager(slug: string): DocPagerLinks {
  const index = DOC_ORDER.indexOf(slug);
  if (index === -1) return { previous: null, next: null };

  const toLink = (value: string | undefined) => {
    if (!value) return null;
    const page = DOC_PAGES.find((p) => p.slug === value);
    if (!page) return null;
    return { title: page.title, href: docHref(page.slug) };
  };

  return {
    previous: toLink(DOC_ORDER[index - 1]),
    next: toLink(DOC_ORDER[index + 1]),
  };
}

export function getCategoryTitle(id: DocPage["category"]): string {
  return DOC_CATEGORIES.find((c) => c.id === id)?.title ?? "Docs";
}