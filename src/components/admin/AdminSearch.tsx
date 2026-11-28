"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type OrgResult = {
  id: string;
  name: string;
  plan: string;
  status: string;
  subscriptionStatus: string | null;
  branches: number;
};

/**
 * Global command/search entry point (AIDE-ADMIN-02).
 *
 * Searches organizations through the server API and offers deep links into the
 * invoice and event workspaces with the same term. It never searches merchant
 * data and never returns records the caller's role cannot view.
 */
export default function AdminSearch({
  open,
  onClose,
  organizationsAllowed,
  billingAllowed,
  eventsAllowed,
}: {
  open: boolean;
  onClose: () => void;
  organizationsAllowed: boolean;
  billingAllowed: boolean;
  eventsAllowed: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OrgResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);

  const term = query.trim();

  useEffect(() => {
    if (!open) return;
    setActive(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open || !organizationsAllowed) return;
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/organizations?q=${encodeURIComponent(term)}&pageSize=5`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Search failed.");
        }
        const body = await res.json();
        setResults(body.organizations ?? []);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [term, open, organizationsAllowed]);

  const links = [
    ...results.map((org) => ({
      key: org.id,
      href: `/dashboard/admin/organizations/${org.id}`,
      label: org.name,
      detail: `${org.plan} · ${org.branches} branch${org.branches === 1 ? "" : "es"}${
        org.subscriptionStatus ? ` · ${org.subscriptionStatus.toLowerCase().replace(/_/g, " ")}` : " · no subscription"
      }`,
    })),
    ...(billingAllowed && term
      ? [
          {
            key: "invoices",
            href: `/dashboard/admin/billing?q=${encodeURIComponent(term)}`,
            label: `Search invoices for “${term}”`,
            detail: "Invoice number, provider reference or organization",
          },
        ]
      : []),
    ...(eventsAllowed && term
      ? [
          {
            key: "events",
            href: `/dashboard/admin/billing/events?q=${encodeURIComponent(term)}`,
            label: `Search webhook events for “${term}”`,
            detail: "Event id, correlation id or event type",
          },
        ]
      : []),
  ];

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((index) => Math.min(index + 1, Math.max(0, links.length - 1)));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((index) => Math.max(0, index - 1));
      } else if (event.key === "Enter" && links[active]) {
        event.preventDefault();
        onClose();
        router.push(links[active].href);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, links, active, onClose, router]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[75] flex items-start justify-center bg-ground/80 p-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-search-title"
        className="w-full max-w-2xl border border-rule bg-surface"
      >
        <h2 id="admin-search-title" className="sr-only">
          Search the platform
        </h2>
        <div className="flex items-center gap-2 border-b border-rule px-4 py-3">
          <label htmlFor="admin-search-input" className="sr-only">
            Search organizations, invoices or events
          </label>
          <input
            ref={inputRef}
            id="admin-search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search organizations, invoice numbers or event ids…"
            className="w-full bg-transparent font-reading text-sm text-ink placeholder:text-muted focus-visible:outline-none"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={onClose}
            className="border border-rule px-2 py-1 font-display text-[11px] font-black uppercase tracking-wider text-secondary hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Esc
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto">
          {loading && <p className="px-4 py-6 text-center font-reading text-sm text-secondary">Searching…</p>}
          {error && (
            <p role="alert" className="px-4 py-6 text-center font-reading text-sm text-danger">
              {error}
            </p>
          )}
          {!loading && !error && term.length < 2 && (
            <p className="px-4 py-6 text-center font-reading text-sm text-secondary">
              Type at least two characters to search.
            </p>
          )}
          {!loading && !error && term.length >= 2 && links.length === 0 && (
            <p className="px-4 py-6 text-center font-reading text-sm text-secondary">
              No organizations, invoices or events match “{term}”.
            </p>
          )}
          {!loading && !error && links.length > 0 && (
            <ul className="divide-y divide-rule">
              {links.map((link, index) => (
                <li key={link.key}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => {
                      onClose();
                      router.push(link.href);
                    }}
                    className={`block w-full px-4 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                      index === active ? "bg-ink/5" : ""
                    }`}
                  >
                    <span className="block font-reading text-sm text-ink">{link.label}</span>
                    <span className="block font-reading text-xs text-secondary">{link.detail}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="border-t border-rule px-4 py-2 font-display text-[11px] text-muted">
          Platform data only. Merchant POS sales and customer records are not searchable here.
        </p>
      </div>
    </div>
  );
}
