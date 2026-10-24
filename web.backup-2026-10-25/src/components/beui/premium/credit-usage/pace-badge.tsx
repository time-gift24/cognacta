"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { SPRING_SWAP } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

/** Tinted on-pace or over-pace status that pops when it changes. */
export function PaceBadge({
  onPace,
  onPaceLabel = "On pace",
  overPaceLabel = "Over pace",
}: {
  onPace: boolean;
  onPaceLabel?: string;
  overPaceLabel?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={onPace ? "on" : "over"}
        initial={reduce ? false : { opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={reduce ? { duration: 0 } : SPRING_SWAP}
        className={cn(
          "rounded-full border px-2 py-0.5 font-medium text-xs",
          onPace
            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        )}
      >
        {onPace ? onPaceLabel : overPaceLabel}
      </motion.span>
    </AnimatePresence>
  );
}
