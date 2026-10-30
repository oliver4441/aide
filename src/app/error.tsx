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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ground p-6">
      <div className="relative z-10 w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <img
            src="/logo.jpg"
            alt="Aide logo"
            className="h-20 w-20 object-cover ring-4 ring-error/10"
          />
        </div>

        <h1 className="mt-2 font-display text-3xl font-bold text-ink">
          Something went wrong
        </h1>
        <p className="mb-8 mt-3 text-lg text-secondary">
          This page hit an unexpected error. Your data is safe — try again, or head
          back to a page that works.
        </p>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="w-full bg-accent px-4 py-2.5 text-sm font-semibold text-ground transition-colors hover:bg-ink sm:w-auto"
          >
            Try again
          </button>
          <a
            href="/"
            className="w-full border border-rule px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-rule/15 sm:w-auto"
          >
            Go home
          </a>
          <a
            href="/help"
            className="w-full border border-rule px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-rule/15 sm:w-auto"
          >
            Help
          </a>
        </div>

        {error.digest ? (
          <p className="mt-8 font-mono text-xs text-secondary">
            Reference: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  );
}
