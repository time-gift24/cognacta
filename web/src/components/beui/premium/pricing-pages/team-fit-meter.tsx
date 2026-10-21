"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/beui/utils";
import type { PricingPageLabels } from "./pricing-page-data";
import { layoutTransition } from "./pricing-page-motion";

export type TeamFitMeterProps = {
  seats: number;
  maxSeats: number;
  labels: PricingPageLabels;
  reduce: boolean | null;
};

/** Springs to the share of the plan's seat limit the team would use. */
export function TeamFitMeter({
  seats,
  maxSeats,
  labels,
  reduce,
}: TeamFitMeterProps) {
  const fits = seats <= maxSeats;
  const fill = Math.min(seats / maxSeats, 1);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{labels.teamFit}</span>
        <span
          className={cn(
            "tabular-nums transition-colors duration-200",
            fits ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {fits
            ? labels.teamFitCount(seats, maxSeats)
            : labels.teamFitLimit(maxSeats)}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={false}
          animate={{ scaleX: fill }}
          transition={layoutTransition(reduce)}
          className={cn(
            "h-full origin-left rounded-full transition-colors duration-300",
            fits ? "bg-foreground" : "bg-foreground/25",
          )}
        />
      </div>
    </div>
  );
}
