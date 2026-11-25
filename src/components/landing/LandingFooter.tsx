import Link from "next/link";
import Container from "@/components/ui/Container";
import { COMPANY_NAME, COMPANY_URL, SUPPORT_EMAIL } from "@/lib/site";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
      { label: "Downloads", href: "/downloads" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Help Centre", href: "/help" },
      { label: "Documentation", href: "/docs" },
      { label: "FAQ", href: "#faq" },
      { label: "Contact", href: `mailto:${SUPPORT_EMAIL}` },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Omix Digital", href: COMPANY_URL, external: true },
      { label: "Blog", href: "https://blog.omixsystems.store", external: true },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-rule bg-ground pb-10 pt-16">
      <Container wide>
        <div className="grid gap-12 pb-12 lg:grid-cols-[1.2fr_2fr]">
          <div className="max-w-xs">
            <Link
              href="/"
              aria-label="Aide home"
              className="font-display text-[22px] font-bold tracking-[-0.06em] text-ink"
            >
              Aide<span className="text-accent">.</span>
            </Link>
            <p className="mt-4 font-reading text-sm leading-6 text-secondary">
              Offline-first POS, inventory and reporting built for Kenyan businesses. Keep selling when the internet drops.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a
                href="https://github.com/oliver4441/aide"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Aide on GitHub"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rule bg-surface text-secondary transition hover:border-ink/40 hover:text-ink"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z"
                  />
                </svg>
              </a>
              <a
                href={COMPANY_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Omix Digital Solutions website"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rule bg-surface text-secondary transition hover:border-ink/40 hover:text-ink"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3.6 9h16.8M3.6 15h16.8M12 3a13.5 13.5 0 0 1 0 18M12 3a13.5 13.5 0 0 0 0 18" />
                </svg>
              </a>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                aria-label="Email support"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rule bg-surface text-secondary transition hover:border-ink/40 hover:text-ink"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  aria-hidden="true"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="mb-4 font-display text-[11px] font-semibold uppercase tracking-[.14em] text-muted">
                  {col.title}
                </h3>
                <ul className="space-y-3 font-reading text-sm text-secondary">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {"external" in link && link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition hover:text-ink"
                        >
                          {link.label}
                        </a>
                      ) : link.href.startsWith("#") || link.href.startsWith("mailto:") ? (
                        <a href={link.href} className="transition hover:text-ink">
                          {link.label}
                        </a>
                      ) : (
                        <Link href={link.href} className="transition hover:text-ink">
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 border-t border-rule pt-6 sm:flex-row sm:items-center">
          <p className="font-reading text-xs text-muted">
            &copy; {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.
          </p>
          <p className="font-display text-[11px] uppercase tracking-[.12em] text-muted">
            Built by {COMPANY_NAME}
          </p>
        </div>
      </Container>
    </footer>
  );
}
