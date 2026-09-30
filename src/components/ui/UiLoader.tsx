"use client";

import { motion } from "framer-motion";

interface UiLoaderProps {
  size?: number;
  className?: string;
  label?: string;
}

/** Motion-driven gradient ring loader. Inherits currentColor. */
export default function UiLoader({ size = 24, className = "", label = "Loading" }: UiLoaderProps) {
  return (
    <span
      role="status"
      aria-label={label}
      aria-live="polite"
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{
          background: "conic-gradient(from 0deg, transparent 15%, currentColor 100%)",
          WebkitMask:
            "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))",
        }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
      />
    </span>
  );
}
