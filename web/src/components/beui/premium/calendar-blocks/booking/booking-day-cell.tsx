"use client";

import { motion } from "motion/react";
import type { KeyboardEvent } from "react";
import { Button } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";
import { layoutSpring } from "./booking-motion";
import { formatLongDate } from "./booking-time";

type BookingDayCellProps = {
  date: string;
  slotCount: number;
  isToday: boolean;
  isSelected: boolean;
  isUnavailable: boolean;
  pillLayoutId: string;
  reduce: boolean;
  onSelect: (date: string) => void;
  cellProps: {
    tabIndex: number;
    ref: (node: HTMLButtonElement | null) => void;
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
    onFocus: () => void;
  };
};

/** One to three dots hint at how open a day is. */
function dotCount(slots: number) {
  if (slots <= 0) return 0;
  if (slots <= 4) return 1;
  if (slots <= 9) return 2;
  return 3;
}

export function BookingDayCell({
  date,
  slotCount,
  isToday,
  isSelected,
  isUnavailable,
  pillLayoutId,
  reduce,
  onSelect,
  cellProps,
}: BookingDayCellProps) {
  const day = Number(date.slice(8));
  const dots = dotCount(slotCount);
  const description = isUnavailable
    ? "unavailable"
    : `${slotCount} open ${slotCount === 1 ? "time" : "times"}`;

  return (
    <td className="p-0.5 text-center">
      <Button
        variant="plain"
        {...cellProps}
        whileHover={undefined}
        whileTap={reduce || isUnavailable ? undefined : { scale: 0.94 }}
        aria-disabled={isUnavailable || undefined}
        aria-pressed={isSelected}
        aria-current={isToday ? "date" : undefined}
        aria-label={`${formatLongDate(date)}, ${description}`}
        onClick={() => {
          if (!isUnavailable) onSelect(date);
        }}
        className={cn(
          "relative isolate mx-auto flex size-10 flex-col items-center justify-center text-sm tabular-nums sm:size-11",
          "transition-colors duration-150",
          isUnavailable
            ? "cursor-default text-muted-foreground/45 hover:text-muted-foreground/45"
            : "font-medium text-foreground hover:bg-primary/5",
          isSelected &&
            "text-primary-foreground hover:bg-transparent hover:text-primary-foreground",
        )}
      >
        {isSelected ? (
          <motion.span
            layoutId={pillLayoutId}
            transition={reduce ? { duration: 0 } : layoutSpring}
            style={{ borderRadius: 9999 }}
            className="absolute inset-0 -z-10 bg-primary"
          />
        ) : null}
        {isToday && !isSelected ? (
          <span
            aria-hidden
            className="absolute inset-0 -z-10 rounded-full border border-foreground/25"
          />
        ) : null}
        <span className="leading-none">{day}</span>
        <span aria-hidden className="mt-1 flex h-1 items-center gap-0.5">
          {Array.from({ length: dots }, (_, index) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative dots.
              key={index}
              className={cn(
                "size-1 rounded-full transition-colors",
                isSelected ? "bg-primary-foreground/80" : "bg-primary/70",
              )}
            />
          ))}
        </span>
      </Button>
    </td>
  );
}
