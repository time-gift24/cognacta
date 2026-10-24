"use client";

import { AnimatePresence, motion } from "motion/react";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import type { ProductTourStep } from "./product-tour-data";
import { panelTransition } from "./product-tour-motion";

export type StepTabsProps = {
  steps: readonly ProductTourStep[];
  active: ProductTourStep;
  ariaLabel: string;
  reduce: boolean | null;
  onSelect: (index: number) => void;
};

/** Small-screen step switcher with the active step's caption. */
export function StepTabs({
  steps,
  active,
  ariaLabel,
  reduce,
  onSelect,
}: StepTabsProps) {
  return (
    <div className="mt-8 lg:hidden">
      <Tabs
        value={active.id}
        onValueChange={(value) =>
          onSelect(steps.findIndex((s) => s.id === value))
        }
        variant="pill"
      >
        <TabsList aria-label={ariaLabel} className="w-full *:flex-1">
          {steps.map((item) => (
            <TabsTrigger key={item.id} value={item.id} className="w-full px-2">
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active.id}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={panelTransition(reduce)}
          className="mt-5"
          aria-live="polite"
        >
          <h3 className="font-medium text-xl">{active.title}</h3>
          <p className="mt-2 text-muted-foreground text-sm leading-6">
            {active.description}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
