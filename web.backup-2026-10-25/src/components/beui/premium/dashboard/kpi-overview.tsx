"use client";

import { CircleHelp } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { Button } from "@/components/beui/motion/button";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { MorphicTooltip } from "@/components/beui/premium/morphic-tooltip";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import {
  formatReportValue,
  type ReportValueFormat,
  reportChange,
} from "./format";

export type KpiMetric = {
  id: string;
  label: string;
  value: number;
  previous?: number;
  format?: ReportValueFormat;
  /** Optional label beside the value, such as Orders or New users. */
  unit?: string;
  /** Chronological samples. The final seven values form the small bar chart. */
  history?: readonly number[];
  description?: string;
  /** Whether an increase is a favorable change for this metric. */
  increaseIsPositive?: boolean;
};

export type KpiOverviewProps = {
  metrics: readonly KpiMetric[];
  title?: string;
  description?: string;
  comparisonLabel?: string;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
};

function HistoryBars({ values }: { values: readonly number[] }) {
  const reduce = useReducedMotion();
  const samples = values.slice(-7);
  const max = Math.max(...samples.map(Math.abs), 1);
  if (samples.length === 0) return null;
  return (
    <div
      aria-hidden="true"
      className="flex h-12 w-16 shrink-0 items-end justify-between gap-1.5"
    >
      {samples.map((value, index) => (
        <motion.span
          // biome-ignore lint/suspicious/noArrayIndexKey: Positional bars retain their identity as the reporting samples change.
          key={index}
          initial={false}
          animate={{ scaleY: Math.max(0.12, Math.abs(value) / max) }}
          transition={{ duration: reduce ? 0 : 0.35, ease: EASE_OUT }}
          className={cn(
            "h-full w-0.5 origin-bottom rounded-full bg-foreground/15",
            index === samples.length - 3 && "bg-foreground",
          )}
        />
      ))}
    </div>
  );
}

function Change({
  metric,
  comparisonLabel,
}: {
  metric: KpiMetric;
  comparisonLabel: string;
}) {
  const change =
    metric.format?.style === "percent" && metric.previous !== undefined
      ? metric.value - metric.previous
      : reportChange(metric.value, metric.previous);
  const positive =
    change !== null &&
    change !== 0 &&
    (metric.increaseIsPositive === false ? change < 0 : change > 0);
  return (
    <p className="flex min-w-0 flex-wrap items-baseline justify-end gap-x-1 text-xs text-muted-foreground">
      <span
        className={cn(
          "font-medium tabular-nums",
          positive
            ? "text-success-foreground"
            : change !== null && change !== 0
              ? "text-destructive"
              : "text-muted-foreground",
        )}
      >
        {change === null ? (
          "—"
        ) : (
          <NumberTicker
            value={change}
            prefix={change > 0 ? "+" : undefined}
            suffix={metric.format?.style === "percent" ? " pp" : "%"}
            format={() => change.toFixed(2)}
            duration={0.6}
            stagger={0.02}
            className="whitespace-nowrap"
          />
        )}
      </span>
      <span>{change === null ? "No comparison" : comparisonLabel}</span>
    </p>
  );
}

/** A compact KPI row with inset value panels and a separate comparison footer. */
export function KpiOverview({
  metrics,
  title,
  description,
  comparisonLabel = "last period",
  loading = false,
  emptyMessage = "No metrics for this period.",
  className,
}: KpiOverviewProps) {
  const heading = useId();
  return (
    <section
      aria-labelledby={title ? heading : undefined}
      aria-label={title ? undefined : "Key performance indicators"}
      aria-busy={loading}
      className={cn("@container w-full min-w-0", className)}
    >
      {title && (
        <header className="mb-5">
          <h2 id={heading} className="text-4xl font-medium tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          )}
        </header>
      )}
      {loading ? (
        <div
          aria-live="polite"
          className="grid gap-3 @lg:grid-cols-2 @5xl:grid-cols-4"
        >
          <span className="sr-only">Loading metrics</span>
          {["a", "b", "c", "d"].map((id) => (
            <div key={id} className="h-36 rounded-2xl border border-border p-4">
              <div className="h-4 w-28 rounded-full bg-foreground/10 motion-safe:animate-pulse" />
              <div className="mt-4 h-8 w-32 rounded-lg bg-foreground/10 motion-safe:animate-pulse" />
            </div>
          ))}
        </div>
      ) : metrics.length === 0 ? (
        <p
          aria-live="polite"
          className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground"
        >
          {emptyMessage}
        </p>
      ) : (
        <dl className="grid gap-3 @lg:grid-cols-2 @5xl:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.id}
              className="min-w-0 rounded-2xl border border-border/60 bg-muted p-1"
            >
              <div className="rounded-xl border border-border bg-background px-4 py-3">
                <dt
                  className="truncate font-mono text-xl font-medium uppercase tracking-tight text-muted-foreground"
                  title={metric.label}
                >
                  {metric.label}
                </dt>
                <dd className="mt-2 flex min-h-12 items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <NumberTicker
                      value={metric.value}
                      format={() =>
                        formatReportValue(metric.value, metric.format)
                      }
                      duration={0.6}
                      stagger={0.02}
                      className="whitespace-nowrap font-mono text-3xl font-medium tabular-nums tracking-tight"
                    />
                    {metric.unit && (
                      <span className="text-xs text-muted-foreground">
                        {metric.unit}
                      </span>
                    )}
                  </div>
                  {metric.history && <HistoryBars values={metric.history} />}
                </dd>
              </div>
              <div className="flex min-h-10 items-center justify-between gap-2 px-2">
                {metric.description ? (
                  <MorphicTooltip content={metric.description} side="bottom">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`About ${metric.label}`}
                      aria-description={metric.description}
                      className="size-9 shrink-0 rounded-full text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <CircleHelp aria-hidden="true" className="size-3.5" />
                    </Button>
                  </MorphicTooltip>
                ) : (
                  <span />
                )}
                <Change metric={metric} comparisonLabel={comparisonLabel} />
              </div>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
