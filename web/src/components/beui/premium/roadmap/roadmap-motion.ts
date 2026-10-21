import type { TargetAndTransition, Transition } from "motion/react";
import { EASE_OUT, SPRING_LAYOUT, SPRING_PANEL } from "@/lib/beui/ease";

type Reduce = boolean | null;

const INSTANT: Transition = { duration: 0 };

/** Radius of the progress ring inside the 32px status node. */
export const RING_RADIUS = 13;

/** Circumference of the progress ring. */
export const RING = 2 * Math.PI * RING_RADIUS;

/** Scroll window over which the timeline line draws. */
export const LINE_SCROLL_OFFSET: ["start 75%", "end 60%"] = [
  "start 75%",
  "end 60%",
];

/** Shared layout spring for periods and cards reflowing after a filter. */
export const layoutTransition = (reduce: Reduce): Transition =>
  reduce ? INSTANT : SPRING_LAYOUT;

export const periodMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
} as const;

export const cardInitial = (reduce: Reduce): TargetAndTransition | false =>
  reduce ? false : { opacity: 0, y: 12, filter: "blur(4px)" };

export const cardAnimate: TargetAndTransition = {
  opacity: 1,
  y: 0,
  filter: "blur(0px)",
};

export const cardExit = (reduce: Reduce): TargetAndTransition =>
  reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, filter: "blur(4px)" };

/** Dash offset that leaves `progress` percent of the ring stroked. */
export const ringOffset = (progress: number) => RING * (1 - progress / 100);

export const ringTransition = (reduce: Reduce): Transition =>
  reduce ? INSTANT : { duration: 1.1, ease: EASE_OUT };

export const progressBarTransition = (reduce: Reduce): Transition =>
  reduce ? INSTANT : { duration: 0.9, ease: EASE_OUT, delay: 0.15 };

export const includedInitial = (reduce: Reduce): TargetAndTransition | false =>
  reduce ? false : { opacity: 0, y: 6 };

export const includedAnimate: TargetAndTransition = { opacity: 1, y: 0 };

export const includedTransition = (
  reduce: Reduce,
  index: number,
): Transition =>
  reduce ? INSTANT : { ...SPRING_PANEL, delay: 0.12 + index * 0.06 };
