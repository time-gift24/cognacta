"use client";

import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";
import { labelFade, layoutSpring, slotRow } from "./booking-motion";

type BookingSlotButtonProps = {
  label: string;
  /** "+1 day" style hint when the viewer's zone pushes the slot across midnight. */
  dayHint: string | null;
  selected: boolean;
  previous: boolean;
  previousLabel: string;
  confirmLabel: string;
  reduce: boolean;
  onSelect: () => void;
  onConfirm: () => void;
};

/**
 * A slot row. Selecting it squeezes the time to the left and a Confirm button
 * grows in beside it (shared layout springs). Time labels cross-fade when the
 * zone or clock format changes.
 */
export function BookingSlotButton({
  label,
  dayHint,
  selected,
  previous,
  previousLabel,
  confirmLabel,
  reduce,
  onSelect,
  onConfirm,
}: BookingSlotButtonProps) {
  const layout = !reduce;
  const transition = reduce ? { duration: 0 } : layoutSpring;

  return (
    <motion.li
      variants={slotRow}
      custom={{ reduce }}
      layout={layout}
      transition={transition}
      className="flex gap-2"
    >
      <Button
        layout={layout}
        transition={transition}
        variant="outline"
        aria-pressed={selected}
        data-booking-previous={previous || undefined}
        onClick={onSelect}
        className={cn(
          "relative h-11 min-w-0 flex-1 justify-center px-4 font-medium tabular-nums",
          selected && "border-foreground/60 bg-transparent",
          previous && !selected && "border-dashed border-foreground/40",
        )}
      >
        <span className="relative inline-grid">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={label}
              initial={{
                opacity: 0,
                filter: reduce ? "blur(0px)" : "blur(3px)",
              }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: reduce ? "blur(0px)" : "blur(3px)" }}
              transition={labelFade}
              className="whitespace-nowrap"
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </span>
        {dayHint ? (
          <span className="ml-1.5 rounded-full bg-muted px-1.5 font-mono text-muted-foreground text-xs">
            {dayHint}
          </span>
        ) : null}
        {previous ? <span className="sr-only">, {previousLabel}</span> : null}
        {previous && !selected ? (
          <span
            aria-hidden
            className="ml-1.5 hidden font-mono text-muted-foreground text-xs sm:inline"
          >
            {previousLabel}
          </span>
        ) : null}
      </Button>
      <AnimatePresence mode="popLayout" initial={false}>
        {selected ? (
          <Button
            key="confirm"
            layout={layout}
            initial={{
              opacity: 0,
              x: reduce ? 0 : 16,
              filter: reduce ? "blur(0px)" : "blur(4px)",
            }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{
              opacity: 0,
              x: reduce ? 0 : 12,
              transition: { duration: 0.12 },
            }}
            transition={transition}
            onClick={onConfirm}
            className="h-11 min-w-0 flex-1 px-4"
          >
            {confirmLabel}
            <ArrowRight aria-hidden className="size-4" />
          </Button>
        ) : null}
      </AnimatePresence>
    </motion.li>
  );
}
