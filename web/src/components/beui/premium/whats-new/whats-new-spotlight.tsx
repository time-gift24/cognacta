"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AnimatedModal,
  AnimatedModalTitle,
} from "@/components/beui/motion/animated-modal";
import { Button } from "@/components/beui/motion/button";
import { cn } from "@/lib/beui/utils";
import type { useSlideNavigation } from "./use-slide-navigation";
import type {
  WhatsNewCategory,
  WhatsNewLabels,
  WhatsNewRelease,
  WhatsNewSlide,
} from "./whats-new-data";
import { WhatsNewFooterNav } from "./whats-new-footer-nav";
import { WhatsNewSlideCopy } from "./whats-new-slide-copy";
import { WhatsNewSlideMedia } from "./whats-new-slide-media";

export type WhatsNewSpotlightProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExitComplete?: () => void;
  release: WhatsNewRelease;
  slides: WhatsNewSlide[];
  categories: WhatsNewCategory[];
  labels: WhatsNewLabels;
  navigation: ReturnType<typeof useSlideNavigation>;
  reduceMotion: boolean;
  /** Milliseconds per slide, or false to disable auto-advance. */
  autoplay: number | false;
  changelogHref?: string;
  onDone: () => void;
  panelClassName?: string;
};

/** The release walkthrough inside the shared AnimatedModal. */
export function WhatsNewSpotlight({
  open,
  onOpenChange,
  onExitComplete,
  release,
  slides,
  categories,
  labels,
  navigation,
  reduceMotion,
  autoplay,
  changelogHref,
  onDone,
  panelClassName,
}: WhatsNewSpotlightProps) {
  const { index, direction, canPrev, canNext, isLast, goTo, next, prev } =
    navigation;
  const slide = slides[index];
  const category = categories.find((item) => item.id === slide?.category);
  const [hovering, setHovering] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const paused = hovering || focusWithin;

  // Auto-advance stops on the last slide, while the person is pointing at or
  // focused on the controls, and never runs with reduced motion.
  useEffect(() => {
    if (!open || !autoplay || paused || reduceMotion || !canNext) return;
    const timer = window.setTimeout(next, autoplay);
    return () => window.clearTimeout(timer);
  }, [open, autoplay, paused, reduceMotion, canNext, next]);

  return (
    <AnimatedModal
      open={open}
      onOpenChange={onOpenChange}
      onExitComplete={onExitComplete}
      panelClassName={cn("max-w-3xl rounded-3xl", panelClassName)}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: arrow keys page through slides anywhere in the dialog; every control is also a button. */}
      <div onKeyDown={navigation.onKeyDown} className="p-2">
        {slide ? (
          <WhatsNewSlideMedia
            slide={slide}
            index={index}
            direction={direction}
            reduceMotion={reduceMotion}
            canPrev={canPrev}
            canNext={canNext}
            onPrev={prev}
            onNext={next}
          >
            <Button
              variant="secondary"
              size="icon"
              aria-label={labels.close}
              onClick={() => onOpenChange(false)}
              className="absolute top-3 right-3 z-10 bg-background/80 backdrop-blur"
            >
              <X aria-hidden className="size-4" />
            </Button>
          </WhatsNewSlideMedia>
        ) : null}
        <div className="px-4 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-5">
          {slide ? (
            <WhatsNewSlideCopy
              slide={slide}
              category={category}
              release={release}
              labels={labels}
              direction={direction}
              reduceMotion={reduceMotion}
            />
          ) : (
            <AnimatedModalTitle className="text-xl font-medium">
              {release.label}
            </AnimatedModalTitle>
          )}
          <p aria-live="polite" className="sr-only">
            {slide ? labels.slideStatus(index + 1, slides.length) : ""}
          </p>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: pauses auto-advance while the controls are in use. */}
          <div
            className="mt-5"
            onPointerEnter={() => setHovering(true)}
            onPointerLeave={() => setHovering(false)}
            onFocus={(event) => {
              // The dialog focuses Next on open; only keyboard focus pauses.
              if (event.target.matches(":focus-visible")) setFocusWithin(true);
            }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node))
                setFocusWithin(false);
            }}
          >
            <WhatsNewFooterNav
              slides={slides}
              index={index}
              labels={labels}
              reduceMotion={reduceMotion}
              canPrev={canPrev}
              isLast={isLast}
              changelogHref={changelogHref}
              onSelect={goTo}
              onPrev={prev}
              onNext={next}
              onDone={onDone}
            />
          </div>
        </div>
      </div>
    </AnimatedModal>
  );
}
