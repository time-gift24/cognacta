"use client";

import { type MotionValue, motion, useTransform } from "motion/react";

const PILL =
  "pointer-events-none absolute top-4 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-md";

/** Each pill fades out as the divider covers its side of the frame. */
export function SideLabels({
  position,
  before,
  after,
}: {
  position: MotionValue<number>;
  before: string;
  after: string;
}) {
  const beforeOpacity = useTransform(position, [6, 22], [0, 1]);
  const afterOpacity = useTransform(position, [78, 94], [1, 0]);
  return (
    <>
      <motion.span
        aria-hidden="true"
        style={{ opacity: beforeOpacity }}
        className={`${PILL} left-4`}
      >
        {before}
      </motion.span>
      <motion.span
        aria-hidden="true"
        style={{ opacity: afterOpacity }}
        className={`${PILL} right-4`}
      >
        {after}
      </motion.span>
    </>
  );
}
