"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { cn } from "@/lib/beui/utils";
import {
  CREDIT_CATEGORIES,
  type CreditCategory,
  formatCompact,
} from "./credit-usage-data";
import { SECTION_RISE, SECTION_STAGGER } from "./credit-usage-motion";
import {
  TREND_DAYS,
  TREND_WORKFLOWS,
  type TrendDay,
  type TrendWorkflow,
} from "./credit-usage-trend-data";
import { TopWorkflows } from "./top-workflows";
import { TrendChartCard } from "./trend-chart-card";
import { TrendSummary } from "./trend-summary";

/* ─────────────────────────────────────────────────────────
 * CREDIT USAGE DAILY TREND
 *
 *  load     summary, chart, and workflow list rise in sequence;
 *           bars grow from the baseline; sparklines draw
 *  scrub    the stacked bar chart glides one detail card beside the
 *           active bar; arrow keys, Home, and End step days
 *  legend   toggling a category re-stacks bars and rolls the totals
 *  link     hovering a workflow fades other categories in the chart
 *
 *  Parts: TrendSummary, TrendChartCard (StackedBarChart),
 *  TopWorkflows (Sparkline). Data shapes live in the data files.
 * ───────────────────────────────────────────────────────── */

const DEFAULT_LABELS = {
  used: "Used so far",
  average: "Daily average",
  forecast: "Projected by Nov 1",
  onPace: "On pace",
  overPace: "Over pace",
  chartTitle: "Spend per day",
  chartHint: "Hover or use arrow keys to inspect a day",
  budget: "Daily budget",
  today: "Today",
  fullRange: "Full cycle",
  workflowsTitle: "Top workflows",
  workflowsDescription: "Change versus the previous cycle",
};

export type CreditUsageTrendLabels = typeof DEFAULT_LABELS;

export type CreditUsageTrendProps = {
  title?: ReactNode;
  description?: ReactNode;
  /** Categories with their label and color classes. */
  categories?: readonly CreditCategory[];
  /** One entry per day of the cycle, oldest first. */
  days?: readonly TrendDay[];
  /**
   * Days that have already happened. Later days render as dashed
   * projections. Defaults to every day when custom days are passed.
   */
  elapsedDays?: number;
  /** Credits included in the cycle. */
  limit?: number;
  /** Daily budget line. Defaults to the limit spread across the cycle. */
  dailyBudget?: number;
  /** Days shown by the short range tab. */
  shortRange?: number;
  /** Rows for the side panel. Pass an empty list to hide it. */
  workflows?: readonly TrendWorkflow[];
  /** Override any interface copy. */
  labels?: Partial<CreditUsageTrendLabels>;
  /** Formatter for compact numbers in the chart and lists. */
  format?: (value: number) => string;
  className?: string;
};

export function CreditUsageTrend({
  title = "Daily credit spend",
  description = "Track the pace of this cycle and spot the days that ran hot.",
  categories = CREDIT_CATEGORIES,
  days: daysProp,
  elapsedDays,
  limit = 500_000,
  dailyBudget,
  shortRange = 14,
  workflows = TREND_WORKFLOWS,
  labels: labelOverrides,
  format = formatCompact,
  className,
}: CreditUsageTrendProps) {
  const reduce = useReducedMotion();
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const allDays = daysProp ?? TREND_DAYS;
  const elapsed = Math.min(
    elapsedDays ?? (daysProp ? allDays.length : 23),
    allDays.length,
  );
  const budget = dailyBudget ?? Math.round(limit / Math.max(allDays.length, 1));

  const [range, setRange] = useState<"short" | "full">("full");
  const [visible, setVisible] = useState<ReadonlySet<string>>(
    () => new Set(categories.map((c) => c.id)),
  );
  const [linked, setLinked] = useState<string | null>(null);
  const byId = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const totals = useMemo(() => {
    const totalOf = (day: TrendDay) =>
      categories.reduce(
        (sum, c) => sum + (visible.has(c.id) ? (day.usage[c.id] ?? 0) : 0),
        0,
      );
    const used = allDays
      .slice(0, elapsed)
      .reduce((sum, day) => sum + totalOf(day), 0);
    const average = elapsed ? Math.round(used / elapsed) : 0;
    const projected = average * allDays.length;
    const share = categories.length ? visible.size / categories.length : 1;
    return { used, average, projected, onPace: projected <= limit * share };
  }, [allDays, categories, visible, elapsed, limit]);

  const start = range === "full" ? 0 : Math.max(0, elapsed - shortRange);
  const end = range === "full" ? allDays.length : elapsed;
  const chartData = useMemo(
    () =>
      allDays.slice(start, end).map((day) => ({
        id: day.label,
        label: day.label,
        values: day.usage,
      })),
    [allDays, start, end],
  );

  const toggle = (id: string) =>
    setVisible((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <motion.section
      initial={reduce ? false : "hidden"}
      animate="show"
      variants={SECTION_STAGGER}
      aria-labelledby="credit-trend-title"
      className={cn(
        "w-full bg-background px-4 py-12 font-sans text-foreground sm:px-8 sm:py-16",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-6xl">
        <motion.div
          variants={SECTION_RISE}
          className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <h2
              id="credit-trend-title"
              className="font-medium text-4xl tracking-tight"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-2 text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <Tabs
            value={range}
            onValueChange={(value) => setRange(value as "short" | "full")}
            variant="pill"
          >
            <TabsList aria-label="Chart range">
              <TabsTrigger value="short">{shortRange} days</TabsTrigger>
              <TabsTrigger value="full">{labels.fullRange}</TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        <TrendSummary {...totals} labels={labels} />

        <div
          className={cn(
            "mt-4 grid gap-4",
            workflows.length > 0 && "lg:grid-cols-[minmax(0,1fr)_20rem]",
          )}
        >
          <TrendChartCard
            key={range}
            data={chartData}
            categories={categories}
            visible={visible}
            onToggleCategory={toggle}
            highlightedCategory={linked}
            projectFrom={elapsed - start}
            projectedValue={totals.average}
            budget={budget}
            todayIndex={range === "full" ? elapsed - 1 : -1}
            format={format}
            labels={{
              title: labels.chartTitle,
              hint: labels.chartHint,
              budget: labels.budget,
              today: labels.today,
            }}
          />
          {workflows.length > 0 ? (
            <TopWorkflows
              workflows={workflows}
              categories={byId}
              highlightedCategory={linked}
              onHighlightCategory={setLinked}
              format={format}
              title={labels.workflowsTitle}
              description={labels.workflowsDescription}
            />
          ) : null}
        </div>
      </div>
    </motion.section>
  );
}
