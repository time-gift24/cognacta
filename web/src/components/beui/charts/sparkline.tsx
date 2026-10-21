"use client";

import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

export type SparklineProps = {
  values: readonly number[];
  /** Stroke class, such as `stroke-blue-500`. */
  strokeClassName?: string;
  strokeWidth?: number;
  width?: number;
  height?: number;
  /** Seconds before the line starts drawing. */
  delay?: number;
  /** Accessible description. Omit for decorative sparklines. */
  label?: string;
  className?: string;
};

/**
 * A compact trend line that draws in from the left. The dash offset is
 * normalized with `pathLength`, so the server-rendered state matches.
 */
export function Sparkline({
  values,
  strokeClassName = "stroke-foreground",
  strokeWidth = 1.75,
  width = 64,
  height = 24,
  delay = 0,
  label,
  className,
}: SparklineProps) {
  const reduce = useReducedMotion();
  const pad = strokeWidth;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const points = values
    .map((value, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * width;
      const y = height - pad - ((value - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-6 w-16 shrink-0 overflow-visible", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {values.length > 1 ? (
        <motion.polyline
          points={points}
          pathLength={1}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1 1"
          className={strokeClassName}
          initial={{ strokeDashoffset: reduce ? 0 : 1 }}
          animate={{ strokeDashoffset: 0 }}
          transition={
            reduce ? { duration: 0 } : { duration: 0.9, ease: EASE_OUT, delay }
          }
        />
      ) : null}
    </svg>
  );
}
