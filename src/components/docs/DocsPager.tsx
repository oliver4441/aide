import Link from "next/link";

import type { DocPagerLinks } from "@/lib/docs";

const ARROW = "M15 6l-6 6 6 6";

function Arrow({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={direction === "left" ? "" : "rotate-180"}
    >
      <path d={ARROW} />
    </svg>
  );
}

/** Previous/next links, following the flat reading order of the docs tree. */
export default function DocsPager({
  previous,
  next,
}: {
  previous: DocPagerLinks["previous"];
  next: DocPagerLinks["next"];
}) {
  if (!previous && !next) return null;

  const card = (
    href: string,
    title: string,
    direction: "left" | "right"
  ) => (
    <Link
      href={href}
      className={`group flex min-h-[76px] flex-col justify-center  border border-rule px-5 py-4 transition-colors hover:border-accent hover:bg-rule/15 ${
        direction === "right" ? "items-end text-right" : "items-start"
      }`}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-secondary">
        {direction === "left" ? <Arrow direction="left" /> : null}
        {direction === "left" ? "Previous" : "Next"}
        {direction === "right" ? <Arrow direction="right" /> : null}
      </span>
      <span className="mt-1 text-sm font-semibold text-ink group-hover:text-accent">
        {title}
      </span>
    </Link>
  );

  return (
    <nav
      aria-label="Documentation pages"
      className="mt-14 grid gap-4 border-t border-rule pt-8 sm:grid-cols-2"
    >
      {previous ? card(previous.href, previous.title, "left") : <span />}
      {next ? card(next.href, next.title, "right") : null}
    </nav>
  );
}