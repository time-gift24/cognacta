"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ButtonLink } from "@/components/beui/motion/button";
import { AnimatedPrice } from "@/components/beui/premium/pricing/animated-price";
import { cn } from "@/lib/beui/utils";
import type {
  PricingPageBilling,
  PricingPageLabels,
  PricingPagePlan,
} from "./pricing-page-data";
import { panelTransition, RISE, washTransition } from "./pricing-page-motion";
import { RecommendedPill } from "./recommended-pill";
import { TeamFitMeter } from "./team-fit-meter";

export type PlanCardProps = {
  plan: PricingPagePlan;
  billing: PricingPageBilling;
  seats: number;
  recommended: boolean;
  highlighted: boolean;
  reduce: boolean | null;
  canHover: boolean;
  currency: string;
  formatMoney: (value: number) => string;
  labels: PricingPageLabels;
  onPreview: (active: boolean) => void;
  onSelect?: () => void;
};

export function PlanCard({
  plan,
  billing,
  seats,
  recommended,
  highlighted,
  reduce,
  canHover,
  currency,
  formatMoney,
  labels,
  onPreview,
  onSelect,
}: PlanCardProps) {
  const annual = billing === "annual";
  const perSeat = annual ? plan.annual : plan.monthly;
  const total = perSeat * seats * (annual ? 12 : 1);
  const totalLabel = `${currency}${formatMoney(total)} ${
    annual ? labels.billedYearly : labels.billedMonthly
  }`;

  return (
    <motion.li
      variants={RISE}
      onPointerEnter={canHover ? () => onPreview(true) : undefined}
      onPointerLeave={canHover ? () => onPreview(false) : undefined}
      onFocus={() => onPreview(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onPreview(false);
        }
      }}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-3xl border bg-background p-2 transition-colors duration-300",
        recommended
          ? "border-foreground/50"
          : highlighted
            ? "border-foreground/25"
            : "border-border",
      )}
    >
      {/* Decorative wash that fades in behind the recommended plan. */}
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{ opacity: recommended ? 1 : 0 }}
        transition={washTransition(reduce)}
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-foreground/5 to-transparent"
      />

      <div className="relative rounded-2xl border border-border p-5 sm:p-6">
        <div className="flex h-7 items-center justify-between gap-3">
          <h2 className="font-medium text-xl">{plan.name}</h2>
          <RecommendedPill
            show={recommended}
            label={labels.recommended}
            reduce={reduce}
          />
        </div>
        <p className="mt-2 min-h-12 text-muted-foreground text-sm leading-6">
          {plan.summary}
        </p>

        <div className="mt-6">
          <AnimatedPrice
            amount={perSeat}
            currency={currency}
            suffix={labels.priceSuffix}
            className="text-5xl tracking-tight"
          />
          <div className="relative mt-2 h-5 overflow-hidden text-muted-foreground text-sm tabular-nums">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.p
                key={totalLabel}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={panelTransition(reduce)}
              >
                {totalLabel}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <TeamFitMeter
          seats={seats}
          maxSeats={plan.maxSeats}
          labels={labels}
          reduce={reduce}
        />

        <ButtonLink
          href={plan.href ?? "#"}
          variant={recommended ? "primary" : "outline"}
          className="mt-6 w-full"
          onClick={onSelect}
        >
          {plan.cta}
        </ButtonLink>
      </div>

      <ul className="relative space-y-3 px-5 pt-5 pb-4 sm:px-6">
        {plan.highlights.map((item) => (
          <li key={item} className="flex items-start gap-3 text-sm leading-6">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-muted">
              <Check className="size-3" aria-hidden="true" />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </motion.li>
  );
}
