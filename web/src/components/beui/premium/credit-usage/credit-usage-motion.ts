import type { Variants } from "motion/react";
import { EASE_OUT } from "@/lib/beui/ease";

/** Staggers direct children of a credit usage section on mount. */
export const SECTION_STAGGER: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

/** Soft blur-rise used by each staged region. */
export const SECTION_RISE: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: EASE_OUT },
  },
};
