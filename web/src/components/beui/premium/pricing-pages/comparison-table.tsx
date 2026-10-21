"use client";

import { motion } from "motion/react";
import type { CSSProperties } from "react";
import { ComparisonCell } from "./comparison-cell";
import type {
  PricingPageGroup,
  PricingPageLabels,
  PricingPagePlan,
  PricingPagePlanId,
} from "./pricing-page-data";
import { layoutTransition } from "./pricing-page-motion";

export type ComparisonTableProps = {
  plans: readonly PricingPagePlan[];
  groups: readonly PricingPageGroup[];
  highlighted: PricingPagePlanId;
  currency: string;
  labels: PricingPageLabels;
  reduce: boolean | null;
};

/** Desktop comparison table whose column highlight glides between plans. */
export function ComparisonTable({
  plans,
  groups,
  highlighted,
  currency,
  labels,
  reduce,
}: ComparisonTableProps) {
  const column = plans.findIndex((plan) => plan.id === highlighted) + 2;
  const columns: CSSProperties = {
    gridTemplateColumns: `minmax(0,1.4fr) repeat(${plans.length},minmax(0,1fr))`,
  };

  return (
    <div className="relative mt-10 hidden md:block">
      {/* A background grid shares the table's column template, so the
          highlight can glide between plan columns as one layout animation. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 grid"
        style={columns}
      >
        <motion.div
          layout
          transition={layoutTransition(reduce)}
          style={{ gridColumn: column, gridRow: 1 }}
          className="rounded-2xl border border-foreground/25"
        />
      </div>

      <table className="relative grid w-full" style={columns}>
        <caption className="sr-only">{labels.compareCaption}</caption>
        <thead className="contents">
          <tr className="contents">
            <th scope="col">
              <span className="sr-only">{labels.featureColumn}</span>
            </th>
            {plans.map((plan) => (
              <th
                key={plan.id}
                scope="col"
                className="px-5 pt-5 pb-4 text-left font-normal"
              >
                <span className="block font-medium text-xl">{plan.name}</span>
                <span className="mt-1 block font-mono text-muted-foreground text-xs tabular-nums">
                  {labels.compareFrom(`${currency}${plan.annual}`)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.title} className="contents">
            <tr className="contents">
              <th
                scope="colgroup"
                colSpan={plans.length + 1}
                className="col-span-full mt-6 px-1 pb-2 text-left font-mono font-normal text-muted-foreground text-xs uppercase tracking-widest"
              >
                {group.title}
              </th>
            </tr>
            {group.rows.map((item) => (
              <tr key={item.label} className="contents">
                <th
                  scope="row"
                  className="border-border border-t px-1 py-4 text-left font-normal text-sm"
                >
                  {item.label}
                </th>
                {plans.map((plan) => (
                  <td
                    key={plan.id}
                    className="flex items-center border-border border-t px-5 py-4"
                  >
                    <ComparisonCell
                      value={item.values[plan.id]}
                      labels={labels}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
