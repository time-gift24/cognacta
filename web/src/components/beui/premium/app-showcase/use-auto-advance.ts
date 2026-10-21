import { useEffect, useRef } from "react";

/**
 * Calls `advance` once `interval` ms after `index` settles, while `running`.
 * Selecting a new index restarts the countdown.
 */
export function useAutoAdvance({
  running,
  index,
  interval,
  advance,
}: {
  running: boolean;
  index: number;
  interval: number;
  advance: () => void;
}) {
  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  // biome-ignore lint/correctness/useExhaustiveDependencies: index restarts the countdown after every change.
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => advanceRef.current(), interval);
    return () => clearTimeout(timer);
  }, [running, index, interval]);
}
