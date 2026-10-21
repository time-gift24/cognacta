"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EASE_OUT } from "@/lib/beui/ease";
import { formatReportValue } from "./format";
import {
  type ComparisonMetric,
  type ComparisonPoint,
  comparisonDateLabel,
} from "./period-comparison-model";

export function PeriodComparisonChart({
  points,
  metric,
  view,
  showPrevious,
}: {
  points: readonly ComparisonPoint[];
  metric: ComparisonMetric;
  view: "line" | "bar";
  showPrevious: boolean;
}) {
  const reduce = useReducedMotion();
  const fillId = useId().replaceAll(":", "");
  const format = (value: number | null) =>
    value === null ? "No observation" : formatReportValue(value, metric.format);
  return (
    <>
      <motion.figure
        key={`${metric.id}:${points[0]?.date}:${showPrevious}:${view}`}
        initial={reduce ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.35, ease: EASE_OUT }}
        aria-label={`${metric.label} by day of period`}
        className="h-64 min-w-0 sm:h-72"
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ComposedChart
            data={[...points]}
            accessibilityLayer
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            barGap={3}
            barCategoryGap="22%"
          >
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--primary)"
                  stopOpacity={0.13}
                />
                <stop
                  offset="100%"
                  stopColor="var(--primary)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 5"
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              minTickGap={32}
              interval="preserveStartEnd"
              ticks={points
                .filter(
                  (_, index) =>
                    index === 0 ||
                    index === points.length - 1 ||
                    index % Math.max(1, Math.ceil((points.length - 1) / 5)) ===
                      0,
                )
                .map((point) => point.day)}
              tickMargin={12}
              tick={{ fill: "var(--muted-foreground)", className: "text-xs" }}
              tickFormatter={(day: number) => `Day ${day}`}
            />
            <YAxis
              width={54}
              axisLine={false}
              tickLine={false}
              tickCount={4}
              tick={{ fill: "var(--muted-foreground)", className: "text-xs" }}
              tickFormatter={(value: number) =>
                new Intl.NumberFormat(metric.format?.locale ?? "en-US", {
                  notation: "compact",
                  maximumFractionDigits: 1,
                  ...(metric.format?.style === "currency"
                    ? {
                        style: "currency",
                        currency: metric.format.currency ?? "USD",
                      }
                    : {}),
                }).format(value) +
                (metric.format?.style === "percent" ? "%" : "")
              }
            />
            <Tooltip
              cursor={
                view === "line"
                  ? { stroke: "var(--border)", strokeDasharray: "3 3" }
                  : { fill: "var(--muted)", fillOpacity: 0.4 }
              }
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as
                  | ComparisonPoint
                  | undefined;
                if (!active || !point) return null;
                return (
                  <div className="rounded-xl border border-border bg-background p-3 text-xs">
                    <p className="mb-2 font-medium">Day {point.day}</p>
                    <p className="flex justify-between gap-5">
                      <span className="text-muted-foreground">
                        {comparisonDateLabel(point.date)}
                      </span>
                      <span className="tabular-nums">
                        {format(point.current)}
                      </span>
                    </p>
                    {showPrevious && point.previousDate && (
                      <p className="mt-2 flex justify-between gap-5">
                        <span className="text-muted-foreground">
                          {comparisonDateLabel(point.previousDate)}
                        </span>
                        <span className="tabular-nums">
                          {format(point.previous)}
                        </span>
                      </p>
                    )}
                  </div>
                );
              }}
            />
            {view === "line" ? (
              <>
                {showPrevious && (
                  <Line
                    dataKey="previous"
                    stroke="var(--muted-foreground)"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={points.length === 1}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                )}
                <Area
                  dataKey="current"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill={`url(#${fillId})`}
                  dot={points.length === 1}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                  connectNulls={false}
                />
              </>
            ) : (
              <>
                {showPrevious && (
                  <Bar
                    dataKey="previous"
                    fill="var(--muted-foreground)"
                    fillOpacity={0.3}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={24}
                    isAnimationActive={false}
                  />
                )}
                <Bar
                  dataKey="current"
                  fill="var(--primary)"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={24}
                  isAnimationActive={false}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </motion.figure>
      <div className="sr-only">
        <table>
          <caption>{metric.label} daily comparison</caption>
          <thead>
            <tr>
              <th scope="col">Current date</th>
              <th scope="col">Current value</th>
              {showPrevious && (
                <>
                  <th scope="col">Comparison date</th>
                  <th scope="col">Comparison value</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.date}>
                <th scope="row">{point.date}</th>
                <td>{format(point.current)}</td>
                {showPrevious && (
                  <>
                    <td>{point.previousDate}</td>
                    <td>{format(point.previous)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
