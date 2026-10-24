"use client";

import { Button } from "@/components/beui/motion/button";
import type {
  RoadmapItem,
  RoadmapLabels,
  RoadmapStatusLabels,
} from "./roadmap-data";
import { RoadmapVoteButton } from "./roadmap-vote-button";

export type RoadmapCardProps = {
  item: RoadmapItem;
  voted: boolean;
  onVote: () => void;
  onOpen: () => void;
  labels: RoadmapLabels;
  statusLabels: RoadmapStatusLabels;
};

/**
 * Roadmap entry. The title button stretches over the whole card so any
 * click opens the detail; the vote button sits above it on its own layer.
 */
export function RoadmapCard({
  item,
  voted,
  onVote,
  onOpen,
  labels,
  statusLabels,
}: RoadmapCardProps) {
  return (
    <article className="relative rounded-2xl border border-border bg-background p-5 transition-colors duration-200 hover:border-foreground/25 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-foreground">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">
            {item.area} · {statusLabels[item.status]}
            {item.status === "progress" && item.progress !== undefined
              ? ` · ${item.progress}%`
              : ""}
          </p>
          <h4 className="mt-2 font-medium text-xl">
            <Button
              variant="plain"
              type="button"
              onClick={onOpen}
              aria-haspopup="dialog"
              // A transform would turn the button into the overlay's
              // containing block and shrink the card-wide hit area.
              whileHover={undefined}
              whileTap={undefined}
              className="text-left font-medium text-xl after:absolute after:inset-0 after:content-[''] focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              {item.title}
            </Button>
          </h4>
          <p className="mt-2 max-w-lg text-muted-foreground text-sm leading-6">
            {item.summary}
          </p>
        </div>
        <RoadmapVoteButton
          item={item}
          voted={voted}
          onVote={onVote}
          labels={labels}
        />
      </div>
    </article>
  );
}
