"use client";

import { motion } from "motion/react";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { SECTION_RISE } from "./credit-usage-motion";
import { PaceBadge } from "./pace-badge";
import { StatCard } from "./stat-card";

export type TrendSummaryProps = {
  used: number;
  average: number;
  projected: number;
  onPace: boolean;
  labels: {
    used: string;
    average: string;
    forecast: string;
    onPace: string;
    overPace: string;
  };
};

/** Used-so-far, daily average, and forecast cards with a pace badge. */
export function TrendSummary({
  used,
  average,
  projected,
  onPace,
  labels,
}: TrendSummaryProps) {
  return (
    <motion.dl
      variants={SECTION_RISE}
      className="mt-8 grid gap-4 sm:grid-cols-3"
    >
      <StatCard label={labels.used}>
        <NumberTicker value={used} locale animateOnMount={false} />
      </StatCard>
      <StatCard label={labels.average}>
        <NumberTicker value={average} locale animateOnMount={false} />
      </StatCard>
      <StatCard
        label={labels.forecast}
        badge={
          <PaceBadge
            onPace={onPace}
            onPaceLabel={labels.onPace}
            overPaceLabel={labels.overPace}
          />
        }
      >
        <NumberTicker value={projected} locale animateOnMount={false} />
      </StatCard>
    </motion.dl>
  );
}
