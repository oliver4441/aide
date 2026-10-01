"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DOC_NAV, type DocNavGroup } from "@/lib/docs-nav";

type DocsNavListProps = {
  groups: DocNavGroup[];
  onNavigate?: () => void;
};

/**
 * The documentation sidebar. Rendered twice — once in the desktop rail and once
 * inside the mobile drawer — so the active-item highlight comes from the current
 * pathname rather than a prop.
 */
export default function DocsNavList({ groups, onNavigate }: DocsNavListProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Documentation" className="pb-10">
      {groups.map((group) => (
        <div key={group.id} className="mb-7">
          <h2 className="mb-2 px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
            {group.title}
          </h2>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active =
                item.href === "/docs"
                  ? pathname === "/docs"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      active
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                    }`}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}