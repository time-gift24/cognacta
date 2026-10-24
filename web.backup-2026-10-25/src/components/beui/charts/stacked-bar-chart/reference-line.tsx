"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/beui/utils";
import { useStackedBarChart } from "./context";

export type StackedBarChartReferenceLineProps = {
  /** Value on the chart scale where the line sits. */
  value: number;
  /** Optional pill shown at the right end of the line. */
  label?: ReactNode;
  className?: string;
};

/** A dashed horizontal guide, such as a daily budget or target. */
export function StackedBarChartReferenceLine({
  value,
  label,
  className,
}: StackedBarChartReferenceLineProps) {
  const { max } = useStackedBarChart();
  const bottom = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 z-10 border-foreground/30 border-t border-dashed",
        className,
      )}
      style={{ bottom: `${bottom}%` }}
    >
      {label ? (
        <span className="absolute -top-6 right-0 rounded-full border border-border bg-background px-2 py-0.5 text-muted-foreground text-xs">
          {label}
        </span>
      ) : null}
    </div>
  );
}
