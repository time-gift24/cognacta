"use client";

import { AnimatePresence, motion } from "motion/react";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { SPRING_PANEL } from "@/lib/beui/ease";
import type { AppShowcaseFeature } from "./app-showcase-data";

/** Mobile feature picker: pill tabs plus the active description. */
export function FeatureTabs({
  features,
  active,
  reduce,
  label,
  onSelect,
}: {
  features: readonly AppShowcaseFeature[];
  active: AppShowcaseFeature;
  reduce: boolean | null;
  /** Accessible name for the tab list. */
  label: string;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="lg:hidden">
      <Tabs
        value={active.id}
        onValueChange={(value) =>
          onSelect(features.findIndex((f) => f.id === value))
        }
        variant="pill"
      >
        <TabsList aria-label={label} className="w-full *:flex-1">
          {features.map((feature) => (
            <TabsTrigger
              key={feature.id}
              value={feature.id}
              className="w-full px-2"
            >
              {feature.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={active.id}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={reduce ? { duration: 0 } : SPRING_PANEL}
          className="mt-4 min-h-12 text-center text-muted-foreground text-sm leading-6"
          aria-live="polite"
        >
          {active.description}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
