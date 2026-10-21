"use client";

import { EllipsisVertical } from "lucide-react";
import type { ReactNode } from "react";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import {
  AnimatedDropdown,
  AnimatedDropdownContent,
  AnimatedDropdownItem,
  AnimatedDropdownTrigger,
} from "@/components/beui/premium/animated-dropdown";
import { cn } from "@/lib/beui/utils";
import { formatReportValue, type ReportValueFormat } from "./format";

export type KpiSupportMetric = {
  id: string;
  label: string;
  icon: ReactNode;
  value: number;
  format?: ReportValueFormat;
  unit?: string;
  /** Supporting context when a period comparison is unavailable. */
  note?: string;
  /** Signed percentage change, supplied by the reporting data source. */
  change?: number;
  increaseIsPositive?: boolean;
  actions?: readonly {
    id: string;
    label: string;
    onSelect: () => void;
    disabled?: boolean;
  }[];
};

export type KpiSupportCardsProps = {
  metrics: readonly KpiSupportMetric[];
  comparisonLabel?: string;
  /** Denser labels and spacing for full dashboard compositions. */
  compact?: boolean;
  className?: string;
};

/** A connected metric row with icons, rolling values, and inline comparisons. */
export function KpiSupportCards({
  metrics,
  comparisonLabel = "vs last month",
  compact = false,
  className,
}: KpiSupportCardsProps) {
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
        <section
          aria-label="Metric cards"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to focus and scroll the metric row.
          tabIndex={0}
          className="overflow-x-auto rounded-2xl border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <dl className="flex flex-col gap-px bg-border @lg:w-max @lg:min-w-full @lg:flex-row">
            {metrics.map((metric) => {
              const change = metric.change;
              const favorable =
                change !== undefined &&
                change !== 0 &&
                (metric.increaseIsPositive === false ? change < 0 : change > 0);

              return (
                <div
                  key={metric.id}
                  className={cn(
                    "@container/metric flex min-w-0 flex-col justify-between bg-background p-4 @lg:flex-1",
                    compact
                      ? "gap-5 @lg:min-w-56"
                      : "gap-8 @lg:min-w-80 @lg:p-5",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-muted text-muted-foreground [&>svg]:size-4"
                    >
                      {metric.icon}
                    </span>
                    <dt
                      className={cn(
                        "min-w-0 flex-1 whitespace-nowrap font-mono uppercase tracking-tight text-muted-foreground",
                        compact ? "text-sm font-normal" : "text-xl font-medium",
                      )}
                    >
                      {metric.label}
                    </dt>
                    {metric.actions && metric.actions.length > 0 && (
                      <AnimatedDropdown>
                        <AnimatedDropdownTrigger
                          aria-label={`Actions for ${metric.label}`}
                          className="-mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <EllipsisVertical aria-hidden className="size-4" />
                        </AnimatedDropdownTrigger>
                        <AnimatedDropdownContent
                          align="end"
                          className="min-w-44"
                        >
                          {metric.actions.map((action) => (
                            <AnimatedDropdownItem
                              key={action.id}
                              disabled={action.disabled}
                              onSelect={action.onSelect}
                            >
                              {action.label}
                            </AnimatedDropdownItem>
                          ))}
                        </AnimatedDropdownContent>
                      </AnimatedDropdown>
                    )}
                  </div>
                  <dd className="flex flex-col items-start gap-x-4 gap-y-2 @sm/metric:flex-row @sm/metric:flex-wrap @sm/metric:items-center @sm/metric:justify-between">
                    <div className="flex min-h-9 items-center gap-2">
                      <NumberTicker
                        value={metric.value}
                        format={() =>
                          formatReportValue(metric.value, metric.format)
                        }
                        duration={0.6}
                        stagger={0.02}
                        className="whitespace-nowrap text-3xl font-medium tabular-nums tracking-tight"
                      />
                      {metric.unit && (
                        <span className="font-mono text-base text-muted-foreground">
                          {metric.unit}
                        </span>
                      )}
                    </div>
                    <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                      {change === undefined ? (
                        (metric.note ?? "No comparison")
                      ) : (
                        <>
                          <span
                            className={cn(
                              "font-mono font-medium tabular-nums",
                              change === 0
                                ? "text-muted-foreground"
                                : favorable
                                  ? "text-success-foreground"
                                  : "text-destructive",
                            )}
                          >
                            <NumberTicker
                              value={change}
                              prefix={change > 0 ? "+" : undefined}
                              suffix="%"
                              format={() =>
                                formatReportValue(change, {
                                  decimals: Number.isInteger(change) ? 0 : 1,
                                })
                              }
                              duration={0.6}
                              stagger={0.02}
                              className="whitespace-nowrap"
                            />
                          </span>
                          <span>{comparisonLabel}</span>
                        </>
                      )}
                    </p>
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      )}
    </section>
  );
}
