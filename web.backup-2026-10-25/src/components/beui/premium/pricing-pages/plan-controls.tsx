"use client";

import { motion } from "motion/react";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import type {
  PricingPageBilling,
  PricingPageLabels,
} from "./pricing-page-data";
import { RISE } from "./pricing-page-motion";
import { SeatControl } from "./seat-control";

export type PlanControlsProps = {
  billing: PricingPageBilling;
  onBillingChange: (billing: PricingPageBilling) => void;
  seats: number;
  minSeats: number;
  maxSeats: number;
  onSeatsChange: (seats: number) => void;
  labels: PricingPageLabels;
};

/** Billing period tabs and team-size slider in one bordered bar. */
export function PlanControls({
  billing,
  onBillingChange,
  seats,
  minSeats,
  maxSeats,
  onSeatsChange,
  labels,
}: PlanControlsProps) {
  return (
    <motion.div
      variants={RISE}
      className="mt-10 grid w-full gap-5 rounded-3xl border border-border p-3 text-left sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-0 sm:p-2"
    >
      <Tabs
        value={billing}
        onValueChange={(value) => onBillingChange(value as PricingPageBilling)}
        variant="pill"
      >
        <TabsList
          aria-label={labels.billingAriaLabel}
          className="w-full sm:w-auto"
        >
          <TabsTrigger value="monthly" className="flex-1 sm:flex-none">
            {labels.monthly}
          </TabsTrigger>
          <TabsTrigger value="annual" className="flex-1 gap-1.5 sm:flex-none">
            {labels.annual}
            {labels.annualBadge ? (
              <span className="font-mono text-muted-foreground text-xs">
                {labels.annualBadge}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <SeatControl
        seats={seats}
        min={minSeats}
        max={maxSeats}
        onSeatsChange={onSeatsChange}
        labels={labels}
      />
    </motion.div>
  );
}
