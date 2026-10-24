"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button, ButtonLink } from "@/components/beui/motion/button";
import { EASE_IN } from "@/lib/beui/ease";
import type { WhatsNewLabels, WhatsNewSlide } from "./whats-new-data";
import { LABEL_SWAP } from "./whats-new-motion";
import { WhatsNewStepDots } from "./whats-new-step-dots";

export type WhatsNewFooterNavProps = {
  slides: WhatsNewSlide[];
  index: number;
  labels: WhatsNewLabels;
  reduceMotion: boolean;
  canPrev: boolean;
  isLast: boolean;
  changelogHref?: string;
  onSelect: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onDone: () => void;
};

/** Step dots, Back / Next, and the changelog link on the final slide. */
export function WhatsNewFooterNav({
  slides,
  index,
  labels,
  reduceMotion,
  canPrev,
  isLast,
  changelogHref,
  onSelect,
  onPrev,
  onNext,
  onDone,
}: WhatsNewFooterNavProps) {
  const swap = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 6, filter: "blur(4px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
      };
  const external = changelogHref ? /^https?:\/\//.test(changelogHref) : false;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex justify-center sm:justify-start">
        <WhatsNewStepDots
          slides={slides}
          index={index}
          labels={labels}
          reduceMotion={reduceMotion}
          onSelect={onSelect}
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <AnimatePresence initial={false}>
          {isLast && changelogHref ? (
            <ButtonLink
              key="changelog"
              href={changelogHref}
              variant="ghost"
              initial={swap.initial}
              animate={{ ...swap.animate, transition: LABEL_SWAP }}
              exit={{
                opacity: 0,
                transition: { duration: 0.12, ease: EASE_IN },
              }}
              className="h-9 px-3 text-sm"
              {...(external
                ? { target: "_blank", rel: "noreferrer noopener" }
                : {})}
            >
              {labels.changelog}
            </ButtonLink>
          ) : null}
        </AnimatePresence>
        <Button
          variant="outline"
          disabled={!canPrev}
          onClick={onPrev}
          aria-label={labels.back}
          className="h-9 gap-1.5 px-3 text-sm sm:px-4"
        >
          <ArrowLeft aria-hidden className="size-4" />
          <span className="sr-only sm:not-sr-only">{labels.back}</span>
        </Button>
        <Button
          data-autofocus
          onClick={isLast ? onDone : onNext}
          className="h-9 min-w-24 gap-1.5 px-4 text-sm"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isLast ? "done" : "next"}
              initial={swap.initial}
              animate={{ ...swap.animate, transition: LABEL_SWAP }}
              exit={{
                opacity: 0,
                transition: { duration: 0.1, ease: EASE_IN },
              }}
              className="inline-flex items-center gap-1.5"
            >
              {isLast ? labels.done : labels.next}
              {isLast ? null : <ArrowRight aria-hidden className="size-4" />}
            </motion.span>
          </AnimatePresence>
        </Button>
      </div>
    </div>
  );
}
