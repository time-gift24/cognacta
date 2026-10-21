"use client";

import { AnimatePresence, useReducedMotion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { useSlideNavigation } from "./use-slide-navigation";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_LABELS,
  DEFAULT_RELEASE,
  DEFAULT_SLIDES,
  type WhatsNewCategory,
  type WhatsNewLabels,
  type WhatsNewRelease,
  type WhatsNewSlide,
  type WhatsNewTeaserPlacement,
} from "./whats-new-data";
import { WhatsNewSpotlight } from "./whats-new-spotlight";
import { WhatsNewTeaser } from "./whats-new-teaser";

const DEFAULT_AUTOPLAY_MS = 6000;

export type WhatsNewProps = {
  release?: WhatsNewRelease;
  slides?: WhatsNewSlide[];
  categories?: WhatsNewCategory[];
  labels?: Partial<WhatsNewLabels>;
  /**
   * Where the teaser card sits. Corner placements are absolutely positioned,
   * so give the container `position: relative`.
   */
  teaserPlacement?: WhatsNewTeaserPlacement;
  /** Render the teaser card that opens the spotlight. */
  showTeaser?: boolean;
  /** Open the spotlight on mount (uncontrolled). */
  defaultOpen?: boolean;
  /** Controlled open state. Pair with `onOpenChange`. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onDismissTeaser?: () => void;
  /** Fired when the person finishes the walkthrough with "Got it". */
  onComplete?: () => void;
  changelogHref?: string;
  /** Auto-advance slides: `true` for 6s, or milliseconds per slide. */
  autoplay?: boolean | number;
  className?: string;
  teaserClassName?: string;
  panelClassName?: string;
};

/**
 * Release spotlight: a floating teaser that opens a paged walkthrough of the
 * latest release, with direction-aware slides, swipe, and keyboard paging.
 */
export function WhatsNew({
  release = DEFAULT_RELEASE,
  slides = DEFAULT_SLIDES,
  categories = DEFAULT_CATEGORIES,
  labels: labelOverrides,
  teaserPlacement = "bottom-right",
  showTeaser = true,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  onDismissTeaser,
  onComplete,
  changelogHref = "#changelog",
  autoplay = false,
  className,
  teaserClassName,
  panelClassName,
}: WhatsNewProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const labels = useMemo(
    () => ({ ...DEFAULT_LABELS, ...labelOverrides }),
    [labelOverrides],
  );
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;
  const [teaserVisible, setTeaserVisible] = useState(true);
  const navigation = useSlideNavigation(slides.length);
  const { reset } = navigation;

  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setOpenState(next);
      onOpenChange?.(next);
    },
    [onOpenChange, openProp],
  );

  const dismissTeaser = useCallback(() => {
    setTeaserVisible(false);
    onDismissTeaser?.();
  }, [onDismissTeaser]);

  const done = useCallback(() => {
    onComplete?.();
    setOpen(false);
  }, [onComplete, setOpen]);

  const autoplayMs =
    autoplay === true
      ? DEFAULT_AUTOPLAY_MS
      : typeof autoplay === "number" && autoplay > 0
        ? autoplay
        : false;

  return (
    <div className={className}>
      <AnimatePresence>
        {showTeaser && teaserVisible ? (
          <WhatsNewTeaser
            key="teaser"
            release={release}
            slides={slides}
            labels={labels}
            placement={teaserPlacement}
            reduceMotion={reduceMotion}
            onOpen={() => setOpen(true)}
            onDismiss={dismissTeaser}
            className={teaserClassName}
          />
        ) : null}
      </AnimatePresence>
      <WhatsNewSpotlight
        open={open}
        onOpenChange={setOpen}
        onExitComplete={reset}
        release={release}
        slides={slides}
        categories={categories}
        labels={labels}
        navigation={navigation}
        reduceMotion={reduceMotion}
        autoplay={autoplayMs}
        changelogHref={changelogHref}
        onDone={done}
        panelClassName={panelClassName}
      />
    </div>
  );
}
