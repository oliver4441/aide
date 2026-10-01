import Link from "next/link";

import DocsContent from "./DocsContent";
import DocsPager from "./DocsPager";
import DocsToc from "./DocsToc";
import { getBreadcrumbs, getPager, getRenderedDoc, type Breadcrumb } from "@/lib/docs";
import type { DocPage } from "@/lib/docs-nav";
import type { DocHeading } from "@/lib/markdown";
import { SUPPORT_EMAIL, SITE_URL } from "@/lib/site";

function Crumbs({ trail }: { trail: Breadcrumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-on-surface-variant">
        {trail.map((crumb, index) => {
          const last = index === trail.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-1.5">
              {last ? (
                <span aria-current="page" className="text-on-surface">
                  {crumb.name}
                </span>
              ) : (
                <Link href={crumb.href} className="transition-colors hover:text-on-surface">
                  {crumb.name}
                </Link>
              )}
              {last ? null : (
                <span aria-hidden="true" className="text-outline">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Collapsed contents for narrow screens, where the sticky rail is hidden. */
function DetailsToc({ headings }: { headings: DocHeading[] }) {
  const entries = headings.filter((h) => h.level === 2);
  if (entries.length < 2) return null;

  return (
    <details className="mb-8 rounded-xl border border-outline-variant bg-surface-container-low">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-on-surface">
        On this page
      </summary>
      <ul className="space-y-1.5 border-t border-outline-variant px-4 py-3">
        {entries.map((heading) => (
          <li key={heading.id} className="text-sm">
            <a
              href={`#${heading.id}`}
              className="text-on-surface-variant transition-colors hover:text-primary"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}

/**
 * Renders one documentation page: breadcrumb trail, title, article body, the
 * on-page contents rail and the previous/next pager.
 *
 * Shared by the docs index and the catch-all route so both produce identical
 * layout. The contents rail lives here rather than in the layout because its
 * entries are per-page, while the shell is shared by every doc page.
 */
export default function DocsArticle({ page }: { page: DocPage }) {
  const { html, headings } = getRenderedDoc(page);
  const trail = getBreadcrumbs(page);
  const pager = getPager(page.slug);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.href}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="gap-12 xl:grid xl:grid-cols-[minmax(0,1fr)_216px]">
        <article className="min-w-0">
          <Crumbs trail={trail} />

          <header className="mb-8">
            <h1 className="font-headline text-3xl font-bold tracking-tight text-on-surface md:text-4xl">
              {page.title}
            </h1>
            <p className="mt-3 text-[15px] leading-7 text-on-surface-variant md:text-base">
              {page.description}
            </p>
          </header>

          <div className="xl:hidden">
            <DetailsToc headings={headings} />
          </div>

          <DocsContent html={html} />

          <DocsPager previous={pager.previous} next={pager.next} />

          <p className="mt-10 text-sm text-on-surface-variant">
            Spotted something out of date?{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:text-primary-light"
            >
              Tell us
            </a>{" "}
            and we&apos;ll fix the page.
          </p>
        </article>

        <aside className="hidden xl:block">
          <div className="sticky top-[88px] max-h-[calc(100vh-112px)] overflow-y-auto pb-10">
            <DocsToc headings={headings} />
          </div>
        </aside>
      </div>
    </>
  );
}