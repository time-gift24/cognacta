import type { Transition, Variants } from "motion/react";
import { EASE_IN, EASE_OUT, SPRING_LAYOUT } from "@/lib/beui/ease";

/** Staggers the header, dropzone, and list on mount. */
export const SECTION_STAGGER: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

/** Soft blur-rise used by each staged region. */
export const SECTION_RISE: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: EASE_OUT },
  },
};

/** Delay between rows that mount together. */
export const ROW_STAGGER = 0.045;

export const ROW_INITIAL = { opacity: 0, y: 10, filter: "blur(4px)" };

/** Rows rise in place; the layout spring lets survivors glide on removal. */
export function rowTransition(delay: number, reduce: boolean): Transition {
  if (reduce) return { duration: 0 };
  return {
    layout: SPRING_LAYOUT,
    opacity: { duration: 0.3, delay, ease: EASE_OUT },
    y: { duration: 0.45, delay, ease: EASE_OUT },
    filter: { duration: 0.35, delay, ease: EASE_OUT },
  };
}

/** Short exit so the remaining rows glide up without overlap. */
export const ROW_EXIT: Transition = { duration: 0.15, ease: EASE_IN };

/** Label and status swaps. */
export const SWAP_VARIANTS: Variants = {
  enter: { opacity: 0, y: 6, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.25, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    y: -6,
    filter: "blur(4px)",
    transition: { duration: 0.12, ease: EASE_IN },
  },
};

/** Progress fills follow incoming values with a settled spring. */
export const PROGRESS_SPRING: Transition = {
  type: "spring",
  stiffness: 140,
  damping: 26,
  mass: 0.6,
};

/** Ambient float for the idle illustration. */
export const FLOAT_TRANSITION: Transition = {
  duration: 3.6,
  ease: "easeInOut",
  repeat: Number.POSITIVE_INFINITY,
  repeatType: "mirror",
};
