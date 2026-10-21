import { Check, Minus } from "lucide-react";
import type { PricingPageCell, PricingPageLabels } from "./pricing-page-data";

export type ComparisonCellProps = {
  /** Missing values render as not included. */
  value: PricingPageCell | undefined;
  labels: Pick<PricingPageLabels, "included" | "notIncluded">;
};

export function ComparisonCell({ value, labels }: ComparisonCellProps) {
  if (value === true) {
    return (
      <span className="inline-grid size-6 place-items-center rounded-full bg-muted">
        <Check className="size-3.5" aria-hidden="true" />
        <span className="sr-only">{labels.included}</span>
      </span>
    );
  }
  if (value === false || value === undefined) {
    return (
      <span className="inline-grid size-6 place-items-center rounded-full text-muted-foreground">
        <Minus className="size-3.5" aria-hidden="true" />
        <span className="sr-only">{labels.notIncluded}</span>
      </span>
    );
  }
  return <span className="text-sm">{value}</span>;
}
