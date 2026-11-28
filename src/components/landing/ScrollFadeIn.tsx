"use client";

import { ReactNode } from "react";
import { motion, MotionConfig } from "framer-motion";

interface ScrollFadeInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export default function ScrollFadeIn({
  children,
  delay = 0,
  className,
}: ScrollFadeInProps) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.14 }}
        transition={{
          duration: 0.52,
          delay,
          ease: [0.22, 1, 0.36, 1],
        }}
        className={className}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
