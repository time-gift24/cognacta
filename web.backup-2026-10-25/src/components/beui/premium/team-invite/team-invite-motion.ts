import type { Transition, Variants } from "motion/react";
import { EASE_IN, EASE_OUT, SPRING_BOUNCE } from "@/lib/beui/ease";

/** Delay between staged entrance sections. */
export const STAGE_STAGGER = 0.07;
/** Delay between list rows when a list mounts. */
export const ROW_STAGGER = 0.045;
/** Delay between chips leaving the composer after a send. */
export const CHIP_SEND_STAGGER = 0.04;

export const EXIT_TRANSITION: Transition = { duration: 0.15, ease: EASE_IN };

export const stageVariants: Variants = {
  hidden: { opacity: 0, y: 10, filter: "blur(6px)" },
  visible: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: EASE_OUT, delay: index * STAGE_STAGGER },
  }),
};

export const reducedStageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
};

export type ChipExit = { sent: boolean; index: number };

export const chipVariants: Variants = {
  initial: { opacity: 0, scale: 0.6, filter: "blur(4px)" },
  animate: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: SPRING_BOUNCE,
  },
  // A removed chip pops out in place; sent chips drop toward the pending
  // list one after another.
  exit: (exit: ChipExit = { sent: false, index: 0 }) =>
    exit.sent
      ? {
          opacity: 0,
          y: 28,
          scale: 0.85,
          filter: "blur(4px)",
          transition: {
            duration: 0.28,
            ease: EASE_IN,
            delay: exit.index * CHIP_SEND_STAGGER,
          },
        }
      : { opacity: 0, scale: 0.7, transition: EXIT_TRANSITION },
};

export const reducedChipVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

export const rowVariants: Variants = {
  initial: { opacity: 0, y: -10, filter: "blur(4px)" },
  animate: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.4, ease: EASE_OUT, delay },
  }),
  exit: { opacity: 0, x: 16, transition: EXIT_TRANSITION },
};

export const reducedRowVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

export const SHAKE_KEYFRAMES = { x: [0, -6, 6, -4, 4, -2, 0] };
export const SHAKE_TRANSITION: Transition = { duration: 0.4 };

export const PULSE_KEYFRAMES = { scale: [1, 0.92, 1.06, 1] };
export const PULSE_TRANSITION: Transition = { duration: 0.4, ease: EASE_OUT };
