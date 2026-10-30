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
  default: "px-6 py-3.5 text-sm",
  sm: "px-3.5 py-2 text-xs",
  lg: "px-8 py-4 text-base",
  icon: "p-2",
} as const;

/**
 * Square, clearly labeled action with thin black border.
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
  const base = "np-btn inline-flex flex-shrink-0";
  const variantCls =
    variant === "danger"
      ? "np-btn--accent"
      : variant === "ghost"
        ? ""
        : variant === "outline"
          ? ""
          : "";
  const cls = `${base} ${variantCls} ${sizes[size]} ${className}`;
  const isBusy = disabled || loading;

  const inner = loading ? (
    <>
      <span className="inline-block w-4 h-4 mr-2 border-[1.5px] border-current border-t-transparent rounded-full animate-spin" />
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
