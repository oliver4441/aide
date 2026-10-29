"use client";

import { ReactNode } from "react";

/**
 * Newsprint: no animations. ScrollFadeIn is a pass-through wrapper.
 */
export default function ScrollFadeIn({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
