import type { Metadata } from "next";
import Link from "next/link";

import ThemeToggle from "@/components/ThemeToggle";
import DocsMobileNav from "@/components/docs/DocsMobileNav";
import DocsSidebar from "@/components/docs/DocsSidebar";
import { SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

/**
 * Docs shell: a slim sticky header, a persistent left rail and the article
 * column — the layout of the reference docs we modelled this on.
 *
 * The on-page contents rail lives inside `DocsArticle` rather than here,
 * because its entries are per-page while this shell is shared by every page.
 *
 * This layout deliberately owns no title, description or canonical. Each page
 * supplies its own, so a new doc cannot inherit the index's URL — the same
 * class of bug that once pointed `/downloads` at the homepage.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "article",
    siteName: "Aide",
    locale: "en_KE",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Aide documentation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og.jpg"],
  },
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-outline-variant bg-surface/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 md:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.jpg" alt="Aide" className="h-8 w-8 rounded-lg object-cover" />
              <span className="font-headline text-lg font-bold text-on-surface">Aide</span>
            </Link>
            <span aria-hidden="true" className="text-outline">
              /
            </span>
            <span className="text-sm font-medium text-on-surface-variant">Docs</span>
          </div>

          <nav className="hidden items-center gap-6 text-sm md:flex" aria-label="Site">
            <Link
              href="/help"
              className="text-on-surface-variant transition-colors hover:text-on-surface"
            >
              Help centre
            </Link>
            <Link
              href="/downloads"
              className="text-on-surface-variant transition-colors hover:text-on-surface"
            >
              Get the app
            </Link>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-on-surface-variant transition-colors hover:text-on-surface"
            >
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-light"
            >
              Open Aide
            </Link>
          </div>
        </div>
        <DocsMobileNav />
      </header>

      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[248px_minmax(0,1fr)]">
          <DocsSidebar />
          <main className="min-w-0 py-10 md:py-12">{children}</main>
        </div>
      </div>

      <footer className="border-t border-outline-variant">
        <div className="mx-auto max-w-[1440px] px-4 py-8 text-sm text-on-surface-variant md:px-8">
          <p>
            Aide documentation · Built by Omix Digital Solutions ·{" "}
            <Link href="/" className="hover:text-on-surface">
              Back to the Aide website
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}