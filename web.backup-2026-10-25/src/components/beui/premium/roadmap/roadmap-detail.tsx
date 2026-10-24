"use client";

import { Check, X } from "lucide-react";
import { motion } from "motion/react";
import {
  AnimatedModalDescription,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import { Button } from "@/components/beui/motion/button";
import type {
  RoadmapItem,
  RoadmapLabels,
  RoadmapStatusLabels,
} from "./roadmap-data";
import {
  includedAnimate,
  includedInitial,
  includedTransition,
  progressBarTransition,
} from "./roadmap-motion";
import { RoadmapStatusNode } from "./roadmap-status-node";
import { RoadmapVoteButton } from "./roadmap-vote-button";

export type RoadmapDetailProps = {
  item: RoadmapItem;
  voted: boolean;
  onVote: () => void;
  onClose: () => void;
  labels: RoadmapLabels;
  statusLabels: RoadmapStatusLabels;
  reduce: boolean | null;
};

/** Dialog body: status header, progress bar, staggered inclusions, vote footer. */
export function RoadmapDetail({
  item,
  voted,
  onVote,
  onClose,
  labels,
  statusLabels,
  reduce,
}: RoadmapDetailProps) {
  return (
    <div>
      <header className="flex items-start gap-3 border-border border-b px-6 py-5">
        <RoadmapStatusNode
          status={item.status}
          progress={item.progress}
          reduce={reduce}
          className="mt-0.5 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs">
            {item.area} · {statusLabels[item.status]}
          </p>
          <AnimatedModalTitle className="mt-1 font-medium text-xl">
            {item.title}
          </AnimatedModalTitle>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={labels.closeDetails}
          onClick={onClose}
          data-autofocus
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      </header>

      <div className="space-y-6 px-6 py-6">
        <AnimatedModalDescription className="text-muted-foreground text-sm leading-6">
          {item.summary}
        </AnimatedModalDescription>

        {item.status === "progress" && item.progress !== undefined ? (
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{labels.progress}</span>
              <span className="font-mono tabular-nums">{item.progress}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ scaleX: reduce ? item.progress / 100 : 0 }}
                animate={{ scaleX: item.progress / 100 }}
                transition={progressBarTransition(reduce)}
                className="h-full origin-left rounded-full bg-foreground"
              />
            </div>
          </div>
        ) : null}

        <div>
          <p className="font-mono text-muted-foreground text-xs uppercase tracking-widest">
            {labels.included}
          </p>
          <ul className="mt-3 space-y-3">
            {item.included.map((entry, index) => (
              <motion.li
                key={entry}
                initial={includedInitial(reduce)}
                animate={includedAnimate}
                transition={includedTransition(reduce, index)}
                className="flex items-start gap-3 text-sm leading-6"
              >
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-muted">
                  <Check className="size-3" aria-hidden="true" />
                </span>
                {entry}
              </motion.li>
            ))}
          </ul>
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 border-border border-t px-6 py-4">
        <p className="text-muted-foreground text-sm">
          {voted ? labels.voted : labels.notVoted}
        </p>
        <RoadmapVoteButton
          item={item}
          voted={voted}
          onVote={onVote}
          labels={labels}
        />
      </footer>
    </div>
  );
}
