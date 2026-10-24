"use client";

import { AnimatePresence, useReducedMotion, useScroll } from "motion/react";
import { useId, useMemo, useRef, useState } from "react";
import { AnimatedModal } from "@/components/beui/motion/animated-modal";
import { cn } from "@/lib/beui/utils";
import {
  DEFAULT_ROADMAP_LABELS,
  ROADMAP_PERIODS,
  ROADMAP_STATUS_LABEL,
  type RoadmapFilter,
  type RoadmapItem,
  type RoadmapLabels,
  type RoadmapPeriod,
  type RoadmapStatusLabels,
} from "./roadmap-data";
import { RoadmapDetail } from "./roadmap-detail";
import { RoadmapHeader } from "./roadmap-header";
import { LINE_SCROLL_OFFSET } from "./roadmap-motion";
import { RoadmapPeriodGroup } from "./roadmap-period-group";
import { RoadmapTimelineLine } from "./roadmap-timeline-line";

/* ─────────────────────────────────────────────────────────
 * ROADMAP STORYBOARD
 *
 *  scroll   the timeline line draws downward as the list passes
 *           the reading line; in-progress rings fill once in view
 *  filter   cards and empty periods leave, the rest reflow into
 *           place with a shared layout spring
 *  vote     the count rolls up or down and the button fills
 *  open     any card opens a detail dialog with a progress bar and
 *           a staggered list of what is included
 *
 *  Parts
 *    roadmap-header.tsx         eyebrow, title, status filter tabs
 *    roadmap-timeline-line.tsx  scroll-drawn rail
 *    roadmap-period-group.tsx   period heading and its animated cards
 *    roadmap-card.tsx           card with a stretched title button
 *    roadmap-status-node.tsx    check, progress ring, or planned dot
 *    roadmap-vote-button.tsx    toggle with rolling count
 *    roadmap-detail.tsx         dialog body
 *    roadmap-motion.ts          transitions and ring geometry
 *    roadmap-data.ts            types, labels, sample periods
 * ───────────────────────────────────────────────────────── */

export type RoadmapTimelineProps = {
  /** Periods in display order. Defaults to sample data. */
  periods?: readonly RoadmapPeriod[];
  /** Overrides for status names used in tabs, cards, and the dialog. */
  statusLabels?: Partial<RoadmapStatusLabels>;
  /** Overrides for interface copy. */
  labels?: Partial<RoadmapLabels>;
  /** Item ids the viewer has already voted for. */
  defaultVotedIds?: readonly string[];
  /** Called after a vote toggles, with the new state. */
  onVote?: (itemId: string, voted: boolean) => void;
  /** Called when an item's detail dialog opens. */
  onOpenItem?: (item: RoadmapItem) => void;
  className?: string;
};

export function RoadmapTimeline({
  periods = ROADMAP_PERIODS,
  statusLabels: statusLabelOverrides,
  labels: labelOverrides,
  defaultVotedIds,
  onVote,
  onOpenItem,
  className,
}: RoadmapTimelineProps) {
  const labels = { ...DEFAULT_ROADMAP_LABELS, ...labelOverrides };
  const statusLabels = { ...ROADMAP_STATUS_LABEL, ...statusLabelOverrides };
  const reduce = useReducedMotion();
  const titleId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<RoadmapFilter>("all");
  const [voted, setVoted] = useState<ReadonlySet<string>>(
    () => new Set(defaultVotedIds),
  );
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<RoadmapItem | null>(null);
  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: LINE_SCROLL_OFFSET,
  });

  const allItems = useMemo(
    () => periods.flatMap((period) => period.items),
    [periods],
  );

  const visiblePeriods = useMemo(
    () =>
      periods
        .map((period) => ({
          ...period,
          items: period.items.filter(
            (item) => filter === "all" || item.status === filter,
          ),
        }))
        .filter((period) => period.items.length > 0),
    [periods, filter],
  );

  const toggleVote = (id: string) => {
    const nextVoted = !voted.has(id);
    setVoted((current) => {
      const next = new Set(current);
      if (nextVoted) next.add(id);
      else next.delete(id);
      return next;
    });
    onVote?.(id, nextVoted);
  };

  const openItem = (item: RoadmapItem) => {
    setActive(item);
    setOpen(true);
    onOpenItem?.(item);
  };

  const isVoted = (id: string) => voted.has(id);

  return (
    <section
      className={cn(
        "w-full bg-background px-4 py-16 font-sans text-foreground sm:px-8 sm:py-24",
        className,
      )}
      aria-labelledby={titleId}
    >
      <div className="mx-auto w-full max-w-5xl">
        <RoadmapHeader
          titleId={titleId}
          items={allItems}
          filter={filter}
          onFilterChange={setFilter}
          labels={labels}
          statusLabels={statusLabels}
        />

        <div ref={listRef} className="relative mt-14">
          <RoadmapTimelineLine progress={scrollYProgress} reduce={reduce} />

          <AnimatePresence initial={false} mode="popLayout">
            {visiblePeriods.map((period) => (
              <RoadmapPeriodGroup
                key={period.id}
                period={period}
                isVoted={isVoted}
                onVote={toggleVote}
                onOpen={openItem}
                labels={labels}
                statusLabels={statusLabels}
                reduce={reduce}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      <AnimatedModal
        open={open}
        onOpenChange={setOpen}
        onExitComplete={() => setActive(null)}
        backdropClassName="bg-foreground/15 backdrop-blur-sm"
        viewportClassName="overscroll-contain inset-3 sm:inset-6"
        panelClassName="max-w-lg rounded-3xl"
      >
        {active ? (
          <RoadmapDetail
            item={active}
            voted={voted.has(active.id)}
            onVote={() => toggleVote(active.id)}
            onClose={() => setOpen(false)}
            labels={labels}
            statusLabels={statusLabels}
            reduce={reduce}
          />
        ) : null}
      </AnimatedModal>
    </section>
  );
}
