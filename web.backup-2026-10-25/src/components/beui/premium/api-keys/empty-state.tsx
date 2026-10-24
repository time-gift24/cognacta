"use client";

import { KeyRound, Plus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/beui/motion/button";
import { EASE_OUT } from "@/lib/beui/ease";

const STAGE = (index: number) => ({
  duration: 0.45,
  ease: EASE_OUT,
  delay: 0.08 * index,
});

/**
 * Empty environment: a dashed key outline draws in, the badge settles, then
 * copy and action rise. Reduced motion shows everything at once.
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const reduce = useReducedMotion();
  const rise = (index: number) =>
    reduce
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: 8, filter: "blur(4px)" },
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          transition: STAGE(index),
        };

  return (
    <div className="flex flex-col items-center rounded-3xl border border-border border-dashed px-6 py-16 text-center">
      <motion.span
        {...rise(0)}
        className="relative grid size-14 place-items-center rounded-full bg-muted text-muted-foreground"
      >
        <svg
          aria-hidden
          viewBox="0 0 56 56"
          className="absolute inset-0 size-full -rotate-90"
        >
          <title>Key outline</title>
          <motion.circle
            cx="28"
            cy="28"
            r="27"
            fill="none"
            strokeWidth="1"
            strokeDasharray="170 170"
            className="stroke-border"
            initial={{ strokeDashoffset: reduce ? 0 : 170 }}
            animate={{ strokeDashoffset: 0 }}
            transition={
              reduce ? { duration: 0 } : { duration: 0.9, ease: EASE_OUT }
            }
          />
        </svg>
        <KeyRound aria-hidden className="size-5" />
      </motion.span>
      <motion.h3 {...rise(1)} className="mt-5 font-medium text-xl">
        {title}
      </motion.h3>
      <motion.p
        {...rise(2)}
        className="mt-2 max-w-sm text-muted-foreground text-sm"
      >
        {description}
      </motion.p>
      <motion.div {...rise(3)} className="mt-6">
        <Button onClick={onAction}>
          <Plus aria-hidden className="size-4" />
          {actionLabel}
        </Button>
      </motion.div>
    </div>
  );
}
