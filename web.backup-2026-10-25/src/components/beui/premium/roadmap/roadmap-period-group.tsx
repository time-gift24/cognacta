"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Ref } from "react";
import { RoadmapCard } from "./roadmap-card";
import type {
  RoadmapItem,
  RoadmapLabels,
  RoadmapPeriod,
  RoadmapStatusLabels,
} from "./roadmap-data";
import {
  cardAnimate,
  cardExit,
  cardInitial,
  layoutTransition,
  periodMotion,
} from "./roadmap-motion";
import { RoadmapStatusNode } from "./roadmap-status-node";

export type RoadmapPeriodGroupProps = {
  period: RoadmapPeriod;
  isVoted: (id: string) => boolean;
  onVote: (id: string) => void;
  onOpen: (item: RoadmapItem) => void;
  labels: RoadmapLabels;
  statusLabels: RoadmapStatusLabels;
  reduce: boolean | null;
  /** Forwarded so the parent `AnimatePresence mode="popLayout"` can measure it. */
  ref?: Ref<HTMLElement>;
};

/** One period: a sticky heading beside its cards, each pinned to a node. */
export function RoadmapPeriodGroup({
  period,
  isVoted,
  onVote,
  onOpen,
  labels,
  statusLabels,
  reduce,
  ref,
}: RoadmapPeriodGroupProps) {
  const transition = layoutTransition(reduce);

  return (
    <motion.section
      ref={ref}
      layout
      {...periodMotion}
      transition={transition}
      aria-labelledby={`roadmap-${period.id}`}
      className="grid gap-4 pb-12 last:pb-0 lg:grid-cols-[10rem_minmax(0,1fr)] lg:gap-10"
    >
      <div className="pl-12 lg:sticky lg:top-24 lg:self-start lg:pt-4 lg:pl-0">
        <h3 id={`roadmap-${period.id}`} className="font-medium text-xl">
          {period.label}
        </h3>
        <p className="mt-1 font-mono text-muted-foreground text-xs">
          {period.period}
        </p>
      </div>

      <ul className="space-y-3">
        <AnimatePresence initial={false} mode="popLayout">
          {period.items.map((item) => (
            <motion.li
              key={item.id}
              layout
              initial={cardInitial(reduce)}
              animate={cardAnimate}
              exit={cardExit(reduce)}
              transition={transition}
              className="relative pl-12"
            >
              <RoadmapStatusNode
                status={item.status}
                progress={item.progress}
                reduce={reduce}
                className="absolute top-5 left-0"
              />
              <RoadmapCard
                item={item}
                voted={isVoted(item.id)}
                onVote={() => onVote(item.id)}
                onOpen={() => onOpen(item)}
                labels={labels}
                statusLabels={statusLabels}
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </motion.section>
  );
}
