"use client";

import type { ReactNode } from "react";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { cn } from "@/lib/beui/utils";
import {
  formatReportValue,
  type ReportValueFormat,
  reportChange,
} from "./format";

export type KpiHeaderMetric = {
  id: string;
  label: string;
  icon: ReactNode;
  value: number;
  format?: ReportValueFormat;
  unit?: string;
  note?: string;
  previous?: number;
  increaseIsPositive?: boolean;
};

export type KpiHeaderCardsProps = {
  metrics: readonly KpiHeaderMetric[];
  comparisonLabel?: string;
  className?: string;
  /** Smaller labels and neutral inset panels for dashboard pages. */
  compact?: boolean;
};

/** Compact KPI cards with icon headings and inset animated value panels. */
export function KpiHeaderCards({
  metrics,
  comparisonLabel = "over last month",
  className,
  compact = false,
}: KpiHeaderCardsProps) {
  return (
    <section
      aria-label="Key performance indicators"
      className={cn("@container w-full min-w-0", className)}
    >
      {metrics.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
          No metrics to display.
        </p>
      ) : (
        <dl
          className={cn(
            "grid grid-cols-1 gap-3",
            compact
              ? "@lg:grid-cols-2 @5xl:grid-cols-4"
              : "@2xl:grid-cols-2 @4xl:grid-cols-4",
          )}
        >
          {metrics.map((metric) => {
            const isPercent = metric.format?.style === "percent";
            const change =
              isPercent && metric.previous !== undefined
                ? metric.value - metric.previous
                : reportChange(metric.value, metric.previous);
            const favorable =
              change !== null &&
              change !== 0 &&
              (metric.increaseIsPositive === false ? change < 0 : change > 0);

            return (
              <div
                key={metric.id}
                className={cn(
                  "flex min-w-0 flex-col rounded-3xl border border-border p-1.5",
                  compact ? "bg-background" : "bg-muted",
                )}
              >
                <dt className="flex items-center gap-3 px-4 py-3 text-muted-foreground">
                  <span
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center rounded-full border border-border [&>svg]:size-4"
                  >
                    {metric.icon}
                  </span>
                  <span
                    className={cn(
                      "font-mono font-medium uppercase tracking-tight",
                      compact ? "text-xs" : "whitespace-nowrap text-xl",
                    )}
                  >
                    {metric.label}
                  </span>
                </dt>
                <dd
                  className={cn(
                    "flex flex-1 flex-col justify-between gap-4 rounded-2xl bg-background p-4",
                    compact && "border border-border",
                  )}
                >
                  <div className="flex min-h-9 items-center">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <NumberTicker
                        value={metric.value}
                        format={() =>
                          formatReportValue(metric.value, metric.format)
                        }
                        duration={0.6}
                        stagger={0.02}
                        className="whitespace-nowrap text-2xl font-medium tabular-nums tracking-tight text-foreground @5xl:text-3xl"
                      />
                      {metric.unit && (
                        <span className="text-sm text-muted-foreground">
                          {metric.unit}
                        </span>
                      )}
                    </div>
                  </div>
                  {metric.note && (
                    <p className="text-xs text-muted-foreground">
                      {metric.note}
                    </p>
                  )}
                  {metric.previous !== undefined && (
                    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                      {change === null ? (
                        "No comparison"
                      ) : (
                        <>
                          <NumberTicker
                            value={change}
                            prefix={change > 0 ? "+" : undefined}
                            suffix={isPercent ? " pp" : "%"}
                            format={() =>
                              formatReportValue(change, { decimals: 1 })
                            }
                            duration={0.6}
                            stagger={0.02}
                            className={cn(
                              "whitespace-nowrap font-medium tabular-nums",
                              change === 0
                                ? "text-muted-foreground"
                                : favorable
                                  ? "text-success-foreground"
                                  : "text-destructive",
                            )}
                          />
                          <span>{comparisonLabel}</span>
                        </>
                      )}
                    </p>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </section>
  );
}
