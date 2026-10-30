"use client";

import React from "react";
import Link from "next/link";

export interface UiButtonProps {
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children: React.ReactNode;
}

const sizes = {
  default: "px-5 py-2.5 text-control",
  sm: "px-3.5 py-2 text-sm",
  lg: "px-8 py-4 text-base",
  icon: "p-2",
} as const;

/**
 * Square, clearly labeled action with a thin rule border.
 * Hover inverts foreground and background immediately.
 * Pass `href` to render a Next <Link>; otherwise renders a <button>.
 */
export default function UiButton({
  href,
  onClick,
  type = "button",
  disabled,
  loading,
  variant = "primary",
  size = "default",
  className = "",
  children,
}: UiButtonProps) {
  const base = "np-btn flex-shrink-0";

  // `primary` and `danger` are the accented action; `outline` is the ruled one.
  const variantCls =
    variant === "primary" || variant === "danger"
      ? "np-btn--accent"
      : variant === "ghost"
        ? "border-transparent hover:border-ink"
        : "";

  const cls = `${base} ${variantCls} ${sizes[size]} ${className}`.replace(/\s+/g, " ").trim();
  const isBusy = disabled || loading;

  const inner = loading ? (
    <>
      <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
      <span>{children}</span>
    </>
  ) : (
    children
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={cls} aria-disabled={isBusy}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isBusy}
      className={cls}
    >
      {inner}
    </button>
  );
}
