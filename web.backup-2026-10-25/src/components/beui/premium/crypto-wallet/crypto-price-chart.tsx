"use client";

/*
 * Scrubbable area chart. Pointer or touch movement (and arrow keys while the
 * chart, a slider, has focus) reports the hovered index so the parent can roll its
 * headline value to that point. A guide line and dot mark the point, and a
 * dashed line marks the opening value. Reduced motion skips the redraw.
 */

import { useReducedMotion } from "motion/react";
import { type KeyboardEvent, useId } from "react";
import {
  Area,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/beui/utils";
import type { CryptoHistoryPoint } from "./crypto-wallet-data";

export function CryptoPriceChart({
  points,
  scrubIndex,
  onScrub,
  label,
  formatValue,
  trend = "up",
  className,
}: {
  points: readonly CryptoHistoryPoint[];
  scrubIndex: number | null;
  onScrub: (index: number | null) => void;
  /** Accessible name of the chart. */
  label: string;
  /** Formats values for screen-reader announcements. */
  formatValue: (value: number) => string;
  trend?: "up" | "down";
  className?: string;
}) {
  const id = useId();
  const reduce = useReducedMotion();
  const data = points.map((point, index) => ({ ...point, index }));
  const values = points.map((point) => point.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const padding = Math.max((high - low) * 0.18, high * 0.005, 0.01);
  const baseline = Math.max(0, low - padding);
  const active = scrubIndex !== null ? data[scrubIndex] : undefined;
  const shown = active ?? data[data.length - 1];

  const onKeyDown = (event: KeyboardEvent) => {
    if (!data.length) return;
    const current = scrubIndex ?? data.length - 1;
    let next: number | null = current;
    if (event.key === "ArrowLeft") next = Math.max(0, current - 1);
    else if (event.key === "ArrowRight")
      next = Math.min(data.length - 1, current + 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = data.length - 1;
    else if (event.key === "Escape") next = null;
    else return;
    event.preventDefault();
    onScrub(next);
  };

  if (points.length < 2)
    return (
      <div
        className={cn(
          "flex items-center justify-center text-sm text-muted-foreground",
          className,
        )}
      >
        History will appear here
      </div>
    );

  return (
    <div
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={data.length - 1}
      aria-valuenow={shown.index}
      aria-valuetext={`${shown.label}: ${formatValue(shown.value)}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onBlur={() => onScrub(null)}
      className={cn(
        "w-full touch-pan-y rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring",
        trend === "up"
          ? "text-emerald-500 dark:text-emerald-400"
          : "text-red-500 dark:text-red-400",
        className,
      )}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ComposedChart
          data={data}
          margin={{ top: 12, right: 4, bottom: 4, left: 4 }}
          accessibilityLayer={false}
          onMouseMove={(state) => {
            const index = Number(state.activeTooltipIndex);
            if (Number.isInteger(index)) onScrub(index);
          }}
          onMouseLeave={() => onScrub(null)}
        >
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.2} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="index" hide type="category" />
          <YAxis hide domain={[baseline, high + padding]} />
          <ReferenceLine
            y={points[0].value}
            stroke="var(--border)"
            strokeDasharray="2 5"
            ifOverflow="extendDomain"
          />
          <Area
            dataKey="value"
            type="monotone"
            baseValue={baseline}
            stroke="none"
            fill={`url(#${id}-fill)`}
            isAnimationActive={!reduce}
            animationDuration={420}
            animationEasing="ease-out"
          />
          <Line
            dataKey="value"
            type="monotone"
            stroke="currentColor"
            strokeWidth={2.25}
            dot={false}
            activeDot={false}
            isAnimationActive={!reduce}
            animationDuration={420}
            animationEasing="ease-out"
          />
          {active ? (
            <>
              <ReferenceLine
                x={active.index}
                stroke="currentColor"
                strokeOpacity={0.35}
              />
              <ReferenceDot
                x={active.index}
                y={active.value}
                r={4.5}
                fill="currentColor"
                stroke="var(--background)"
                strokeWidth={2}
              />
            </>
          ) : null}
          <Tooltip content={() => null} cursor={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
