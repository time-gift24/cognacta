"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { ButtonLink } from "@/components/beui/motion/button";
import type { PricingPageLabels } from "./pricing-page-data";
import { useSectionReveal } from "./use-section-reveal";

export type ClosingCtaProps = {
  maxSeats: number;
  primaryHref: string;
  secondaryHref: string;
  onPrimaryClick?: () => void;
  labels: PricingPageLabels;
  reduce: boolean | null;
};

/** Closing row for organizations larger than the seat slider allows. */
export function ClosingCta({
  maxSeats,
  primaryHref,
  secondaryHref,
  onPrimaryClick,
  labels,
  reduce,
}: ClosingCtaProps) {
  const reveal = useSectionReveal(reduce);

  return (
    <motion.section
      {...reveal}
      className="mt-24 flex flex-col items-start justify-between gap-6 rounded-3xl border border-border p-6 sm:flex-row sm:items-center sm:p-10"
    >
      <div>
        <h2 className="max-w-lg text-balance font-medium text-xl">
          {labels.closingTitle(maxSeats)}
        </h2>
        <p className="mt-2 max-w-lg text-muted-foreground text-sm leading-6">
          {labels.closingDescription}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <ButtonLink href={secondaryHref} variant="outline">
          {labels.closingSecondary}
        </ButtonLink>
        <ButtonLink href={primaryHref} onClick={onPrimaryClick}>
          {labels.closingPrimary}
          <ArrowRight className="size-4" aria-hidden="true" />
        </ButtonLink>
      </div>
    </motion.section>
  );
}
