"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { EASE_IN, EASE_OUT, SPRING_SWAP } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import { type MeterSegment, useSegmentedMeter } from "./context";

/* One tooltip glides between segments above the track. It mounts in place
 * and cross-fades its content when the active segment changes. */
export type SegmentedMeterTooltipProps = {
  /** Custom content for the active segment. */
  children?: (segment: MeterSegment & { share: number }) => ReactNode;
  /** Keeps the tooltip inside the track, as a percent from each edge. */
  edgeInset?: number;
  className?: string;
};

export function SegmentedMeterTooltip({
  children,
  edgeInset = 12,
  className,
}: SegmentedMeterTooltipProps) {
  const { placed, active, formatValue, reduce } = useSegmentedMeter();
  const segment = placed.find((s) => s.id === active) ?? null;
  const anchor = segment
    ? Math.min(Math.max(segment.center, edgeInset), 100 - edgeInset)
    : 0;

  return (
    <AnimatePresence>
      {segment ? (
        <motion.div
          key="segmented-meter-tooltip"
          aria-hidden="true"
          initial={
            reduce
              ? false
              : { opacity: 0, y: 6, scale: 0.96, left: `${anchor}%` }
          }
          animate={{ opacity: 1, y: 0, scale: 1, left: `${anchor}%` }}
          exit={
            reduce
              ? { opacity: 0, transition: { duration: 0 } }
              : {
                  opacity: 0,
                  y: 4,
                  scale: 0.97,
                  transition: { duration: 0.14, ease: EASE_IN },
                }
          }
          transition={reduce ? { duration: 0 } : SPRING_SWAP}
          className={cn(
            "pointer-events-none absolute bottom-full z-10 mb-3 -translate-x-1/2 whitespace-nowrap rounded-2xl border border-border bg-background px-3.5 py-2.5",
            className,
          )}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={segment.id}
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: EASE_OUT }}
            >
              {children ? (
                children(segment)
              ) : (
                <>
                  <p className="font-medium text-sm">{segment.label}</p>
                  <p className="mt-0.5 text-muted-foreground text-xs tabular-nums">
                    {formatValue(segment.value)} ·{" "}
                    {(segment.share * 100).toFixed(1)}% of use
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
