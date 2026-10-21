"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { SPRING_BOUNCE } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import type { IntegrationHealthStatus } from "./integration-health-data";
import { STATUS_TONES } from "./integration-health-motion";

/**
 * Tinted status pill. When the status changes, the old pill shrinks away and
 * the new one pops in with a bouncy spring. Reduced motion swaps instantly.
 */
export function IntegrationHealthStatusPill({
  status,
  label,
  className,
}: {
  status: IntegrationHealthStatus;
  label: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const tone = STATUS_TONES[status];

  return (
    <span
      aria-live="polite"
      className={cn("relative inline-flex items-center", className)}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={status}
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={
            reduce
              ? { opacity: 0, transition: { duration: 0 } }
              : { opacity: 0, scale: 0.8, transition: { duration: 0.12 } }
          }
          transition={reduce ? { duration: 0 } : SPRING_BOUNCE}
          className={cn(
            "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 font-medium text-xs",
            tone.pill,
          )}
        >
          <span className={cn("size-1.5 rounded-full", tone.dot)} />
          {label}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
