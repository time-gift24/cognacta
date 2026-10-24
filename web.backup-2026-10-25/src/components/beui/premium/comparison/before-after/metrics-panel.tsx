"use client";

import { type MotionValue, motion, useTransform } from "motion/react";
import { cn } from "@/lib/beui/utils";
import type { BeforeAfterMetric } from "./before-after-data";
import { useBlendedValue } from "./use-morph-value";

function MetricRow({
  metric,
  afterShare,
  beforeLabel,
  afterLabel,
}: {
  metric: BeforeAfterMetric;
  afterShare: MotionValue<number>;
  beforeLabel: string;
  afterLabel: string;
}) {
  const reading = useBlendedValue(afterShare, metric.before, metric.after);
  const text = useTransform(
    reading,
    (v) => `${Math.round(v)}${metric.unit ?? ""}`,
  );
  const scaleX = useTransform(reading, (v) =>
    Math.min(1, Math.max(0, v / 100)),
  );
  const unit = metric.unit ?? "";
  return (
    <li className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{metric.label}</span>
        <motion.span
          aria-hidden="true"
          className="font-mono font-medium tabular-nums"
        >
          {text}
        </motion.span>
        <span className="sr-only">
          {`${beforeLabel} ${metric.before}${unit}, ${afterLabel} ${metric.after}${unit}`}
        </span>
      </div>
      <div className="h-1.5 overflow-clip rounded-full bg-muted">
        <motion.div
          style={{ scaleX }}
          className={cn(
            "h-full origin-left rounded-full",
            metric.colorClassName ?? "bg-foreground",
          )}
        />
      </div>
    </li>
  );
}

export function MetricsPanel({
  metrics,
  afterShare,
  beforeLabel,
  afterLabel,
}: {
  metrics: readonly BeforeAfterMetric[];
  afterShare: MotionValue<number>;
  beforeLabel: string;
  afterLabel: string;
}) {
  return (
    <ul className="space-y-4">
      {metrics.map((metric) => (
        <MetricRow
          key={metric.id}
          metric={metric}
          afterShare={afterShare}
          beforeLabel={beforeLabel}
          afterLabel={afterLabel}
        />
      ))}
    </ul>
  );
}
