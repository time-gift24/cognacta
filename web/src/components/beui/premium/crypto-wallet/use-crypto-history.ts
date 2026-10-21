"use client";

import { useState } from "react";
import type { CryptoHistoryPoint } from "./crypto-wallet-data";

/**
 * Range selection plus scrubbing for a wallet chart. Returns the value to
 * show in the headline: the scrubbed point while inspecting, otherwise the
 * latest point, along with the change since the start of the range.
 */
export function useCryptoHistory(
  history: Record<string, readonly CryptoHistoryPoint[]>,
  defaultRange?: string,
) {
  const ranges = Object.keys(history);
  const [range, setRangeState] = useState(defaultRange ?? ranges[0] ?? "");
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const current = history[range] ? range : (ranges[0] ?? "");
  const points = (history[current] ?? []).filter(
    (point) => Number.isFinite(point.value) && point.value >= 0,
  );
  const first = points[0]?.value ?? 0;
  const focus =
    scrubIndex !== null && points[scrubIndex] ? points[scrubIndex] : undefined;
  const value = focus?.value ?? points.at(-1)?.value;
  const change = value !== undefined ? value - first : 0;
  const lastChange = (points.at(-1)?.value ?? 0) - first;

  return {
    ranges,
    range: current,
    setRange: (next: string) => {
      setScrubIndex(null);
      setRangeState(next);
    },
    points,
    scrubIndex: focus ? scrubIndex : null,
    setScrubIndex,
    /** Headline value, or undefined without history. */
    value,
    change,
    percent: first > 0 ? (change / first) * 100 : null,
    /** Label of the scrubbed point, or null when showing the latest value. */
    focusLabel: focus?.label ?? null,
    /** Direction of the whole range, which colors the chart. */
    trend: lastChange >= 0 ? ("up" as const) : ("down" as const),
  };
}
