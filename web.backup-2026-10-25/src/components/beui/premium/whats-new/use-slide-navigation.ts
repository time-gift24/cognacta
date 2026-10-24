"use client";

import { type KeyboardEvent, useCallback, useState } from "react";

export type SlideDirection = 1 | -1;

/**
 * Index plus the direction of travel, so slides can enter from the side the
 * person is moving towards. Left/Right arrow keys step through the slides.
 */
export function useSlideNavigation(count: number) {
  const [state, setState] = useState<{
    index: number;
    direction: SlideDirection;
  }>({ index: 0, direction: 1 });
  const last = Math.max(count - 1, 0);
  const index = Math.min(state.index, last);

  const goTo = useCallback(
    (target: number) =>
      setState((current) => {
        const next = Math.min(Math.max(target, 0), last);
        const from = Math.min(current.index, last);
        if (next === from) return current;
        return { index: next, direction: next > from ? 1 : -1 };
      }),
    [last],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);
  const reset = useCallback(() => setState({ index: 0, direction: 1 }), []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable='true']")) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        prev();
      }
    },
    [next, prev],
  );

  return {
    index,
    direction: state.direction,
    canPrev: index > 0,
    canNext: index < last,
    isLast: index === last,
    goTo,
    next,
    prev,
    reset,
    onKeyDown,
  };
}
