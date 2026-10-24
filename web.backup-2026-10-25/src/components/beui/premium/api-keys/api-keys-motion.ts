import type { Transition, Variants } from "motion/react";
import { EASE_IN, EASE_OUT, SPRING_LAYOUT } from "@/lib/beui/ease";

/** Staggers the header, tabs, and table on mount. */
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

/** Delay between rows when a list mounts. */
export const ROW_STAGGER = 0.045;

/** Rows rise in place; later rows enter on their own without the stagger. */
export function rowTransition(delay: number, reduce: boolean): Transition {
  if (reduce) return { duration: 0 };
  return {
    ...SPRING_LAYOUT,
    opacity: { duration: 0.3, delay, ease: EASE_OUT },
    y: { duration: 0.45, delay, ease: EASE_OUT },
    filter: { duration: 0.35, delay, ease: EASE_OUT },
  };
}

export const ROW_INITIAL = { opacity: 0, y: 10, filter: "blur(4px)" };

/** Short exit so the empty state and table never overlap for long. */
export const PANEL_EXIT: Transition = { duration: 0.15, ease: EASE_IN };

/** Highlight tint that fades from a newly created row. */
export const HIGHLIGHT_FADE: Transition = { duration: 2.2, ease: EASE_OUT };

/** Dialog stage swap: form out, reveal in. */
export const STAGE_VARIANTS: Variants = {
  enter: { opacity: 0, y: 10, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.35, ease: EASE_OUT, delay: 0.05 },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(6px)",
    transition: { duration: 0.15, ease: EASE_IN },
  },
};
