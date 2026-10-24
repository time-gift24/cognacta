"use client";

import { animate, useMotionValue } from "motion/react";
import { type PointerEvent, useCallback, useRef } from "react";
import { SPRING_PANEL } from "@/lib/beui/ease";

export type UseSwipeOptions = {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  canSwipeLeft: boolean;
  canSwipeRight: boolean;
  /** Disables the follow-the-finger offset (reduced motion). */
  reduceMotion?: boolean;
  /** Fraction of the element width a drag must cover to change slide. */
  threshold?: number;
};

/** Pixels per millisecond that count as a flick regardless of distance. */
const FLICK_VELOCITY = 0.5;
/** Pixels of travel before a press becomes a horizontal drag. */
const SLOP = 6;

/** iOS-style resistance: the further you pull, the less it moves. */
function rubberBand(distance: number, dimension: number, constant: number) {
  const sign = Math.sign(distance);
  const abs = Math.abs(distance);
  return sign * (1 - 1 / ((abs * constant) / dimension + 1)) * dimension;
}

/**
 * Horizontal pointer swipe with a threshold, flick detection, and a
 * rubber-band at the ends. Vertical scrolling stays native (`touch-action:
 * pan-y` on the element).
 */
export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  canSwipeLeft,
  canSwipeRight,
  reduceMotion = false,
  threshold = 0.18,
}: UseSwipeOptions) {
  const x = useMotionValue(0);
  const drag = useRef<{
    id: number;
    startX: number;
    startY: number;
    startTime: number;
    width: number;
    horizontal: boolean | null;
  } | null>(null);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    drag.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTime: event.timeStamp,
      width: event.currentTarget.getBoundingClientRect().width || 1,
      horizontal: null,
    };
  }, []);

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const state = drag.current;
      if (!state || state.id !== event.pointerId) return;
      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      if (state.horizontal === null) {
        if (Math.hypot(dx, dy) < SLOP) return;
        state.horizontal = Math.abs(dx) > Math.abs(dy);
        if (!state.horizontal) {
          drag.current = null;
          return;
        }
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      if (reduceMotion) return;
      const allowed = dx < 0 ? canSwipeLeft : canSwipeRight;
      x.set(rubberBand(dx, state.width, allowed ? 0.9 : 0.25));
    },
    [canSwipeLeft, canSwipeRight, reduceMotion, x],
  );

  const finish = useCallback(
    (event: PointerEvent<HTMLElement>, cancelled: boolean) => {
      const state = drag.current;
      if (!state || state.id !== event.pointerId) return;
      drag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
      animate(x, 0, reduceMotion ? { duration: 0 } : SPRING_PANEL);
      if (cancelled || !state.horizontal) return;
      const dx = event.clientX - state.startX;
      const elapsed = Math.max(event.timeStamp - state.startTime, 1);
      const passed =
        Math.abs(dx) > state.width * threshold ||
        Math.abs(dx) / elapsed > FLICK_VELOCITY;
      if (!passed) return;
      if (dx < 0 && canSwipeLeft) onSwipeLeft();
      else if (dx > 0 && canSwipeRight) onSwipeRight();
    },
    [
      canSwipeLeft,
      canSwipeRight,
      onSwipeLeft,
      onSwipeRight,
      reduceMotion,
      threshold,
      x,
    ],
  );

  return {
    x,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (event: PointerEvent<HTMLElement>) => finish(event, false),
      onPointerCancel: (event: PointerEvent<HTMLElement>) =>
        finish(event, true),
    },
  };
}
