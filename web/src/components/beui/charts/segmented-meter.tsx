"use client";

import { cn } from "@/lib/beui/utils";
import {
  SegmentedMeterContext,
  type SegmentedMeterProps,
  useSegmentedMeterModel,
} from "./segmented-meter/context";
import { SegmentedMeterLegend } from "./segmented-meter/legend";
import { SegmentedMeterTooltip } from "./segmented-meter/tooltip";
import { SegmentedMeterTrack } from "./segmented-meter/track";

/**
 * A capacity meter split into colored segments, with a gliding tooltip and
 * a linked legend.
 *
 * ```tsx
 * <SegmentedMeter segments={segments} max={limit} onSelect={filterBy}>
 *   <SegmentedMeterTrack className="mt-14">
 *     <SegmentedMeterTooltip />
 *   </SegmentedMeterTrack>
 *   <SegmentedMeterLegend trailing="Renews Nov 1" />
 * </SegmentedMeter>
 * ```
 */
export function SegmentedMeter({
  className,
  children,
  ...props
}: SegmentedMeterProps) {
  const model = useSegmentedMeterModel(props);

  return (
    <SegmentedMeterContext.Provider value={model}>
      <figure aria-label={model.label} className={cn("m-0 w-full", className)}>
        {children === undefined ? (
          <>
            <SegmentedMeterTrack className="mt-14">
              <SegmentedMeterTooltip />
            </SegmentedMeterTrack>
            <SegmentedMeterLegend />
          </>
        ) : (
          children
        )}
      </figure>
    </SegmentedMeterContext.Provider>
  );
}

export type { ChartSeries } from "./chart-series";
export {
  type MeterSegment,
  type SegmentedMeterProps,
  useSegmentedMeter,
} from "./segmented-meter/context";
export {
  SegmentedMeterLegend,
  type SegmentedMeterLegendProps,
} from "./segmented-meter/legend";
export {
  SegmentedMeterTooltip,
  type SegmentedMeterTooltipProps,
} from "./segmented-meter/tooltip";
export {
  SegmentedMeterTrack,
  type SegmentedMeterTrackProps,
} from "./segmented-meter/track";
