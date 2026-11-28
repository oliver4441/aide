"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Shared primitives for the platform Admin Console (AIDE-ADMIN-02).
 *
 * Newsprint tokens only — the console is a different *workspace* from a
 * business dashboard, not a different visual language.
 */

export function money(amount: number | string | null | undefined, currency = "KES") {
  const value = Number(amount ?? 0);
  return `${currency} ${new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)}`;
}

export function shortDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function shortDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function daysFromNow(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

const STATUS_SYMBOLS: Record<string, string> = {
  ACTIVE: "●",
  TRIALING: "◐",
  PAST_DUE: "!",
  GRACE_PERIOD: "!",
  CANCELED: "×",
  EXPIRED: "×",
  SUCCEEDED: "✓",
  FAILED: "!",
  DEAD_LETTER: "!",
  PENDING: "…",
  PROCESSING: "…",
  OPEN: "○",
  PAID: "✓",
  VOID: "×",
  UNCOLLECTIBLE: "!",
  DRAFT: "○",
  PUBLISHED: "✓",
  ARCHIVED: "×",
  REFUNDED: "↩",
};

const STATUS_TONE: Record<string, string> = {
  ACTIVE: "border-success/50 text-success",
  SUCCEEDED: "border-success/50 text-success",
  PAID: "border-success/50 text-success",
  PUBLISHED: "border-success/50 text-success",
  TRIALING: "border-accent/50 text-accent",
  PENDING: "border-rule text-secondary",
  PROCESSING: "border-rule text-secondary",
  OPEN: "border-rule text-ink",
  DRAFT: "border-rule text-secondary",
  ARCHIVED: "border-rule text-muted",
  CANCELED: "border-rule text-muted",
  EXPIRED: "border-rule text-muted",
  VOID: "border-rule text-muted",
  REFUNDED: "border-rule text-secondary",
  PAST_DUE: "border-warning/60 text-warning",
  GRACE_PERIOD: "border-warning/60 text-warning",
  FAILED: "border-danger/60 text-danger",
  DEAD_LETTER: "border-danger/60 text-danger",
  UNCOLLECTIBLE: "border-danger/60 text-danger",
};

/** Status is never conveyed by colour alone: symbol + human text always. */
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone = STATUS_TONE[status] || "border-rule text-secondary";
  const symbol = STATUS_SYMBOLS[status] || "•";
  const text =
    label ?? status.toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-display text-[11px] font-black uppercase tracking-wider ${tone}`}
    >
      <span aria-hidden="true">{symbol}</span>
      {text}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  meta,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="border-b border-rule pb-5 mb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-black text-ink md:text-3xl">{title}</h1>
          {description && (
            <p className="mt-1 max-w-3xl font-reading text-sm text-secondary">{description}</p>
          )}
          {meta && <div className="mt-2 font-display text-xs text-muted">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  definition,
  href,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  definition?: string;
  href?: string;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const border =
    tone === "danger"
      ? "border-danger/50"
      : tone === "warning"
        ? "border-warning/50"
        : tone === "success"
          ? "border-success/40"
          : "border-rule";
  const content = (
    <>
      <span className="block font-display text-[11px] font-black uppercase tracking-wider text-secondary">
        {label}
      </span>
      <div className="mt-2 font-display text-2xl font-black text-ink break-words">{value}</div>
      {hint && <div className="mt-1 font-reading text-xs text-secondary">{hint}</div>}
      {definition && (
        <p className="mt-2 border-t border-rule pt-2 font-reading text-[11px] leading-snug text-muted">
          {definition}
        </p>
      )}
    </>
  );

  return href ? (
    <Link
      href={href}
      className={`block border ${border} bg-surface p-4 transition-colors hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent`}
    >
      {content}
    </Link>
  ) : (
    <div className={`border ${border} bg-surface p-4`}>{content}</div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  footer,
  id,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="border border-rule bg-surface" aria-label={title}>
      <div className="flex flex-col gap-2 border-b border-rule px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-sm font-black uppercase tracking-wider text-ink">{title}</h2>
          {description && <p className="mt-0.5 font-reading text-xs text-secondary">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
      {footer && <div className="border-t border-rule px-4 py-2 text-xs text-secondary">{footer}</div>}
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="font-display text-sm font-black text-ink">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-md font-reading text-xs text-secondary">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="border border-danger/50 bg-surface p-5" role="alert">
      <p className="font-display text-sm font-black text-ink">Something went wrong</p>
      <p className="mt-1 font-reading text-sm text-secondary">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 border border-ink px-3 py-1.5 font-display text-xs font-black uppercase tracking-wider text-ink hover:bg-ink hover:text-ground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function LoadingBlock({ rows = 4, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div className="space-y-2" role="status" aria-live="polite" aria-label={label}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-10 animate-pulse border border-rule bg-surface motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

export function FilterBar({
  onSubmit,
  children,
  actions,
}: {
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="mb-4 flex flex-col gap-3 border border-rule bg-surface p-3 lg:flex-row lg:items-end lg:justify-between"
      aria-label="Filters"
    >
      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </form>
  );
}

export function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={htmlFor}
        className="block font-display text-[11px] font-black uppercase tracking-wider text-secondary"
      >
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 font-reading text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "mt-1 w-full border border-rule bg-ground px-2.5 py-2 font-reading text-sm text-ink placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent";

export function Table({
  head,
  children,
  caption,
}: {
  head: ReactNode;
  children: ReactNode;
  caption?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-full border-collapse text-left font-reading text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="border-b border-rule bg-ground/60">
          <tr className="font-display text-[11px] uppercase tracking-wider text-secondary">{head}</tr>
        </thead>
        <tbody className="divide-y divide-rule">{children}</tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-4 py-2 font-display text-xs text-secondary"
      aria-label="Pagination"
    >
      <span>
        Page {page} of {totalPages} · {total} record{total === 1 ? "" : "s"}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="border border-rule px-2.5 py-1 font-black uppercase tracking-wider text-ink disabled:opacity-40 hover:enabled:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="border border-rule px-2.5 py-1 font-black uppercase tracking-wider text-ink disabled:opacity-40 hover:enabled:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          Next
        </button>
      </div>
    </nav>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  busy = false,
  destructive = false,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab" || !containerRef.current) return;
      const focusable = containerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ground/80 p-4 backdrop-blur-sm sm:items-center">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        aria-describedby="admin-confirm-description"
        className="w-full max-w-lg border border-rule bg-surface p-5"
      >
        <h2 id="admin-confirm-title" className="font-display text-lg font-black text-ink">
          {title}
        </h2>
        <p id="admin-confirm-description" className="mt-2 font-reading text-sm text-secondary">
          {description}
        </p>
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="border border-rule px-3 py-1.5 font-display text-xs font-black uppercase tracking-wider text-ink hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`border px-3 py-1.5 font-display text-xs font-black uppercase tracking-wider disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
              destructive
                ? "border-danger bg-danger text-ground hover:bg-danger/90"
                : "border-ink bg-ink text-ground hover:bg-ink/90"
            }`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Toast({
  message,
  tone = "success",
  onDismiss,
}: {
  message: string;
  tone?: "success" | "error";
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 left-1/2 z-[80] flex w-[min(92vw,32rem)] -translate-x-1/2 items-start gap-3 border bg-surface px-4 py-3 shadow-lg ${
        tone === "error" ? "border-danger" : "border-success"
      }`}
    >
      <span aria-hidden="true" className="font-display font-black text-ink">
        {tone === "error" ? "!" : "✓"}
      </span>
      <p className="flex-1 font-reading text-sm text-ink">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss message"
        className="font-display text-xs font-black uppercase tracking-wider text-secondary hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        Close
      </button>
    </div>
  );
}

export function DetailList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="font-display text-[11px] font-black uppercase tracking-wider text-secondary">
            {item.label}
          </dt>
          <dd className="mt-0.5 break-words font-reading text-sm text-ink">{item.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Timeline({
  items,
}: {
  items: Array<{ id: string; title: string; detail?: ReactNode; meta?: ReactNode; href?: string }>;
}) {
  if (items.length === 0) {
    return <EmptyState title="No activity yet" description="Actions taken in the console appear here." />;
  }
  return (
    <ol className="divide-y divide-rule">
      {items.map((item) => (
        <li key={item.id} className="px-4 py-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <div className="min-w-0">
              {item.href ? (
                <Link href={item.href} className="font-reading text-sm text-ink underline decoration-rule hover:decoration-ink">
                  {item.title}
                </Link>
              ) : (
                <p className="font-reading text-sm text-ink">{item.title}</p>
              )}
              {item.detail && <p className="mt-0.5 font-reading text-xs text-secondary">{item.detail}</p>}
            </div>
            {item.meta && (
              <div className="shrink-0 font-display text-[11px] text-muted">{item.meta}</div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function UsageBar({
  label,
  used,
  limit,
  unlimited,
}: {
  label: string;
  used: number;
  limit: number | null;
  unlimited: boolean;
}) {
  const percent = unlimited || !limit ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const over = !unlimited && limit !== null && used > limit;
  return (
    <div>
      <div className="flex items-baseline justify-between font-display text-xs">
        <span className="font-black uppercase tracking-wider text-secondary">{label}</span>
        <span className={over ? "font-black text-danger" : "text-ink"}>
          {used} / {unlimited ? "Unlimited" : limit}
          {over && <span className="ml-1">· over limit</span>}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full bg-rule" role="presentation">
        <div
          className={`h-full ${over ? "bg-danger" : "bg-accent"}`}
          style={{ width: unlimited ? "4%" : `${percent}%` }}
        />
      </div>
    </div>
  );
}
