"use client";

/**
 * Dark-only theme indicator.
 *
 * The app is forced to the dark theme site-wide; this component remains as a
 * no-op indicator so existing imports in navigation/sidebar layouts keep working.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Dark theme active"
      title="Dark theme"
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rule bg-surface text-secondary ${className}`.trim()}
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.6}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998z"
        />
      </svg>
    </div>
  );
}
