"use client";

import { AnimatePresence, motion } from "motion/react";
import { pillEnterTransition, pillExitTransition } from "./pricing-page-motion";

export type RecommendedPillProps = {
  show: boolean;
  label: string;
  reduce: boolean | null;
};

/** Blurs out of the old plan and blooms in on the newly recommended one. */
export function RecommendedPill({ show, label, reduce }: RecommendedPillProps) {
  return (
    <AnimatePresence initial={false}>
      {show ? (
        <motion.span
          key="recommended"
          initial={{ opacity: 0, scale: 0.85, y: 6, filter: "blur(4px)" }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            filter: "blur(0px)",
            transition: pillEnterTransition(reduce),
          }}
          exit={{
            opacity: 0,
            scale: 0.9,
            y: -6,
            filter: "blur(4px)",
            transition: pillExitTransition(reduce),
          }}
          className="rounded-full bg-primary px-2.5 py-1 font-medium text-primary-foreground text-xs"
        >
          {label}
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}
