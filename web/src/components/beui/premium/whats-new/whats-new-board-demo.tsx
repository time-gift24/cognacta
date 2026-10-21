"use client";

import { Check, GitPullRequestArrow, Zap } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useId, useState } from "react";
import { EASE_IN, EASE_OUT, SPRING_BOUNCE, SPRING_LAYOUT } from "@/lib/beui/ease";
import { cn } from "@/lib/beui/utils";

/*
 * Storyboard: a three-column board. Every 1.8s the highlighted card glides
 * to the next column (shared layout), a "Moved by rule" chip pops onto it,
 * and after the last column it fades out and reappears in the first one.
 * The loop only runs while the slide is active. Reduced motion shows the
 * card resting in the last column with its chip.
 */

export type WhatsNewBoardDemoProps = {
  active: boolean;
  reduceMotion: boolean;
};

const COLUMNS = ["In progress", "In review", "Shipped"];
const STEP_MS = 1800;
/** Filler rows per column, as widths of their skeleton lines. */
const FILLER = [["w-3/4", "w-1/2"], ["w-2/3"], ["w-1/2", "w-3/5"]];

function FillerCard({ width }: { width: string }) {
  return (
    <div className="space-y-1.5 rounded-lg border border-border bg-background p-2">
      <div className={cn("h-1.5 rounded-full bg-muted", width)} />
      <div className="h-1.5 w-1/3 rounded-full bg-muted" />
    </div>
  );
}

/** Custom slide media: a mini board where an automation moves a card. */
export function WhatsNewBoardDemo({
  active,
  reduceMotion,
}: WhatsNewBoardDemoProps) {
  const id = useId();
  const [tick, setTick] = useState(0);
  const looping = active && !reduceMotion;
  const column = reduceMotion ? 2 : tick % COLUMNS.length;
  const cycle = Math.floor(tick / COLUMNS.length);

  useEffect(() => {
    if (!looping) return;
    const timer = window.setInterval(() => setTick((t) => t + 1), STEP_MS);
    return () => window.clearInterval(timer);
  }, [looping]);

  return (
    <div
      aria-hidden
      className="flex size-full flex-col gap-3 bg-linear-to-br from-teal-500/15 via-background to-sky-500/15 p-3 sm:p-5"
    >
      <div className="flex w-fit max-w-full items-center gap-2 rounded-full border border-border bg-background py-1 pr-3 pl-1 text-xs">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted">
          <Zap className="size-3 text-muted-foreground" />
        </span>
        <span className="truncate text-muted-foreground">
          When a review is approved, move to the next column
        </span>
      </div>
      <LayoutGroup id={id}>
        <div className="grid min-h-0 flex-1 grid-cols-3 gap-2 sm:gap-3">
          {COLUMNS.map((name, columnIndex) => (
            <div
              key={name}
              className="flex min-h-0 flex-col gap-1.5 overflow-clip rounded-xl border border-border bg-background/70 p-1.5 sm:gap-2 sm:p-2"
            >
              <div className="flex items-center justify-between px-1 text-xs font-medium">
                <span className="truncate">{name}</span>
                <span className="font-mono text-muted-foreground tabular-nums">
                  {FILLER[columnIndex].length +
                    (column === columnIndex ? 1 : 0)}
                </span>
              </div>
              <AnimatePresence mode="popLayout" initial={false}>
                {column === columnIndex ? (
                  <motion.div
                    key={`card-${cycle}`}
                    layoutId={`${id}-card-${cycle}`}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{
                      opacity: 0,
                      scale: 0.94,
                      transition: { duration: 0.15, ease: EASE_IN },
                    }}
                    transition={{
                      layout: SPRING_LAYOUT,
                      default: { duration: 0.3, ease: EASE_OUT },
                    }}
                    className="space-y-1.5 rounded-lg border border-foreground/20 bg-background p-2"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <GitPullRequestArrow className="size-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">Billing export</span>
                    </div>
                    {columnIndex > 0 ? (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={SPRING_BOUNCE}
                        className="inline-flex max-w-full items-center gap-1 rounded-full border border-teal-500/25 bg-teal-500/10 px-1.5 py-0.5 text-xs text-teal-700 dark:text-teal-300"
                      >
                        <Check className="size-3 shrink-0" />
                        <span className="truncate">Moved by rule</span>
                      </motion.span>
                    ) : null}
                  </motion.div>
                ) : null}
              </AnimatePresence>
              {FILLER[columnIndex].map((width) => (
                <FillerCard key={width} width={width} />
              ))}
            </div>
          ))}
        </div>
      </LayoutGroup>
    </div>
  );
}
