"use client";

import { cn } from "@/lib/beui/utils";
import { StackedBarChartAxis } from "./stacked-bar-chart/axis";
import {
  type StackedBarChartProps,
  StackedBarContext,
  useStackedBarModel,
} from "./stacked-bar-chart/context";
import { StackedBarChartPlot } from "./stacked-bar-chart/plot";
import { StackedBarChartTooltip } from "./stacked-bar-chart/tooltip";

/**
 * Stacked bars over time with an inspectable active bar.
 *
 * Compose parts as children, or omit children for a plot with a tooltip and
 * axis:
 *
 * ```tsx
 * <StackedBarChart data={days} series={series} visibleSeries={visible}>
 *   <StackedBarChartPlot className="h-64">
 *     <StackedBarChartReferenceLine value={budget} label="Budget" />
 *     <StackedBarChartTooltip />
 *   </StackedBarChartPlot>
 *   <StackedBarChartAxis />
 * </StackedBarChart>
 * ```
 */
export function StackedBarChart({
  className,
  children,
  ...props
}: StackedBarChartProps) {
  const model = useStackedBarModel(props);

  return (
    <StackedBarContext.Provider value={model}>
      <figure aria-label={model.label} className={cn("m-0 w-full", className)}>
        {children === undefined ? (
          <>
            <StackedBarChartPlot>
              <StackedBarChartTooltip />
            </StackedBarChartPlot>
            <StackedBarChartAxis />
          </>
        ) : (
          children
        )}
      </figure>
    </StackedBarContext.Provider>
  );
}

export type { ChartSeries } from "./chart-series";
export {
  type StackedBarAxisMark,
  StackedBarChartAxis,
  type StackedBarChartAxisProps,
} from "./stacked-bar-chart/axis";
export {
  type StackedBarChartProps,
  type StackedBarDatum,
  useStackedBarChart,
} from "./stacked-bar-chart/context";
export {
  StackedBarChartPlot,
  type StackedBarChartPlotProps,
} from "./stacked-bar-chart/plot";
export {
  StackedBarChartReferenceLine,
  type StackedBarChartReferenceLineProps,
} from "./stacked-bar-chart/reference-line";
export {
  StackedBarChartTooltip,
  type StackedBarChartTooltipProps,
  StackedBarTooltipContent,
} from "./stacked-bar-chart/tooltip";
