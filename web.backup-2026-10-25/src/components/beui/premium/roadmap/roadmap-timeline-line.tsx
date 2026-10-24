"use client";

import { type MotionValue, motion } from "motion/react";

export type RoadmapTimelineLineProps = {
  progress: MotionValue<number>;
  reduce: boolean | null;
};

/** Vertical rail through the node column that draws down with scroll. */
export function RoadmapTimelineLine({
  progress,
  reduce,
}: RoadmapTimelineLineProps) {
  return (
    <div
      aria-hidden="true"
      className="absolute top-4 bottom-4 left-4 w-px bg-border lg:left-[calc(10rem+2.5rem+1rem)]"
    >
      <motion.div
        style={{ scaleY: reduce ? 1 : progress }}
        className="h-full w-full origin-top bg-foreground/60"
      />
    </div>
  );
}
