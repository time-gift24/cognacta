import type { Variants } from "motion/react";
import { SPRING_PANEL } from "@/lib/beui/ease";

/** Maximum phone tilt toward the pointer, in degrees. */
export const TILT_DEG = 7;

/** Screen slides in from the side of travel with a soft blur. */
export const SCREEN: Variants = {
  enter: (direction: number) => ({
    x: `${direction * 24}%`,
    opacity: 0,
    filter: "blur(6px)",
  }),
  center: { x: "0%", opacity: 1, filter: "blur(0px)" },
  exit: (direction: number) => ({
    x: `${direction * -24}%`,
    opacity: 0,
    filter: "blur(6px)",
  }),
};

/** Staggers list rows inside a screen after it lands. */
export const STAGGER: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.2, staggerChildren: 0.06 } },
};

export const RISE: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: SPRING_PANEL },
};
