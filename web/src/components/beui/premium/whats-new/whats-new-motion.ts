import type { Transition, Variants } from "motion/react";
import { EASE_IN, EASE_IN_OUT, EASE_OUT } from "@/lib/beui/ease";

/*
 * Storyboard
 * 1. Teaser: 0.6s after mount the card blur-rises into its corner, then the
 *    release thumbnails fan out behind each other 70ms apart. Hovering the
 *    card spreads the fan a little. Dismissing drops it 16px and fades in
 *    180ms.
 * 2. Spotlight: AnimatedModal scales the panel in. The active slide's image
 *    drifts slowly (Ken Burns) while it is on screen.
 * 3. Changing slides: media slides and un-blurs in from the side of travel
 *    while the old slide leaves the other way; the copy follows 80ms later.
 *    The active step dot stretches into a pill with a layout spring.
 * 4. Dragging the media follows the finger with resistance (rubber-band at
 *    the first and last slide) and springs back on release.
 * Reduced motion: no transforms, blur, or Ken Burns. The teaser and slides
 * cross-fade, and dragging does not move the media.
 */

export const TEASER_DELAY = 0.6;
export const THUMB_STAGGER = 0.07;

/** Pixels the media and copy travel when a slide enters or leaves. */
const TRAVEL = 48;
const COPY_TRAVEL = 24;

export type SlideMotionContext = { direction: 1 | -1; reduce: boolean };

export function teaserMotion(reduce: boolean) {
  return {
    initial: reduce
      ? { opacity: 0 }
      : { opacity: 0, y: 24, filter: "blur(6px)" },
    animate: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: reduce
        ? { duration: 0.2, delay: TEASER_DELAY }
        : { duration: 0.55, delay: TEASER_DELAY, ease: EASE_OUT },
    },
    exit: {
      opacity: 0,
      y: reduce ? 0 : 16,
      transition: { duration: 0.18, ease: EASE_IN },
    },
  };
}

function slideVariants(travel: number, enterDelay: number): Variants {
  return {
    enter: ({ direction, reduce }: SlideMotionContext) =>
      reduce
        ? { opacity: 0 }
        : { opacity: 0, x: direction * travel, filter: "blur(8px)" },
    center: ({ reduce }: SlideMotionContext) => ({
      opacity: 1,
      x: 0,
      filter: "blur(0px)",
      transition: reduce
        ? { duration: 0.2, delay: enterDelay }
        : {
            x: { duration: 0.5, delay: enterDelay, ease: EASE_OUT },
            opacity: { duration: 0.3, delay: enterDelay, ease: EASE_OUT },
            filter: { duration: 0.4, delay: enterDelay, ease: EASE_OUT },
          },
    }),
    exit: ({ direction, reduce }: SlideMotionContext) =>
      reduce
        ? { opacity: 0, transition: { duration: 0.15 } }
        : {
            opacity: 0,
            x: direction * -travel,
            filter: "blur(8px)",
            transition: { duration: 0.2, ease: EASE_IN },
          },
  };
}

export const MEDIA_VARIANTS = slideVariants(TRAVEL, 0);
export const COPY_VARIANTS = slideVariants(COPY_TRAVEL, 0.08);

/** Three slow drifts so neighbouring slides do not move the same way. */
const KEN_BURNS_PATHS = [
  { scale: [1.04, 1.14], x: ["0%", "-2.5%"], y: ["0%", "-1.5%"] },
  { scale: [1.12, 1.04], x: ["-2%", "1.5%"], y: ["-1%", "0.5%"] },
  { scale: [1.05, 1.13], x: ["1.5%", "-1%"], y: ["1%", "-1.5%"] },
];

export function kenBurnsPath(variant: number) {
  return KEN_BURNS_PATHS[variant % KEN_BURNS_PATHS.length];
}

export const KEN_BURNS_TRANSITION: Transition = {
  duration: 16,
  ease: EASE_IN_OUT,
  repeat: Number.POSITIVE_INFINITY,
  repeatType: "mirror",
};

/** Text label swap on the primary footer action (Next / Got it). */
export const LABEL_SWAP: Transition = { duration: 0.2, ease: EASE_OUT };
