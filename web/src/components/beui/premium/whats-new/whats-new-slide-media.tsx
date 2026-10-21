"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/beui/utils";
import { useSwipe } from "./use-swipe";
import {
  isImageMedia,
  type WhatsNewSlideMedia as SlideMediaData,
  type WhatsNewSlide,
} from "./whats-new-data";
import { WhatsNewKenBurns } from "./whats-new-ken-burns";
import { MEDIA_VARIANTS, type SlideMotionContext } from "./whats-new-motion";

export type WhatsNewSlideMediaProps = {
  slide: WhatsNewSlide;
  index: number;
  direction: 1 | -1;
  reduceMotion: boolean;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** Overlay controls such as the close button. */
  children?: ReactNode;
  className?: string;
};

function renderMedia(
  media: SlideMediaData,
  index: number,
  reduceMotion: boolean,
) {
  if (isImageMedia(media))
    return (
      <WhatsNewKenBurns
        media={media}
        variant={index}
        animated={!reduceMotion}
      />
    );
  return typeof media.render === "function"
    ? media.render({ active: true, reduceMotion })
    : media.render;
}

/**
 * Wide media stage. Slides overlap during the transition so the outgoing
 * one leaves while the next arrives from the side of travel. Dragging the
 * stage horizontally pages through the slides.
 */
export function WhatsNewSlideMedia({
  slide,
  index,
  direction,
  reduceMotion,
  canPrev,
  canNext,
  onPrev,
  onNext,
  children,
  className,
}: WhatsNewSlideMediaProps) {
  const { x, handlers } = useSwipe({
    onSwipeLeft: onNext,
    onSwipeRight: onPrev,
    canSwipeLeft: canNext,
    canSwipeRight: canPrev,
    reduceMotion,
  });
  const custom: SlideMotionContext = { direction, reduce: reduceMotion };

  return (
    <div
      className={cn(
        "relative aspect-video w-full touch-pan-y overflow-clip rounded-2xl border border-border bg-background select-none",
        className,
      )}
      {...handlers}
    >
      <motion.div style={{ x }} className="absolute inset-0 cursor-grab">
        <AnimatePresence initial={false} custom={custom}>
          <motion.div
            key={slide.id}
            custom={custom}
            variants={MEDIA_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0"
          >
            {renderMedia(slide.media, index, reduceMotion)}
          </motion.div>
        </AnimatePresence>
      </motion.div>
      {children}
    </div>
  );
}
