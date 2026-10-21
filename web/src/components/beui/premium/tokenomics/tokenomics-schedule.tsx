"use client";

/*
 * Monthly stacked area of unlocked supply. Areas rise in on first view.
 * Scrubbing (pointer, touch, or arrow keys) moves a guide line and rolls the
 * headline to that month. The allocation focused anywhere in the section
 * stays solid while the rest fade back, and the headline re-totals for it.
 * Dashed markers show where cliffs end. Reduced motion skips the rise.
 */

import { useReducedMotion } from "motion/react";
import { type KeyboardEvent, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import { cn } from "@/lib/beui/utils";
import {
  buildUnlockSchedule,
  compactTokens,
  type TokenAllocation,
  type TokenomicsCopy,
} from "./tokenomics-data";

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 };

export function TokenomicsSchedule({
  allocations,
  supply,
  symbol,
  copy,
  months,
  activeId,
  onActiveChange,
}: {
  allocations: readonly TokenAllocation[];
  supply: number;
  symbol: string;
  copy: TokenomicsCopy;
  /** Last month shown. */
  months: number;
  /** Allocation to emphasize, shared with the distribution chart. */
  activeId: string | null;
  onActiveChange: (id: string | null) => void;
}) {
  const reduce = useReducedMotion();
  const [scrub, setScrub] = useState<number | null>(null);
  const schedule = buildUnlockSchedule(allocations, supply, months, 1);
  const data = schedule.map((point) => ({
    month: point.month,
    ...point.values,
  }));
  const month = scrub ?? months;
  const values = schedule[month]?.values ?? {};
  const focused = allocations.find((item) => item.id === activeId);
  const unlocked = focused
    ? (values[focused.id] ?? 0)
    : Object.values(values).reduce((sum, value) => sum + value, 0);
  const base = focused ? (supply * focused.percent) / 100 : supply;
  const share = base ? (unlocked / base) * 100 : 0;
  const cliffs = [
    ...new Set(allocations.map((item) => item.cliffMonths)),
  ].filter((value) => value > 0 && value < months);
  const ticks = Array.from(
    { length: Math.floor(months / 12) + 1 },
    (_, i) => i * 12,
  );

  const onKeyDown = (event: KeyboardEvent) => {
    const current = scrub ?? months;
    let next: number | null = current;
    if (event.key === "ArrowLeft") next = Math.max(0, current - 1);
    else if (event.key === "ArrowRight") next = Math.min(months, current + 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = months;
    else if (event.key === "Escape") next = null;
    else return;
    event.preventDefault();
    setScrub(next);
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <p className="text-4xl font-medium tracking-tight tabular-nums">
            <DigitSwap value={`${share.toFixed(1)}%`} />
          </p>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {focused
              ? `of ${focused.label.toLowerCase()} unlocked`
              : `of supply ${copy.unlocked.toLowerCase()}`}
            {" by "}
            <span className="text-foreground">{copy.month(month)}</span>
          </p>
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          <DigitSwap
            value={compactTokens(unlocked)}
            className="font-medium text-foreground"
          />{" "}
          {symbol}
        </p>
      </div>

      <div
        role="slider"
        aria-label={`${copy.schedule}. ${copy.scheduleHint}`}
        aria-valuemin={0}
        aria-valuemax={months}
        aria-valuenow={month}
        aria-valuetext={`${copy.month(month)}: ${share.toFixed(1)}% unlocked`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onBlur={() => setScrub(null)}
        className="mt-6 h-72 w-full touch-pan-y rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart
            data={data}
            margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
            accessibilityLayer={false}
            onMouseMove={(state) => {
              const index = Number(state.activeTooltipIndex);
              if (Number.isInteger(index)) setScrub(index);
            }}
            onMouseLeave={() => setScrub(null)}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="2 6"
            />
            <XAxis
              dataKey="month"
              type="number"
              domain={[0, months]}
              ticks={ticks}
              tickFormatter={(value: number) =>
                value === 0 ? copy.month(0) : `M${value}`
              }
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
            />
            <YAxis
              domain={[0, supply]}
              ticks={[0, supply * 0.25, supply * 0.5, supply * 0.75, supply]}
              tickFormatter={(value: number) =>
                `${Math.round((value / supply) * 100)}%`
              }
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            {allocations.map((allocation) => (
              <Area
                key={allocation.id}
                dataKey={allocation.id}
                name={allocation.label}
                stackId="supply"
                type="linear"
                fill="currentColor"
                fillOpacity={0.9}
                stroke="var(--background)"
                strokeWidth={1.5}
                activeDot={false}
                isAnimationActive={!reduce}
                animationDuration={900}
                animationEasing="ease-out"
                onMouseEnter={() => onActiveChange(allocation.id)}
                onMouseLeave={() => onActiveChange(null)}
                className={cn(
                  allocation.text,
                  "transition-opacity duration-200",
                  activeId && activeId !== allocation.id && "opacity-20",
                )}
              />
            ))}
            {cliffs.map((cliff) => (
              <ReferenceLine
                key={cliff}
                x={cliff}
                stroke="var(--muted-foreground)"
                strokeDasharray="3 4"
                strokeOpacity={0.6}
                label={{
                  value: copy.cliffEnds,
                  position: "insideTopLeft",
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                  offset: 8,
                }}
              />
            ))}
            {scrub !== null ? (
              <ReferenceLine
                x={scrub}
                stroke="var(--foreground)"
                strokeOpacity={0.5}
              />
            ) : null}
            <Tooltip content={() => null} cursor={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
