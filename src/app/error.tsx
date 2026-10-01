"use client";

import { useEffect } from "react";

/**
 * Error boundary for the landing/auth/docs half of the app.
 *
 * There was previously no `error.tsx` anywhere, so an uncaught render error fell
 * through to the framework's own error screen. This keeps the failure inside the
 * site's design tokens and gives the visitor a way out.
 *
 * `reset()` re-renders the segment; Next calls this boundary again for the same
 * children, so it only recovers from a transient failure — anything deterministic
 * will throw again, which is why the links are the primary escape hatch.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep the digest visible in the console: it is the only handle support has
    // to correlate a report with a server-side log entry.
    console.error("Unhandled error in route segment:", error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface p-6">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-error/10 blur-[130px]" />

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <img
            src="/logo.jpg"
            alt="Aide logo"
            className="h-20 w-20 rounded-2xl object-cover shadow-lg ring-4 ring-error/10"
          />
        </div>

        <h1 className="mt-2 font-headline text-3xl font-bold text-on-surface">
          Something went wrong
        </h1>
        <p className="mb-8 mt-3 text-lg text-on-surface-variant">
          This page hit an unexpected error. Your data is safe — try again, or head
          back to a page that works.
        </p>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-light sm:w-auto"
          >
            Try again
          </button>
          <a
            href="/"
            className="w-full rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container sm:w-auto"
          >
            Go home
          </a>
          <a
            href="/help"
            className="w-full rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container sm:w-auto"
          >
            Help
          </a>
        </div>

        {error.digest ? (
          <p className="mt-8 font-mono text-xs text-on-surface-variant">
            Reference: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  );
}
