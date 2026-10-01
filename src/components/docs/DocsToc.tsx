"use client";

import { useEffect, useMemo, useState } from "react";

import type { DocHeading } from "@/lib/markdown";

/**
 * On-page table of contents, mirroring the right-hand rail of the reference
 * docs. Only h2/h3 entries are listed — deeper nesting is noise in a narrow
 * column — and the current section is tracked with an IntersectionObserver.
 */
export default function DocsToc({ headings }: { headings: DocHeading[] }) {
  // Memoised on the prop identity: without this the observer would be torn down
  // and rebuilt on every render, because each render allocates a new array.
  const entries = useMemo(
    () => headings.filter((h) => h.level === 2 || h.level === 3),
    [headings]
  );
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (entries.length === 0) return;

    setActiveId(entries[0]?.id ?? "");

    const seen = new Set<string>();
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (record.isIntersecting) seen.add(record.target.id);
          else seen.delete(record.target.id);
        }
        if (seen.size > 0) {
          // Topmost visible heading wins, so the marker never jumps backwards
          // while scrolling up.
          const first = entries.find((h) => seen.has(h.id));
          if (first) setActiveId(first.id);
        }
      },
      { rootMargin: "-88px 0px -70% 0px", threshold: 0 }
    );

    for (const heading of entries) {
      const element = document.getElementById(heading.id);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <nav aria-label="On this page" className="text-sm">
      <h2 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
        On this page
      </h2>
      <ul className="space-y-1 border-l border-outline-variant">
        {entries.map((heading) => {
          const active = heading.id === activeId;
          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                aria-current={active ? "true" : undefined}
                className={`-ml-px block border-l-2 py-1 transition-colors ${
                  heading.level === 3 ? "pl-6" : "pl-3"
                } ${
                  active
                    ? "border-primary font-medium text-primary"
                    : "border-transparent text-on-surface-variant hover:border-outline hover:text-on-surface"
                }`}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}