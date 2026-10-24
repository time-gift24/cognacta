"use client";

import { motion } from "motion/react";
import { SeriesToggles } from "@/components/beui/charts/series-toggles";
import {
  type StackedBarAxisMark,
  StackedBarChart,
  StackedBarChartAxis,
  StackedBarChartPlot,
  StackedBarChartReferenceLine,
  StackedBarChartTooltip,
  type StackedBarDatum,
} from "@/components/beui/charts/stacked-bar-chart";
import type { CreditCategory } from "./credit-usage-data";
import { SECTION_RISE } from "./credit-usage-motion";

export type TrendChartCardProps = {
  data: readonly StackedBarDatum[];
  categories: readonly CreditCategory[];
  visible: ReadonlySet<string>;
  onToggleCategory: (id: string) => void;
  highlightedCategory: string | null;
  /** First bar drawn as a projection. */
  projectFrom: number;
  projectedValue: number;
  budget: number;
  /** Bar index for today, marked on the axis when inside the range. */
  todayIndex: number;
  format: (value: number) => string;
  labels: {
    title: string;
    hint: string;
    budget: string;
    today: string;
  };
};

/** Card wrapping the stacked bar chart with a budget line and toggles. */
export function TrendChartCard({
  data,
  categories,
  visible,
  onToggleCategory,
  highlightedCategory,
  projectFrom,
  projectedValue,
  budget,
  todayIndex,
  format,
  labels,
}: TrendChartCardProps) {
  const last = data.length - 1;
  const marks: StackedBarAxisMark[] = [
    { index: 0, label: data[0]?.label },
    ...(todayIndex > 0 && todayIndex < last
      ? [
          {
            index: todayIndex,
            emphasis: true,
            label: (
              <>
                <span className="hidden sm:inline">{labels.today} · </span>
                {data[todayIndex]?.label}
              </>
            ),
          },
        ]
      : []),
    ...(last > 0 ? [{ index: last, label: data[last]?.label }] : []),
  ];

  return (
    <motion.div
      variants={SECTION_RISE}
      className="rounded-3xl border border-border p-5 sm:p-6"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium text-xl">{labels.title}</h3>
        <p className="hidden text-muted-foreground text-xs sm:block">
          {labels.hint}
        </p>
      </div>

      <StackedBarChart
        data={data}
        series={categories}
        visibleSeries={visible}
        highlightedSeries={highlightedCategory}
        projectFrom={projectFrom}
        projectedValue={projectedValue}
        formatValue={format}
        label={labels.title}
        className="mt-8"
      >
        <StackedBarChartPlot>
          <StackedBarChartReferenceLine
            value={budget}
            label={`${labels.budget} ${format(budget)}`}
          />
          <StackedBarChartTooltip />
        </StackedBarChartPlot>
        <StackedBarChartAxis marks={marks} />
      </StackedBarChart>

      <SeriesToggles
        series={categories}
        visible={visible}
        onToggle={onToggleCategory}
        className="mt-5 border-border border-t pt-5"
      />
    </motion.div>
  );
}
