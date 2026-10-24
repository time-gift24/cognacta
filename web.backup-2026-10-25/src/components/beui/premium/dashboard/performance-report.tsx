"use client";

import { Activity, ChartColumn, ChartLine } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { type ReactNode, useId, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/beui/motion/button";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { EASE_OUT_CSS } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import {
  formatReportValue,
  type ReportValueFormat,
  reportChange,
} from "./format";

export type ReportPoint = {
  label: string;
  value: number;
  previous?: number;
  previousLabel?: string;
};
export type ReportMetric = {
  id: string;
  label: string;
  points: readonly ReportPoint[];
  format?: ReportValueFormat;
  aggregation?: "sum" | "average";
  icon?: ReactNode;
  increaseIsPositive?: boolean;
};
export type PerformanceReportProps = {
  metrics: readonly ReportMetric[];
  title?: string;
  periodLabel?: string;
  comparisonLabel?: string;
  compare?: boolean;
  metricId?: string;
  defaultMetricId?: string;
  onMetricChange?: (id: string) => void;
  controls?: ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
};

function aggregate(
  values: readonly number[],
  mode: ReportMetric["aggregation"],
) {
  const total = values.reduce((sum, value) => sum + value, 0);
  return mode === "average" && values.length ? total / values.length : total;
}
function formatAnimatedValue(value: number, format?: ReportValueFormat) {
  return formatReportValue(value, format).replaceAll(" ", "\u00a0");
}

function previousTotal(metric: ReportMetric, compare: boolean) {
  if (
    !compare ||
    !metric.points.length ||
    metric.points.some((point) => point.previous === undefined)
  )
    return undefined;
  return aggregate(
    metric.points.map((point) => point.previous ?? 0),
    metric.aggregation,
  );
}
function formatDate(label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(label)) return label;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${label}T00:00:00Z`));
}

/** Compact KPI summaries linked to keyboard-accessible bar and line charts. */
export function PerformanceReport({
  metrics,
  title = "Overview",
  periodLabel,
  comparisonLabel = "Previous period",
  compare = true,
  metricId: controlledId,
  defaultMetricId,
  onMetricChange,
  controls,
  loading = false,
  emptyMessage = "No activity for this period.",
  className,
}: PerformanceReportProps) {
  const heading = useId();
  const panelId = useId();
  const barTabId = useId();
  const lineTabId = useId();
  const reduce = useReducedMotion();
  const [internalId, setInternalId] = useState(
    defaultMetricId ?? metrics[0]?.id,
  );
  const [view, setView] = useState<"bar" | "line">("bar");
  const [showPrevious, setShowPrevious] = useState(true);
  const metric =
    metrics.find((item) => item.id === (controlledId ?? internalId)) ??
    metrics[0];
  const points = metric?.points ?? [];
  const total = aggregate(
    points.map((point) => point.value),
    metric?.aggregation,
  );
  const previous = metric ? previousTotal(metric, compare) : undefined;
  const hasPrevious = previous !== undefined;
  const formatted = (value: number) => formatReportValue(value, metric?.format);
  const selectMetric = (id: string) => {
    if (controlledId === undefined) setInternalId(id);
    onMetricChange?.(id);
  };
  return (
    <section
      aria-labelledby={heading}
      aria-busy={loading}
      className={cn("@container w-full min-w-0 space-y-4", className)}
    >
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h2
            id={heading}
            className="text-2xl font-normal tracking-tight text-muted-foreground"
          >
            {title}
          </h2>
          {periodLabel && (
            <p className="mt-2 text-sm text-muted-foreground">{periodLabel}</p>
          )}
        </div>
        {controls}
      </header>
      <fieldset
        aria-label="Choose a metric"
        className="grid grid-cols-1 gap-3 @lg:grid-cols-2 @3xl:grid-cols-4"
      >
        {metrics.map((item) => {
          const value = aggregate(
            item.points.map((point) => point.value),
            item.aggregation,
          );
          const prior = previousTotal(item, compare);
          const percent = item.format?.style === "percent";
          const change =
            percent && prior !== undefined
              ? value - prior
              : reportChange(value, prior);
          const positive =
            change !== null &&
            (item.increaseIsPositive === false ? change < 0 : change > 0);
          const selected = item.id === metric?.id;
          return (
            <div
              key={item.id}
              className={cn(
                "relative flex min-w-0 flex-col gap-2 rounded-2xl border bg-background p-4 text-left transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background has-[:disabled]:pointer-events-none has-[:disabled]:opacity-50",
                selected
                  ? "border-primary"
                  : "border-border hover:border-muted-foreground/50",
              )}
            >
              <span className="flex min-h-9 items-center justify-between gap-2">
                <span className="text-sm font-normal leading-tight text-muted-foreground">
                  {item.label}
                </span>
                <span
                  aria-hidden="true"
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground [&>svg]:size-3.5"
                >
                  {item.icon ?? <Activity />}
                </span>
              </span>
              <span className="flex min-h-9 flex-wrap items-center gap-2">
                {loading || !item.points.length ? (
                  <span className="text-3xl">—</span>
                ) : (
                  <NumberTicker
                    value={value}
                    format={() => formatAnimatedValue(value, item.format)}
                    duration={0.6}
                    stagger={0.02}
                    className="whitespace-nowrap text-3xl font-medium tabular-nums tracking-tight"
                  />
                )}
              </span>
              <span className="flex min-h-4 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                {change !== null ? (
                  <>
                    <NumberTicker
                      value={change}
                      prefix={change > 0 ? "+" : undefined}
                      suffix={percent ? "\u00a0pp" : "%"}
                      format={() => formatReportValue(change, { decimals: 1 })}
                      className={cn(
                        "whitespace-nowrap font-medium tabular-nums",
                        change === 0
                          ? "text-muted-foreground"
                          : positive
                            ? "text-success-foreground"
                            : "text-destructive",
                      )}
                    />
                    <span>vs. {comparisonLabel.toLowerCase()}</span>
                  </>
                ) : (
                  <span>
                    {item.aggregation === "average"
                      ? "Daily average"
                      : "Period total"}
                  </span>
                )}
              </span>
              {/* Full-card control; the shared Button is always pill-shaped, so the
                  card keeps its own radius and this sits on top. */}
              <Button
                variant="plain"
                type="button"
                aria-label={item.label}
                aria-pressed={selected}
                disabled={loading || !item.points.length}
                onClick={() => selectMetric(item.id)}
                whileHover={undefined}
                whileTap={undefined}
                className="absolute inset-0 size-full cursor-pointer outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          );
        })}
      </fieldset>
      <div className="min-w-0 rounded-2xl border border-border bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          <div>
            <h3 className="text-base font-normal text-muted-foreground">
              {metric ? `${metric.label} over time` : "Activity over time"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Daily activity for the selected period
            </p>
          </div>
          <Tabs
            value={view}
            onValueChange={(value) => setView(value as "bar" | "line")}
            variant="pill"
          >
            <TabsList aria-label="Chart style" className="p-0.5">
              {[
                { id: "bar" as const, label: "Bars", Icon: ChartColumn },
                { id: "line" as const, label: "Line", Icon: ChartLine },
              ].map(({ id, label, Icon }) => (
                <TabsTrigger
                  key={id}
                  value={id}
                  id={id === "bar" ? barTabId : lineTabId}
                  aria-label={id === "bar" ? "Bar chart" : "Line chart"}
                  aria-controls={panelId}
                  tabIndex={view === id ? 0 : -1}
                  onKeyDown={(event) => {
                    if (
                      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                        event.key,
                      )
                    )
                      return;
                    event.preventDefault();
                    const next =
                      event.key === "Home"
                        ? "bar"
                        : event.key === "End"
                          ? "line"
                          : view === "bar"
                            ? "line"
                            : "bar";
                    setView(next);
                    document
                      .getElementById(next === "bar" ? barTabId : lineTabId)
                      ?.focus();
                  }}
                  className="h-8 gap-1.5 rounded-full px-3 py-0 text-xs font-normal focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon aria-hidden="true" className="size-3.5" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        {hasPrevious && (
          <div className="flex flex-wrap items-center gap-3 px-4 pb-2 text-xs sm:px-5">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <span
                aria-hidden="true"
                className={
                  view === "bar"
                    ? "size-2 rounded-full bg-primary"
                    : "h-0.5 w-4 rounded-full bg-primary"
                }
              />
              Current period
            </span>
            <Button
              variant="plain"
              type="button"
              aria-pressed={showPrevious}
              onClick={() => setShowPrevious(!showPrevious)}
              className={cn(
                "inline-flex h-8 items-center gap-2 rounded-full px-2 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !showPrevious && "opacity-50",
              )}
            >
              <span
                aria-hidden="true"
                className={
                  view === "bar"
                    ? "size-2 rounded-full bg-muted-foreground/35"
                    : "w-4 border-t border-dashed border-muted-foreground"
                }
              />
              {comparisonLabel}
            </Button>
          </div>
        )}
        <div
          id={panelId}
          role="tabpanel"
          aria-labelledby={view === "bar" ? barTabId : lineTabId}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: The chart tab panel is a keyboard navigation destination.
          tabIndex={0}
          className="min-w-0 px-3 pb-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4 sm:pb-4"
        >
          {loading || points.length === 0 ? (
            <output className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              {loading ? "Loading report…" : emptyMessage}
            </output>
          ) : (
            <figure
              aria-label={`${metric?.label}: ${formatted(total)} ${metric?.aggregation === "average" ? "average" : "total"}.`}
              className="h-56 min-w-0 sm:h-64"
            >
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <ComposedChart
                  data={[...points]}
                  margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                  barGap={1}
                  barCategoryGap="20%"
                  accessibilityLayer
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--border)"
                    strokeOpacity={0.5}
                  />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fill: "var(--muted-foreground)",
                      className: "text-xs",
                    }}
                    ticks={points
                      .filter(
                        (_, index) =>
                          index === 0 ||
                          index === points.length - 1 ||
                          index %
                            Math.max(1, Math.ceil((points.length - 1) / 5)) ===
                            0,
                      )
                      .map((point) => point.label)}
                    interval="preserveStartEnd"
                    minTickGap={48}
                    tickMargin={12}
                    tickFormatter={formatDate}
                  />
                  <YAxis
                    width={36}
                    tickLine={false}
                    axisLine={false}
                    tickCount={4}
                    tick={{
                      fill: "var(--muted-foreground)",
                      className: "text-xs",
                    }}
                    tickFormatter={(value: number) =>
                      new Intl.NumberFormat(metric?.format?.locale ?? "en-US", {
                        notation: "compact",
                        maximumFractionDigits: 1,
                      }).format(value)
                    }
                  />
                  <Tooltip
                    cursor={
                      view === "bar"
                        ? { fill: "var(--muted)", fillOpacity: 0.4 }
                        : { stroke: "var(--border)", strokeDasharray: "3 3" }
                    }
                    content={({ active, payload }) => {
                      const point = payload?.[0]?.payload as
                        | ReportPoint
                        | undefined;
                      if (!active || !point) return null;
                      return (
                        <div className="rounded-xl border border-border bg-background px-4 py-3 text-xs">
                          <p className="mb-2 font-medium">
                            {formatDate(point.label)}
                          </p>
                          <p className="flex justify-between gap-6">
                            <span className="text-muted-foreground">
                              {metric?.label}
                            </span>
                            <span className="tabular-nums">
                              {formatted(point.value)}
                            </span>
                          </p>
                          {hasPrevious &&
                            showPrevious &&
                            point.previous !== undefined && (
                              <p className="mt-2 flex justify-between gap-6">
                                <span className="text-muted-foreground">
                                  {point.previousLabel
                                    ? formatDate(point.previousLabel)
                                    : comparisonLabel}
                                </span>
                                <span className="tabular-nums">
                                  {formatted(point.previous)}
                                </span>
                              </p>
                            )}
                        </div>
                      );
                    }}
                  />
                  {view === "bar" ? (
                    <>
                      {hasPrevious && showPrevious && (
                        <Bar
                          dataKey="previous"
                          fill="var(--muted-foreground)"
                          fillOpacity={0.35}
                          maxBarSize={20}
                          radius={[3, 3, 0, 0]}
                          isAnimationActive={false}
                        />
                      )}
                      <Bar
                        dataKey="value"
                        fill="var(--primary)"
                        maxBarSize={20}
                        radius={[3, 3, 0, 0]}
                        isAnimationActive={!reduce}
                        animationDuration={500}
                        animationEasing={EASE_OUT_CSS}
                      />
                    </>
                  ) : (
                    <>
                      {hasPrevious && showPrevious && (
                        <Line
                          type="linear"
                          dataKey="previous"
                          stroke="var(--muted-foreground)"
                          strokeOpacity={0.5}
                          strokeWidth={1.5}
                          strokeDasharray="3 4"
                          dot={false}
                          isAnimationActive={false}
                        />
                      )}
                      <Line
                        type="linear"
                        dataKey="value"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        dot={points.length === 1}
                        activeDot={{
                          r: 4,
                          fill: "var(--primary)",
                          stroke: "var(--background)",
                          strokeWidth: 2,
                        }}
                        isAnimationActive={!reduce}
                        animationDuration={500}
                        animationEasing={EASE_OUT_CSS}
                      />
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </figure>
          )}
        </div>
      </div>
    </section>
  );
}
