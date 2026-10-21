"use client";

import { motion } from "motion/react";
import { FaqDisclosureList } from "@/components/beui/premium/faq-blocks/faq-disclosure-list";
import type {
  PricingPageFaqItem,
  PricingPageLabels,
} from "./pricing-page-data";
import { useSectionReveal } from "./use-section-reveal";

export type PricingFaqSectionProps = {
  items: readonly PricingPageFaqItem[];
  defaultValue: string | null;
  labels: PricingPageLabels;
  reduce: boolean | null;
};

export function PricingFaqSection({
  items,
  defaultValue,
  labels,
  reduce,
}: PricingFaqSectionProps) {
  const reveal = useSectionReveal(reduce);

  return (
    <motion.section
      {...reveal}
      className="mt-24 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16"
      aria-labelledby="pricing-faq-title"
    >
      <div>
        <h2
          id="pricing-faq-title"
          className="font-medium text-4xl tracking-tight"
        >
          {labels.faqTitle}
        </h2>
        <p className="mt-3 max-w-sm text-muted-foreground leading-7">
          {labels.faqDescription}
        </p>
      </div>
      <FaqDisclosureList items={items} defaultValue={defaultValue} compact />
    </motion.section>
  );
}
