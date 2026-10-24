"use client";

import { motion } from "motion/react";
import { Button } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";
import type { AppShowcaseFeature } from "./app-showcase-data";

/** Desktop feature card with an auto-advance progress line. */
export function FeatureRow({
  feature,
  active,
  running,
  reduce,
  interval,
  onSelect,
}: {
  feature: AppShowcaseFeature;
  active: boolean;
  running: boolean;
  reduce: boolean | null;
  /** Auto-advance interval in ms; drives the progress line. */
  interval: number;
  onSelect: () => void;
}) {
  const Icon = feature.icon;

  return (
    <li
      className={cn(
        "rounded-2xl border transition-colors duration-300 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-foreground",
        active ? "border-border" : "border-transparent",
      )}
    >
      <Button
        variant="plain"
        type="button"
        aria-pressed={active}
        onClick={onSelect}
        whileHover={undefined}
        whileTap={undefined}
        className="block w-full p-5 text-left focus-visible:ring-0 focus-visible:ring-offset-0"
      >
        <span className="flex items-center gap-3">
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-full bg-muted transition-colors duration-300",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <span
            className={cn(
              "font-medium text-xl transition-colors duration-300",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {feature.title}
          </span>
        </span>
        <span className="mt-3 block text-muted-foreground text-sm leading-6">
          {feature.description}
        </span>
        <span className="mt-4 block h-0.5 overflow-hidden rounded-full bg-border">
          {active ? (
            <motion.span
              key={running ? "running" : "still"}
              initial={{ scaleX: running ? 0 : 1 }}
              animate={{ scaleX: 1 }}
              transition={
                running && !reduce
                  ? { duration: interval / 1000, ease: "linear" }
                  : { duration: 0 }
              }
              className="block h-full origin-left bg-foreground"
            />
          ) : null}
        </span>
      </Button>
    </li>
  );
}
