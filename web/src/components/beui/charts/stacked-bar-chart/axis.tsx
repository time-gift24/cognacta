"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/beui/utils";
import { useStackedBarChart } from "./context";

export type StackedBarAxisMark = {
  /** Bar index the mark labels. */
  index: number;
  label: ReactNode;
  /** Draws the mark in the foreground color, for example "Today". */
  emphasis?: boolean;
};

export type StackedBarChartAxisProps = {
  /** Marks to show. Defaults to the first and last bar labels. */
  marks?: readonly StackedBarAxisMark[];
  className?: string;
};

/** Labels under the plot. The first and last marks pin to the edges. */
export function StackedBarChartAxis({
  marks,
  className,
}: StackedBarChartAxisProps) {
  const { data } = useStackedBarChart();
  const last = data.length - 1;
  const resolved =
    marks ??
    (data.length > 0
      ? [
          { index: 0, label: data[0].label },
          ...(last > 0 ? [{ index: last, label: data[last].label }] : []),
        ]
      : []);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative mt-3 h-4 font-mono text-muted-foreground text-xs",
        className,
      )}
    >
      {resolved.map((mark) => {
        const edge =
          mark.index === 0 ? "left" : mark.index === last ? "right" : null;
        return (
          <span
            key={mark.index}
            className={cn(
              "absolute top-0 whitespace-nowrap",
              edge === "left" && "left-0",
              edge === "right" && "right-0",
              !edge && "-translate-x-1/2",
              "emphasis" in mark && mark.emphasis && "text-foreground",
            )}
            style={
              edge
                ? undefined
                : { left: `${((mark.index + 0.5) / data.length) * 100}%` }
            }
          >
            {mark.label}
          </span>
        );
      })}
    </div>
  );
}
