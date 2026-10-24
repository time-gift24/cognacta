"use client";

import { useReducedMotion } from "motion/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { type ChartSeries, formatChartValue } from "../chart-series";

export type MeterSegment = ChartSeries & {
  value: number;
};

export interface SegmentedMeterProps {
  segments: readonly MeterSegment[];
  /** Capacity of the meter. The unused remainder renders as a muted track. */
  max: number;
  /** Controlled focused segment, for linking to legends or tables. */
  activeId?: string | null;
  onActiveChange?: (id: string | null) => void;
  /** Called when a segment or legend item is clicked. */
  onSelect?: (id: string) => void;
  /** Marks the selected segment as pressed. */
  selectedId?: string | null;
  formatValue?: (value: number) => string;
  /** Accessible name for the meter. */
  label?: string;
  className?: string;
  children?: ReactNode;
}

export function useSegmentedMeterModel({
  segments,
  max,
  activeId,
  onActiveChange,
  onSelect,
  selectedId = null,
  formatValue = formatChartValue,
  label = "Usage meter",
}: SegmentedMeterProps) {
  const reduce = useReducedMotion();
  const canHover = useHoverCapable();
  const [internalActive, setInternalActive] = useState<string | null>(null);
  const active = activeId === undefined ? internalActive : activeId;

  const setActive = useCallback(
    (id: string | null) => {
      if (activeId === undefined) setInternalActive(id);
      onActiveChange?.(id);
    },
    [activeId, onActiveChange],
  );

  const layout = useMemo(() => {
    let offset = 0;
    const total = segments.reduce((sum, s) => sum + s.value, 0);
    const placed = segments.map((segment) => {
      const width = max > 0 ? (segment.value / max) * 100 : 0;
      const placedSegment = {
        ...segment,
        width,
        center: offset + width / 2,
        share: total > 0 ? segment.value / total : 0,
      };
      offset += width;
      return placedSegment;
    });
    return { placed, used: total, remainder: Math.max(0, 100 - offset) };
  }, [segments, max]);

  return {
    ...layout,
    max,
    active,
    /** Segment to emphasize: the hovered one, else the selected one. */
    focus: active ?? selectedId,
    setActive,
    onSelect,
    selectedId,
    formatValue,
    label,
    reduce,
    canHover,
  };
}

export type SegmentedMeterModel = ReturnType<typeof useSegmentedMeterModel>;

export const SegmentedMeterContext = createContext<SegmentedMeterModel | null>(
  null,
);

export function useSegmentedMeter() {
  const model = useContext(SegmentedMeterContext);
  if (!model)
    throw new Error("SegmentedMeter parts must be inside <SegmentedMeter>");
  return model;
}
