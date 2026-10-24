"use client";

import { AnimatePresence, motion } from "motion/react";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { ComparisonCell } from "./comparison-cell";
import type {
  PricingPageGroup,
  PricingPageLabels,
  PricingPagePlan,
  PricingPagePlanId,
} from "./pricing-page-data";
import { panelTransition } from "./pricing-page-motion";

export type ComparisonMobileProps = {
  plans: readonly PricingPagePlan[];
  groups: readonly PricingPageGroup[];
  plan: PricingPagePlanId;
  onPlanChange: (plan: PricingPagePlanId) => void;
  labels: PricingPageLabels;
  reduce: boolean | null;
};

/** One plan at a time on small screens, chosen with a segmented control. */
export function ComparisonMobile({
  plans,
  groups,
  plan,
  onPlanChange,
  labels,
  reduce,
}: ComparisonMobileProps) {
  return (
    <div className="mt-8 md:hidden">
      <Tabs value={plan} onValueChange={onPlanChange} variant="segment">
        <TabsList aria-label={labels.compareMobileAriaLabel} className="w-full">
          {plans.map((item) => (
            <TabsTrigger key={item.id} value={item.id} className="flex-1">
              {item.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={plan}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={panelTransition(reduce)}
          className="mt-4"
        >
          {groups.map((group) => (
            <section key={group.title}>
              <h3 className="mt-6 pb-2 font-mono text-muted-foreground text-xs uppercase tracking-widest">
                {group.title}
              </h3>
              <ul>
                {group.rows.map((item) => (
                  <li
                    key={item.label}
                    className="flex min-h-12 items-center justify-between gap-4 border-border border-t py-3 text-sm"
                  >
                    <span>{item.label}</span>
                    <ComparisonCell value={item.values[plan]} labels={labels} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
