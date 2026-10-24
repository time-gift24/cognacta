"use client";

import { useReducedMotion } from "motion/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { type ChartSeries, formatChartValue } from "../chart-series";

export type StackedBarDatum = {
  id: string;
  /** Axis, tooltip, and accessible label, such as "Oct 12". */
  label: string;
  /** Value per series id. Missing series count as zero. */
  values: Record<string, number>;
};

export interface StackedBarChartProps {
  data: readonly StackedBarDatum[];
  series: readonly ChartSeries[];
  /** Series ids to draw. Defaults to every series. */
  visibleSeries?: Iterable<string>;
  /** Fades every other series, for example while a legend item is hovered. */
  highlightedSeries?: string | null;
  /**
   * Index of the first projected bar. Bars from here on render as dashed
   * placeholders at `projectedValue` and cannot be inspected.
   */
  projectFrom?: number;
  projectedValue?: number;
  /** Top of the value scale. Defaults to the tallest bar plus headroom. */
  max?: number;
  /** Controlled active bar. Pair with `onActiveIndexChange`. */
  activeIndex?: number | null;
  onActiveIndexChange?: (index: number | null) => void;
  formatValue?: (value: number) => string;
  /** Accessible name for the chart. */
  label?: string;
  className?: string;
  children?: ReactNode;
}

export function useStackedBarModel({
  data,
  series,
  visibleSeries,
  highlightedSeries = null,
  projectFrom,
  projectedValue = 0,
  max: maxProp,
  activeIndex,
  onActiveIndexChange,
  formatValue = formatChartValue,
  label = "Stacked bar chart",
}: StackedBarChartProps) {
  const reduce = useReducedMotion();
  const canHover = useHoverCapable();
  const [internalActive, setInternalActive] = useState<number | null>(null);
  const barRefs = useRef(new Map<number, HTMLButtonElement>());

  const visible = useMemo(
    () => new Set(visibleSeries ?? series.map((s) => s.id)),
    [visibleSeries, series],
  );
  const projectionStart = Math.min(projectFrom ?? data.length, data.length);

  const totalOf = useCallback(
    (datum: StackedBarDatum, onlyVisible = true) =>
      series.reduce(
        (sum, s) =>
          sum +
          (!onlyVisible || visible.has(s.id) ? (datum.values[s.id] ?? 0) : 0),
        0,
      ),
    [series, visible],
  );

  const max = useMemo(() => {
    if (maxProp) return maxProp;
    const tallest = Math.max(
      projectedValue,
      ...data.map((datum) => totalOf(datum, false)),
    );
    return Math.max(tallest * 1.08, 1);
  }, [maxProp, data, projectedValue, totalOf]);

  const rawActive = activeIndex === undefined ? internalActive : activeIndex;
  const active =
    rawActive !== null && rawActive >= 0 && rawActive < projectionStart
      ? rawActive
      : null;

  const setActive = useCallback(
    (index: number | null) => {
      if (activeIndex === undefined) setInternalActive(index);
      onActiveIndexChange?.(index);
    },
    [activeIndex, onActiveIndexChange],
  );

  const focusBar = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, projectionStart - 1));
      barRefs.current.get(clamped)?.focus();
    },
    [projectionStart],
  );

  return {
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
    label,
    reduce,
    canHover,
  };
}

export type StackedBarModel = ReturnType<typeof useStackedBarModel>;

export const StackedBarContext = createContext<StackedBarModel | null>(null);

export function useStackedBarChart() {
  const model = useContext(StackedBarContext);
  if (!model)
    throw new Error("StackedBarChart parts must be inside <StackedBarChart>");
  return model;
}
