import { EASE_IN, EASE_IN_OUT, EASE_OUT, SPRING_GLIDE } from "@/lib/beui/ease";

/** Divider glide for clicks, keyboard steps, and hold-to-compare. */
export const DIVIDER_SPRING = { type: "spring", ...SPRING_GLIDE } as const;

/** One-time invitation sweep after the stage scrolls into view. */
export const SWEEP = {
  delay: 0.5,
  duration: 1.8,
  depth: 30,
  ease: EASE_IN_OUT,
} as const;

/** Keyboard step sizes, in percent of the stage width. */
export const KEY_STEP = 2;
export const PAGE_STEP = 10;

/** Scene cross-fade: the incoming photo resolves from a soft blur. */
export function sceneVariants(reduce: boolean | null) {
  return {
    initial: reduce ? { opacity: 0 } : { opacity: 0, filter: "blur(14px)" },
    animate: {
      opacity: 1,
      filter: "blur(0px)",
      transition: { duration: reduce ? 0.15 : 0.6, ease: EASE_OUT },
    },
    exit: {
      opacity: 0,
      transition: { duration: reduce ? 0.1 : 0.35, ease: EASE_IN },
    },
  };
}

/** Section entrance: header, stage, and readout blur-rise in sequence. */
export function riseVariants(reduce: boolean | null, index: number) {
  return {
    initial: reduce ? false : { opacity: 0, y: 14, filter: "blur(6px)" },
    whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
    viewport: { once: true, amount: 0.3 },
    transition: {
      duration: reduce ? 0 : 0.5,
      delay: reduce ? 0 : index * 0.07,
      ease: EASE_OUT,
    },
  } as const;
}

/** Scene-change morph for metrics and histogram bars. */
export const MORPH = { duration: 0.6, ease: EASE_OUT } as const;
