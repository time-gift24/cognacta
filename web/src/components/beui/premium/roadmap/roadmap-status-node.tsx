"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/beui/utils";
import type { RoadmapStatus } from "./roadmap-data";
import {
  RING,
  RING_RADIUS,
  ringOffset,
  ringTransition,
} from "./roadmap-motion";

export type RoadmapStatusNodeProps = {
  status: RoadmapStatus;
  progress?: number;
  reduce: boolean | null;
  className?: string;
};

/** Timeline marker: check when shipped, progress ring in flight, dot when planned. */
export function RoadmapStatusNode({
  status,
  progress = 0,
  reduce,
  className,
}: RoadmapStatusNodeProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-8 place-items-center rounded-full bg-background",
        status === "planned" && "border border-border border-dashed",
        className,
      )}
    >
      {status === "shipped" ? (
        <span className="grid size-8 place-items-center rounded-full bg-muted">
          <Check className="size-3.5" />
        </span>
      ) : null}
      {status === "progress" ? (
        <svg
          viewBox="0 0 32 32"
          className="size-8 -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="16"
            cy="16"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="2"
            className="stroke-border"
          />
          <motion.circle
            cx="16"
            cy="16"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={RING}
            className="stroke-foreground"
            initial={{
              strokeDashoffset: reduce ? ringOffset(progress) : RING,
            }}
            whileInView={{ strokeDashoffset: ringOffset(progress) }}
            viewport={{ once: true }}
            transition={ringTransition(reduce)}
          />
        </svg>
      ) : null}
      {status === "planned" ? (
        <span className="size-1.5 rounded-full bg-muted-foreground" />
      ) : null}
    </span>
  );
}
