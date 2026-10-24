"use client";

import {
  SegmentedMeter,
  SegmentedMeterLegend,
  SegmentedMeterTooltip,
  SegmentedMeterTrack,
} from "@/components/beui/charts/segmented-meter";
import { Button } from "@/components/beui/motion/button";
import { NumberTicker } from "@/components/beui/motion/number-ticker";
import { cn } from "@/lib/beui/utils";
import type { CreditCategory, CreditUsagePeriod } from "./credit-usage-data";

const grouped = new Intl.NumberFormat("en-US");

export type CreditPlanCardProps = {
  period: CreditUsagePeriod;
  categories: readonly CreditCategory[];
  planName: string;
  changePlanLabel: string;
  creditsUsedLabel: string;
  /** Category currently highlighted from elsewhere, such as the table. */
  activeCategory: string | null;
  onActiveCategoryChange: (id: string | null) => void;
  selectedCategory: string | null;
  onSelectCategory: (id: string) => void;
  format: (value: number) => string;
  onChangePlan?: () => void;
  className?: string;
};

/** Plan summary with a segmented usage meter and headline stats. */
export function CreditPlanCard({
  period,
  categories,
  planName,
  changePlanLabel,
  creditsUsedLabel,
  activeCategory,
  onActiveCategoryChange,
  selectedCategory,
  onSelectCategory,
  format,
  onChangePlan,
  className,
}: CreditPlanCardProps) {
  const segments = categories.map((category) => ({
    ...category,
    value: period.usage[category.id] ?? 0,
  }));
  const used = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div
      className={cn(
        "rounded-3xl border border-border bg-background p-5 sm:p-7",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-medium">{planName}</p>
          <p className="mt-1 flex flex-wrap items-center gap-1 text-muted-foreground text-sm">
            <NumberTicker value={used} locale animateOnMount={false} />
            of {grouped.format(period.limit)} {creditsUsedLabel}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onChangePlan}
        >
          {changePlanLabel}
        </Button>
      </div>

      <SegmentedMeter
        segments={segments}
        max={period.limit}
        activeId={activeCategory}
        onActiveChange={onActiveCategoryChange}
        selectedId={selectedCategory}
        onSelect={onSelectCategory}
        formatValue={(value) => `${grouped.format(value)} credits`}
        label="Credits used by category"
      >
        <SegmentedMeterTrack className="mt-14">
          <SegmentedMeterTooltip />
        </SegmentedMeterTrack>
        <SegmentedMeterLegend format={format} trailing={period.renews} />
      </SegmentedMeter>

      {period.stats.length > 0 ? (
        <dl className="mt-6 grid grid-cols-2 gap-y-6 border-border border-t pt-6 md:grid-cols-4">
          {period.stats.slice(0, 4).map((stat, index) => (
            <div
              key={stat.label}
              className={cn(
                "flex flex-col-reverse gap-1",
                index > 0 && "md:border-border md:border-l md:pl-6",
                index % 2 === 1 && "border-border border-l pl-6",
              )}
            >
              <dt className="text-muted-foreground text-sm">{stat.label}</dt>
              <dd className="font-medium text-4xl tracking-tight">
                <NumberTicker value={stat.value} locale />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
