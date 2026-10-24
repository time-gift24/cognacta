"use client";

import { motion } from "motion/react";
import { ComparisonMobile } from "./comparison-mobile";
import { ComparisonTable } from "./comparison-table";
import type {
  PricingPageGroup,
  PricingPageLabels,
  PricingPagePlan,
  PricingPagePlanId,
} from "./pricing-page-data";
import { useSectionReveal } from "./use-section-reveal";

export type ComparisonSectionProps = {
  plans: readonly PricingPagePlan[];
  groups: readonly PricingPageGroup[];
  highlighted: PricingPagePlanId;
  mobilePlan: PricingPagePlanId;
  onMobilePlanChange: (plan: PricingPagePlanId) => void;
  currency: string;
  labels: PricingPageLabels;
  reduce: boolean | null;
};

export function ComparisonSection({
  plans,
  groups,
  highlighted,
  mobilePlan,
  onMobilePlanChange,
  currency,
  labels,
  reduce,
}: ComparisonSectionProps) {
  const reveal = useSectionReveal(reduce);

  return (
    <motion.section
      {...reveal}
      className="mt-24"
      aria-labelledby="pricing-compare-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="pricing-compare-title"
            className="font-medium text-4xl tracking-tight"
          >
            {labels.compareTitle}
          </h2>
          <p className="mt-3 max-w-lg text-muted-foreground leading-7">
            {labels.compareDescription}
          </p>
        </div>
      </div>

      <ComparisonTable
        plans={plans}
        groups={groups}
        highlighted={highlighted}
        currency={currency}
        labels={labels}
        reduce={reduce}
      />
      <ComparisonMobile
        plans={plans}
        groups={groups}
        plan={mobilePlan}
        onPlanChange={onMobilePlanChange}
        labels={labels}
        reduce={reduce}
      />
    </motion.section>
  );
}
