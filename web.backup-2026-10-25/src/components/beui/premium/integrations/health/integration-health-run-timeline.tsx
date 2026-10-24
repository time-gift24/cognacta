"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE_OUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";
import type {
  IntegrationHealthLabels,
  IntegrationHealthRun,
} from "./integration-health-data";
import { layoutTransition, STATUS_TONES } from "./integration-health-motion";

/**
 * Vertical run history. New runs slide in at the top while older runs glide
 * down on a layout spring. Reduced motion inserts rows instantly.
 */
export function IntegrationHealthRunTimeline({
  runs,
  labels,
  formatSyncAge,
}: {
  runs: readonly IntegrationHealthRun[];
  labels: IntegrationHealthLabels;
  formatSyncAge: (minutes: number) => string;
}) {
  const reduce = Boolean(useReducedMotion());

  return (
    <ol className="relative">
      <span
        aria-hidden="true"
        className="absolute top-3 bottom-3 left-2.75 w-px bg-border"
      />
      <AnimatePresence initial={false}>
        {runs.map((run) => {
          const ok = run.status === "success";
          const tone = ok ? STATUS_TONES.healthy : STATUS_TONES.failing;
          return (
            <motion.li
              key={run.id}
              layout={!reduce}
              initial={
                reduce ? false : { opacity: 0, y: -8, filter: "blur(4px)" }
              }
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                duration: reduce ? 0 : 0.35,
                ease: EASE_OUT,
                ...layoutTransition(reduce),
              }}
              className="relative flex items-start gap-3 py-2"
            >
              <span className="relative mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-background">
                <span
                  className={cn(
                    "grid size-4 place-items-center rounded-full border",
                    tone.pill,
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", tone.dot)} />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-medium text-foreground text-sm">
                    {run.note}
                  </span>
                  <time className="shrink-0 text-muted-foreground text-xs tabular-nums">
                    {formatSyncAge(run.minutesAgo)}
                  </time>
                </span>
                <span
                  className={cn(
                    "block text-xs tabular-nums",
                    ok ? "text-muted-foreground" : tone.text,
                  )}
                >
                  {ok
                    ? `${run.records.toLocaleString("en-US")} ${labels.records}`
                    : labels.failing}
                </span>
              </span>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}
