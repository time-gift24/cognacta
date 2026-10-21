"use client";

import { Button } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";
import type { ChartSeries } from "./chart-series";

export type SeriesTogglesProps = {
  series: readonly ChartSeries[];
  /** Ids of the series currently shown. */
  visible: ReadonlySet<string>;
  onToggle: (id: string) => void;
  /** Prevents hiding the last visible series. */
  keepOne?: boolean;
  className?: string;
};

/** Pill toggles that show or hide chart series. */
export function SeriesToggles({
  series,
  visible,
  onToggle,
  keepOne = true,
  className,
}: SeriesTogglesProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {series.map((s) => {
        const on = visible.has(s.id);
        const locked = keepOne && on && visible.size === 1;
        return (
          <Button
            key={s.id}
            type="button"
            size="sm"
            variant="outline"
            aria-pressed={on}
            aria-disabled={locked || undefined}
            onClick={() => {
              if (!locked) onToggle(s.id);
            }}
            className={cn("transition-opacity", !on && "opacity-50")}
          >
            <span
              className={cn(
                "size-2 rounded-full transition-transform duration-200",
                s.color,
                !on && "scale-50",
              )}
            />
            {s.label}
          </Button>
        );
      })}
    </div>
  );
}
