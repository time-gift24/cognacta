"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  Minus,
} from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/beui/motion/button";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { PlanningTabs } from "@/components/beui/premium/dashboard-pages/planning-ui";
import { cn } from "@/lib/beui/utils";
import { formatReportValue } from "./format";
import { PeriodComparisonChart } from "./period-comparison-chart";
import { PeriodComparisonControls } from "./period-comparison-controls";
import {
  buildComparison,
  type ComparisonMetric,
  type ComparisonMode,
  type ComparisonRange,
  type ComparisonRecord,
  comparisonChangeLabel,
  comparisonDays,
  comparisonRangeLabel,
  shiftComparisonDate,
} from "./period-comparison-model";

export type PeriodComparisonReportProps = {
  metrics: readonly ComparisonMetric[];
  records: readonly ComparisonRecord[];
  /** Latest complete UTC day; presets stay anchored to this data snapshot. */
  asOf: string;
  title?: string;
  defaultRange?: ComparisonRange;
  defaultComparison?: ComparisonMode;
  onFiltersChange?: (filters: {
    range: ComparisonRange;
    comparison: ComparisonMode;
    metricId: string;
  }) => void;
  className?: string;
};

/** Equal-length period comparisons with explicit data coverage and aligned dates. */
export function PeriodComparisonReport({
  metrics,
  records,
  asOf,
  title = "Period comparison",
  defaultRange,
  defaultComparison = "previous",
  onFiltersChange,
  className,
}: PeriodComparisonReportProps) {
  const heading = useId();
  const [range, setRange] = useState<ComparisonRange>(
    defaultRange ?? { from: shiftComparisonDate(asOf, -27), to: asOf },
  );
  const [comparison, setComparison] =
    useState<ComparisonMode>(defaultComparison);
  const [metricId, setMetricId] = useState(metrics[0]?.id ?? "");
  const [view, setView] = useState<"line" | "bar">("line");
  const metric = metrics.find((item) => item.id === metricId) ?? metrics[0];
  const summaries = metrics.map((item) => ({
    metric: item,
    ...buildComparison(records, item, range, comparison),
  }));
  const selected = summaries.find((item) => item.metric.id === metric?.id);
  const notify = (
    nextRange: ComparisonRange,
    nextComparison: ComparisonMode,
    nextMetric: string,
  ) =>
    onFiltersChange?.({
      range: nextRange,
      comparison: nextComparison,
      metricId: nextMetric,
    });
  const value = (value: number | null, item: ComparisonMetric) =>
    value === null ? "—" : formatReportValue(value, item.format);
  const favorable =
    selected?.change !== null &&
    selected?.change !== undefined &&
    (metric?.increaseIsPositive === false
      ? selected.change < 0
      : selected.change > 0);
  const ChangeIcon =
    selected?.change === 0
      ? Minus
      : (selected?.change ?? 0) > 0
        ? ArrowUpRight
        : ArrowDownRight;
  return (
    <section
      aria-labelledby={heading}
      className={cn("@container w-full min-w-0 space-y-5", className)}
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2
            id={heading}
            className="text-2xl font-normal tracking-tight text-muted-foreground"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            See what changed, one period at a time.
          </p>
        </div>
        <PeriodComparisonControls
          range={range}
          mode={comparison}
          asOf={asOf}
          onRangeChange={(next) => {
            setRange(next);
            notify(next, comparison, metricId);
          }}
          onModeChange={(next) => {
            setComparison(next);
            notify(range, next, metricId);
          }}
        />
      </header>
      {!metric || !selected ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Add metrics to start comparing periods.
        </p>
      ) : (
        <>
          <fieldset
            aria-label="Choose comparison metric"
            className="grid gap-3 @lg:grid-cols-2 @3xl:grid-cols-3"
          >
            {summaries.map((summary) => (
              <div
                key={summary.metric.id}
                className={cn(
                  "relative flex min-w-0 flex-col gap-3 rounded-2xl border bg-background p-4 text-left transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
                  summary.metric.id === metric.id
                    ? "border-primary/60"
                    : "border-border hover:border-muted-foreground/50",
                )}
              >
                <span className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  {summary.metric.label}
                  <span className="grid size-7 place-items-center rounded-full bg-muted">
                    <ChartNoAxesCombined aria-hidden className="size-3.5" />
                  </span>
                </span>
                {summary.current.value === null ? (
                  <span className="text-3xl font-medium">—</span>
                ) : (
                  <NumberTicker
                    value={summary.current.value}
                    format={() =>
                      formatReportValue(
                        summary.current.value ?? 0,
                        summary.metric.format,
                      ).replaceAll(" ", "\u00a0")
                    }
                    startOnView={false}
                    className="text-3xl font-medium tabular-nums tracking-tight"
                  />
                )}
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {summary.change === null
                      ? comparison === "none"
                        ? summary.metric.aggregation === "average"
                          ? "Daily average"
                          : "Period total"
                        : "Comparison unavailable"
                      : comparisonChangeLabel(summary.change, summary.metric)}
                  </span>
                  {summary.change !== null && (
                    <span>
                      vs.{" "}
                      {comparison === "year"
                        ? "one year earlier"
                        : "previous period"}
                    </span>
                  )}
                </span>
                {/* Full-card control; the shared Button is always pill-shaped, so the
                    card keeps its own radius and this sits on top. */}
                <Button
                  variant="plain"
                  type="button"
                  aria-label={summary.metric.label}
                  aria-pressed={summary.metric.id === metric.id}
                  onClick={() => {
                    setMetricId(summary.metric.id);
                    notify(range, comparison, summary.metric.id);
                  }}
                  whileHover={undefined}
                  whileTap={undefined}
                  className="absolute inset-0 size-full cursor-pointer outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            ))}
          </fieldset>
          <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-background">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <h3 className="text-base font-normal text-muted-foreground">
                  {metric.label} over time
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {comparisonDays(range)} days ·{" "}
                  {metric.aggregation === "average"
                    ? "Daily average"
                    : "Period total"}
                </p>
              </div>
              <PlanningTabs
                label="Comparison chart style"
                value={view}
                onChange={(next) => setView(next as "line" | "bar")}
                options={[
                  { value: "line", label: "Line" },
                  { value: "bar", label: "Bars" },
                ]}
              />
            </div>
            <div className="grid @3xl:grid-cols-[minmax(0,1fr)_240px]">
              <div className="min-w-0 p-4 sm:p-5">
                <div className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-0.5 w-4 rounded-full bg-primary"
                    />
                    Current period
                  </span>
                  {selected.prior && (
                    <span className="inline-flex items-center gap-2">
                      <span
                        aria-hidden
                        className="w-4 border-t border-dashed border-muted-foreground"
                      />
                      {comparison === "year"
                        ? "One year earlier"
                        : "Previous period"}
                    </span>
                  )}
                </div>
                {selected.current.count === 0 ? (
                  <output className="flex h-64 items-center justify-center text-sm text-muted-foreground sm:h-72">
                    No observations in this period.
                  </output>
                ) : (
                  <PeriodComparisonChart
                    metric={metric}
                    points={selected.points}
                    view={view}
                    showPrevious={!!selected.prior}
                  />
                )}
              </div>
              <aside
                aria-label="Selected metric comparison"
                className="flex flex-col gap-5 border-t border-border p-5 @3xl:border-l @3xl:border-t-0"
              >
                <div>
                  <p className="text-xs text-muted-foreground">
                    Current period
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {comparisonRangeLabel(range)}
                  </p>
                  <p className="mt-3 text-2xl font-medium tabular-nums">
                    {value(selected.current.value, metric)}
                  </p>
                </div>
                {selected.prior && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {comparison === "year"
                        ? "One year earlier"
                        : "Previous period"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {comparisonRangeLabel(selected.prior)}
                    </p>
                    <p className="mt-3 text-2xl font-medium tabular-nums text-muted-foreground">
                      {value(selected.previous.value, metric)}
                    </p>
                  </div>
                )}
                {selected.prior && (
                  <div className="border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground">Change</p>
                    {selected.change !== null ? (
                      <p
                        className={cn(
                          "mt-2 flex items-center gap-1 text-xl font-medium tabular-nums",
                          selected.change === 0
                            ? "text-muted-foreground"
                            : favorable
                              ? "text-success-foreground"
                              : "text-destructive",
                        )}
                      >
                        <ChangeIcon aria-hidden className="size-4" />
                        {comparisonChangeLabel(selected.change, metric)}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {selected.complete && selected.previous.value === 0
                          ? "No percentage baseline"
                          : "Not enough data to compare"}
                      </p>
                    )}
                  </div>
                )}
              </aside>
            </div>
            <footer className="flex flex-wrap justify-between gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground">
              <span>
                {selected.prior
                  ? "Periods align by day, using equal day counts."
                  : "Showing the selected period."}
              </span>
              <span>
                Coverage: {selected.current.count}/{selected.points.length} days
                {selected.prior
                  ? ` · comparison ${selected.previous.count}/${selected.points.length}`
                  : ""}
              </span>
            </footer>
          </div>
          <p aria-live="polite" className="sr-only">
            Showing {metric.label}, {comparisonRangeLabel(range)}.{" "}
            {selected.change !== null
              ? `Change ${comparisonChangeLabel(selected.change, metric)}.`
              : ""}
          </p>
        </>
      )}
    </section>
  );
}
