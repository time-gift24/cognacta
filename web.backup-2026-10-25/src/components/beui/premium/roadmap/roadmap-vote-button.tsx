"use client";

import { ChevronUp } from "lucide-react";
import { Button } from "@/components/beui/motion/button";
import { DigitSwap } from "@/components/beui/motion/digit-swap";
import type { RoadmapItem, RoadmapLabels } from "./roadmap-data";

export type RoadmapVoteButtonProps = {
  item: RoadmapItem;
  voted: boolean;
  onVote: () => void;
  labels: Pick<RoadmapLabels, "vote" | "removeVote" | "votes">;
};

/** Upvote toggle; the count rolls in the direction of the change. */
export function RoadmapVoteButton({
  item,
  voted,
  onVote,
  labels,
}: RoadmapVoteButtonProps) {
  const count = item.votes + (voted ? 1 : 0);

  return (
    <Button
      type="button"
      size="sm"
      variant={voted ? "primary" : "outline"}
      aria-pressed={voted}
      aria-label={`${voted ? labels.removeVote : labels.vote} ${item.title}, ${count} ${labels.votes}`}
      onClick={onVote}
      className="relative z-10 h-8 gap-1.5 px-3"
    >
      <ChevronUp className="size-3.5" aria-hidden="true" />
      <DigitSwap
        value={count}
        direction={voted ? "up" : "down"}
        className="font-mono tabular-nums"
      />
    </Button>
  );
}
