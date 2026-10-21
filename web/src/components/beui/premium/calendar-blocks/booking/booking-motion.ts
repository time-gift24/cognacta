import type { Transition, Variants } from "motion/react";
import { EASE_IN, EASE_OUT, SPRING_LAYOUT } from "@/lib/beui/ease";

/** Month grids slide in from the side the user is travelling towards. */
export const monthSlide: Variants = {
  enter: ({ direction, reduce }: { direction: number; reduce: boolean }) => ({
    opacity: 0,
    x: reduce ? 0 : direction * 28,
    filter: reduce ? "blur(0px)" : "blur(4px)",
  }),
  center: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { duration: 0.32, ease: EASE_OUT },
  },
  exit: ({ direction, reduce }: { direction: number; reduce: boolean }) => ({
    opacity: 0,
    x: reduce ? 0 : direction * -28,
    filter: reduce ? "blur(0px)" : "blur(4px)",
    transition: { duration: 0.15, ease: EASE_IN },
  }),
};

/** Slot rows cascade 45ms apart whenever the day or duration changes. */
export const slotList: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045 } },
};

export const slotRow: Variants = {
  hidden: ({ reduce }: { reduce: boolean }) => ({
    opacity: 0,
    y: reduce ? 0 : 8,
    filter: reduce ? "blur(0px)" : "blur(4px)",
  }),
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.4, ease: EASE_OUT },
  },
};

/** Quick cross-fade for time labels when the zone or clock format changes. */
export const labelFade: Transition = { duration: 0.16, ease: EASE_OUT };

export const panelSwap: Variants = {
  initial: ({ reduce }: { reduce: boolean }) => ({
    opacity: 0,
    y: reduce ? 0 : 10,
    filter: reduce ? "blur(0px)" : "blur(6px)",
  }),
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.36, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    filter: "blur(4px)",
    transition: { duration: 0.15, ease: EASE_IN },
  },
};

export const layoutSpring = SPRING_LAYOUT;
