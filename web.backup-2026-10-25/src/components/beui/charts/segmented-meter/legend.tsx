"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/beui/motion/button";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { cn } from "@/lib/beui/utils";
import { useSegmentedMeter } from "./context";

export type SegmentedMeterLegendProps = {
  /** Formatter for legend values. Defaults to the meter formatter. */
  format?: (value: number) => string;
  /** Content pinned to the end of the legend row, such as a renewal note. */
  trailing?: ReactNode;
  className?: string;
};

/** Legend items share hover, focus, and selection with the track. */
export function SegmentedMeterLegend({
  format,
  trailing,
  className,
}: SegmentedMeterLegendProps) {
  const {
    placed,
    focus,
    setActive,
    onSelect,
    selectedId,
    formatValue,
    canHover,
  } = useSegmentedMeter();
  const formatLegend = format ?? formatValue;

  return (
    <div
      className={cn(
        "mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm",
        className,
      )}
    >
      {placed.map((segment) => (
        <Button
          key={segment.id}
          type="button"
          variant="plain"
          aria-pressed={onSelect ? selectedId === segment.id : undefined}
          onClick={onSelect ? () => onSelect(segment.id) : undefined}
          onPointerEnter={canHover ? () => setActive(segment.id) : undefined}
          onPointerLeave={canHover ? () => setActive(null) : undefined}
          onFocus={() => setActive(segment.id)}
          onBlur={() => setActive(null)}
          whileHover={undefined}
          whileTap={undefined}
          className={cn(
            "flex min-h-8 items-center gap-2 px-1 transition-opacity duration-200",
            focus !== null && focus !== segment.id && "opacity-40",
          )}
        >
          <span className={cn("size-2 rounded-full", segment.color)} />
          <span className="text-muted-foreground">{segment.label}</span>
          <DigitSwap
            value={formatLegend(segment.value)}
            className="font-mono text-foreground text-xs tabular-nums"
          />
        </Button>
      ))}
      {trailing ? (
        <span className="ml-auto text-muted-foreground text-xs">
          {trailing}
        </span>
      ) : null}
    </div>
  );
}
