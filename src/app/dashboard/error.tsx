"use client";

import { useEffect } from "react";

/**
 * Error boundary for `/dashboard`.
 *
 * Separate from the root boundary because the failure modes are different: a
 * dashboard error usually means the local database or a sync call failed, and
 * the visitor is signed in and mid-task. So the escape hatches are the POS and
 * the dashboard itself rather than the marketing site.
 *
 * `reset()` only helps for transient failures — a deterministic throw will fail
 * again on re-render.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error in dashboard:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-low p-6 text-center">
        <h1 className="font-headline text-xl font-bold text-on-surface">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          This screen hit an unexpected error. Anything you already saved is still
          on this device and will sync when the connection is back.
        </p>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-light sm:w-auto"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="w-full rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container sm:w-auto"
          >
            Back to dashboard
          </a>
        </div>

        {error.digest ? (
          <p className="mt-6 font-mono text-xs text-on-surface-variant">
            Reference: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  );
}
