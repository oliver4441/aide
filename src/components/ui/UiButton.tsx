"use client";

import React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import UiLoader from "./UiLoader";

const buttonVariants = cva(
  "ui-btn relative inline-flex select-none items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition-shadow duration-200 disabled:pointer-events-none disabled:opacity-70",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-on-primary shadow-lg shadow-primary/10 hover:shadow-primary/30",
        outline:
          "border border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container",
        ghost: "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
        danger: "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20",
      },
      size: {
        default: "px-6 py-3.5 text-sm",
        sm: "px-3.5 py-2 text-xs",
        lg: "px-8 py-4 text-base",
        icon: "p-2",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  }
);

export interface UiButtonProps
  extends VariantProps<typeof buttonVariants> {
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Motion-powered button with subtle press/scale feedback and a built-in loader.
 * Pass `href` to render a Next <Link>; otherwise renders a <button>.
 */
export default function UiButton({
  href,
  onClick,
  type = "button",
  disabled,
  loading,
  variant,
  size,
  className = "",
  children,
}: UiButtonProps) {
  const cls = cn(buttonVariants({ variant, size }), className);
  const isBusy = disabled || loading;

  const inner = loading ? (
    <>
      <UiLoader size={size === "sm" ? 14 : 16} />
      <span>{children}</span>
    </>
  ) : (
    children
  );

  const motionProps = {
    whileHover: isBusy ? {} : { scale: 1.02 },
    whileTap: isBusy ? {} : { scale: 0.97 },
    transition: { type: "spring", stiffness: 400, damping: 25 },
  } as const;

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={cls}>
        {inner}
      </Link>
    );
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={isBusy}
      className={cls}
      {...(motionProps as any)}
    >
      {inner}
    </motion.button>
  );
}
