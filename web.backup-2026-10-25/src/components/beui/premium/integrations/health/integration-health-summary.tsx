"use client";

import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { cn } from "@/lib/beui/utils";
import type {
  IntegrationHealthLabels,
  IntegrationHealthStatus,
} from "./integration-health-data";
import { STATUS_TONES } from "./integration-health-motion";

const ORDER: IntegrationHealthStatus[] = ["healthy", "attention", "failing"];

/** Three count tiles. Counts roll when a connection changes status. */
export function IntegrationHealthSummary({
  counts,
  labels,
}: {
  counts: Record<IntegrationHealthStatus, number>;
  labels: IntegrationHealthLabels;
}) {
  const total = counts.healthy + counts.attention + counts.failing;

  return (
    <dl aria-live="polite" className="grid grid-cols-3 gap-2 sm:gap-3">
      {ORDER.map((status) => {
        const tone = STATUS_TONES[status];
        const share = total ? counts[status] / total : 0;
        return (
          <div
            key={status}
            className="relative flex flex-col gap-3 overflow-clip rounded-2xl border border-border bg-background p-3 sm:p-4"
          >
            <dt className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
              <span
                className={cn("size-1.5 shrink-0 rounded-full", tone.dot)}
              />
              <span className="truncate">{labels[status]}</span>
            </dt>
            <dd className="flex items-end justify-between gap-2">
              <NumberTicker
                value={counts[status]}
                pad={2}
                blur
                className="font-medium text-3xl text-foreground tracking-tight"
              />
              <span className="hidden text-right text-muted-foreground text-xs sm:block">
                {labels[`${status}Hint`]}
              </span>
            </dd>
            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-0.5 bg-border/60"
            >
              <span
                className={cn(
                  "block h-full origin-left transition-transform duration-500 ease-out motion-reduce:transition-none",
                  tone.dot,
                )}
                style={{ transform: `scaleX(${share})` }}
              />
            </span>
          </div>
        );
      })}
    </dl>
  );
}
