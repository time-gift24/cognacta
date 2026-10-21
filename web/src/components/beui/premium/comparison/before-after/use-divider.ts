"use client";

import {
  type AnimationPlaybackControls,
  animate,
  type MotionValue,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from "motion/react";
import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  DIVIDER_SPRING,
  KEY_STEP,
  PAGE_STEP,
  SWEEP,
} from "./before-after-motion";

const clamp = (value: number) => Math.min(100, Math.max(0, value));

export type DividerState = {
  /** Percent of the stage showing the "before" photo, from the left edge. */
  position: MotionValue<number>;
  /** Share of the frame showing the corrected photo, 0–1. */
  afterShare: MotionValue<number>;
  /** Rounded position for ARIA and callbacks. */
  value: number;
  stageRef: React.RefObject<HTMLDivElement | null>;
  stageHandlers: {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
  };
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  sweep: () => void;
  hold: (active: boolean) => void;
  dragging: boolean;
};

export function useDivider({
  defaultPosition,
  onPositionChange,
  reduce,
}: {
  defaultPosition: number;
  onPositionChange?: (position: number) => void;
  reduce: boolean | null;
}): DividerState {
  const position = useMotionValue(clamp(defaultPosition));
  const afterShare = useTransform(position, (p) => 1 - p / 100);
  const [value, setValue] = useState(Math.round(clamp(defaultPosition)));
  const [dragging, setDragging] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const playback = useRef<AnimationPlaybackControls | null>(null);
  const interacted = useRef(false);
  const heldFrom = useRef<number | null>(null);
  const callback = useRef(onPositionChange);
  callback.current = onPositionChange;

  useMotionValueEvent(position, "change", (next) => {
    const rounded = Math.round(next);
    setValue((prev) => (prev === rounded ? prev : rounded));
  });

  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    callback.current?.(value);
  }, [value]);

  useEffect(() => () => playback.current?.stop(), []);

  const moveTo = useCallback(
    (target: number, glide: boolean) => {
      playback.current?.stop();
      const next = clamp(target);
      if (glide && !reduce) {
        playback.current = animate(position, next, DIVIDER_SPRING);
      } else {
        position.set(next);
      }
    },
    [position, reduce],
  );

  const fromPointer = (clientX: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return position.get();
    return ((clientX - rect.left) / rect.width) * 100;
  };

  const stageHandlers: DividerState["stageHandlers"] = {
    onPointerDown: (event) => {
      if (event.button !== 0 || heldFrom.current !== null) return;
      interacted.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
      moveTo(fromPointer(event.clientX), true);
    },
    onPointerMove: (event) => {
      if (!dragging) return;
      moveTo(fromPointer(event.clientX), false);
    },
    onPointerUp: (event) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
      setDragging(false);
    },
    onPointerCancel: () => setDragging(false),
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const current = position.get();
    const steps: Record<string, number> = {
      ArrowLeft: current - KEY_STEP,
      ArrowDown: current - KEY_STEP,
      ArrowRight: current + KEY_STEP,
      ArrowUp: current + KEY_STEP,
      PageDown: current - PAGE_STEP,
      PageUp: current + PAGE_STEP,
      Home: 0,
      End: 100,
    };
    if (!(event.key in steps)) return;
    event.preventDefault();
    interacted.current = true;
    // Snap keyboard steps from the rounded value so repeated presses land on
    // clean 2% increments even mid-glide.
    moveTo(Math.round(steps[event.key] ?? current), !event.repeat);
  };

  const sweep = useCallback(() => {
    if (reduce || interacted.current) return;
    const start = position.get();
    const dip = clamp(start - SWEEP.depth);
    playback.current?.stop();
    playback.current = animate(position, [start, dip, start], {
      delay: SWEEP.delay,
      duration: SWEEP.duration,
      ease: SWEEP.ease,
      times: [0, 0.5, 1],
    });
  }, [position, reduce]);

  const hold = useCallback(
    (active: boolean) => {
      if (active) {
        if (heldFrom.current !== null) return;
        interacted.current = true;
        heldFrom.current = position.get();
        moveTo(100, true);
        return;
      }
      if (heldFrom.current === null) return;
      const restore = heldFrom.current;
      heldFrom.current = null;
      moveTo(restore, true);
    },
    [moveTo, position],
  );

  return {
    position,
    afterShare,
    value,
    stageRef,
    stageHandlers,
    onKeyDown,
    sweep,
    hold,
    dragging,
  };
}
