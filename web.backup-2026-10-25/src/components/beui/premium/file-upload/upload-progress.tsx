"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/beui/utils";
import type { UploadStatus } from "./file-upload-data";
import { PROGRESS_SPRING } from "./file-upload-motion";

const FILL: Record<UploadStatus | "overall", string> = {
  queued: "bg-foreground/40",
  uploading: "bg-foreground",
  paused: "bg-muted-foreground/50",
  failed: "bg-rose-500",
  done: "bg-emerald-500",
  overall: "bg-foreground",
};

/**
 * Thin progress track. The fill scales from the left with a settled spring
 * so bursty progress events read as one smooth motion; reduced motion snaps.
 */
export function UploadProgress({
  value,
  status = "overall",
  label,
  className,
}: {
  value: number;
  status?: UploadStatus | "overall";
  label: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const clamped = Math.min(1, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}
    >
      <motion.div
        initial={false}
        animate={{ scaleX: clamped }}
        transition={reduce ? { duration: 0 } : PROGRESS_SPRING}
        className={cn(
          "h-full origin-left rounded-full transition-colors duration-300",
          FILL[status],
        )}
      />
    </div>
  );
}
