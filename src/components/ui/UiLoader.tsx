"use client";

interface UiLoaderProps {
  size?: number;
  className?: string;
  label?: string;
}

/**
 * Newsprint spinner: a square-ruled ring in the current text colour.
 * No spring physics — motion is limited to a single linear spin, so it reads as
 * a printed rule turning rather than something gliding in.
 */
export default function UiLoader({ size = 24, className = "", label = "Loading" }: UiLoaderProps) {
  return (
    <span
      role="status"
      aria-label={label}
      aria-live="polite"
      className={`inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        aria-hidden="true"
        className="block h-full w-full animate-spin rounded-full border-2 border-current border-t-transparent"
      />
    </span>
  );
}
