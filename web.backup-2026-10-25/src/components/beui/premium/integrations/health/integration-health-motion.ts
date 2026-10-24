import type { Transition, Variants } from "motion/react";
import { EASE_IN, EASE_OUT, SPRING_LAYOUT } from "@/lib/beui/ease";
import type { IntegrationHealthStatus } from "./integration-health-data";

/** Gap between staged entrance groups (header, summary, toolbar, list). */
export const STAGE_GAP = 0.07;
/** Gap between rows during the first list cascade. */
export const ROW_GAP = 0.045;
/** Rows start cascading after the toolbar has landed. */
export const ROW_LEAD = 0.26;
/** Minimum visible duration of a manual sync. */
export const SYNC_DURATION_MS = 1600;

export const EXIT_TRANSITION: Transition = { duration: 0.15, ease: EASE_IN };

export const STATUS_TONES: Record<
  IntegrationHealthStatus,
  { pill: string; dot: string; stroke: string; text: string }
> = {
  healthy: {
    pill: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    stroke: "stroke-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  attention: {
    pill: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    stroke: "stroke-amber-500",
    text: "text-amber-700 dark:text-amber-300",
  },
  failing: {
    pill: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    stroke: "stroke-rose-500",
    text: "text-rose-700 dark:text-rose-300",
  },
};

export const stageContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: STAGE_GAP } },
};

export function stageItem(reduce: boolean): Variants {
  if (reduce) return { hidden: { opacity: 1 }, visible: { opacity: 1 } };
  return {
    hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.5, ease: EASE_OUT },
    },
  };
}

export type RowMotionCustom = { reduce: boolean; delay: number };

export const rowVariants: Variants = {
  hidden: ({ reduce }: RowMotionCustom) =>
    reduce ? { opacity: 1 } : { opacity: 0, y: 10, filter: "blur(4px)" },
  visible: ({ reduce, delay }: RowMotionCustom) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: reduce
      ? { duration: 0 }
      : { duration: 0.4, ease: EASE_OUT, delay },
  }),
  exit: ({ reduce }: RowMotionCustom) =>
    reduce
      ? { opacity: 0, transition: { duration: 0 } }
      : {
          opacity: 0,
          scale: 0.98,
          filter: "blur(4px)",
          transition: EXIT_TRANSITION,
        },
};

export function layoutTransition(reduce: boolean): Transition {
  return { layout: reduce ? { duration: 0 } : SPRING_LAYOUT };
}
