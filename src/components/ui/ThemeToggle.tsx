"use client";

/**
 * Light / dark switch for the Newsprint theme.
 *
 * The state lives on `<html class="dark">` (set before first paint by the
 * inline script in `src/app/layout.tsx`), so the button does not own any
 * state — it just flips the class and remembers the choice. That keeps server
 * and client markup identical: both icons are always rendered and the active
 * one is chosen with `dark:` variants, so there is no hydration mismatch.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const toggle = () => {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    root.classList.toggle("dark", next);
    root.style.colorScheme = next ? "dark" : "light";
    try {
      localStorage.setItem("aide-theme", next ? "dark" : "light");
    } catch {
      // Private mode / storage disabled: the theme still applies for this page.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light and dark theme"
      title="Light / dark"
      className={`np-btn h-10 w-10 shrink-0 p-0 ${className}`.trim()}
    >
      {/* Moon — shown while the page is light: clicking goes dark. */}
      <svg
        className="h-4 w-4 dark:hidden"
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
      {/* Sun — shown while the page is dark: clicking goes light. */}
      <svg
        className="hidden h-4 w-4 dark:block"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.6}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0z"
        />
      </svg>
    </button>
  );
}
