"use client";

import { CircleHelp } from "lucide-react";
import { type ReactNode, useId } from "react";
import { Button } from "@/components/beui/motion/button";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { MorphicTooltip } from "@/components/beui/premium/morphic-tooltip";
import { cn } from "@/lib/beui/utils";
import { formatReportValue, type ReportValueFormat } from "./format";

export type KpiSummaryMetric = {
  id: string;
  label: string;
  value: number;
  format?: ReportValueFormat;
  /** An optional limit shown beside the value using the same format. */
  limit?: number;
  unit?: string;
  description?: string;
};

export type KpiSummaryCardProps = {
  title: string;
  icon?: ReactNode;
  updatedAt?: { label: string; dateTime: string };
  /** A leading metric and two supporting metrics. */
  metrics: readonly KpiSummaryMetric[];
  className?: string;
};

/** A compact account summary with a shared header and divided metrics. */
export function KpiSummaryCard({
  title,
  icon,
  updatedAt,
  metrics,
  className,
}: KpiSummaryCardProps) {
  const heading = useId();

  return (
    <section
      aria-labelledby={heading}
      className={cn(
        "@container w-full rounded-2xl border border-border bg-background p-5 sm:p-6",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground [&>svg]:size-4"
            >
              {icon}
            </span>
          )}
          <h3 id={heading} className="text-xl font-medium text-foreground">
            {title}
          </h3>
        </div>
        {updatedAt && (
          <time
            dateTime={updatedAt.dateTime}
            className="text-xs text-muted-foreground"
          >
            {updatedAt.label}
          </time>
        )}
      </header>
      {metrics.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">
          No metrics to display.
        </p>
      ) : (
        <dl className="mt-5 grid grid-cols-1 gap-5 @2xl:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.id}
              className="min-w-0 border-t border-border pt-5 first:border-t-0 first:pt-0 @2xl:border-t-0 @2xl:border-l @2xl:pl-5 @2xl:pt-0 @2xl:first:col-span-2 @2xl:first:border-l-0 @2xl:first:pl-0"
            >
              <dt className="flex min-h-9 items-center gap-1 text-sm text-muted-foreground">
                <span className="whitespace-nowrap">{metric.label}</span>
                {metric.description && (
                  <MorphicTooltip content={metric.description} side="top">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`About ${metric.label}`}
                      aria-description={metric.description}
                      className="size-9 shrink-0 rounded-full text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <CircleHelp aria-hidden="true" className="size-3.5" />
                    </Button>
                  </MorphicTooltip>
                )}
              </dt>
              <dd className="mt-1 flex min-h-7 flex-wrap items-center gap-x-2 gap-y-1">
                <NumberTicker
                  value={metric.value}
                  format={() => formatReportValue(metric.value, metric.format)}
                  duration={0.6}
                  stagger={0.02}
                  className="whitespace-nowrap text-xl font-medium tabular-nums tracking-tight text-foreground"
                />
                {metric.limit !== undefined && (
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <span aria-hidden="true">/</span>
                    <span className="sr-only">of</span>
                    <NumberTicker
                      value={metric.limit}
                      format={() =>
                        formatReportValue(metric.limit ?? 0, metric.format)
                      }
                      duration={0.6}
                      stagger={0.02}
                      className="whitespace-nowrap tabular-nums"
                    />
                  </span>
                )}
                {metric.unit && (
                  <span className="text-sm text-muted-foreground">
                    {metric.unit}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
