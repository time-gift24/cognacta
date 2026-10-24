"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { useHoverCapable } from "@/lib/beui/hooks/use-hover-capable";
import { cn } from "@/lib/beui/utils";
import { ClosingCta } from "./closing-cta";
import { ComparisonSection } from "./comparison-section";
import { PlanCard } from "./plan-card";
import { PlanControls } from "./plan-controls";
import { PricingFaqSection } from "./pricing-faq-section";
import {
  DEFAULT_LABELS,
  formatMoney as defaultFormatMoney,
  PRICING_PAGE_COMPARISON,
  PRICING_PAGE_FAQ,
  PRICING_PAGE_PLANS,
  PRICING_PAGE_SEATS,
  type PricingPageBilling,
  type PricingPageFaqItem,
  type PricingPageGroup,
  type PricingPageLabels,
  type PricingPagePlan,
  type PricingPagePlanId,
  recommendedPlanFor,
} from "./pricing-page-data";
import { CARDS, INTRO, RISE } from "./pricing-page-motion";

/* ─────────────────────────────────────────────────────────
 * PAGE STORYBOARD
 *
 *    0ms   intro copy rises through a soft blur, staggered
 *  240ms   billing + team-size controls settle in      (PlanControls)
 *  320ms   plan cards cascade upward                   (PlanCard)
 *  scroll  comparison, FAQ, and closing row reveal once in view
 *          (ComparisonSection, PricingFaqSection, ClosingCta)
 *
 * Interactions
 *  billing   per-seat prices roll; totals cross-fade
 *  seats     "Recommended" pill blurs out, then blooms in on the smallest
 *            plan that fits (RecommendedPill); each card's team-fit meter
 *            springs to size (TeamFitMeter)
 *  hover     focusing a plan card slides the comparison column
 *            highlight to that plan (ComparisonTable)
 *
 * Reduced motion: entrances and reveals render in place, and every
 * swap, meter, and highlight change is instant.
 * ───────────────────────────────────────────────────────── */

const CARD_COLUMNS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

export type PricingPlanExplorerProps = {
  className?: string;
  /** Plans in ascending size; the first one that fits the team is recommended. */
  plans?: readonly PricingPagePlan[];
  /** Comparison rows keyed by plan id. */
  comparison?: readonly PricingPageGroup[];
  faqItems?: readonly PricingPageFaqItem[];
  /** FAQ item open on mount. Defaults to the first item. */
  faqDefaultValue?: string | null;
  minSeats?: number;
  maxSeats?: number;
  defaultSeats?: number;
  defaultBilling?: PricingPageBilling;
  /** Currency symbol shown before prices. */
  currency?: string;
  formatMoney?: (value: number) => string;
  labels?: Partial<PricingPageLabels>;
  /** Closing row primary destination. */
  salesHref?: string;
  /** Closing row secondary destination. */
  securityHref?: string;
  onSelectPlan?: (
    planId: PricingPagePlanId,
    billing: PricingPageBilling,
    seats: number,
  ) => void;
  onContactSales?: () => void;
  onBillingChange?: (billing: PricingPageBilling) => void;
  onSeatsChange?: (seats: number) => void;
};

export function PricingPlanExplorer({
  className,
  plans = PRICING_PAGE_PLANS,
  comparison = PRICING_PAGE_COMPARISON,
  faqItems = PRICING_PAGE_FAQ,
  faqDefaultValue,
  minSeats = PRICING_PAGE_SEATS.min,
  maxSeats = PRICING_PAGE_SEATS.max,
  defaultSeats = PRICING_PAGE_SEATS.default,
  defaultBilling = "annual",
  currency = "$",
  formatMoney = defaultFormatMoney,
  labels: labelOverrides,
  salesHref = "#",
  securityHref = "#",
  onSelectPlan,
  onContactSales,
  onBillingChange,
  onSeatsChange,
}: PricingPlanExplorerProps) {
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const reduce = useReducedMotion();
  const canHover = useHoverCapable();
  const [billing, setBilling] = useState<PricingPageBilling>(defaultBilling);
  const [seats, setSeats] = useState(() =>
    Math.min(Math.max(defaultSeats, minSeats), maxSeats),
  );
  const [previewPlan, setPreviewPlan] = useState<PricingPagePlanId | null>(
    null,
  );
  const [mobilePlan, setMobilePlan] = useState<PricingPagePlanId | null>(null);

  const recommended = recommendedPlanFor(plans, seats);
  const highlighted = previewPlan ?? recommended;

  const changeBilling = (next: PricingPageBilling) => {
    setBilling(next);
    onBillingChange?.(next);
  };
  const changeSeats = (next: number) => {
    setSeats(next);
    onSeatsChange?.(next);
  };

  return (
    <main
      className={cn(
        "min-h-screen w-full bg-background px-4 py-14 font-sans text-foreground sm:px-8 sm:py-20",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-6xl">
        <motion.header
          initial={reduce ? false : "hidden"}
          animate="show"
          variants={INTRO}
          className="mx-auto flex max-w-2xl flex-col items-center text-center"
        >
          <motion.p
            variants={RISE}
            className="font-mono text-muted-foreground text-xs uppercase tracking-widest"
          >
            {labels.eyebrow}
          </motion.p>
          <motion.h1
            variants={RISE}
            className="mt-4 text-balance font-medium text-4xl tracking-tight md:text-5xl"
          >
            {labels.title}
          </motion.h1>
          <motion.p
            variants={RISE}
            className="mt-4 max-w-xl text-pretty text-muted-foreground leading-7"
          >
            {labels.description}
          </motion.p>

          <PlanControls
            billing={billing}
            onBillingChange={changeBilling}
            seats={seats}
            minSeats={minSeats}
            maxSeats={maxSeats}
            onSeatsChange={changeSeats}
            labels={labels}
          />
        </motion.header>

        <motion.ul
          initial={reduce ? false : "hidden"}
          animate="show"
          variants={CARDS}
          className={cn(
            "mt-14 grid gap-4",
            CARD_COLUMNS[plans.length] ?? CARD_COLUMNS[3],
          )}
        >
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              billing={billing}
              seats={seats}
              recommended={plan.id === recommended}
              highlighted={plan.id === highlighted}
              reduce={reduce}
              canHover={canHover}
              currency={currency}
              formatMoney={formatMoney}
              labels={labels}
              onPreview={(active) => setPreviewPlan(active ? plan.id : null)}
              onSelect={
                onSelectPlan
                  ? () => onSelectPlan(plan.id, billing, seats)
                  : undefined
              }
            />
          ))}
        </motion.ul>

        <ComparisonSection
          plans={plans}
          groups={comparison}
          highlighted={highlighted}
          mobilePlan={mobilePlan ?? recommended}
          onMobilePlanChange={setMobilePlan}
          currency={currency}
          labels={labels}
          reduce={reduce}
        />

        <PricingFaqSection
          items={faqItems}
          defaultValue={
            faqDefaultValue === undefined
              ? (faqItems[0]?.id ?? null)
              : faqDefaultValue
          }
          labels={labels}
          reduce={reduce}
        />

        <ClosingCta
          maxSeats={maxSeats}
          primaryHref={salesHref}
          secondaryHref={securityHref}
          onPrimaryClick={onContactSales}
          labels={labels}
          reduce={reduce}
        />
      </div>
    </main>
  );
}
