import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * Global motion defaults. `reducedMotion="user"` honours the OS
 * prefers-reduced-motion setting, degrading animations to fade-only.
 * See technical-solution.md §4.1.6.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }} reducedMotion="user">
      {children}
    </MotionConfig>
  );
}
