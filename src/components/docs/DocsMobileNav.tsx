"use client";

import { useEffect, useState } from "react";

import DocsNavList from "./DocsNavList";
import { DOC_NAV } from "@/lib/docs-nav";

/**
 * Small-screen stand-in for the sidebar. The rail is hidden below `lg`, so the
 * same navigation is exposed as a collapsible panel directly under the header.
 */
export default function DocsMobileNav() {
  const [open, setOpen] = useState(false);
  const [pathname, setPathname] = useState("");

  // Close the panel whenever navigation happens.
  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="docs-mobile-nav"
        className="flex w-full items-center justify-between border-b border-outline-variant bg-surface-container-low px-4 py-3 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container"
      >
        <span className="flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Browse documentation
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div
          id="docs-mobile-nav"
          className="max-h-[60vh] overflow-y-auto border-b border-outline-variant bg-surface px-4 py-4 shadow-lg"
        >
          <DocsNavList groups={DOC_NAV} onNavigate={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}