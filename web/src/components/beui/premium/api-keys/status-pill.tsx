"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import type { ApiKeyStatus } from "./api-keys-data";

export const STATUS_STYLES: Record<
  ApiKeyStatus,
  { pill: string; dot: string; stroke: string }
> = {
  active: {
    pill: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    stroke: "stroke-emerald-500",
  },
  expiring: {
    pill: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    stroke: "stroke-amber-500",
  },
  revoked: {
    pill: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    stroke: "stroke-muted-foreground/50",
  },
};

/** Tinted status label that cross-fades when the status changes. */
export function StatusPill({
  status,
  label,
  className,
}: {
  status: ApiKeyStatus;
  label: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const style = STATUS_STYLES[status];

  return (
    <span
      className={cn(
        "relative inline-flex h-6 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full border px-2.5 font-medium text-xs transition-colors duration-300",
        style.pill,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full transition-colors duration-300",
          style.dot,
        )}
      />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={status}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: reduce ? 0.1 : 0.22, ease: EASE_OUT }}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
