import type { Variants } from "motion/react";
import { EASE_IN, EASE_OUT } from "@/lib/beui/ease";

/** Page sections stage in 70ms apart. */
export const PAGE: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

/** Soft blur-rise for each page section. */
export const RISE: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: EASE_OUT },
  },
};

export const ROW_STAGGER = 0.045;
/** Rows that mount within this window of their list cascade together. */
export const CASCADE_WINDOW_MS = 260;
/** Short exit so surviving rows glide without overlap. */
export const EXIT = { duration: 0.16, ease: EASE_IN };
export const INSTANT = { duration: 0 };
