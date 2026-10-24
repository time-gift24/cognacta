import type { Transition, Variants } from "motion/react";
import { EASE_IN, EASE_OUT, SPRING_LAYOUT, SPRING_PANEL } from "@/lib/beui/ease";

/** Staggers the intro copy and controls. */
export const INTRO: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

/** Soft blur-rise used by intro items, plan cards, and section reveals. */
export const RISE: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: EASE_OUT },
  },
};

/** Plan cards cascade after the intro has settled. */
export const CARDS: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.32, staggerChildren: 0.08 } },
};

const INSTANT: Transition = { duration: 0 };

/** Wash that fades in behind the recommended plan. */
export function washTransition(reduce: boolean | null): Transition {
  return reduce ? INSTANT : { duration: 0.5, ease: EASE_OUT };
}

/** Recommended pill blooms in after the old one has cleared. */
export function pillEnterTransition(reduce: boolean | null): Transition {
  return reduce ? INSTANT : { ...SPRING_PANEL, delay: 0.14 };
}

export function pillExitTransition(reduce: boolean | null): Transition {
  return reduce ? INSTANT : { duration: 0.16, ease: EASE_IN };
}

/** Totals and the mobile comparison panel swap on this spring. */
export function panelTransition(reduce: boolean | null): Transition {
  return reduce ? INSTANT : SPRING_PANEL;
}

/** Team-fit meter and comparison column highlight. */
export function layoutTransition(reduce: boolean | null): Transition {
  return reduce ? INSTANT : SPRING_LAYOUT;
}
