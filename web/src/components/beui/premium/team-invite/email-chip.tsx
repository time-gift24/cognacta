"use client";

import { CircleAlert, X } from "lucide-react";
import { motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import { Button } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";
import type { EmailChipData } from "./parse-emails";
import {
  type ChipExit,
  chipVariants,
  reducedChipVariants,
  SHAKE_KEYFRAMES,
  SHAKE_TRANSITION,
} from "./team-invite-motion";

export type EmailChipProps = {
  chip: EmailChipData;
  /** Increments when this chip should shake (a duplicate was entered). */
  shakeNonce?: number;
  exit: ChipExit;
  disabled?: boolean;
  onRemove: (id: string) => void;
};

export function EmailChip({
  chip,
  shakeNonce,
  exit,
  disabled,
  onRemove,
}: EmailChipProps) {
  const reduce = useReducedMotion();
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const invalid = Boolean(chip.error);

  useEffect(() => {
    if (!shakeNonce || reduce || !scope.current) return;
    animate(scope.current, SHAKE_KEYFRAMES, SHAKE_TRANSITION);
  }, [shakeNonce, reduce, animate, scope]);

  return (
    <motion.span
      ref={scope}
      layout={reduce ? false : "position"}
      variants={reduce ? reducedChipVariants : chipVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={exit}
      className={cn(
        "inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border pr-0.5 pl-3 text-sm",
        invalid
          ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : "border-border bg-background text-foreground",
      )}
    >
      {invalid ? (
        <CircleAlert aria-hidden className="-ml-1 size-3.5 shrink-0" />
      ) : null}
      <span className="min-w-0 truncate">{chip.email}</span>
      {invalid ? (
        <span className="shrink-0 text-xs opacity-80">· {chip.error}</span>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={() => onRemove(chip.id)}
        aria-label={`Remove ${chip.email}`}
        className="relative size-7 shrink-0 text-current after:absolute after:-inset-1.5 hover:bg-foreground/5"
      >
        <X aria-hidden className="size-3.5" />
      </Button>
    </motion.span>
  );
}
