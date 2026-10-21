"use client";

import { motion } from "motion/react";
import type { KeyboardEvent, ReactNode } from "react";
import { Button } from "@/components/beui/motion/button";
import { SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { useStackedBarChart } from "./context";

/* Bars grow from the baseline 18ms apart; series slices re-stack with a
 * layout spring when visibility changes. One bar is tabbable at a time;
 * arrow keys, Home, and End move between inspectable bars. */
const BAR_STAGGER = 0.018;
const BAR_DELAY = 0.3;

export type StackedBarChartPlotProps = {
  /** Overlays drawn in plot coordinates, such as a tooltip or reference line. */
  children?: ReactNode;
  /** Gap between bars. */
  gapClassName?: string;
  className?: string;
};

export function StackedBarChartPlot({
  children,
  gapClassName = "gap-1",
  className,
}: StackedBarChartPlotProps) {
  const {
    data,
    series,
    visible,
    highlightedSeries,
    projectionStart,
    projectedValue,
    max,
    active,
    setActive,
    focusBar,
    barRefs,
    totalOf,
    formatValue,
    reduce,
    canHover,
  } = useStackedBarChart();

  const tabbable = active ?? Math.max(projectionStart - 1, 0);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const moves: Record<string, number> = {
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      Home: 0,
      End: projectionStart - 1,
    };
    if (event.key === "Escape") {
      setActive(null);
      return;
    }
    if (!(event.key in moves)) return;
    event.preventDefault();
    focusBar(moves[event.key]);
  };

  return (
    <div className={cn("relative h-64", className)}>
      {children}
      <div className={cn("flex h-full items-end", gapClassName)}>
        {data.map((datum, index) => {
          const projected = index >= projectionStart;
          const total = projected ? projectedValue : totalOf(datum);
          const isActive = active === index;
          const dim = active !== null && !isActive && !projected;

          return (
            <Button
              key={datum.id}
              ref={(node) => {
                if (node) barRefs.current.set(index, node);
                else barRefs.current.delete(index);
              }}
              type="button"
              variant="plain"
              disabled={projected}
              tabIndex={projected ? -1 : index === tabbable ? 0 : -1}
              aria-label={
                projected
                  ? `${datum.label}, projected ${formatValue(total)}`
                  : `${datum.label}: ${formatValue(total)}`
              }
              aria-pressed={isActive}
              onPointerEnter={
                canHover && !projected ? () => setActive(index) : undefined
              }
              onPointerLeave={canHover ? () => setActive(null) : undefined}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              onKeyDown={(event) => onKeyDown(event, index)}
              whileHover={undefined}
              whileTap={undefined}
              className="relative flex h-full min-w-0 flex-1 items-end disabled:opacity-100"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-foreground/15 transition-opacity duration-150",
                  isActive ? "opacity-100" : "opacity-0",
                )}
              />
              <motion.span
                aria-hidden="true"
                initial={reduce ? false : { scaleY: 0 }}
                animate={{ scaleY: total / max, opacity: dim ? 0.35 : 1 }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : {
                        scaleY: {
                          ...SPRING_LAYOUT,
                          delay: BAR_DELAY + index * BAR_STAGGER,
                        },
                        opacity: { duration: 0.18 },
                      }
                }
                style={{ originY: 1 }}
                className={cn(
                  "relative flex h-full w-full flex-col-reverse overflow-hidden rounded-md",
                  projected && "border border-foreground/25 border-dashed",
                )}
              >
                {projected
                  ? null
                  : series.map((s) => (
                      <motion.span
                        key={s.id}
                        animate={{
                          flexGrow: visible.has(s.id)
                            ? (datum.values[s.id] ?? 0)
                            : 0,
                          opacity:
                            highlightedSeries && highlightedSeries !== s.id
                              ? 0.25
                              : 1,
                        }}
                        transition={
                          reduce
                            ? { duration: 0 }
                            : {
                                flexGrow: SPRING_LAYOUT,
                                opacity: { duration: 0.18 },
                              }
                        }
                        style={{ flexBasis: 0 }}
                        className={cn("block w-full", s.color)}
                      />
                    ))}
              </motion.span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
