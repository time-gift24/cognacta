"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { EASE_IN, SPRING_SWAP } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { type StackedBarDatum, useStackedBarChart } from "./context";

/* One card glides beside the active bar's top. It mounts in place, flips
 * to the other side past the flip point, and never covers the bar. */
const OFFSET_PX = 14;

export type StackedBarChartTooltipProps = {
  /** Custom content for the active bar. Defaults to a per-series list. */
  children?: (datum: StackedBarDatum, index: number) => ReactNode;
  /** Highest point of the card as a percent of the plot height. */
  maxTop?: number;
  /** Fraction of the plot width after which the card opens to the left. */
  flipAt?: number;
  className?: string;
};

export function StackedBarChartTooltip({
  children,
  maxTop = 48,
  flipAt = 0.55,
  className,
}: StackedBarChartTooltipProps) {
  const { data, active, max, totalOf, reduce } = useStackedBarChart();
  const datum = active === null ? null : data[active];

  const center =
    active === null ? 0 : ((active + 0.5) / Math.max(data.length, 1)) * 100;
  const height = datum ? (totalOf(datum) / max) * 100 : 0;
  const top = Math.min(Math.max(100 - height - 4, 0), maxTop);
  const side = center < flipAt * 100 ? "right" : "left";
  const offset = side === "right" ? OFFSET_PX : -OFFSET_PX;
  const x = side === "right" ? "0%" : "-100%";

  return (
    <AnimatePresence>
      {datum && active !== null ? (
        <motion.div
          key="stacked-bar-tooltip"
          aria-hidden="true"
          initial={
            reduce ? false : { opacity: 0, left: `${center}%`, top: `${top}%` }
          }
          animate={{ opacity: 1, left: `${center}%`, top: `${top}%` }}
          exit={
            reduce
              ? { opacity: 0, transition: { duration: 0 } }
              : { opacity: 0, transition: { duration: 0.14, ease: EASE_IN } }
          }
          transition={reduce ? { duration: 0 } : SPRING_SWAP}
          className="pointer-events-none absolute z-20"
        >
          <motion.div
            initial={reduce ? false : { x, marginLeft: offset, scale: 0.96 }}
            animate={{ x, marginLeft: offset, scale: 1 }}
            transition={reduce ? { duration: 0 } : SPRING_SWAP}
            style={{ originX: side === "right" ? 0 : 1 }}
            className={cn(
              "w-48 rounded-2xl border border-border bg-background p-3",
              className,
            )}
          >
            {children ? (
              children(datum, active)
            ) : (
              <StackedBarTooltipContent datum={datum} />
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Default tooltip body: label, total, and one row per visible series. */
export function StackedBarTooltipContent({
  datum,
}: {
  datum: StackedBarDatum;
}) {
  const { series, visible, totalOf, formatValue } = useStackedBarChart();

  return (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-medium text-sm">{datum.label}</p>
        <p className="font-mono text-xs tabular-nums">
          {formatValue(totalOf(datum))}
        </p>
      </div>
      <ul className="mt-2 space-y-1">
        {series
          .filter((s) => visible.has(s.id))
          .map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className={cn("size-1.5 rounded-full", s.color)} />
                {s.label}
              </span>
              <span className="font-mono tabular-nums">
                {formatValue(datum.values[s.id] ?? 0)}
              </span>
            </li>
          ))}
      </ul>
    </>
  );
}
